# Concept Drill Page

## What it does

Clicking a concept badge anywhere (heatmap, knowledge graph, dashboard) opens a dedicated
drill page that shows:
- Your current strength score for that concept
- All problems in the DB tagged to that concept, sorted by difficulty
- Which ones you've already solved, which you've rated, and which are unsolved

This turns the heatmap from a read-only visualisation into an action surface.

## Routes

```
/dashboard/drill/[conceptId]    — e.g. /dashboard/drill/dp-1d
```

## Data

No new backend endpoints needed. Uses two existing endpoints:

1. `GET /recommendations/skill-profile` — for the concept strength
2. `GET /recommendations` — already returns problems per concept; we need a variant that
   returns ALL problems for a given concept, not just the top recommendation

### New endpoint (minimal)
`GET /problems?conceptId=dp-1d` — returns all problems tagged to a concept, with
`UserProblemActivity` joined (so we know solve status and confidence rating).

Response:
```json
{
  "concept": { "id": "dp-1d", "name": "DP 1D", "strength": 52 },
  "problems": [
    {
      "id": "...",
      "title": "Climbing Stairs",
      "difficulty": "easy",
      "link": "...",
      "solved": true,
      "confidenceRating": 4,
      "nextReviewAt": "2026-05-14T00:00:00Z"
    }
  ]
}
```

## Frontend

### Entry points (clickable)
- Concept badges on the skill heatmap → navigate to drill page
- Nodes in knowledge graph → tooltip has a "Drill →" link
- Concept pills on problem cards (today's problems)

### Drill page layout
```
[← Back]   DP 1D   Strength: 52 / 100
━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROBLEMS  (12 total · 4 solved · 8 remaining)
[ ] Hard    Palindrome Partitioning II    CF 2000    Solve ↗
[✓] Medium  Climbing Stairs               CF 1200    Rated 4/5
[ ] Easy    Fibonacci Number              CF 800     Solve ↗
...
```

Solved problems show the confidence rating (and spaced repetition due date if applicable).
Unsolved problems show a "Solve ↗" link.

## Acceptance criteria
- [ ] Clicking a heatmap badge navigates to `/dashboard/drill/[conceptId]`
- [ ] Page shows concept name, strength score, and progress (X solved / Y total)
- [ ] Problems are sorted: unsolved easy → unsolved medium → unsolved hard → solved
- [ ] Solved problems show confidence rating
- [ ] "Solve ↗" opens CF link in new tab

## Files to change / create
- `apps/api/src/recommendations/recommendations.controller.ts` — add `GET /problems` route
- `apps/api/src/recommendations/recommendations.service.ts` — query logic
- `apps/web/src/app/api/problems/route.ts` — Next.js proxy (new)
- `apps/web/src/app/dashboard/drill/[conceptId]/page.tsx` — new page (new)
- `apps/web/src/components/skill-heatmap.tsx` — make badges clickable (Link)
- `apps/web/src/components/knowledge-graph.tsx` — tooltip drill link
