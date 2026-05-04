# Architecture

## Overview

CP Intelligence is a competitive programming skill tracker. It ingests your Codeforces submission history, builds a knowledge graph of your DSA concept strengths, and surfaces the two or three problems you most need to solve today.

The system is split into four main pieces:

```
Browser
  │
  │  HTTP (REST/JSON, cookies)
  ▼
┌─────────────────────────┐
│   Next.js Frontend      │  :3000
│   (React + TypeScript)  │
│   - Server Components   │
│   - /api/* BFF routes   │
└─────────┬───────────────┘
          │ HTTP (REST/JSON + JWT)
          │ (server-to-server, token from cookie)
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
│   Go Processor          │        │  24h TTL)    │
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
│   Anthropic Claude API  │
│   (claude-haiku-4-5,    │
│   recommendation text)  │
└─────────────────────────┘
```

## Service responsibilities

### Next.js Frontend (:3000)

Handles both UI rendering and acts as a Backend-for-Frontend (BFF) layer. See [Next.js BFF pattern](#nextjs-bff-pattern) below.

- Server Components fetch data directly on the server (no client-side fetch waterfalls)
- `/api/*` route handlers proxy requests to NestJS, managing the JWT token stored in an httpOnly cookie
- Middleware protects `/dashboard/*` and `/setup/*` — redirects unauthenticated users to `/auth`
- Client components (SyncButton, DailyRecommendations) call `/api/*` routes, never NestJS directly

### NestJS Backend (:3001)

The primary API. All authenticated requests from the frontend flow through NestJS.

- User registration and login (JWT issued as httpOnly cookie via Next.js BFF)
- Codeforces handle validation and submission sync
- Upserts problems and submissions into PostgreSQL before forwarding to Go
- Forwards raw submission data to the Go processor via gRPC
- Caches daily recommendations in Redis (TTL 24h, key: `recommendations:{userId}`)
- Reads skill profile via gRPC and exposes it to the frontend

### Go Processor (:50051)

The computation engine. Only accessible via gRPC — never directly from the browser.

- Seeds the 71-node knowledge graph into Neo4j on startup (idempotent MERGE)
- Receives raw submission batches from NestJS
- Computes per-concept skill scores and writes HAS_SKILL edges to Neo4j
- Runs the recommendation engine (weakest unlocked concept → fetch problems from PostgreSQL)
- Calls the Anthropic Claude API (haiku model) to generate human-readable recommendation reasoning

### AI Provider (external, provider-agnostic)

All AI calls go through an `AIProvider` interface in the Go service. The default implementation calls the Anthropic Claude API (`claude-haiku-4-5-20251001`, 15s timeout). Swap to any other provider by implementing the interface and setting `AI_PROVIDER` in the environment.

## Next.js BFF Pattern

The frontend never exposes the JWT to the browser. Instead it stores the token in an **httpOnly cookie** (`cp_token`), which JavaScript cannot read. All API calls from client components go through Next.js route handlers in `app/api/`, which read the cookie on the server and attach it as an `Authorization: Bearer` header before proxying to NestJS.

```
Browser (client component)
    │
    │  POST /api/sync          ← no token visible to JS
    ▼
Next.js /api/sync/route.ts    ← runs on Node.js server
    │  reads cp_token cookie
    │  attaches Authorization header
    │
    │  POST http://localhost:3001/codeforces/sync
    ▼
NestJS :3001                  ← validates JWT, processes request
```

### Cookie lifecycle

| Event | Action |
|---|---|
| Login or Register | Next.js `/api/auth/login` calls NestJS, receives JWT, sets `cp_token` cookie (httpOnly, sameSite=lax, maxAge=7d) |
| Authenticated request | `/api/*` route reads cookie, forwards as Bearer token |
| Logout | `/api/auth/logout` deletes cookie, redirects to `/auth` |

### BFF route map

| Next.js Route | Method | Proxies to NestJS |
|---|---|---|
| `/api/auth/login` | POST | `POST /auth/login` |
| `/api/auth/register` | POST | `POST /auth/register` |
| `/api/auth/logout` | POST | deletes cookie, redirects |
| `/api/sync` | POST | `POST /codeforces/sync` |
| `/api/confidence` | POST | `POST /recommendations/confidence` |
| `/api/codeforces/handle` | POST | `PUT /codeforces/handle` |

### Middleware

`middleware.ts` runs on every request before the route handler:

- `/dashboard/*`, `/setup/*` — redirect to `/auth` if `cp_token` cookie is absent
- `/auth` — redirect to `/dashboard` if `cp_token` cookie is present (already logged in)

## Data flow

### Initial sync

```
1. User links Codeforces handle
   Browser → POST /api/codeforces/handle
   Next.js BFF → PUT /codeforces/handle (NestJS)
   NestJS validates handle exists on Codeforces API

2. User triggers sync
   Browser → POST /api/sync
   Next.js BFF → POST /codeforces/sync (NestJS)
   NestJS fetches up to 10,000 submissions from Codeforces API
   NestJS runs upsertProblems() — deduplicates and persists problem metadata
   NestJS runs upsertSubmissions() — upserts raw submissions into PostgreSQL
   NestJS calls Go processor via gRPC: ProcessSubmissions
   Go computes skill scores, writes HAS_SKILL edges to Neo4j
   Go returns SkillProfile proto to NestJS
   NestJS invalidates Redis cache for this user
```

### Dashboard load

```
1. Browser requests /dashboard (server component)
2. Next.js reads cp_token cookie on the server
3. Parallel fetch: GET /skill-profile + GET /recommendations (both via NestJS)
4. NestJS checks Redis for recommendations (key: recommendations:{userId})
   Cache hit → return immediately (sub-millisecond)
   Cache miss → gRPC GetRecommendations to Go processor
     Go queries Neo4j: UnlockedWeakConcepts Cypher
     Go fetches matching problems from PostgreSQL
     Go calls Claude haiku for reasoning text
     NestJS caches response (TTL 24h)
5. Next.js renders ProgressSection, WeaknessHeatmap, DailyRecommendations
```

### Post-solve confidence rating

```
1. User rates confidence 1–5 after solving a problem
   Browser → POST /api/confidence
   Next.js BFF → POST /recommendations/confidence (NestJS)
2. NestJS updates user_problem_activity in PostgreSQL
3. NestJS calls Go: UpdateConfidence via gRPC
4. Go updates HAS_SKILL.strength in Neo4j
5. NestJS invalidates Redis recommendations cache for this user
6. Next.js calls router.refresh() — server component re-fetches fresh data
```

## Why this split

**NestJS handles auth and I/O** because TypeScript is well-suited for REST APIs, and the developer has existing expertise here.

**Go handles computation** because skill scoring and graph traversal benefit from Go's performance and concurrency model. It's also a deliberate learning opportunity.

**gRPC between them** because it's type-safe (proto contracts), efficient (binary protocol), and good practice for service-to-service communication. The proto file in `packages/proto/` is the single source of truth.

**Neo4j for the knowledge graph** because graph traversal queries ("find all unlocked weak concepts") are natural Cypher queries and would be complex JOINs in SQL.

**PostgreSQL for relational data** because users, submissions, and problem activity are naturally relational and benefit from foreign keys and indexes.

**Redis for caching** because recommendation generation involves multiple round trips (Neo4j + PostgreSQL + Claude API). Caching the result for 24h makes the dashboard load fast. The cache is invalidated on sync and on confidence updates, so data stays fresh when it matters. The app works correctly with no Redis available — all cache methods silently return null on error.

**Next.js BFF** because storing JWT in httpOnly cookies prevents XSS attacks from stealing tokens. The BFF layer is thin (proxy only) — no business logic lives there.
