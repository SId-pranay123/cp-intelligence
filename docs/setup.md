# Local Setup

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20+ | https://nodejs.org |
| Go | 1.22+ | https://go.dev |
| Docker + Docker Compose | any recent | https://docker.com |
| protoc | 3.x | `brew install protobuf` (mac) |
| protoc-gen-go | latest | `go install google.golang.org/protobuf/cmd/protoc-gen-go@latest` |
| protoc-gen-go-grpc | latest | `go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest` |

`protoc` and the Go plugins are only needed if you modify the proto file. The generated Go files are committed.

## 1. Start infrastructure

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** on `localhost:5432` (user: `cp_user`, password: `cp_password`, db: `cp_intelligence`)
- **Redis** on `localhost:6379`
- **Neo4j** on `localhost:7687` (bolt) and `localhost:7474` (browser UI)
  - Neo4j credentials: `neo4j` / `cp_password`

Wait ~10 seconds for Neo4j to fully initialise before starting the Go service.

## 2. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
cp apps/processor/.env.example apps/processor/.env
```

Edit `apps/api/.env`:
- Set `JWT_SECRET` to any long random string
- Set `CODEFORCES_API_KEY` if you have one (the public API works without it for most calls)

Edit `apps/processor/.env`:
- `AI_PROVIDER=claude` and set `ANTHROPIC_API_KEY` to your Anthropic key
- Or set `AI_PROVIDER=openai` and `OPENAI_API_KEY`

## 3. Install Node dependencies

From the repo root:

```bash
npm install
```

This installs dependencies for both `apps/api` and `apps/web` via npm workspaces.

## 4. Run database migrations

```bash
cd apps/api
npx prisma migrate deploy
npx prisma generate
```

This applies all SQL migrations to the local PostgreSQL instance and generates the TypeScript client.

## 5. Start the Go processor

```bash
cd apps/processor
go run ./cmd/processor
```

Expected output:
```
neo4j: connected successfully
processor: gRPC server listening on :50051
```

## 6. Start the NestJS API

```bash
cd apps/api
npm run start:dev
```

Expected output includes:
```
[ProcessorService] gRPC client connected → localhost:50051
[NestApplication] Nest application successfully started
```

## 7. Start the frontend

```bash
cd apps/web
npm run dev
```

Frontend available at http://localhost:3000.

## Running all services at once

Use three terminal tabs/panes:

```bash
# Tab 1 — Go processor
cd apps/processor && go run ./cmd/processor

# Tab 2 — NestJS API
cd apps/api && npm run start:dev

# Tab 3 — Next.js frontend
cd apps/web && npm run dev
```

## Verifying the setup

### Register a user
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","username":"yourhandle","password":"yourpassword"}'
```

### Link Codeforces handle
```bash
TOKEN="<accessToken from above>"
curl -X PUT http://localhost:3001/codeforces/handle \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"handle":"your_cf_handle"}'
```

### Sync submissions
```bash
curl -X POST http://localhost:3001/codeforces/sync \
  -H "Authorization: Bearer $TOKEN"
# Returns: {"synced": N}
```

### Neo4j browser

Open http://localhost:7474, login with `neo4j` / `cp_password`, and run:
```cypher
MATCH (u:User)-[r:HAS_SKILL]->(c:Concept)
RETURN u, r, c LIMIT 50
```

## Regenerating proto code

If you change `packages/proto/data_processing.proto`:

```bash
cd /path/to/repo
PATH="$PATH:$(go env GOPATH)/bin" protoc \
  --proto_path=packages/proto \
  --go_out=apps/processor/gen/proto \
  --go_opt=paths=source_relative \
  --go-grpc_out=apps/processor/gen/proto \
  --go-grpc_opt=paths=source_relative \
  packages/proto/data_processing.proto
```

Commit the generated `gen/proto/*.go` files.

## Common issues

**Neo4j fails to connect:** Wait 15-20 seconds after `docker-compose up` before starting the Go processor. Neo4j takes longer to initialise than Postgres or Redis.

**`prisma migrate dev` hangs:** It requires an interactive terminal. Run it in a real terminal tab (not piped). Type `y` when prompted.

**Port conflicts:** If anything is already on 3000, 3001, 5432, 6379, or 7687, stop the conflicting process or edit `docker-compose.yml` to use different host ports.

**Go processor can't find neo4j package:** Run `go mod tidy` inside `apps/processor/`.
