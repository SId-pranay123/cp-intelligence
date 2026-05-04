package main

import (
	"context"
	"log"
	"net"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"google.golang.org/grpc"

	pb "github.com/cp-intelligence/processor/gen/proto"
	"github.com/cp-intelligence/processor/internal/ai"
	"github.com/cp-intelligence/processor/internal/graph"
	neo4jclient "github.com/cp-intelligence/processor/internal/neo4j"
	"github.com/cp-intelligence/processor/internal/postgres"
	"github.com/cp-intelligence/processor/internal/server"
)

func main() {
	// ── Config from env ──────────────────────────────────────────────────────
	grpcPort     := envOr("GRPC_PORT", "50051")
	neo4jURI    := envOr("NEO4J_URI", "bolt://localhost:7687")
	neo4jUser   := envOr("NEO4J_USERNAME", "neo4j")
	neo4jPass   := envOr("NEO4J_PASSWORD", "cp_password")
	postgresURL  := envOr("POSTGRES_URL", "")
	aiProvider   := envOr("AI_PROVIDER", "claude")
	anthropicKey := envOr("ANTHROPIC_API_KEY", "")

	// ── Neo4j ────────────────────────────────────────────────────────────────
	driver, err := neo4jclient.Connect(neo4jURI, neo4jUser, neo4jPass)
	if err != nil {
		log.Printf("neo4j: connection failed — %v (continuing without graph DB)", err)
	}
	if driver != nil {
		defer func() {
			if closeErr := driver.Close(context.Background()); closeErr != nil {
				log.Printf("neo4j: error closing driver: %v", closeErr)
			}
		}()

		seedCtx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
		if seedErr := graph.SeedGraph(seedCtx, driver); seedErr != nil {
			log.Printf("graph seed: failed — %v", seedErr)
		}
		cancel()
	}

	// ── PostgreSQL ───────────────────────────────────────────────────────────
	var pgPool *pgxpool.Pool
	if postgresURL != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		pgPool, err = postgres.Connect(ctx, postgresURL)
		cancel()
		if err != nil {
			log.Printf("postgres: connection failed — %v (recommendations will use fallback data)", err)
			pgPool = nil
		} else {
			log.Printf("postgres: connected successfully")
			defer pgPool.Close()
		}
	} else {
		log.Printf("postgres: POSTGRES_URL not set — recommendations will use fallback data")
	}

	// ── AI Provider ──────────────────────────────────────────────────────────
	var aiSvc ai.Provider
	switch aiProvider {
	case "claude":
		if anthropicKey != "" {
			aiSvc = ai.NewClaudeProvider(anthropicKey)
			log.Printf("ai: using Claude provider")
		} else {
			log.Printf("ai: ANTHROPIC_API_KEY not set — using template reasons")
		}
	default:
		log.Printf("ai: unknown provider %q — using template reasons", aiProvider)
	}

	// ── gRPC server ──────────────────────────────────────────────────────────
	lis, err := net.Listen("tcp", ":"+grpcPort)
	if err != nil {
		log.Fatalf("failed to listen on :%s: %v", grpcPort, err)
	}

	grpcServer := grpc.NewServer()
	pb.RegisterDataProcessingServiceServer(grpcServer, server.New(driver, pgPool, aiSvc))

	log.Printf("processor: gRPC server listening on :%s", grpcPort)

	// ── Graceful shutdown ────────────────────────────────────────────────────
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-quit
		log.Println("processor: shutting down gracefully...")
		grpcServer.GracefulStop()
	}()

	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("gRPC server error: %v", err)
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
