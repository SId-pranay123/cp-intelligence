# Step 6 — Skill Scoring

## What was built

Real scoring logic in `ProcessSubmissions`, Neo4j read/write for skill profiles, and five unit tests verifying each formula component.

## Proto change

`problem_rating int32` was added as field 9 to the `Submission` message. The proto was regenerated. This field carries the Codeforces difficulty rating (0 = unknown), which drives the difficulty multiplier in the scoring formula. The NestJS side will pass this value when `ProcessSubmissions` is wired in Step 9.

## New files

```
apps/processor/internal/
├── scoring/
│   ├── scoring.go        # Pure computation — no I/O
│   └── scoring_test.go   # 5 unit tests
└── neo4j/
    └── graph.go          # UpsertSkillProfile, ReadSkillProfile
```

`internal/server/server.go` was updated to call scoring and graph functions.

## Scoring algorithm

See `docs/skill-scoring.md` for the full explanation. Summary:

1. Group submissions by `problem_id`
2. Sort each group chronologically
3. Per problem: `score = base × difficulty × recency × attempts_penalty`
4. Per concept (tag): `strength = mean(problem scores) / 1.6 × 100`

The algorithm is a pure function: `Compute(submissions []*pb.Submission) []ConceptStrength`. It has no side effects and is straightforward to test.

## Neo4j writes

`UpsertSkillProfile` runs in a single write transaction. For each concept:

```cypher
MERGE (c:Concept {id: $conceptId})
  ON CREATE SET c.name = $conceptName
WITH c
MATCH (u:User {id: $userId})
MERGE (u)-[r:HAS_SKILL]->(c)
SET r.strength         = $strength,
    r.last_practiced   = $lastPracticed,
    r.decayed_strength = $strength
```

`MERGE` on both nodes and relationships means this is safe to call multiple times — it's idempotent.

**Note on concept nodes:** At this stage, concept IDs are raw Codeforces tag strings (e.g. `"graphs"`, `"dp"`, `"binary search"`). In Step 7, the proper concept graph will be seeded with hand-curated nodes and dependency edges. At that point, the tag-to-concept mapping will be replaced with a proper AI-driven lookup.

## Neo4j reads

`ReadSkillProfile` runs in a read transaction:

```cypher
MATCH (u:User {id: $userId})-[r:HAS_SKILL]->(c:Concept)
RETURN c.id, c.name, r.strength, r.last_practiced
ORDER BY r.strength DESC
```

Results are converted back to `[]ConceptStrength` and then serialised into the `SkillProfile` proto response.

## ProcessSubmissions behaviour

If Neo4j is unavailable, the RPC still succeeds — it logs the write error and returns the computed profile. The profile was already computed in-memory, so the caller (NestJS) still gets useful data even if the graph write fails. This is the right tradeoff: a Neo4j hiccup shouldn't break a sync that took 15 seconds to fetch from Codeforces.

## Unit test results

```
=== RUN   TestCompute_SingleACHardRecent   --- PASS (strength = 100.00)
=== RUN   TestCompute_WANoAC               --- PASS (strength = 24.38)
=== RUN   TestCompute_MultipleAttemptsThenAC --- PASS (strength = 43.75)
=== RUN   TestCompute_OldSubmissionDecay   --- PASS (strength = 25.00)
=== RUN   TestCompute_PenaltyFloor         --- PASS (strength = 40.63)
PASS
ok  github.com/cp-intelligence/processor/internal/scoring  0.767s
```

Run with: `cd apps/processor && go test ./internal/scoring/... -v`

## How to test the full flow manually

Start Neo4j and the Go processor, then call `ProcessSubmissions` via grpcurl or the Node.js test script from Step 5 with real submission data. After the call, check Neo4j:

```cypher
MATCH (u:User {id: "your-user-id"})-[r:HAS_SKILL]->(c:Concept)
RETURN c.name, r.strength ORDER BY r.strength DESC
```

You should see concept nodes for each distinct Codeforces tag in the user's history, with strengths between 0 and 100.

## What was verified

`go build ./...` passed. All 5 unit tests pass. `npx tsc --noEmit` on the NestJS side still passes (no NestJS changes in this step).
