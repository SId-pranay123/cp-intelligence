# ── Stage 1: Build Go processor ──────────────────────────────────────────────
FROM golang:1.25-alpine AS go-builder

WORKDIR /build/processor

COPY apps/processor/go.mod apps/processor/go.sum ./
RUN go mod download

COPY apps/processor/ ./
COPY packages/proto/ ../proto/

RUN CGO_ENABLED=0 GOOS=linux go build -o /processor ./cmd/processor

# ── Stage 2: Build NestJS API ─────────────────────────────────────────────────
FROM node:20-alpine AS node-builder

WORKDIR /build/api

# Install all deps (including devDeps needed for nest build)
COPY apps/api/package*.json ./
RUN npm ci

COPY packages/ /build/packages/
COPY apps/api/ ./

RUN npm run build

# Production node_modules (no devDeps)
RUN npm ci --omit=dev

# ── Stage 3: Final image ──────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Go binary
COPY --from=go-builder /processor ./processor

# NestJS compiled output and production node_modules
COPY --from=node-builder /build/api/dist ./apps/api/dist
COPY --from=node-builder /build/api/node_modules ./apps/api/node_modules
COPY --from=node-builder /build/api/package.json ./apps/api/package.json

# Proto file (loaded at runtime by NestJS gRPC client)
COPY packages/proto/ ./packages/proto/

# Generated Prisma client (needed at runtime)
COPY --from=node-builder /build/api/generated/ ./apps/api/generated/

# Prisma schema, migrations, seed, and config (needed for migrate deploy + db seed)
COPY --from=node-builder /build/api/prisma/ ./apps/api/prisma/
COPY --from=node-builder /build/api/prisma.config.ts ./apps/api/prisma.config.ts

# Install prisma CLI + tsx for runtime migrations and seed (not in prod node_modules)
RUN cd apps/api && npm install --no-save prisma tsx

COPY start.sh ./
RUN chmod +x start.sh processor

EXPOSE 3001

ENTRYPOINT ["./start.sh"]
