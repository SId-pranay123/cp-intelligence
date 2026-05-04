package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

const (
	groqBaseURL = "https://api.groq.com/openai/v1/chat/completions"
	groqModel   = "llama-3.1-8b-instant"
)

// GroqProvider implements Provider using the Groq API (OpenAI-compatible).
type GroqProvider struct {
	apiKey string
	model  string
	client *http.Client
}

// NewGroqProvider creates a provider. model defaults to llama3-8b-8192 if empty.
func NewGroqProvider(apiKey, model string) *GroqProvider {
	if model == "" {
		model = groqModel
	}
	return &GroqProvider{
		apiKey: apiKey,
		model:  model,
		client: &http.Client{Timeout: 15 * time.Second},
	}
}

func (g *GroqProvider) MapProblemToConcepts(ctx context.Context, req MapRequest) (MapResponse, error) {
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

	resp, err := g.complete(ctx, prompt)
	if err != nil {
		log.Printf("groq: MapProblemToConcepts failed (falling back to raw tags): %v", err)
		return MapResponse{ConceptIDs: req.ProblemTags}, nil
	}

	resp = stripMarkdownFences(resp)

	var ids []string
	if jsonErr := json.Unmarshal([]byte(resp), &ids); jsonErr != nil {
		log.Printf("groq: MapProblemToConcepts JSON parse failed (%v) — raw: %q", jsonErr, resp)
		return MapResponse{ConceptIDs: req.ProblemTags}, nil
	}
	return MapResponse{ConceptIDs: ids}, nil
}

func (g *GroqProvider) GenerateRecommendationReason(ctx context.Context, req ReasonRequest) (ReasonResponse, error) {
	prompt := fmt.Sprintf(
		`You are a competitive programming coach. Write ONE encouraging sentence (max 20 words) explaining
why a student with %.0f%% strength in %s should solve "%s" next.
Return ONLY the sentence, no quotes or extra text.`,
		req.ConceptStrength, req.ConceptName, req.ProblemTitle,
	)

	reason, err := g.complete(ctx, prompt)
	if err != nil {
		log.Printf("groq: GenerateRecommendationReason failed (falling back to template): %v", err)
		return ReasonResponse{Reason: templateReason(req)}, nil
	}
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return ReasonResponse{Reason: templateReason(req)}, nil
	}
	return ReasonResponse{Reason: reason}, nil
}

// ── HTTP types (OpenAI-compatible) ────────────────────────────────────────────

type groqRequest struct {
	Model     string        `json:"model"`
	Messages  []groqMessage `json:"messages"`
	MaxTokens int           `json:"max_tokens,omitempty"`
}

type groqMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type groqResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
		Type    string `json:"type"`
	} `json:"error,omitempty"`
}

func (g *GroqProvider) complete(ctx context.Context, prompt string) (string, error) {
	body, _ := json.Marshal(groqRequest{
		Model:     g.model,
		Messages:  []groqMessage{{Role: "user", Content: prompt}},
		MaxTokens: 256,
	})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, groqBaseURL, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+g.apiKey)
	req.Header.Set("Content-Type", "application/json")

	res, err := g.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("http: %w", err)
	}
	defer res.Body.Close()

	raw, _ := io.ReadAll(res.Body)

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return "", fmt.Errorf("HTTP %d: %s", res.StatusCode, string(raw))
	}

	var gr groqResponse
	if err := json.Unmarshal(raw, &gr); err != nil {
		return "", fmt.Errorf("decode JSON: %w — raw: %s", err, string(raw))
	}

	if gr.Error != nil {
		return "", fmt.Errorf("api error (%s): %s", gr.Error.Type, gr.Error.Message)
	}

	if len(gr.Choices) == 0 {
		return "", fmt.Errorf("no choices returned — raw: %s", string(raw))
	}

	return gr.Choices[0].Message.Content, nil
}
