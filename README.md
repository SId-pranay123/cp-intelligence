# CP Intelligence

A competitive programming skill tracker and personalised problem recommender. It analyses your Codeforces submission history, builds a knowledge-graph of your DSA concept strengths, and surfaces the two or three problems you most need to solve today.

## Architecture

```
[Next.js Frontend :3000]
        ↕ REST
[NestJS Backend :3001] ←→ [PostgreSQL]
        ↕ gRPC              [Redis]
[Go Processor :50051] ←→ [Neo4j]
        ↕
[Codeforces API]
        ↕
[AI Provider (Claude by default — swap via AI_PROVIDER)]
```

## Monorepo layout

```
cp-intelligence/
├── apps/
│   ├── web/          # Next.js 14 frontend (TypeScript)
│   ├── api/          # NestJS backend (TypeScript)
│   └── processor/    # Go data processing service (gRPC)
├── packages/
│   └── proto/        # Shared protobuf definitions
├── docker-compose.yml
└── README.md
```

## Prerequisites

- Node.js 20+
- Go 1.22+
- Docker + Docker Compose

## Running locally

### 1. Start infrastructure

```bash
docker-compose up -d
```

This starts PostgreSQL (5432), Redis (6379), and Neo4j (7474 / 7687).

### 2. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
cp apps/processor/.env.example apps/processor/.env
# Fill in your API keys
```

### 3. Install JS dependencies

```bash
npm install
```

### 4. Start services

```bash
# Terminal 1 — NestJS API
npm run dev:api

# Terminal 2 — Next.js frontend
npm run dev:web

# Terminal 3 — Go processor
cd apps/processor && go run ./cmd/processor
```

Neo4j browser UI: http://localhost:7474 (user: `neo4j`, password: `cp_password`)

## Build order

See the technical document (`cp-intelligence-technical.md`) for the full 13-step build sequence.
