package server

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"

	pb "github.com/cp-intelligence/processor/gen/proto"
	"github.com/cp-intelligence/processor/internal/ai"
	"github.com/cp-intelligence/processor/internal/graph"
	neo4jgraph "github.com/cp-intelligence/processor/internal/neo4j"
	"github.com/cp-intelligence/processor/internal/postgres"
	"github.com/cp-intelligence/processor/internal/scoring"
)

// Server implements the DataProcessingServiceServer interface.
type Server struct {
	pb.UnimplementedDataProcessingServiceServer
	neo4j neo4j.DriverWithContext
	pg    *pgxpool.Pool
	ai    ai.Provider
}

func New(driver neo4j.DriverWithContext, pg *pgxpool.Pool, aiProvider ai.Provider) *Server {
	return &Server{neo4j: driver, pg: pg, ai: aiProvider}
}

// ProcessSubmissions scores a user's submission batch and persists
// the resulting concept strengths to Neo4j.
func (s *Server) ProcessSubmissions(
	ctx context.Context,
	req *pb.SubmissionBatch,
) (*pb.SkillProfile, error) {
	log.Printf("ProcessSubmissions: user=%s submissions=%d", req.UserId, len(req.Submissions))

	strengths := scoring.Compute(req.Submissions)
	log.Printf("ProcessSubmissions: computed %d concept strengths for user=%s", len(strengths), req.UserId)

	if s.neo4j != nil {
		// Use a detached context so Neo4j write survives client-side cancellation
		// (NestJS has a gRPC timeout that may fire before the write completes).
		writeCtx, writeCancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer writeCancel()
		if err := neo4jgraph.UpsertSkillProfile(writeCtx, s.neo4j, req.UserId, strengths); err != nil {
			log.Printf("ProcessSubmissions: neo4j write failed for user=%s: %v", req.UserId, err)
		}
	}

	return buildSkillProfile(req.UserId, strengths), nil
}

// GetSkillProfile reads a user's concept strengths from Neo4j.
// Falls back to recomputing from Postgres submissions when Neo4j is unavailable
// or has no data for this user yet.
func (s *Server) GetSkillProfile(
	ctx context.Context,
	req *pb.UserRequest,
) (*pb.SkillProfile, error) {
	log.Printf("GetSkillProfile: user=%s", req.UserId)

	if s.neo4j != nil {
		strengths, err := neo4jgraph.ReadSkillProfile(ctx, s.neo4j, req.UserId)
		if err != nil {
			log.Printf("GetSkillProfile: neo4j read failed for user=%s: %v", req.UserId, err)
		} else if len(strengths) > 0 {
			return buildSkillProfile(req.UserId, strengths), nil
		}
	}

	// Postgres fallback: recompute strengths from raw submissions.
	subs, err := postgres.FetchUserSubmissions(ctx, s.pg, req.UserId)
	if err != nil {
		log.Printf("GetSkillProfile: postgres fetch failed for user=%s: %v", req.UserId, err)
		return &pb.SkillProfile{UserId: req.UserId}, nil
	}
	if len(subs) == 0 {
		return &pb.SkillProfile{UserId: req.UserId}, nil
	}
	log.Printf("GetSkillProfile: computing from %d postgres submissions for user=%s", len(subs), req.UserId)
	strengths := scoring.Compute(subs)
	return buildSkillProfile(req.UserId, strengths), nil
}

// GetRecommendations returns up to 5 problem recommendations for a user
// based on their weakest unlocked concepts (strength<60, all prereqs met).
func (s *Server) GetRecommendations(
	ctx context.Context,
	req *pb.RecommendationRequest,
) (*pb.RecommendationResponse, error) {
	log.Printf("GetRecommendations: user=%s", req.UserId)

	if s.neo4j == nil {
		return s.recommendationsFromPostgres(ctx, req.UserId)
	}

	// 1. Find unlocked weak concepts from Neo4j
	weakConcepts, err := graph.UnlockedWeakConcepts(ctx, s.neo4j, req.UserId, 5)
	if err != nil {
		log.Printf("GetRecommendations: neo4j query failed for user=%s: %v", req.UserId, err)
		return s.recommendationsFromPostgres(ctx, req.UserId)
	}
	if len(weakConcepts) == 0 {
		return s.recommendationsFromPostgres(ctx, req.UserId)
	}

	log.Printf("GetRecommendations: found %d weak concepts for user=%s", len(weakConcepts), req.UserId)
	for i, wc := range weakConcepts {
		log.Printf("GetRecommendations: weak[%d] concept=%s strength=%.1f cfTags=%v", i, wc.ConceptID, wc.Strength, wc.CFTags)
	}

	type result struct {
		rec   *pb.Recommendation
		index int
	}

	resultsCh := make(chan result, len(weakConcepts))
	var wg sync.WaitGroup

	for i, concept := range weakConcepts {
		wg.Add(1)
		go func(idx int, c graph.WeakConcept) {
			defer wg.Done()

			problems, pgErr := postgres.UnsolvedByConceptIDs(ctx, s.pg, req.UserId, c.CFTags, 1)
			if pgErr != nil {
				log.Printf("GetRecommendations: pg query failed concept=%s: %v", c.ConceptID, pgErr)
			}
			if len(problems) == 0 {
				return
			}
			p := problems[0]

			reason := fmt.Sprintf("Practise %s to strengthen your %.0f%% skill in %s.",
				p.ProblemName, c.Strength, c.ConceptName)
			if s.ai != nil {
				resp, aiErr := s.ai.GenerateRecommendationReason(ctx, ai.ReasonRequest{
					ConceptName:     c.ConceptName,
					ConceptStrength: c.Strength,
					ProblemTitle:    p.ProblemName,
				})
				if aiErr == nil && resp.Reason != "" {
					reason = resp.Reason
				}
			}

			resultsCh <- result{
				index: idx,
				rec: &pb.Recommendation{
					Problem: &pb.Problem{
						Id:         p.ProblemID,
						Title:      p.ProblemName,
						Link:       p.Link,
						Difficulty: p.Difficulty,
						Source:     "codeforces",
					},
					ConceptName: c.ConceptName,
					Reason:      reason,
				},
			}
		}(i, concept)
	}

	wg.Wait()
	close(resultsCh)

	ordered := make([]*pb.Recommendation, len(weakConcepts))
	for r := range resultsCh {
		ordered[r.index] = r.rec
	}
	var recs []*pb.Recommendation
	for _, r := range ordered {
		if r != nil {
			recs = append(recs, r)
		}
	}

	log.Printf("GetRecommendations: returning %d recommendations for user=%s", len(recs), req.UserId)
	return &pb.RecommendationResponse{UserId: req.UserId, Recommendations: recs}, nil
}

// UpdateConfidence adjusts a concept's HAS_SKILL strength based on a
// self-reported confidence rating (1–5).
//
// Multipliers: 5→×1.10  4→×1.05  3→×1.00  2→×0.85  1→×0.70
func (s *Server) UpdateConfidence(
	ctx context.Context,
	req *pb.ConfidenceUpdate,
) (*pb.UpdateResult, error) {
	log.Printf("UpdateConfidence: user=%s concept=%s rating=%d",
		req.UserId, req.ConceptId, req.Rating)

	if s.neo4j == nil {
		return &pb.UpdateResult{Success: true}, nil
	}

	multiplier := confidenceMultiplier(req.Rating)
	if err := graph.UpdateConceptStrength(ctx, s.neo4j, req.UserId, req.ConceptId, multiplier); err != nil {
		log.Printf("UpdateConfidence: neo4j update failed user=%s concept=%s: %v",
			req.UserId, req.ConceptId, err)
		return &pb.UpdateResult{Success: false}, nil
	}

	return &pb.UpdateResult{Success: true}, nil
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func confidenceMultiplier(rating int32) float64 {
	switch rating {
	case 5:
		return 1.10
	case 4:
		return 1.05
	case 2:
		return 0.85
	case 1:
		return 0.70
	default: // 3 or unexpected
		return 1.00
	}
}


// recommendationsFromPostgres generates recommendations without Neo4j by
// recomputing strengths from Postgres submissions and picking the weakest concepts.
func (s *Server) recommendationsFromPostgres(ctx context.Context, userID string) (*pb.RecommendationResponse, error) {
	log.Printf("GetRecommendations: falling back to postgres for user=%s", userID)

	// Use a detached context so DB + AI work survives client-side gRPC deadline.
	ctx, cancel := context.WithTimeout(context.Background(), 18*time.Second)
	defer cancel()

	subs, err := postgres.FetchUserSubmissions(ctx, s.pg, userID)
	if err != nil || len(subs) == 0 {
		return &pb.RecommendationResponse{UserId: userID}, nil
	}

	strengths := scoring.Compute(subs)

	// Sort ascending by strength, pick top 5 weak concepts (strength < 60).
	weakConcepts := make([]graph.WeakConcept, 0, 5)
	for _, cs := range strengths {
		if cs.Strength < 60 {
			weakConcepts = append(weakConcepts, graph.WeakConcept{
				ConceptID:   cs.ConceptID,
				ConceptName: cs.ConceptName,
				Strength:    cs.Strength,
				CFTags:      []string{cs.ConceptID}, // concept_ids column stores concept IDs, not CF tags
			})
		}
	}
	// Simple insertion sort by strength ascending (slice is small)
	for i := 1; i < len(weakConcepts); i++ {
		key := weakConcepts[i]
		j := i - 1
		for j >= 0 && weakConcepts[j].Strength > key.Strength {
			weakConcepts[j+1] = weakConcepts[j]
			j--
		}
		weakConcepts[j+1] = key
	}
	if len(weakConcepts) > 5 {
		weakConcepts = weakConcepts[:5]
	}

	type result struct {
		rec   *pb.Recommendation
		index int
	}
	resultsCh := make(chan result, len(weakConcepts))
	var wg sync.WaitGroup

	for i, concept := range weakConcepts {
		wg.Add(1)
		go func(idx int, c graph.WeakConcept) {
			defer wg.Done()

			problems, pgErr := postgres.UnsolvedByConceptIDs(ctx, s.pg, userID, c.CFTags, 1)
			if pgErr != nil || len(problems) == 0 {
				return
			}
			p := problems[0]

			reason := fmt.Sprintf("Practise %s to strengthen your %.0f%% skill in %s.",
				p.ProblemName, c.Strength, c.ConceptName)
			if s.ai != nil {
				resp, aiErr := s.ai.GenerateRecommendationReason(ctx, ai.ReasonRequest{
					ConceptName:     c.ConceptName,
					ConceptStrength: c.Strength,
					ProblemTitle:    p.ProblemName,
				})
				if aiErr == nil && resp.Reason != "" {
					reason = resp.Reason
				}
			}

			resultsCh <- result{
				index: idx,
				rec: &pb.Recommendation{
					Problem: &pb.Problem{
						Id:         p.ProblemID,
						Title:      p.ProblemName,
						Link:       p.Link,
						Difficulty: p.Difficulty,
						Source:     "codeforces",
					},
					ConceptName: c.ConceptName,
					Reason:      reason,
				},
			}
		}(i, concept)
	}

	wg.Wait()
	close(resultsCh)

	ordered := make([]*pb.Recommendation, len(weakConcepts))
	for r := range resultsCh {
		ordered[r.index] = r.rec
	}
	var recs []*pb.Recommendation
	for _, r := range ordered {
		if r != nil {
			recs = append(recs, r)
		}
	}

	log.Printf("GetRecommendations: postgres fallback returning %d recommendations for user=%s", len(recs), userID)
	return &pb.RecommendationResponse{UserId: userID, Recommendations: recs}, nil
}

func buildSkillProfile(userID string, strengths []scoring.ConceptStrength) *pb.SkillProfile {
	concepts := make([]*pb.ConceptStrength, 0, len(strengths))
	for _, cs := range strengths {
		var lp int64
		if !cs.LastPracticed.IsZero() {
			lp = cs.LastPracticed.Unix()
		} else {
			lp = time.Now().Unix()
		}
		concepts = append(concepts, &pb.ConceptStrength{
			ConceptId:     cs.ConceptID,
			ConceptName:   cs.ConceptName,
			Strength:      cs.Strength,
			LastPracticed: lp,
		})
	}
	return &pb.SkillProfile{UserId: userID, Concepts: concepts}
}
