package ai

import "context"

// Provider is the interface all AI backends must implement.
// Swap the default Claude adapter for any other provider by
// setting AI_PROVIDER and supplying an implementation here.
type Provider interface {
	MapProblemToConcepts(ctx context.Context, req MapRequest) (MapResponse, error)
	GenerateRecommendationReason(ctx context.Context, req ReasonRequest) (ReasonResponse, error)
}

type MapRequest struct {
	ProblemTitle string
	ProblemTags  []string
	Statement    string
}

type MapResponse struct {
	ConceptIDs []string
}

type ReasonRequest struct {
	ConceptName    string
	ConceptStrength float64
	ProblemTitle   string
}

type ReasonResponse struct {
	Reason string
}
