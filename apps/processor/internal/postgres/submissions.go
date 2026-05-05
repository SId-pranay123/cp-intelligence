package postgres

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"

	pb "github.com/cp-intelligence/processor/gen/proto"
)

// FetchUserSubmissions loads all codeforces_submissions rows for a user and
// returns them as proto Submission messages ready for scoring.Compute.
func FetchUserSubmissions(ctx context.Context, pool *pgxpool.Pool, userID string) ([]*pb.Submission, error) {
	if pool == nil {
		return nil, nil
	}

	rows, err := pool.Query(ctx, `
		SELECT
			problem_id,
			problem_name,
			problem_tags,
			verdict,
			language,
			EXTRACT(EPOCH FROM submitted_at)::bigint,
			COALESCE(time_taken_ms, 0),
			COALESCE(memory_used,  0)
		FROM codeforces_submissions
		WHERE user_id = $1
		ORDER BY submitted_at ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []*pb.Submission
	for rows.Next() {
		var (
			problemID   string
			problemName string
			tags        []string
			verdict     string
			language    string
			submittedAt int64
			timeTakenMs int32
			memoryUsed  int32
		)
		if err := rows.Scan(
			&problemID, &problemName, &tags,
			&verdict, &language, &submittedAt,
			&timeTakenMs, &memoryUsed,
		); err != nil {
			log.Printf("postgres.FetchUserSubmissions: scan error: %v", err)
			continue
		}
		result = append(result, &pb.Submission{
			ProblemId:   problemID,
			ProblemName: problemName,
			Tags:        tags,
			Verdict:     verdict,
			Language:    language,
			SubmittedAt: submittedAt,
			TimeTakenMs: timeTakenMs,
			MemoryUsed:  memoryUsed,
		})
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	log.Printf("postgres.FetchUserSubmissions: loaded %d submissions for user=%s", len(result), userID)
	return result, nil
}
