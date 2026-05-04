package scoring

import (
	"testing"
	"time"

	pb "github.com/cp-intelligence/processor/gen/proto"
)

func ts(daysAgo int) int64 {
	return time.Now().AddDate(0, 0, -daysAgo).Unix()
}

func TestCompute_SingleACHardRecent(t *testing.T) {
	subs := []*pb.Submission{
		{
			ProblemId:     "1A",
			ProblemName:   "Problem A",
			Tags:          []string{"graphs", "dfs"},
			Verdict:       "OK",
			SubmittedAt:   ts(5),  // 5 days ago → recency 1.0
			ProblemRating: 2000,   // hard → multiplier 1.6
		},
	}
	results := Compute(subs)

	// Expect 2 concepts: graphs, dfs
	if len(results) != 2 {
		t.Fatalf("expected 2 concepts, got %d", len(results))
	}

	for _, cs := range results {
		// AC(1.0) * hard(1.6) * recency(1.0) * no_penalty(1.0) = 1.6
		// normalised: 1.6/1.6*100 = 100
		if cs.Strength != 100 {
			t.Errorf("concept %s: expected strength 100, got %.2f", cs.ConceptID, cs.Strength)
		}
	}
}

func TestCompute_WANoAC(t *testing.T) {
	subs := []*pb.Submission{
		{
			ProblemId:     "2B",
			Tags:          []string{"dp"},
			Verdict:       "WRONG_ANSWER",
			SubmittedAt:   ts(10),
			ProblemRating: 1500, // medium → 1.3
		},
	}
	results := Compute(subs)
	if len(results) != 1 {
		t.Fatalf("expected 1 concept, got %d", len(results))
	}
	// base=0.3, diff=1.3, recency=1.0, penalty=1.0 → 0.39/1.6*100 = 24.375
	cs := results[0]
	expected := 0.3 * 1.3 * 1.0 * 1.0 / 1.6 * 100
	if abs(cs.Strength-expected) > 0.01 {
		t.Errorf("expected %.2f, got %.2f", expected, cs.Strength)
	}
}

func TestCompute_MultipleAttemptsThenAC(t *testing.T) {
	// 3 WA then 1 AC → 3 extra attempts, penalty = max(0.5, 1.0-0.3) = 0.7
	subs := []*pb.Submission{
		{ProblemId: "3C", Tags: []string{"greedy"}, Verdict: "WRONG_ANSWER", SubmittedAt: ts(20), ProblemRating: 800},
		{ProblemId: "3C", Tags: []string{"greedy"}, Verdict: "WRONG_ANSWER", SubmittedAt: ts(19), ProblemRating: 800},
		{ProblemId: "3C", Tags: []string{"greedy"}, Verdict: "WRONG_ANSWER", SubmittedAt: ts(18), ProblemRating: 800},
		{ProblemId: "3C", Tags: []string{"greedy"}, Verdict: "OK", SubmittedAt: ts(17), ProblemRating: 800},
	}
	results := Compute(subs)
	// base=1.0, diff=1.0(easy<1200), recency=1.0, penalty=0.7 → 0.7/1.6*100 = 43.75
	cs := results[0]
	expected := 1.0 * 1.0 * 1.0 * 0.7 / 1.6 * 100
	if abs(cs.Strength-expected) > 0.01 {
		t.Errorf("expected %.2f, got %.2f", expected, cs.Strength)
	}
}

func TestCompute_OldSubmissionDecay(t *testing.T) {
	subs := []*pb.Submission{
		{ProblemId: "4D", Tags: []string{"math"}, Verdict: "OK", SubmittedAt: ts(200), ProblemRating: 1000},
	}
	results := Compute(subs)
	// recency = 0.4 (>180 days)
	cs := results[0]
	expected := 1.0 * 1.0 * 0.4 * 1.0 / 1.6 * 100
	if abs(cs.Strength-expected) > 0.01 {
		t.Errorf("expected %.2f, got %.2f", expected, cs.Strength)
	}
}

func TestCompute_PenaltyFloor(t *testing.T) {
	// 6 WA then AC → penalty would be 1.0-0.6=0.4, but floor is 0.5
	subs := make([]*pb.Submission, 7)
	for i := range 6 {
		subs[i] = &pb.Submission{ProblemId: "5E", Tags: []string{"trees"}, Verdict: "WRONG_ANSWER", SubmittedAt: ts(10 - i), ProblemRating: 1200}
	}
	subs[6] = &pb.Submission{ProblemId: "5E", Tags: []string{"trees"}, Verdict: "OK", SubmittedAt: ts(1), ProblemRating: 1200}
	results := Compute(subs)
	cs := results[0]
	// base=1.0, diff=1.3(medium, 1200), recency=1.0, penalty=0.5(floor)
	expected := 1.0 * 1.3 * 1.0 * 0.5 / 1.6 * 100
	if abs(cs.Strength-expected) > 0.01 {
		t.Errorf("expected %.2f, got %.2f", expected, cs.Strength)
	}
}

func abs(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}
