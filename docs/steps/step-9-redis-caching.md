# Step 9 — Redis Caching & Problem Table Population

## What was built

Two things were completed in this step:

1. **Redis caching** for recommendations in NestJS — avoids regenerating recommendations (Neo4j + PostgreSQL + Claude) on every dashboard load.
2. **Problem table population** during sync — `upsertProblems()` runs before `upsertSubmissions()`, mapping CF tags to concept IDs so problems are usable by the recommendation engine.

---

## Redis Caching

### RedisService

A `@Global()` NestJS module built on `ioredis`. Registered once in `AppModule`, available everywhere via injection.

```typescript
const client = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT ?? '6379'),
  lazyConnect: true,
  maxRetriesPerRequest: 1,
});
```

`lazyConnect: true` means the connection is established on first use, not at module init. This prevents the app from failing to start if Redis is unavailable.

All public methods are wrapped in try/catch and return `null` on error:

```typescript
async get(key: string): Promise<string | null> {
  try {
    return await this.client.get(key);
  } catch {
    return null;
  }
}
```

The same pattern applies to `set` and `del`. The app works correctly without Redis — it just regenerates recommendations on every request.

### Cache key and TTL

| Key pattern | TTL |
|---|---|
| `recommendations:{userId}` | 86400 seconds (24h) |

### Cache invalidation

The cache is explicitly deleted (`DEL`) — not expired — in two places:

| Trigger | Action |
|---|---|
| `POST /codeforces/sync` success | `redis.del('recommendations:' + userId)` |
| `POST /recommendations/confidence` success | `redis.del('recommendations:' + userId)` |

Explicit invalidation ensures users see fresh recommendations immediately after syncing or rating a problem, rather than waiting up to 24h for the TTL to expire.

### Flow with caching

```
GET /recommendations
  ↓
Check Redis: recommendations:{userId}
  ├─ HIT  → return cached JSON, done
  └─ MISS → call Go GetRecommendations gRPC
              → Neo4j: UnlockedWeakConcepts
              → PostgreSQL: unsolved problems
              → Claude: reasoning text
              → SET recommendations:{userId} EX 86400
              → return response
```

---

## Problem Table Population

### Why it's needed

`codeforces_submissions.problem_id` is a foreign key to `problems.external_id`. Before upserting submissions, problems must exist in the database. Additionally, the recommendation engine queries `problems.concept_ids` to match problems to concepts — this field must be populated during sync.

### upsertProblems()

Runs at the start of `POST /codeforces/sync`, before `upsertSubmissions()`.

1. Extract unique problems from the submission list using a JS `Map<externalId, ProblemData>` for deduplication
2. Map each problem's CF tags to concept IDs using `cf-tag-map.ts`
3. Map the problem's rating to a difficulty tier
4. Build the Codeforces link
5. Upsert in chunks of 100

```typescript
// Difficulty mapping
function ratingToDifficulty(rating?: number): Difficulty {
  if (!rating) return 'medium';
  if (rating < 1200) return 'easy';
  if (rating < 1900) return 'medium';
  if (rating < 2400) return 'hard';
  return 'expert';
}

// Link construction
const link = `https://codeforces.com/problemset/problem/${contestId}/${index}`;
```

### cf-tag-map.ts

Maps Codeforces problem tags to internal concept IDs. This file is an exact mirror of Go's `CFTagMapping` constant — both must agree on concept IDs, otherwise problems seeded by NestJS won't match concepts queried by Go.

Selected entries showing the correct concept IDs:

```typescript
export const CF_TAG_MAP: Record<string, string[]> = {
  'math':              ['math-basics'],   // NOT 'math'
  'dp':                ['dp-1d'],         // NOT 'dp'
  'dfs and similar':   ['dfs'],
  'shortest paths':    ['dijkstra', 'bellman-ford'],
  'data structures':   ['segment-trees', 'fenwick-trees'],
  'flows':             ['network-flow'],
  'bitmasks':          ['bitmask-dp'],
  // ... ~80 total entries
};
```

## Bugs found and fixed

**1. Wrong concept IDs in cf-tag-map.ts**

Original implementation used `"math"→["math"]` and `"dp"→["dp"]`. The graph nodes are `math-basics` and `dp-1d`. Problems were being assigned non-existent concept IDs, so they never appeared in recommendations.

Fix: rewrote the map as an exact mirror of Go's `CFTagMapping`.

**2. SELECT DISTINCT + ORDER BY error in problem fetch**

The Go recommendation query used `SELECT DISTINCT` with `ORDER BY CASE difficulty ...` where the CASE expression was not in the SELECT list. PostgreSQL rejects this.

Fix: wrapped the inner query and moved `ORDER BY` to the outer query.

**3. Wrong SQL column names in Go**

Go used `problemId`, `problemName`, `tags`, `rating` — actual columns are `external_id`, `title`, `concept_ids`, `difficulty`, `link`.

Fix: corrected all column references.

**4. min() invalid in Neo4j SET clause**

`SET s.strength = min(s.strength, $newStrength)` fails — `min()` is an aggregation function, not a scalar function in Cypher.

Fix: replaced with `SET s.strength = CASE WHEN $newStrength > s.strength THEN $newStrength ELSE s.strength END`.

## What was verified

- Redis `GET recommendations:{userId}` returns cached JSON after first dashboard load
- Second dashboard load is faster (cache hit, no gRPC call)
- After `POST /codeforces/sync`, Redis key is deleted and next load regenerates
- After `POST /recommendations/confidence`, Redis key is deleted
- App starts and serves requests normally when Redis is not running (lazyConnect + catch)
- Problems table is populated with correct `concept_ids` after sync
- Recommendations show problems tagged with the correct concepts
