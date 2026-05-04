# Step 7 — Knowledge Graph

## What was built

Seeded a 71-node DSA concept graph into Neo4j and implemented the gRPC endpoints for reading and writing skill data.

## Components

### Neo4j schema

Two node labels and two relationship types:

- `(Concept)` — 71 nodes, seeded at startup
- `(User)` — one node per registered user, created on registration
- `(Concept)-[:REQUIRES]->(Concept)` — ~93 prerequisite edges, seeded at startup
- `(User)-[:HAS_SKILL {strength, decayed_strength, last_practiced}]->(Concept)` — created/updated on sync

### Graph seeding (`apps/processor/graph/seed.go`)

`SeedGraph()` is called when the Go processor starts. It uses Cypher `MERGE` queries so it is idempotent — safe to run on every restart without duplicating data.

All 71 concept nodes and ~93 `REQUIRES` edges are defined as Go structs in this file. The groups are:

| Group | Count |
|---|---|
| Foundations | 5 |
| Sorting & Searching | 5 |
| Linear Structures | 6 |
| Trees | 10 |
| Graphs | 15 |
| DP | 8 |
| Math | 8 |
| General Techniques | 4 |
| String Algorithms | 7 |
| Advanced Structures | 3 |

### ProcessSubmissions gRPC

Receives raw submission data from NestJS, computes per-concept skill scores, and writes `HAS_SKILL` edges to Neo4j:

1. Group submissions by concept ID (using `concept_ids` from the problems table)
2. For each concept: compute strength from acceptance rate and difficulty weighting
3. `MERGE (u)-[s:HAS_SKILL]->(c) SET s.strength = ...`

Strength never decreases on reprocessing — the MERGE uses a CASE expression to keep the higher value.

**Bug fixed:** Initial implementation used `min()` in the Neo4j `SET` clause, which is an aggregation function and invalid in a `SET` context. Neo4j rejects this with a syntax error. Fixed by replacing with a CASE expression:

```cypher
SET s.strength = CASE WHEN $newStrength > s.strength THEN $newStrength ELSE s.strength END
```

### GetSkillProfile gRPC

Returns all `HAS_SKILL` edges for a user as a list of `{ concept_id, strength }` pairs. NestJS calls this on dashboard load (or reads from a cache if available).

### UpdateConfidence gRPC

Updates a single `HAS_SKILL.strength` value based on a user's confidence rating (1–5). Maps the rating to a strength delta and applies it. Also updates `last_practiced` timestamp.

## Key decisions

**Idempotent seeding:** Using MERGE instead of CREATE means the processor can restart safely without manual cleanup. This matters during development when the service restarts frequently.

**Strength never decreases on sync:** A user's historical submissions are replayed on every sync. Using MAX semantics on the HAS_SKILL strength ensures re-syncing doesn't reset progress.

**Separate `decayed_strength` field:** The raw `strength` is preserved for historical comparison. `decayed_strength` applies time decay and is the value shown in the UI. Decay is calculated at read time, not stored proactively.

## What was verified

- Neo4j browser shows 71 Concept nodes after first processor startup
- REQUIRES edges form the expected DAG (no cycles)
- ProcessSubmissions creates HAS_SKILL edges visible in Neo4j browser
- GetSkillProfile returns the correct strengths for a user who has synced
- Strength does not decrease when sync is run twice
