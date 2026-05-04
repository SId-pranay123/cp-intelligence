# Architecture

## Overview

CP Intelligence is a competitive programming skill tracker. It ingests your Codeforces submission history, builds a knowledge graph of your DSA concept strengths, and surfaces the two or three problems you most need to solve today.

The system is split into four main pieces:

```
Browser
  │
  │  HTTP (REST/JSON)
  ▼
┌─────────────────────────┐
│   Next.js Frontend      │  :3000
│   (React + TypeScript)  │
└─────────┬───────────────┘
          │ HTTP (REST/JSON)
          ▼
┌─────────────────────────┐        ┌──────────────┐
│   NestJS Backend        │◄──────►│  PostgreSQL  │
│   (TypeScript)          │        │  (users,     │
│   :3001                 │        │  submissions,│
└─────────┬───────────────┘        │  problems,   │
          │                        │  activity)   │
          │ gRPC                   └──────────────┘
          │
          │                        ┌──────────────┐
          ▼                        │    Redis     │
┌─────────────────────────┐◄──────►│  (daily recs,│
│   Go Processor          │        │  sessions)   │
│   :50051                │        └──────────────┘
└─────────┬───────────────┘
          │
          │ Bolt
          ▼
┌─────────────────────────┐
│   Neo4j                 │
│   (knowledge graph,     │
│   skill profiles)       │
└─────────────────────────┘
          ▲
          │ HTTP (external)
┌─────────────────────────┐
│   Codeforces API        │
│   (submission history)  │
└─────────────────────────┘

┌─────────────────────────┐
│   AI Provider           │
│   (Claude by default,   │
│   provider-agnostic)    │
└─────────────────────────┘
```

## Service responsibilities

### NestJS Backend (:3001)

The primary API. All requests from the frontend go through here.

- User registration and login (JWT)
- Codeforces handle validation and submission sync
- Forwards raw submission data to the Go processor via gRPC
- Caches daily recommendations in Redis (TTL 24h)
- Reads skill profile via gRPC and exposes it to the frontend

### Go Processor (:50051)

The computation engine. Only accessible via gRPC — never directly from the browser.

- Receives raw submission batches from NestJS
- Computes per-concept skill scores
- Reads and writes the knowledge graph in Neo4j
- Runs the recommendation engine (weakest unlocked concept → fetch problems)
- Calls the AI provider to generate human-readable recommendation reasoning

### Next.js Frontend (:3000)

Purely presentational. Calls the NestJS API, renders graphs and problem lists.

### AI Provider (external, provider-agnostic)

All AI calls go through an `AIProvider` interface in the Go service. The default implementation calls the Anthropic Claude API. Swap to any other provider by implementing the interface and setting `AI_PROVIDER` in the environment.

## Data flow

### Initial sync

```
1. User links Codeforces handle → PUT /codeforces/handle
   └─ NestJS validates handle exists on Codeforces API

2. User triggers sync → POST /codeforces/sync
   └─ NestJS fetches up to 10,000 submissions from Codeforces
   └─ NestJS upserts raw submissions into PostgreSQL
   └─ NestJS calls Go processor via gRPC: ProcessSubmissions
   └─ Go computes skill scores, writes to Neo4j
   └─ Go returns SkillProfile proto to NestJS
   └─ NestJS caches daily recommendations in Redis
```

### Daily recommendation

```
1. User opens dashboard
2. NestJS checks Redis for today's recs (key: recs:{userId}:{date})
3. Cache hit → return immediately
4. Cache miss → NestJS calls Go: GetRecommendations
   └─ Go queries Neo4j: find weakest unlocked concept
   └─ Go fetches 2-3 matching problems from PostgreSQL
   └─ Go calls AI provider for recommendation reasoning
   └─ NestJS caches response, returns to frontend
```

### Post-solve confidence rating

```
1. User rates confidence 1-5 after solving a problem
2. NestJS updates user_problem_activity in PostgreSQL
3. NestJS calls Go: UpdateConfidence
4. Go updates HAS_SKILL.strength in Neo4j
5. Next day's recommendations recalculate from updated profile
```

## Why this split

**NestJS handles auth and I/O** because TypeScript is well-suited for REST APIs, and the developer has existing expertise here.

**Go handles computation** because skill scoring and graph traversal benefit from Go's performance and concurrency model. It's also a deliberate learning opportunity.

**gRPC between them** because it's type-safe (proto contracts), efficient (binary protocol), and good practice for service-to-service communication. The proto file in `packages/proto/` is the single source of truth.

**Neo4j for the knowledge graph** because graph traversal queries ("find all unlocked weak concepts") are natural Cypher queries and would be complex JOINs in SQL.

**PostgreSQL for relational data** because users, submissions, and problem activity are naturally relational and benefit from foreign keys and indexes.
