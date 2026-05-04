package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const anthropicAPI = "https://api.anthropic.com/v1/messages"

// ClaudeProvider implements Provider using the Anthropic Claude API.
type ClaudeProvider struct {
	apiKey string
	client *http.Client
}

func NewClaudeProvider(apiKey string) *ClaudeProvider {
	return &ClaudeProvider{
		apiKey: apiKey,
		client: &http.Client{Timeout: 15 * time.Second},
	}
}

// MapProblemToConcepts asks Claude which internal concept IDs a problem covers.
func (c *ClaudeProvider) MapProblemToConcepts(ctx context.Context, req MapRequest) (MapResponse, error) {
	prompt := fmt.Sprintf(
		`You are a competitive programming tutor. Given a problem, list the internal concept IDs it practises.

Problem title: %s
Tags: %s

Respond with ONLY a JSON array of concept ID strings (lowercase, hyphenated), e.g. ["dp","graphs","binary-search"].
Use only these valid IDs: dp, graphs, greedy, binary-search, two-pointers, prefix-sum, sorting, math,
arrays, strings, trees, dfs, bfs, recursion, bit-manipulation, number-theory, combinatorics, geometry,
hashing, stack, queue, deque, segment-tree, fenwick-tree, union-find, shortest-path, mst,
dynamic-programming-on-trees, digit-dp, game-theory, matrix-exponentiation.`,
		req.ProblemTitle,
		strings.Join(req.ProblemTags, ", "),
	)

	resp, err := c.complete(ctx, prompt)
	if err != nil {
		return MapResponse{ConceptIDs: req.ProblemTags}, nil // graceful fallback to raw tags
	}

	var ids []string
	if jsonErr := json.Unmarshal([]byte(resp), &ids); jsonErr != nil {
		return MapResponse{ConceptIDs: req.ProblemTags}, nil
	}
	return MapResponse{ConceptIDs: ids}, nil
}

// GenerateRecommendationReason generates a one-sentence explanation for
// why this problem is recommended for the user.
func (c *ClaudeProvider) GenerateRecommendationReason(ctx context.Context, req ReasonRequest) (ReasonResponse, error) {
	prompt := fmt.Sprintf(
		`You are a competitive programming coach. Write ONE encouraging sentence (max 20 words) explaining
why a student with %.0f%% strength in %s should solve "%s" next.
Return ONLY the sentence, no quotes or extra text.`,
		req.ConceptStrength, req.ConceptName, req.ProblemTitle,
	)

	reason, err := c.complete(ctx, prompt)
	if err != nil || strings.TrimSpace(reason) == "" {
		reason = templateReason(req)
	}
	return ReasonResponse{Reason: strings.TrimSpace(reason)}, nil
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

type claudeRequest struct {
	Model     string          `json:"model"`
	MaxTokens int             `json:"max_tokens"`
	Messages  []claudeMessage `json:"messages"`
}

type claudeMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type claudeResponse struct {
	Content []struct {
		Text string `json:"text"`
	} `json:"content"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (c *ClaudeProvider) complete(ctx context.Context, prompt string) (string, error) {
	body, _ := json.Marshal(claudeRequest{
		Model:     "claude-haiku-4-5-20251001",
		MaxTokens: 256,
		Messages:  []claudeMessage{{Role: "user", Content: prompt}},
	})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, anthropicAPI, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("content-type", "application/json")

	res, err := c.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("claude http: %w", err)
	}
	defer res.Body.Close()

	raw, _ := io.ReadAll(res.Body)
	var cr claudeResponse
	if err := json.Unmarshal(raw, &cr); err != nil {
		return "", fmt.Errorf("claude decode: %w", err)
	}
	if cr.Error != nil {
		return "", fmt.Errorf("claude api: %s", cr.Error.Message)
	}
	if len(cr.Content) == 0 {
		return "", fmt.Errorf("claude: empty response")
	}
	return cr.Content[0].Text, nil
}

func templateReason(req ReasonRequest) string {
	return fmt.Sprintf("Practise %s to strengthen your %.0f%% skill in %s.",
		req.ProblemTitle, req.ConceptStrength, req.ConceptName)
}
