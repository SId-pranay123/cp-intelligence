package postgres

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ProblemRow is a minimal view of a problem fetched from PostgreSQL.
type ProblemRow struct {
	ProblemID   string // external_id, e.g. "1234A"
	ProblemName string // title
	Difficulty  string // "easy" | "medium" | "hard" | "expert" | "unknown"
	Link        string // full Codeforces URL
}

// UnsolvedByConceptIDs returns problems whose concept_ids overlap with the
// given set that the user has NOT yet solved (no 'OK' submission).
// Returns nil, nil when the DB has no matching rows — callers should skip
// the concept rather than falling back to static problems.
func UnsolvedByConceptIDs(
	ctx context.Context,
	pool *pgxpool.Pool,
	userID string,
	conceptIDs []string,
	limit int,
) ([]ProblemRow, error) {
	if pool == nil || len(conceptIDs) == 0 {
		return nil, nil
	}

	log.Printf("postgres.UnsolvedByConceptIDs: querying user=%s concepts=%v", userID, conceptIDs)

	rows, err := pool.Query(ctx, `
		SELECT external_id, title, difficulty, link
		FROM (
		  SELECT DISTINCT
		    p.external_id,
		    p.title,
		    COALESCE(p.difficulty, 'unknown') AS difficulty,
		    p.link
		  FROM problems p
		  WHERE p.source = 'codeforces'
		    AND p.concept_ids && $1
		    AND p.external_id NOT IN (
		          SELECT cs.problem_id
		          FROM codeforces_submissions cs
		          WHERE cs.user_id = $2
		            AND cs.verdict = 'OK'
		        )
		) sub
		ORDER BY CASE difficulty
		  WHEN 'easy'   THEN 1
		  WHEN 'medium' THEN 2
		  WHEN 'hard'   THEN 3
		  WHEN 'expert' THEN 4
		  ELSE 0
		END ASC
		LIMIT $3
	`, conceptIDs, userID, limit)
	if err != nil {
		log.Printf("postgres.UnsolvedByConceptIDs: query failed user=%s concepts=%v: %v", userID, conceptIDs, err)
		return nil, err
	}
	defer rows.Close()

	var result []ProblemRow
	for rows.Next() {
		var r ProblemRow
		if scanErr := rows.Scan(&r.ProblemID, &r.ProblemName, &r.Difficulty, &r.Link); scanErr != nil {
			log.Printf("postgres.UnsolvedByConceptIDs: scan error: %v", scanErr)
			continue
		}
		result = append(result, r)
	}
	if rows.Err() != nil {
		log.Printf("postgres.UnsolvedByConceptIDs: rows error: %v", rows.Err())
		return nil, rows.Err()
	}
	log.Printf("postgres.UnsolvedByConceptIDs: found %d problems for user=%s concepts=%v", len(result), userID, conceptIDs)
	return result, nil
}

// staticProblems is used when the DB is unavailable or has no matching rows.
// ConceptIDs mirror the concept IDs stored in the problems table.
var staticProblems = []struct {
	row        ProblemRow
	conceptIDs []string
}{
	{ProblemRow{"4A", "Watermelon", "easy", "https://codeforces.com/problemset/problem/4/A"}, []string{"math", "brute-force"}},
	{ProblemRow{"1A", "Theatre Square", "easy", "https://codeforces.com/problemset/problem/1/A"}, []string{"math"}},
	{ProblemRow{"158B", "Taxi", "easy", "https://codeforces.com/problemset/problem/158/B"}, []string{"greedy", "math"}},
	{ProblemRow{"263A", "Beautiful Matrix", "medium", "https://codeforces.com/problemset/problem/263/A"}, []string{"implementation"}},
	{ProblemRow{"1359C", "Mixing Water", "hard", "https://codeforces.com/problemset/problem/1359/C"}, []string{"binary-search", "math"}},
	{ProblemRow{"580C", "Kefa and Park", "medium", "https://codeforces.com/problemset/problem/580/C"}, []string{"dfs", "trees"}},
	{ProblemRow{"702C", "Cellular Network", "medium", "https://codeforces.com/problemset/problem/702/C"}, []string{"binary-search"}},
	{ProblemRow{"339B", "Xenia and Tree", "hard", "https://codeforces.com/problemset/problem/339/B"}, []string{"trees", "segment-tree"}},
	{ProblemRow{"86C", "Genetic Engineering", "hard", "https://codeforces.com/problemset/problem/86/C"}, []string{"dp", "strings"}},
	{ProblemRow{"455B", "A Lot of Games", "medium", "https://codeforces.com/problemset/problem/455/B"}, []string{"game-theory"}},
}

func fallback(conceptIDs []string, limit int) []ProblemRow {
	want := make(map[string]bool, len(conceptIDs))
	for _, c := range conceptIDs {
		want[c] = true
	}

	var result []ProblemRow
	for _, sp := range staticProblems {
		for _, c := range sp.conceptIDs {
			if want[c] {
				result = append(result, sp.row)
				break
			}
		}
		if len(result) >= limit {
			return result
		}
	}
	// If nothing matched, return generic easy problems
	if len(result) == 0 {
		n := limit
		if n > len(staticProblems) {
			n = len(staticProblems)
		}
		for i := 0; i < n; i++ {
			result = append(result, staticProblems[i].row)
		}
	}
	return result
}
