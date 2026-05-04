# Step 5 — gRPC Setup

## What was built

- Go gRPC code generated from the proto
- Full Go server with stub handlers for all 4 RPCs + Neo4j connection
- NestJS `ProcessorService` as a gRPC client

## Go code generation

`protoc-gen-go` and `protoc-gen-go-grpc` were installed via `go install`. The proto is compiled with:

```bash
PATH="$PATH:$(go env GOPATH)/bin" protoc \
  --proto_path=packages/proto \
  --go_out=apps/processor/gen/proto \
  --go_opt=paths=source_relative \
  --go-grpc_out=apps/processor/gen/proto \
  --go-grpc_opt=paths=source_relative \
  packages/proto/data_processing.proto
```

The generated files are committed so the Go service can build without protoc installed.

**Issue encountered:** The initial `go.mod` had `google.golang.org/grpc v1.63.2`, but the newly installed `protoc-gen-go-grpc` generated code referencing `grpc.SupportPackageIsVersion9` which didn't exist until v1.65+. Fixed by running `go get google.golang.org/grpc@latest` which upgraded to v1.80.0.

## Go service structure

```
apps/processor/
├── cmd/processor/main.go          # Entry point, graceful shutdown
├── gen/proto/                     # Generated gRPC code (committed)
│   ├── data_processing.pb.go
│   └── data_processing_grpc.pb.go
└── internal/
    ├── ai/
    │   ├── provider.go            # AIProvider interface
    │   └── claude.go              # Default implementation (stub)
    ├── neo4j/
    │   └── client.go              # Connect + VerifyConnectivity
    └── server/
        └── server.go              # 4 RPC handlers (stubs at this step)
```

## Neo4j connection

`neo4jclient.Connect` opens the driver and calls `driver.VerifyConnectivity` with a 10-second timeout. If it fails, the service logs the error but continues — the gRPC server still starts. This is intentional: in development, Neo4j might take 15-20 seconds to initialise after `docker-compose up`. A failed Neo4j connection is survivable; the service just won't be able to read or write skill profiles.

## Graceful shutdown

```go
quit := make(chan os.Signal, 1)
signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

go func() {
  <-quit
  grpcServer.GracefulStop()
}()
```

`GracefulStop` waits for in-flight RPCs to complete before shutting down. The Neo4j driver is closed via `defer`.

## NestJS ProcessorService

NestJS uses dynamic proto loading (`@grpc/proto-loader`) rather than TypeScript code generation. Reasons:
- No extra build step needed on the TypeScript side
- The proto file is loaded at runtime from `packages/proto/`
- Type safety is provided by manually-written interfaces in `ProcessorService`

The client connects in `onModuleInit` and is torn down in `onModuleDestroy`.

All four RPCs are wrapped as promise-returning methods:

```typescript
callProcessSubmissions(userId, submissions): Promise<SkillProfile>
callGetRecommendations(userId): Promise<unknown>
callUpdateConfidence(userId, problemId, rating): Promise<{success: boolean}>
callGetSkillProfile(userId): Promise<SkillProfile>
```

## End-to-end verification

Go server started, NestJS connected, then a Node.js script directly called all three testable RPCs:

```
ProcessSubmissions OK: {"concepts":[],"user_id":"test-123"}
GetRecommendations OK: {"recommendations":[],"user_id":"test-123"}
UpdateConfidence OK:   {"success":true}
```

Go server log confirmed receipt:
```
ProcessSubmissions: user=test-123 submissions=0
GetRecommendations: user=test-123
UpdateConfidence:   user=test-123 problem=1A rating=4
```

## What was verified

`go build ./...` passed. `npx tsc --noEmit` passed. All RPCs round-tripped successfully.
