# Spaced Repetition Queue

## What it does

After a user rates their confidence on a solved problem (1–5), the system schedules the problem
to resurface at a future date. Problems with low confidence come back sooner. This converts
the existing confidence ratings into a long-term retention engine.

## Interval schedule

| Confidence | Next review |
|------------|-------------|
| 1 (no idea) | 1 day |
| 2 (partial) | 2 days |
| 3 (ok) | 4 days |
| 4 (solid) | 8 days |
| 5 (mastered) | 16 days |

Each subsequent correct review doubles the interval (simplified SM-2).

## Data model changes

Add two columns to `user_problem_activity`:

```sql
next_review_at  TIMESTAMPTZ   -- when to show again (NULL = not yet reviewed)
review_count    INT DEFAULT 0 -- how many times reviewed so far
```

Prisma:
```prisma
nextReviewAt   DateTime? @map("next_review_at")
reviewCount    Int       @default(0) @map("review_count")
```

## Backend changes

### Update confidence endpoint
`POST /recommendations/confidence` — after saving rating, compute and write `nextReviewAt`:

```
interval = 2^(reviewCount) * baseInterval(confidenceRating)  days
nextReviewAt = now + interval
reviewCount += 1
```

### New endpoint
`GET /review/queue` — returns problems where `nextReviewAt <= now`, joined with problem details.
Response shape mirrors `/recommendations` so the same `ProblemsRow` component works.

## Frontend changes

### Sidebar badge
Show count of due reviews next to "Today's problems" (e.g. "Today's problems · 3").

### Review tab on problems page
Two tabs: **Recommendations** (existing) | **Due for review** (new). The review tab shows
problems pulled from `/review/queue`. After rating, the problem disappears from the queue.

### Visual indicator
Problems in review queue get a small "↻ Review" badge instead of the concept pill,
so the user knows the context.

## Acceptance criteria
- [ ] Confidence rating persists `nextReviewAt` and `reviewCount` to DB
- [ ] `GET /review/queue` returns only problems due today or earlier
- [ ] Problems page has Recommendations / Review tabs
- [ ] Rating a review problem reschedules it (doesn't permanently remove it)
- [ ] Badge count on sidebar updates after reviewing

## Files to change
- `apps/api/prisma/schema.prisma` — add fields
- `apps/api/src/recommendations/recommendations.controller.ts` — update confidence endpoint
- `apps/api/src/recommendations/recommendations.service.ts` — scheduling logic
- `apps/api/src/recommendations/recommendations.controller.ts` — add `GET /review/queue`
- `apps/web/src/app/api/review/route.ts` — Next.js proxy (new)
- `apps/web/src/app/dashboard/problems/page.tsx` — add tabs
- `apps/web/src/components/sidebar.tsx` — badge count
