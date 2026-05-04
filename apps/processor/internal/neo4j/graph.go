package neo4j

import (
	"context"
	"fmt"
	"time"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/cp-intelligence/processor/internal/scoring"
)

// UpsertSkillProfile writes (or updates) a user's concept strength
// relationships in Neo4j, then returns the current profile back.
func UpsertSkillProfile(
	ctx context.Context,
	driver neo4j.DriverWithContext,
	userID string,
	strengths []scoring.ConceptStrength,
) error {
	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		// Ensure User node exists
		_, err := tx.Run(ctx,
			`MERGE (u:User {id: $userId})`,
			map[string]any{"userId": userID},
		)
		if err != nil {
			return nil, fmt.Errorf("merge user: %w", err)
		}

		for _, cs := range strengths {
			_, err := tx.Run(ctx, `
				MERGE (c:Concept {id: $conceptId})
				  ON CREATE SET c.name = $conceptName

				WITH c
				MATCH (u:User {id: $userId})
				MERGE (u)-[r:HAS_SKILL]->(c)
				SET r.strength         = $strength,
				    r.last_practiced   = $lastPracticed,
				    r.decayed_strength = $strength
			`, map[string]any{
				"userId":        userID,
				"conceptId":     cs.ConceptID,
				"conceptName":   cs.ConceptName,
				"strength":      cs.Strength,
				"lastPracticed": cs.LastPracticed.Unix(),
			})
			if err != nil {
				return nil, fmt.Errorf("upsert concept %s: %w", cs.ConceptID, err)
			}
		}
		return nil, nil
	})
	return err
}

// ReadSkillProfile fetches all HAS_SKILL relationships for a user from Neo4j.
func ReadSkillProfile(
	ctx context.Context,
	driver neo4j.DriverWithContext,
	userID string,
) ([]scoring.ConceptStrength, error) {
	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		records, err := tx.Run(ctx, `
			MATCH (u:User {id: $userId})-[r:HAS_SKILL]->(c:Concept)
			RETURN c.id           AS conceptId,
			       c.name         AS conceptName,
			       r.strength     AS strength,
			       r.last_practiced AS lastPracticed
			ORDER BY r.strength DESC
		`, map[string]any{"userId": userID})
		if err != nil {
			return nil, err
		}

		var out []scoring.ConceptStrength
		for records.Next(ctx) {
			rec := records.Record()

			conceptID, _ := rec.Get("conceptId")
			conceptName, _ := rec.Get("conceptName")
			strength, _ := rec.Get("strength")
			lastPrac, _ := rec.Get("lastPracticed")

			cs := scoring.ConceptStrength{
				ConceptID:   fmt.Sprintf("%v", conceptID),
				ConceptName: fmt.Sprintf("%v", conceptName),
			}
			if s, ok := strength.(float64); ok {
				cs.Strength = s
			}
			if lp, ok := lastPrac.(int64); ok {
				cs.LastPracticed = time.Unix(lp, 0)
			}
			out = append(out, cs)
		}
		return out, records.Err()
	})
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, nil
	}
	return result.([]scoring.ConceptStrength), nil
}
