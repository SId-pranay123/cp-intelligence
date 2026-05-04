# Codeforces Sync

## Overview

Users connect their Codeforces account in two steps: first they set their handle (with validation), then they trigger a full sync which fetches their complete submission history and stores it in PostgreSQL.

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
- Alphanumeric, underscore, and hyphen only (`^[a-zA-Z0-9_-]+$`)

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

Fetches the user's full submission history from Codeforces and upserts it into `codeforces_submissions`.

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

## Upsert logic

Submissions are upserted (not inserted) using the composite unique key `(user_id, problem_id, submission_id)`:

- `submission_id` — Codeforces' own numeric submission ID (unique per submission)
- `problem_id` — derived from `contestId + index` (e.g. `1234A`) or `problemsetName + index` for gym/practice problems

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

## Bug found and fixed during testing

**Issue:** `PUT /codeforces/handle` with an unknown handle was returning `503` instead of `404`.

**Root cause:** Codeforces returns HTTP 400 (not just a JSON `status: FAILED`) for unknown handles. Axios throws on non-2xx responses before the response body can be inspected. The original code only checked `res.data.status === 'FAILED'` on the success path, which was never reached.

**Fix:** Added an explicit catch for `axiosError.response?.status === 400` in `validateHandleExists`. The error response body is read and checked for `status: FAILED` to distinguish "handle not found" from a genuine bad-request error. A true bad request from CF would also have `status: FAILED` in the body, so this is safe.
