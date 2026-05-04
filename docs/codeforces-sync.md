# Codeforces Sync

## Overview

Users connect their Codeforces account in two steps: first they set their handle (with validation), then they trigger a full sync which fetches their complete submission history, populates the problems table, and stores submissions in PostgreSQL.

## Endpoints

Both endpoints require a valid JWT (`Authorization: Bearer <token>`).

### PUT /codeforces/handle

Sets the authenticated user's Codeforces handle. Validates the handle exists on Codeforces before saving.

**Request body:**
```json
{ "handle": "tourist" }
```

**Validation:**
- 1–24 characters
- Alphanumeric, underscore, hyphen, and dot (`^[a-zA-Z0-9_\-.]+$`)

**Success (200):**
```json
{ "handle": "tourist" }
```

**Errors:**
- `400 Bad Request` — handle format invalid
- `404 Not Found` — handle does not exist on Codeforces
- `503 Service Unavailable` — Codeforces API unreachable or timed out

**How validation works:**
The service calls `https://codeforces.com/api/user.info?handles={handle}`. Codeforces returns HTTP 200 with `status: "OK"` for valid handles, and HTTP 400 with `status: "FAILED"` for unknown ones. Both cases are handled — the 400 body is read to distinguish a "not found" from a real network failure.

### POST /codeforces/sync

Fetches the user's full submission history from Codeforces, populates the problems table, and upserts submissions into `codeforces_submissions`.

**Request body:** none

**Success (200):**
```json
{ "synced": 5436 }
```

`synced` is the total number of submissions processed (not just new ones).

**Errors:**
- `400 Bad Request` — no handle set (call PUT /codeforces/handle first)
- `503 Service Unavailable` — Codeforces API error or timeout

## Codeforces API calls

| Call | URL |
|---|---|
| Handle validation | `GET /api/user.info?handles={handle}` |
| Submission fetch | `GET /api/user.status?handle={handle}&from=1&count=10000` |

The sync fetches up to 10,000 submissions per request. Codeforces returns them most-recent-first. The timeout for each call is 15 seconds.

## Problem table population

Before upserting submissions, the sync runs `upsertProblems()` to ensure every problem in the submission list exists in the `problems` table. This is required because `codeforces_submissions.problem_id` is a foreign key.

### Deduplication

Codeforces can return the same problem in multiple submissions. `upsertProblems()` deduplicates by `external_id` using a JavaScript `Map` before writing to the database:

```typescript
const problemMap = new Map<string, ProblemData>();
for (const sub of submissions) {
  const externalId = `${sub.problem.contestId}${sub.problem.index}`;
  if (!problemMap.has(externalId)) {
    problemMap.set(externalId, buildProblemData(sub.problem));
  }
}
```

### Rating → difficulty mapping

| CF rating | Difficulty |
|---|---|
| < 1200 | `easy` |
| 1200–1899 | `medium` |
| 1900–2399 | `hard` |
| ≥ 2400 | `expert` |
| unrated | `medium` (default) |

### Problem link construction

```typescript
const link = `https://codeforces.com/problemset/problem/${contestId}/${index}`;
```

### Tag → concept mapping (cf-tag-map.ts)

CF tags on each problem are mapped to internal concept IDs via `cf-tag-map.ts`. This file is an exact mirror of Go's `CFTagMapping` constant so both services agree on concept IDs.

Selected mappings:

| CF tag | Concept IDs |
|---|---|
| `math` | `["math-basics"]` |
| `dp` | `["dp-1d"]` |
| `implementation` | `["arrays"]` |
| `brute force` | `["backtracking"]` |
| `dfs and similar` | `["dfs"]` |
| `shortest paths` | `["dijkstra", "bellman-ford"]` |
| `greedy` | `["greedy"]` |
| `trees` | `["trees"]` |
| `graphs` | `["graphs"]` |
| `bitmasks` | `["bitmask-dp"]` |
| `binary search` | `["binary-search"]` |
| `two pointers` | `["two-pointers"]` |
| `strings` | `["strings"]` |
| `hashing` | `["hashing"]` |
| `sortings` | `["sorting"]` |
| `number theory` | `["number-theory"]` |
| `combinatorics` | `["combinatorics"]` |
| `geometry` | `["geometry"]` |
| `data structures` | `["segment-trees", "fenwick-trees"]` |
| `flows` | `["network-flow"]` |

The full map covers ~80 CF tags. Each problem's `concept_ids` is the union of all mapped concept IDs for its tags, deduplicated.

### Upsert strategy

Problems are upserted in chunks of 100 using Prisma's `upsert` with `external_id` as the unique key:

```typescript
await prisma.problem.upsert({
  where: { external_id: problem.externalId },
  create: { ...problem },
  update: { title: problem.title, concept_ids: problem.conceptIds, difficulty: problem.difficulty },
});
```

Only `title`, `concept_ids`, and `difficulty` are updated on conflict — the link and external ID are immutable.

## Submission upsert logic

After problems are populated, submissions are upserted using the composite unique key `(user_id, problem_id, submission_id)`:

- `submission_id` — Codeforces' own numeric submission ID (unique per submission)
- `problem_id` — references `problems.external_id`

On conflict: only `verdict` is updated (Codeforces can retroactively rejudge submissions). All other fields are immutable once created.

Upserts are batched in chunks of 200 and run with `Promise.all` within each chunk to stay within connection pool limits.

## Error handling

| Condition | Response |
|---|---|
| No handle set | 400 — "No Codeforces handle set" |
| Handle doesn't exist | 404 — "Codeforces handle X does not exist" |
| Codeforces timeout (15s) | 503 — "Codeforces API timed out" |
| HTTP 429 from CF | 503 — "rate limit hit, try again" |
| HTTP 502/503 from CF | 503 — "temporarily unavailable" |
| CF returns `status: FAILED` on sync | 400 — forwards CF's error message |

## Bugs found and fixed

**Issue 1:** `PUT /codeforces/handle` with an unknown handle was returning `503` instead of `404`.

**Root cause:** Codeforces returns HTTP 400 (not just a JSON `status: FAILED`) for unknown handles. Axios throws on non-2xx responses before the response body can be inspected. The original code only checked `res.data.status === 'FAILED'` on the success path, which was never reached.

**Fix:** Added an explicit catch for `axiosError.response?.status === 400` in `validateHandleExists`. The error response body is read and checked for `status: FAILED` to distinguish "handle not found" from a genuine bad-request error.

**Issue 2:** Handle DTO regex rejected handles containing dots (e.g. `pranay.2`).

**Root cause:** Original regex was `^[a-zA-Z0-9_-]+$`, which does not allow dots. Some CF handles contain dots.

**Fix:** Updated regex to `^[a-zA-Z0-9_\-.]+$`.

**Issue 3:** `cf-tag-map.ts` used wrong concept IDs.

**Root cause:** Initial implementation used `"math"→["math"]` and `"dp"→["dp"]` instead of the correct `"math"→["math-basics"]` and `"dp"→["dp-1d"]`. This meant those problems were assigned non-existent concept IDs and never surfaced in recommendations.

**Fix:** Rewrote `cf-tag-map.ts` as an exact mirror of Go's `CFTagMapping` constant.
