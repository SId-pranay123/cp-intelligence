# Step 8 — Recommendations

## What was built

The end-to-end recommendations pipeline: a Neo4j Cypher query to find unlocked weak concepts, a PostgreSQL query to find unsolved problems for each concept, and Claude haiku to generate reasoning text for each recommendation.

## Components

### UnlockedWeakConcepts Cypher query

Finds concepts the user is weak in (strength < 60 or no skill edge) where all prerequisites have been met (all prereqs have strength ≥ 60 for this user, or the concept has no prerequisites). Results sorted weakest-first, limited to 5.

This is the core of the recommendation logic — it prevents the system from recommending advanced topics before fundamentals are in place.

### Problem fetch (PostgreSQL)

For each weak concept, one unsolved problem is selected ordered by difficulty (easy → medium → hard → expert). "Unsolved" means no submission with `verdict = 'OK'` exists for this user.

### AI reasoning (Anthropic Claude)

Go processor calls `claude-haiku-4-5-20251001` with a 15-second timeout. The prompt includes:
- Concept name
- Current strength percentage
- Problem title

On failure (timeout, API error): falls back to template string `"Practise {title} to strengthen your {strength}% skill in {concept}"`.

### GetRecommendations gRPC

Returns up to 5 `Recommendation` proto messages. NestJS calls this when the Redis cache is cold (miss or invalidated).

### Confidence rating endpoint

`POST /recommendations/confidence` accepts `{ conceptId, confidence }` (confidence 1–5), maps to a strength delta, calls `UpdateConfidence` gRPC, then invalidates the Redis cache for this user.

## Key decisions

**Limit 5 recommendations:** More than 5 choices causes decision paralysis. The system is opinionated — it picks the single most valuable problem per concept.

**Easy-first within a concept:** A user who scores 15% on binary search needs a Div 2 B problem, not a Div 1 D. Ordering by difficulty ascending ensures the problem is achievable.

**Claude haiku for reasoning:** Haiku is the fastest and cheapest Claude model. Recommendation text needs to be short and generated quickly. The 15s timeout keeps the gRPC response time bounded.

**Template fallback:** The AI call is best-effort. Recommendations must always be returned — even if Claude is down. A template fallback guarantees this.

## Bugs found and fixed

**1. SELECT DISTINCT + ORDER BY CASE incompatibility**

The initial problem fetch query used `SELECT DISTINCT` with an `ORDER BY CASE` expression that was not in the select list. PostgreSQL rejects this:

```
ERROR: for SELECT DISTINCT, ORDER BY expressions must appear in select list
```

Fix: wrapped the query in a subquery so `ORDER BY` applies to the outer query which is not `DISTINCT`.

**2. Wrong column names in Go SQL query**

Initial Go code referenced `problemId`, `problemName`, `tags`, `rating`. The actual PostgreSQL columns are `external_id`, `title`, `concept_ids`, `difficulty`, `link`.

Fix: corrected all column references in the Go `scanRows` function.

## What was verified

- Dashboard shows 5 recommendations for a user who has synced
- Recommended concepts are ones the user has low strength in
- Each recommendation links to an unsolved problem at the appropriate difficulty
- AI reason is present when Claude API is available
- Template fallback fires when Claude API is unavailable (tested by setting invalid API key)
- Confidence rating (1–5) updates Neo4j strength and invalidates Redis cache
- After rating, next dashboard load shows updated strength in heatmap
