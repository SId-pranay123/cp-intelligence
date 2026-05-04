# CP Intelligence Platform — Master Technical Document

---

## 1. System Overview

The platform consists of 4 main services that communicate with each other:

```
[Next.js Frontend]
        ↕ REST
[NestJS Backend] ←→ [PostgreSQL]
        ↕ gRPC       [Redis]
[Go Data Service] ←→ [Neo4j]
        ↕
[Codeforces API]
        ↕
[Claude API]
```

---

## 2. Services

### 2.1 NestJS Backend (Primary API)
**Responsibility:**
- User auth (JWT)
- REST API for frontend
- Codeforces OAuth + API sync trigger
- Communicates with Go service via gRPC
- Manages user data in PostgreSQL
- Caches recommendations in Redis

**Port:** 3001

---

### 2.2 Go Data Processing Service
**Responsibility:**
- Receives raw submission data from NestJS
- Processes and computes skill scores per concept
- Applies decay logic to skill scores
- Builds and updates user skill profile in Neo4j
- Runs recommendation engine (weakest unlocked concept → fetch problems)
- Exposes gRPC interface for NestJS to call

**Port:** 50051 (gRPC)

---

### 2.3 Next.js Frontend
**Responsibility:**
- User dashboard
- Knowledge graph / weakness heatmap visualization
- Daily practice plan display
- Confidence rating after solving
- Progress diff view
- Auth pages

**Port:** 3000

---

### 2.4 AI Provider (External, Provider-Agnostic)
**Responsibility:**
- Map problems to concept nodes (during graph seeding)
- Generate human-readable explanation of why a problem is recommended
- System design feedback (V2)

**Design:**
- All AI calls go through an `AIProvider` interface in the Go service
- The interface exposes two methods: `MapProblemToConcepts` and `GenerateRecommendationReason`
- The default implementation targets the Claude API (Anthropic), but any provider (OpenAI, Gemini, local LLM) can be swapped in by implementing the interface
- Provider selection is controlled via the `AI_PROVIDER` environment variable
- No business logic depends on Claude-specific constructs (no claude-sdk types leak outside the adapter layer)

---

## 3. Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | Next.js + React + TypeScript | Developer's strength |
| Primary Backend | NestJS + TypeScript | Developer's strength, structured |
| Data Processing | Go | Performance, good learning opportunity |
| Service Communication | gRPC | Efficient service-to-service, good Go practice |
| Primary DB | PostgreSQL | Relational user/activity data |
| Graph DB | Neo4j Aura | Purpose-built for knowledge graph traversal |
| Cache | Redis | Daily recommendations, sessions |
| AI | Provider-agnostic AI interface (default: Claude API) | Concept mapping, recommendation reasoning |
| External API | Codeforces API | Submission history sync |
| Frontend Deploy | Vercel | Simple Next.js deployment |
| Backend Deploy | Railway | NestJS + Go services |
| Graph DB Host | Neo4j Aura (free tier) | Managed Neo4j |

---

## 4. Data Flow

### 4.1 Initial Sync Flow
```
User connects Codeforces account
→ NestJS fetches full submission history from Codeforces API
→ NestJS stores raw submissions in PostgreSQL
→ NestJS calls Go service via gRPC with raw submission data
→ Go service processes submissions:
    - Maps problems to concept nodes
    - Computes skill score per concept
    - Applies decay to old solved problems
    - Updates user skill profile in Neo4j
→ Go service returns updated skill profile to NestJS
→ NestJS caches daily recommendations in Redis
→ Frontend fetches and displays
```

### 4.2 Daily Recommendation Flow
```
User opens platform
→ NestJS checks Redis cache for today's recommendations
→ If cache miss: NestJS calls Go service via gRPC
→ Go service queries Neo4j:
    - Find weakest unlocked concept node for user
    - Fetch problems tagged to that concept
    - Return top 2-3 problems with reasoning
→ NestJS caches result in Redis (TTL: 24hrs)
→ Frontend displays problems + reason why
```

### 4.3 Post-Solve Confidence Rating Flow
```
User solves problem → comes back → rates confidence (1-5)
→ NestJS updates UserActivity in PostgreSQL
→ NestJS calls Go service via gRPC
→ Go service updates concept node strength in Neo4j
→ Tomorrow's recommendations recalculate
```

---

## 5. Database Schemas

### 5.1 PostgreSQL Tables

**users**
```
id, email, username, codeforces_handle, created_at, updated_at
```

**codeforces_submissions**
```
id, user_id, problem_id, problem_name, problem_tags[], 
verdict, language, submitted_at, time_taken_ms, memory_used
```

**user_problem_activity**
```
id, user_id, problem_id, source, attempts, solved_at, 
time_taken_minutes, confidence_rating (1-5), created_at
```

**problems**
```
id, source (codeforces|leetcode|cses), external_id, 
title, difficulty, link, concept_ids[], created_at
```

---

### 5.2 Neo4j Graph Schema

**Nodes:**
```
(:Concept {id, name, description, difficulty_level})
(:Problem {id, source, link, difficulty})
(:User {id, username})
```

**Relationships:**
```
(:Concept)-[:REQUIRES]->(:Concept)         // dependency edges
(:Problem)-[:TESTS]->(:Concept)            // problem maps to concept
(:User)-[:HAS_SKILL {strength, last_practiced, decayed_strength}]->(:Concept)
(:User)-[:SOLVED {attempts, confidence, solved_at}]->(:Problem)
```

---

## 6. gRPC Service Definition

```protobuf
service DataProcessingService {
  rpc ProcessSubmissions(SubmissionBatch) returns (SkillProfile);
  rpc GetRecommendations(RecommendationRequest) returns (RecommendationResponse);
  rpc UpdateConfidence(ConfidenceUpdate) returns (UpdateResult);
  rpc GetSkillProfile(UserRequest) returns (SkillProfile);
}
```

---

## 7. Knowledge Graph Design

### Concept Nodes (V1 — DSA only, ~80-100 nodes)
Core categories:
- Arrays, Strings
- Sorting, Searching, Binary Search
- Linked Lists, Stacks, Queues
- Trees, Binary Trees, BST, Segment Trees, Fenwick Trees
- Graphs: BFS, DFS, Dijkstra, Bellman-Ford, Floyd-Warshall
- Graph advanced: DSU, SCC, Topological Sort, MST
- Dynamic Programming: 1D, 2D, Tree DP, Bitmask DP
- Math: Number Theory, Combinatorics, Probability
- Greedy, Backtracking, Divide and Conquer
- String algorithms: KMP, Z-algorithm, Trie

### Dependency examples:
```
Arrays → Binary Search
Arrays → Two Pointers
BFS → Dijkstra
Trees → Tree DP
DP (1D) → DP (2D)
DSU requires: Graphs basic
SCC requires: DFS
```

### Graph seeding approach:
1. Hand-curate core concept nodes and dependency edges (one time)
2. Use Claude API to map Codeforces problems to concept nodes
3. Manually verify mappings for accuracy
4. Ongoing: new problems auto-mapped by Claude, spot-checked

---

## 8. Skill Score Computation (Go Service)

### Score per concept (0-100):
```
base_score = f(attempts, verdict, difficulty)
- Solved first try, hard problem = high score
- Solved after 5 attempts, easy problem = low score

recency_weight = f(days_since_solved)
- Solved today = 1.0
- Solved 30 days ago = 0.8
- Solved 6 months ago = 0.4

confidence_multiplier = f(user_confidence_rating)
- Rating 5 = 1.1
- Rating 1 = 0.7

final_strength = base_score × recency_weight × confidence_multiplier
```

### Decay:
- Strength decays passively over time if concept not practiced
- Decay rate: ~5% per 30 days of inactivity
- Floors at 20 (never goes to zero, you don't forget everything)

---

## 9. Recommendation Engine Logic (Go Service)

```
1. Fetch user's full skill profile from Neo4j
2. Find all concept nodes where:
   - User strength < threshold (e.g. < 60)
   - All dependency concepts are sufficiently strong (> 60)
   → These are "unlocked weak" concepts
3. Sort by: lowest strength first
4. For top concept: fetch 2-3 problems from PostgreSQL tagged to it
   - Mix of difficulties (one easy, one medium, one hard)
   - Exclude already solved
5. Call Claude API to generate reason:
   "You're weak on DSU (strength: 34). This problem tests basic union-find."
6. Return to NestJS
```

---

## 10. Build Order

Build in this exact order — each step depends on the previous:

| Step | What | Service |
|------|------|---------|
| 1 | Project setup, monorepo structure | All |
| 2 | PostgreSQL schema + migrations | NestJS |
| 3 | Auth (register, login, JWT) | NestJS |
| 4 | Codeforces API sync | NestJS |
| 5 | Go service setup + gRPC connection | Go |
| 6 | Skill score computation | Go |
| 7 | Neo4j setup + seed knowledge graph | Go + Neo4j |
| 8 | Recommendation engine | Go |
| 9 | Redis caching layer | NestJS |
| 10 | Frontend — auth + dashboard | Next.js |
| 11 | Frontend — heatmap visualization | Next.js |
| 12 | Frontend — daily plan + confidence rating | Next.js |
| 13 | Frontend — progress diff | Next.js |

---

## 11. Repo Structure

```
cp-intelligence/
├── apps/
│   ├── web/              # Next.js frontend
│   ├── api/              # NestJS backend
│   └── processor/        # Go data service
├── packages/
│   └── proto/            # Shared gRPC proto definitions
├── docker-compose.yml
└── README.md
```

---

## 12. Environment Variables

**NestJS:**
```
DATABASE_URL
REDIS_URL
NEO4J_URI
CODEFORCES_API_KEY
ANTHROPIC_API_KEY
JWT_SECRET
GO_SERVICE_URL (gRPC endpoint)
```

**Go Service:**
```
NEO4J_URI
NEO4J_USERNAME
NEO4J_PASSWORD
AI_PROVIDER          # "claude" | "openai" | "gemini" (default: claude)
ANTHROPIC_API_KEY    # required when AI_PROVIDER=claude
OPENAI_API_KEY       # required when AI_PROVIDER=openai
GRPC_PORT
```

---

## 13. Out of Scope (V1)

- Leetcode integration (paid API)
- System design practice mode
- Social features
- Company targeting
- Vector DB
- Mobile app
