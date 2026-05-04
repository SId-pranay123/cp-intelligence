package scoring

import (
	"math"
	"time"

	pb "github.com/cp-intelligence/processor/gen/proto"
	"github.com/cp-intelligence/processor/internal/graph"
)

// ConceptStrength is the computed strength for a single concept.
type ConceptStrength struct {
	ConceptID     string
	ConceptName   string  // same as ID for tag-based concepts
	Strength      float64 // 0–100
	LastPracticed time.Time
}

// problemScore is an intermediate result for a single problem.
type problemScore struct {
	score         float64
	lastPracticed time.Time
	tags          []string
}

// Compute derives per-concept strengths from a flat submission batch.
// All business rules live here — the server and neo4j layers are I/O only.
func Compute(submissions []*pb.Submission) []ConceptStrength {
	// ── 1. Group submissions by problemID ────────────────────────────────────
	type submGroup struct {
		subs   []*pb.Submission
		rating int32
	}
	byProblem := make(map[string]*submGroup)

	for _, s := range submissions {
		g, ok := byProblem[s.ProblemId]
		if !ok {
			g = &submGroup{rating: s.ProblemRating}
			byProblem[s.ProblemId] = g
		}
		g.subs = append(g.subs, s)
		// Use the highest rating seen for this problem (API can return 0 sometimes)
		if s.ProblemRating > g.rating {
			g.rating = s.ProblemRating
		}
	}

	// ── 2. Score each problem ────────────────────────────────────────────────
	now := time.Now()
	problemScores := make([]problemScore, 0, len(byProblem))

	for _, g := range byProblem {
		ps := scoreProblem(g.subs, g.rating, now)
		problemScores = append(problemScores, ps)
	}

	// ── 3. Aggregate by concept ID (via CF tag mapping) ─────────────────────
	type conceptAgg struct {
		total         float64
		count         int
		lastPracticed time.Time
	}
	byConcept := make(map[string]*conceptAgg)

	for _, ps := range problemScores {
		conceptIDs := graph.MapTagsToConceptIDs(ps.tags)
		for _, id := range conceptIDs {
			agg, ok := byConcept[id]
			if !ok {
				agg = &conceptAgg{}
				byConcept[id] = agg
			}
			agg.total += ps.score
			agg.count++
			if ps.lastPracticed.After(agg.lastPracticed) {
				agg.lastPracticed = ps.lastPracticed
			}
		}
	}

	// ── 4. Normalise to 0–100 ────────────────────────────────────────────────
	// Max possible raw score per problem: AC(1.0) × hard(1.6) × recent(1.0) × first_try(1.0) = 1.6
	const maxRaw = 1.6

	result := make([]ConceptStrength, 0, len(byConcept))
	for id, agg := range byConcept {
		raw := agg.total / float64(agg.count)
		strength := math.Min(100, raw/maxRaw*100)
		result = append(result, ConceptStrength{
			ConceptID:     id,
			ConceptName:   id, // canonical name resolved from graph in Step 8
			Strength:      math.Round(strength*100) / 100,
			LastPracticed: agg.lastPracticed,
		})
	}

	return result
}

// scoreProblem computes a single problem's contribution score in [0, maxRaw].
func scoreProblem(subs []*pb.Submission, rating int32, now time.Time) problemScore {
	// Sort submissions by submission time (earliest first)
	sortByTime(subs)

	// Find the first AC and count prior attempts
	acIdx := -1
	for i, s := range subs {
		if s.Verdict == "OK" || s.Verdict == "AC" || s.Verdict == "Accepted" {
			acIdx = i
			break
		}
	}

	var (
		baseScore     float64
		lastSubmitted time.Time
		tags          []string
	)

	// Use the AC submission if it exists, otherwise the last attempt
	ref := subs[len(subs)-1]
	if acIdx >= 0 {
		ref = subs[acIdx]
		baseScore = 1.0
	} else {
		baseScore = 0.3
	}

	lastSubmitted = time.Unix(ref.SubmittedAt, 0)
	tags = ref.Tags

	// Difficulty multiplier
	diffMult := difficultyMultiplier(rating)
	baseScore *= diffMult

	// Recency weight
	days := now.Sub(lastSubmitted).Hours() / 24
	recency := recencyWeight(days)

	// Attempts penalty: extra attempts before the decisive submission
	extraAttempts := 0
	if acIdx >= 0 {
		extraAttempts = acIdx // submissions[0..acIdx-1] are WA/TLE/etc.
	} else {
		extraAttempts = len(subs) - 1
	}
	penalty := math.Max(0.5, 1.0-0.1*float64(extraAttempts))

	return problemScore{
		score:         baseScore * recency * penalty,
		lastPracticed: lastSubmitted,
		tags:          tags,
	}
}

func difficultyMultiplier(rating int32) float64 {
	switch {
	case rating == 0:
		return 1.0 // unknown → treat as easy
	case rating < 1200:
		return 1.0
	case rating <= 1900:
		return 1.3
	default:
		return 1.6
	}
}

func recencyWeight(days float64) float64 {
	switch {
	case days <= 30:
		return 1.0
	case days <= 90:
		return 0.8
	case days <= 180:
		return 0.6
	default:
		return 0.4
	}
}

// sortByTime sorts a slice of submissions ascending by SubmittedAt.
// Insertion sort is fine here — per-problem slices are tiny.
func sortByTime(subs []*pb.Submission) {
	for i := 1; i < len(subs); i++ {
		key := subs[i]
		j := i - 1
		for j >= 0 && subs[j].SubmittedAt > key.SubmittedAt {
			subs[j+1] = subs[j]
			j--
		}
		subs[j+1] = key
	}
}
