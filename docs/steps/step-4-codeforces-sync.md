# Step 4 — Codeforces Sync

## What was built

A `CodeforcesModule` with two protected endpoints: one to set and validate a Codeforces handle, one to sync the full submission history into PostgreSQL.

## Schema change

`submission_id` (Codeforces' own numeric ID) was added to `CodeforcesSubmission` in a new migration, along with a composite unique constraint `(user_id, problem_id, submission_id)`. This is the upsert key — it ensures the same submission is never duplicated regardless of how many times sync runs.

Because `prisma migrate dev` requires an interactive TTY (it prompts for confirmation on potentially destructive changes), the migration had to be run in a separate terminal. This was the first encounter with this limitation.

## Packages installed

- `axios` — HTTP client for Codeforces API calls

## File structure

```
src/codeforces/
├── dto/
│   └── set-handle.dto.ts    # validates handle format
├── codeforces-api.types.ts  # raw CF API shapes (CfSubmission, CfUser, etc.)
├── codeforces.service.ts    # API calls, upsert logic, error handling
├── codeforces.controller.ts # PUT /codeforces/handle, POST /codeforces/sync
└── codeforces.module.ts
```

## Upsert batching

The sync path upserts 200 submissions at a time using `Promise.all` within each chunk. Prisma v7's WASM client doesn't support `createMany` with `skipDuplicates` in the same way as the Rust client, so individual `upsert` calls are used instead.

On conflict: only `verdict` is updated. Submission metadata (timestamps, language, tags) is immutable.

## Error handling

All Codeforces API errors go through a single `handleAxiosError` helper:

| Condition | Status |
|---|---|
| `ECONNABORTED` (timeout) | 503 |
| HTTP 429 | 503 — rate limit message |
| HTTP 502/503 | 503 — CF unavailable |
| Everything else | 503 — generic message |

The 15-second timeout per request prevents a slow CF API from blocking NestJS threads indefinitely.

## Bug found and fixed

**Problem:** `PUT /codeforces/handle` with a non-existent handle returned `503 Service Unavailable` instead of `404 Not Found`.

**Root cause:** Codeforces returns HTTP 400 (not 200 with `status: "FAILED"`) for unknown handles. Axios throws a rejected promise on 4xx/5xx responses before the response body can be read. The original `validateHandleExists` function checked `res.data.status === 'FAILED'` only on the success path (2xx), which was never reached for invalid handles.

**Fix:** Added a catch block specifically for `axiosError.response?.status === 400`:

```typescript
if (axios.isAxiosError(err) && err.response?.status === 400) {
  const body = err.response.data as CfApiResponse<unknown>;
  if (body?.status === 'FAILED') {
    throw new NotFoundException(`Codeforces handle "${handle}" does not exist.`);
  }
}
```

This correctly distinguishes CF's "handle not found" 400 from a genuine client error.

## Smoke test results

```
POST /codeforces/sync   (no handle set)
→ 400 {"message":"No Codeforces handle set. Call PUT /codeforces/handle first."}

PUT /codeforces/handle  {"handle":"xyzfakeabc999"}
→ 404 {"message":"Codeforces handle \"xyzfakeabc999\" does not exist."}

PUT /codeforces/handle  {"handle":"tourist"}
→ 200 {"handle":"tourist"}

POST /codeforces/sync   (handle: tourist)
→ 200 {"synced":5436}

POST /codeforces/sync   (no JWT)
→ 401 {"message":"Unauthorized"}
```

## What was verified

TypeScript compile clean. All five cases above tested live. 5,436 submissions stored in PostgreSQL and visible in the `codeforces_submissions` table.
