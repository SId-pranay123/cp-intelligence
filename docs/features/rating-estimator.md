# Rating Estimator

## What it does

Given a user's skill profile (strengths across 71 concepts), estimate what their Codeforces
rating *should* be. Displayed on the dashboard as:

```
Estimated CF rating   ~1450
Your actual rating    1200
Gap: +250 — strong fundamentals, consider entering more contests
```

## Algorithm

### Approach: concept-weighted heuristic

Each concept maps to a difficulty tier. A user who is strong in harder concepts
should have a higher estimated rating.

**Tier weights** (CF rating bands each concept starts appearing in):

| Tier | Rating range | Weight |
|------|-------------|--------|
| 1    | 800–1099    | 1.0 |
| 2    | 1100–1399   | 1.5 |
| 3    | 1400–1699   | 2.0 |
| 4    | 1700–1999   | 2.5 |
| 5    | 2000–2399   | 3.0 |
| 6    | 2400+       | 4.0 |

**Formula:**
```
weighted_sum = Σ (concept_strength * tier_weight)  for all concepts with strength > 0
max_possible = Σ (100 * tier_weight)               for all concepts
ratio = weighted_sum / max_possible

estimated_rating = 800 + ratio * (3500 - 800)
```

Clamp to [800, 3500].

### Concept tier map (defined in code, not DB)
Assign each of the 71 concepts a tier based on the CF rating where it typically first appears
as a problem tag. Example:

```
arrays: 1, strings: 1, binary-search: 2, bfs: 2, dfs: 2,
dp-1d: 2, dp-2d: 3, graphs: 2, dijkstra: 3, segment-tree: 4,
fft: 6, suffix-array: 5, ...
```

The full map lives in `apps/web/src/lib/concepts.ts` alongside the existing concept list.

## Backend changes

None. This is a pure frontend calculation using the existing `/recommendations/skill-profile`
response. Runs client-side on the dashboard.

## Frontend changes

### Dashboard card (new stat card)
```
Estimated rating    ~1450
↑ 250 above actual  (if CF rating is known)
```

### Fetch actual CF rating
CF's public API: `https://codeforces.com/api/user.info?handles={handle}`
returns `rating` field. Call this once after the skill profile loads.
Cache in localStorage with a 24h TTL so we don't hammer the CF API.

### Gap interpretation
```
gap > +300  → "Strong fundamentals, more contests needed"
gap 0–300   → "Well matched"
gap < 0     → "Contest-hardened, focus on concept depth"
```

## Limitations (document honestly)
- Heuristic, not ML. Accurate within ±200–300 rating points on average.
- Doesn't account for contest experience, speed, or stress performance.
- Will be recalibrated once we have enough users to compare actual vs. estimated.

## Acceptance criteria
- [ ] Estimated rating appears on the Dashboard overview section
- [ ] Actual CF rating fetched from CF API and shown alongside
- [ ] Gap text updates based on difference
- [ ] CF API call is cached in localStorage (24h TTL)
- [ ] Gracefully handles no CF handle or CF API failure

## Files to change / create
- `apps/web/src/lib/concepts.ts` — add `tier` field to each concept
- `apps/web/src/lib/rating-estimator.ts` — estimator function (new)
- `apps/web/src/app/dashboard/page.tsx` — add estimated rating card (client component)
