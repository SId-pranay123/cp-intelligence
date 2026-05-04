# gRPC Services

## Overview

The NestJS backend and Go processor communicate exclusively via gRPC. The proto file at `packages/proto/data_processing.proto` is the single source of truth — both services derive their types from it.

## Proto file

```protobuf
service DataProcessingService {
  rpc ProcessSubmissions(SubmissionBatch)       returns (SkillProfile);
  rpc GetRecommendations(RecommendationRequest) returns (RecommendationResponse);
  rpc UpdateConfidence(ConfidenceUpdate)         returns (UpdateResult);
  rpc GetSkillProfile(UserRequest)              returns (SkillProfile);
}
```

## Message types

### Submission

The unit of input for `ProcessSubmissions`. Maps 1:1 to a Codeforces submission.

| Field | Type | Notes |
|---|---|---|
| `problem_id` | string | e.g. `1234A`, `gym-123B` |
| `problem_name` | string | display name |
| `tags` | repeated string | Codeforces problem tags (used as concept proxies) |
| `verdict` | string | `OK` for AC, `WRONG_ANSWER`, `TLE`, etc. |
| `language` | string | e.g. `GNU C++17` |
| `submitted_at` | int64 | Unix timestamp |
| `time_taken_ms` | int32 | execution time |
| `memory_used` | int32 | memory in KB |
| `problem_rating` | int32 | Codeforces difficulty rating (0 = unknown) |

### SkillProfile

Returned by `ProcessSubmissions` and `GetSkillProfile`.

```
SkillProfile {
  user_id: string
  concepts: ConceptStrength[]
}

ConceptStrength {
  concept_id:      string   // e.g. "graphs", "dp", "binary search"
  concept_name:    string
  strength:        double   // 0–100
  last_practiced:  int64    // Unix timestamp
}
```

### RecommendationResponse

Returned by `GetRecommendations`.

```
RecommendationResponse {
  user_id: string
  recommendations: Recommendation[]
}

Recommendation {
  problem:       Problem
  concept_name:  string   // why this problem was recommended
  reason:        string   // AI-generated human-readable explanation
}
```

## RPC descriptions

### ProcessSubmissions

**Caller:** NestJS after a Codeforces sync  
**Input:** Full submission history for one user  
**Output:** Updated skill profile

The Go service computes concept strengths from the submission batch (see `docs/skill-scoring.md`), writes them to Neo4j, and returns the updated profile. NestJS uses the returned profile to warm the Redis cache.

### GetRecommendations

**Caller:** NestJS on cache miss for daily recommendations  
**Input:** User ID  
**Output:** 2-3 recommended problems with reasoning

The Go service queries Neo4j to find the weakest unlocked concept, fetches matching problems from PostgreSQL, and calls the AI provider to generate reasons. *(Implemented in Step 8.)*

### UpdateConfidence

**Caller:** NestJS when user submits a confidence rating (1-5)  
**Input:** User ID, problem ID, rating  
**Output:** Success boolean

Updates the `HAS_SKILL` relationship strength in Neo4j, which affects tomorrow's recommendations. *(Full logic in Step 8.)*

### GetSkillProfile

**Caller:** NestJS when frontend requests the heatmap data  
**Input:** User ID  
**Output:** All concept strengths for the user from Neo4j

## Code generation

Go code is generated from the proto using:

```bash
protoc \
  --proto_path=packages/proto \
  --go_out=apps/processor/gen/proto \
  --go_opt=paths=source_relative \
  --go-grpc_out=apps/processor/gen/proto \
  --go-grpc_opt=paths=source_relative \
  packages/proto/data_processing.proto
```

This produces two files in `apps/processor/gen/proto/`:
- `data_processing.pb.go` — message types
- `data_processing_grpc.pb.go` — service interface + client/server stubs

The generated files are committed to the repo so the Go service can build without protoc installed.

## NestJS client

NestJS uses `@grpc/proto-loader` to dynamically load the proto at startup — no code generation needed on the NestJS side. The `ProcessorService` wraps all four RPCs as promise-returning methods:

```typescript
// Usage in any NestJS service (inject ProcessorService):
const profile = await this.processor.callProcessSubmissions(userId, submissions);
const recs    = await this.processor.callGetRecommendations(userId);
```

Connection is established in `onModuleInit`. The `GO_SERVICE_URL` env var controls the address (default: `localhost:50051`). The client uses insecure credentials — TLS is terminated at the infrastructure layer in production.

## Adding the `problem_rating` field

When the proto `Submission` message was first written, `problem_rating` was missing. It was added in Step 6 when the skill scoring algorithm was implemented, because difficulty is a core input to the score formula. Any future proto changes follow the same pattern: add a field with the next available number, regenerate Go code, update the NestJS mapping in `CodeforcesService.callProcessSubmissions`.
