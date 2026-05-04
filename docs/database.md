# Database

## PostgreSQL

Managed via Prisma ORM (v7, WASM engine with `@prisma/adapter-pg` driver adapter). Schema lives in `apps/api/prisma/schema.prisma`. Migrations are in `apps/api/prisma/migrations/`.

### users

Stores account credentials and the linked Codeforces handle.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT (UUID) | Primary key |
| `email` | TEXT | Unique |
| `username` | TEXT | Unique, 3–30 chars |
| `password_hash` | TEXT | bcrypt, cost 12 |
| `codeforces_handle` | TEXT? | Nullable, unique — set via PUT /codeforces/handle |
| `created_at` | TIMESTAMP | Auto |
| `updated_at` | TIMESTAMP | Auto-updated |

**Relations:** One user → many `codeforces_submissions`, many `user_problem_activity` records.

### codeforces_submissions

Raw submission history synced from Codeforces. Never modified after creation except `verdict` (Codeforces can retroactively rejudge).

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT (UUID) | Primary key |
| `user_id` | TEXT | FK → users.id (CASCADE DELETE) |
| `submission_id` | TEXT | Codeforces' own submission ID |
| `problem_id` | TEXT | Derived: `contestId + index` e.g. `1234A` |
| `problem_name` | TEXT | Display name |
| `problem_tags` | TEXT[] | PostgreSQL array |
| `verdict` | TEXT | e.g. `OK`, `WRONG_ANSWER`, `TLE` |
| `language` | TEXT | e.g. `GNU C++17` |
| `submitted_at` | TIMESTAMP | From CF Unix timestamp |
| `time_taken_ms` | INT? | Nullable |
| `memory_used` | INT? | In KB, nullable |

**Unique constraint:** `(user_id, problem_id, submission_id)` — the upsert key.  
**Indexes:** `user_id`, `problem_id`.

### user_problem_activity

Tracks a user's interaction with a specific problem (from any source). Updated when the user rates confidence after solving.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT (UUID) | Primary key |
| `user_id` | TEXT | FK → users.id (CASCADE DELETE) |
| `problem_id` | TEXT | FK → problems.id (CASCADE DELETE) |
| `source` | TEXT | `codeforces`, `leetcode`, `cses` |
| `attempts` | INT | Default 0 |
| `solved_at` | TIMESTAMP? | Nullable until solved |
| `time_taken_minutes` | INT? | Nullable |
| `confidence_rating` | INT? | 1–5, nullable until user rates |
| `created_at` | TIMESTAMP | Auto |

**Unique constraint:** `(user_id, problem_id)` — one record per user+problem.  
**Index:** `user_id`.

### problems

The platform's problem catalogue. Populated during graph seeding (Step 7).

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT (UUID) | Primary key |
| `source` | TEXT | `codeforces`, `leetcode`, `cses` |
| `external_id` | TEXT | Source-specific ID |
| `title` | TEXT | |
| `difficulty` | TEXT? | Nullable |
| `link` | TEXT | Full URL |
| `concept_ids` | TEXT[] | PostgreSQL array of concept IDs |
| `created_at` | TIMESTAMP | Auto |

**Unique constraint:** `(source, external_id)`.  
**Index:** `source`.

---

## Neo4j

Stores the knowledge graph and user skill profiles. The graph schema uses Cypher node and relationship types.

### Nodes

**(:Concept)**
```
{
  id:               string  // e.g. "graphs", "binary-search", "dp-1d"
  name:             string  // human-readable
  description:      string  // optional, added during seeding
  difficulty_level: string  // "beginner" | "intermediate" | "advanced"
}
```

**(:Problem)**
```
{
  id:         string  // matches PostgreSQL problems.id
  source:     string
  link:       string
  difficulty: string
}
```

**(:User)**
```
{
  id:       string  // matches PostgreSQL users.id
  username: string
}
```

### Relationships

**(:Concept)-[:REQUIRES]->(:Concept)**

Dependency edges. "You need to understand graphs before you can learn Dijkstra."

```
(graphs)-[:REQUIRES]->(dijkstra)
(arrays)-[:REQUIRES]->(binary-search)
(dfs)-[:REQUIRES]->(scc)
```

These are hand-curated during graph seeding (Step 7). They drive the "unlocked concept" logic in the recommendation engine — a concept is unlocked only when all its prerequisites have strength > 60.

**(:Problem)-[:TESTS]->(:Concept)**

Maps a problem to the concepts it exercises. One problem can test multiple concepts.

```
(problem-1234A)-[:TESTS]->(graphs)
(problem-1234A)-[:TESTS]->(dfs)
```

**(:User)-[:HAS_SKILL {strength, last_practiced, decayed_strength}]->(:Concept)**

The user's current skill level for a concept.

| Property | Type | Notes |
|---|---|---|
| `strength` | float | 0–100, computed by scoring engine |
| `last_practiced` | int64 | Unix timestamp of most recent submission |
| `decayed_strength` | float | Strength after passive time decay (Step 8) |

**(:User)-[:SOLVED {attempts, confidence, solved_at}]->(:Problem)**

Records which problems a user has solved.

| Property | Type | Notes |
|---|---|---|
| `attempts` | int | Total submission count |
| `confidence` | int | 1–5, from user rating |
| `solved_at` | int64 | Unix timestamp |

### Example queries

Find all unlocked weak concepts for a user:
```cypher
MATCH (u:User {id: $userId})-[r:HAS_SKILL]->(c:Concept)
WHERE r.strength < 60
AND NOT EXISTS {
  MATCH (c)-[:REQUIRES]->(prereq:Concept)
  WHERE NOT EXISTS {
    MATCH (u)-[pr:HAS_SKILL]->(prereq)
    WHERE pr.strength >= 60
  }
}
RETURN c ORDER BY r.strength ASC
LIMIT 1
```

Get a user's full skill profile:
```cypher
MATCH (u:User {id: $userId})-[r:HAS_SKILL]->(c:Concept)
RETURN c.id, c.name, r.strength, r.last_practiced
ORDER BY r.strength DESC
```
