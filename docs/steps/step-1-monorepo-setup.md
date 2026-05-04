# Step 1 — Monorepo Setup

## What was built

A monorepo skeleton using npm workspaces with three apps and one shared package, plus Docker infrastructure for all external services.

## Folder structure

```
cp-intelligence/
├── apps/
│   ├── web/              # Next.js 14 (TypeScript) — port 3000
│   ├── api/              # NestJS (TypeScript) — port 3001
│   └── processor/        # Go gRPC service — port 50051
├── packages/
│   └── proto/            # Shared protobuf definitions
├── docker-compose.yml
├── package.json          # npm workspaces root
├── .gitignore
└── README.md
```

### `apps/web`
- `package.json`, `tsconfig.json`
- Minimal Next.js App Router scaffold (`src/app/page.tsx`, `layout.tsx`)

### `apps/api`
- `package.json`, `tsconfig.json`, `nest-cli.json`
- Minimal NestJS bootstrap (`src/main.ts`, `src/app.module.ts`)

### `apps/processor`
- `go.mod` with gRPC, protobuf, and Neo4j driver declared
- Minimal gRPC server (`cmd/processor/main.go`)
- Provider-agnostic AI interface (`internal/ai/provider.go` + `internal/ai/claude.go`)

### `packages/proto`
- `data_processing.proto` — all four RPCs and their message types
- `package.json` (makes it a workspace package, even though Go consumes the file directly)

## Docker Compose services

| Service | Image | Ports | Purpose |
|---|---|---|---|
| `postgres` | postgres:16-alpine | 5432 | User data, submissions, activity |
| `redis` | redis:7-alpine | 6379 | Daily recommendation cache |
| `neo4j` | neo4j:5-community | 7474, 7687 | Knowledge graph, skill profiles |

All services use named Docker volumes so data survives container restarts.

## Why npm workspaces (not Turborepo / nx)

For a two-JS-app setup, npm workspaces provides everything needed without the overhead of a dedicated monorepo tool. The Go service is not managed by npm at all — it's built and run separately. A more complex repo with shared TypeScript packages might warrant Turborepo.

## Provider-agnostic AI decision

The original technical design specified the Claude API directly. Before starting code, the technical doc was updated to describe a provider-agnostic `AIProvider` interface in the Go service. This means:
- All AI calls go through `internal/ai/Provider` (interface)
- `internal/ai/ClaudeProvider` is the default implementation
- Swapping to OpenAI = implement the interface, set `AI_PROVIDER=openai`
- No business logic touches Claude-specific types

## What was verified

The directory structure was created and the tree confirmed with `find`. No services were started at this stage.
