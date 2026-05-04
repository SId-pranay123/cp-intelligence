package graph

import (
	"context"
	"fmt"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

// WeakConcept is a concept the user should practise next.
type WeakConcept struct {
	ConceptID   string
	ConceptName string
	Strength    float64
	CFTags      []string // Codeforces tag strings that map to this concept
}

// UnlockedWeakConcepts returns concepts where:
//   - The user's strength < 60 (or no HAS_SKILL yet), AND
//   - Every prerequisite (REQUIRES edge) has been met (strength ≥ 60) or the
//     concept has no prerequisites.
//
// Results are ordered by ascending strength so the weakest unlocked concept
// comes first. At most `limit` rows are returned.
func UnlockedWeakConcepts(
	ctx context.Context,
	driver neo4j.DriverWithContext,
	userID string,
	limit int,
) ([]WeakConcept, error) {
	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		cypher := `
MATCH (c:Concept)
// Current strength for this user (0 if no edge yet)
OPTIONAL MATCH (u:User {id: $userId})-[r:HAS_SKILL]->(c)
WITH c, coalesce(r.strength, 0) AS strength

// Only consider weak concepts
WHERE strength < 60

// Check all prerequisites are met
OPTIONAL MATCH (c)<-[:REQUIRES]-(prereq:Concept)
OPTIONAL MATCH (u2:User {id: $userId})-[rp:HAS_SKILL]->(prereq)
WITH c, strength,
     collect(prereq) AS prereqs,
     collect(coalesce(rp.strength, 0)) AS prereqStrengths

// Concept is unlocked if it has no prerequisites OR all prereqs are ≥ 60
WHERE size(prereqs) = 0
   OR all(s IN prereqStrengths WHERE s >= 60)

// Fetch CF tags stored on the concept node
RETURN c.id AS conceptId,
       c.name AS conceptName,
       strength,
       coalesce(c.cfTags, []) AS cfTags
ORDER BY strength ASC
LIMIT $limit
`
		records, err := tx.Run(ctx, cypher, map[string]any{
			"userId": userID,
			"limit":  limit,
		})
		if err != nil {
			return nil, fmt.Errorf("run cypher: %w", err)
		}

		var concepts []WeakConcept
		for records.Next(ctx) {
			r := records.Record()
			id, _ := r.Get("conceptId")
			name, _ := r.Get("conceptName")
			strength, _ := r.Get("strength")
			cfTagsRaw, _ := r.Get("cfTags")

			var cfTags []string
			if arr, ok := cfTagsRaw.([]any); ok {
				for _, v := range arr {
					if s, ok := v.(string); ok {
						cfTags = append(cfTags, s)
					}
				}
			}

			// Fall back to concept ID as CF tag if none stored
			if len(cfTags) == 0 {
				cfTags = []string{fmt.Sprint(id)}
			}

			concepts = append(concepts, WeakConcept{
				ConceptID:   fmt.Sprint(id),
				ConceptName: fmt.Sprint(name),
				Strength:    toFloat64(strength),
				CFTags:      cfTags,
			})
		}
		return concepts, records.Err()
	})
	if err != nil {
		return nil, err
	}

	concepts, _ := result.([]WeakConcept)
	return concepts, nil
}

// UpdateConceptStrength adjusts the HAS_SKILL strength for a single concept
// by the given multiplier, capped at 100.
func UpdateConceptStrength(
	ctx context.Context,
	driver neo4j.DriverWithContext,
	userID, conceptID string,
	multiplier float64,
) error {
	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		_, err := tx.Run(ctx, `
MATCH (u:User {id: $userId})-[r:HAS_SKILL]->(c:Concept {id: $conceptId})
WITH r, CASE WHEN r.strength * $multiplier > 100.0 THEN 100.0
             ELSE r.strength * $multiplier END AS newStrength
SET r.strength = newStrength, r.decayed_strength = newStrength
`, map[string]any{
			"userId":     userID,
			"conceptId":  conceptID,
			"multiplier": multiplier,
		})
		return nil, err
	})
	return err
}

func toFloat64(v any) float64 {
	switch n := v.(type) {
	case float64:
		return n
	case int64:
		return float64(n)
	}
	return 0
}
