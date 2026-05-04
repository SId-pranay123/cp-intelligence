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
		if err := neo4jgraph.UpsertSkillProfile(ctx, s.neo4j, req.UserId, strengths); err != nil {
			// Log but don't fail the RPC — NestJS should still get the profile back
			log.Printf("ProcessSubmissions: neo4j write failed for user=%s: %v", req.UserId, err)
		}
	}

	return buildSkillProfile(req.UserId, strengths), nil
}

// GetSkillProfile reads a user's concept strengths from Neo4j.
func (s *Server) GetSkillProfile(
	ctx context.Context,
	req *pb.UserRequest,
) (*pb.SkillProfile, error) {
	log.Printf("GetSkillProfile: user=%s", req.UserId)

	if s.neo4j == nil {
		return &pb.SkillProfile{UserId: req.UserId}, nil
	}

	strengths, err := neo4jgraph.ReadSkillProfile(ctx, s.neo4j, req.UserId)
	if err != nil {
		return nil, fmt.Errorf("read skill profile: %w", err)
	}

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
		return &pb.RecommendationResponse{UserId: req.UserId}, nil
	}

	// 1. Find unlocked weak concepts from Neo4j
	weakConcepts, err := graph.UnlockedWeakConcepts(ctx, s.neo4j, req.UserId, 5)
	if err != nil {
		log.Printf("GetRecommendations: neo4j query failed for user=%s: %v", req.UserId, err)
		return &pb.RecommendationResponse{UserId: req.UserId}, nil
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
