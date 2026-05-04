# Skill Scoring

## Overview

The skill scoring algorithm converts a user's raw Codeforces submission history into a per-concept strength score between 0 and 100. It lives entirely in `apps/processor/internal/scoring/scoring.go` — pure computation with no I/O.

## Why this algorithm

The goal is to answer: *"How well does this user know graphs right now?"* A naive approach (count solved problems) ignores three important signals:

1. **Recency** — knowledge fades. Solving 20 graph problems two years ago means less than solving 5 last month.
2. **Difficulty** — solving a 2400-rated problem is stronger evidence of skill than solving a 900-rated one.
3. **Efficiency** — solving on the first attempt shows deeper understanding than solving after ten wrong answers.

## Step-by-step

### Step 1 — Group by problem

All submissions for a given problem are collected together. A user might have multiple attempts (WA, WA, then AC). The group is sorted chronologically.

### Step 2 — Score each problem

For each problem group, one score is produced.

#### Base score

| Outcome | Base score |
|---|---|
| First AC found in group | 1.0 |
| No AC (all WA / TLE / MLE) | 0.3 |

A score of 0.3 (not 0) for a failed problem is intentional. Attempting a hard problem and failing still demonstrates some engagement with the concept.

#### Difficulty multiplier

Based on the Codeforces problem rating:

| CF Rating | Category | Multiplier |
|---|---|---|
| 0 (unknown) | — | 1.0 |
| < 1200 | Easy | 1.0 |
| 1200 – 1900 | Medium | 1.3 |
| > 1900 | Hard | 1.6 |

This stretches the score range upward for hard problems. A perfect hard problem tops out at `1.0 × 1.6 = 1.6`, which normalises to 100.

#### Recency weight

Based on days since the decisive submission (AC, or last attempt if no AC):

| Days since solved | Weight |
|---|---|
| 0 – 30 | 1.0 |
| 31 – 90 | 0.8 |
| 91 – 180 | 0.6 |
| > 180 | 0.4 |

The minimum weight is 0.4, not 0. You don't forget everything — you just get less credit for stale knowledge.

#### Attempts penalty

Counts the number of wrong submissions before the first AC:

```
extra_attempts = index of first AC in sorted group  (0 if first try)
penalty = max(0.5, 1.0 - 0.1 × extra_attempts)
```

Examples:
- First try (0 extra) → `1.0`
- 1 WA then AC → `0.9`
- 3 WA then AC → `0.7`
- 6+ WA then AC → `0.5` (floor)

The floor of 0.5 ensures persistence is still rewarded even for very messy solves.

#### Per-problem score

```
score = base_score × difficulty_multiplier × recency_weight × attempts_penalty
```

Maximum possible: `1.0 × 1.6 × 1.0 × 1.0 = 1.6`  
Minimum possible: `0.3 × 1.0 × 0.4 × 0.5 = 0.06`

### Step 3 — Aggregate by concept (tag)

Each Codeforces problem is tagged with one or more concept tags (e.g. `["graphs", "dfs", "trees"]`). Each tag is used as a concept proxy.

For each tag, collect all problem scores where that tag appears and compute the average:

```
concept_raw = mean(all problem scores for this tag)
```

A problem tagged with three concepts contributes its score to all three.

### Step 4 — Normalise to 0–100

```
concept_strength = min(100, concept_raw / 1.6 × 100)
```

Dividing by 1.6 (the maximum possible raw score) means a concept where every solved problem was: AC on first try, rated 2000+, and solved this week → scores exactly 100.

The result is rounded to 2 decimal places.

## Confidence multiplier (future)

The technical design includes a confidence multiplier from the user's self-rating (1–5) after solving:

```
Rating 5 → multiplier 1.1
Rating 1 → multiplier 0.7
```

This is not applied in the `ProcessSubmissions` path (where confidence ratings aren't available). It will be applied in `UpdateConfidence` in Step 8, which re-scores the specific concept after the user submits a rating.

## Decay (future)

The technical design includes passive strength decay over time (~5% per 30 days of inactivity, floor at 20). This will be a scheduled job in Step 8 that periodically re-reads Neo4j and applies the decay formula.

## Testing

Five unit tests in `apps/processor/internal/scoring/scoring_test.go` cover:

| Test | What it verifies |
|---|---|
| `TestCompute_SingleACHardRecent` | Perfect score = 100 |
| `TestCompute_WANoAC` | WA-only gives correct partial credit |
| `TestCompute_MultipleAttemptsThenAC` | Attempts penalty applied correctly |
| `TestCompute_OldSubmissionDecay` | Recency weight for >180 days = 0.4 |
| `TestCompute_PenaltyFloor` | 6+ WA before AC → floor at 0.5 |

Run with: `cd apps/processor && go test ./internal/scoring/...`
