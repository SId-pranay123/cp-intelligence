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

// Base URL — model name is appended at runtime so it is configurable via env.
// gemini-1.5-flash: free tier (1500 req/day, 1M tokens/min) — no billing required.
// gemini-2.0-flash: requires Cloud billing enabled on the project.
const geminiBaseURL = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent"

// GeminiProvider implements Provider using the Google Gemini API.
type GeminiProvider struct {
	apiKey string
	model  string
	client *http.Client
}

// NewGeminiProvider creates a provider. model defaults to gemini-1.5-flash if empty.
func NewGeminiProvider(apiKey, model string) *GeminiProvider {
	if model == "" {
		model = "gemini-1.5-flash"
	}
	return &GeminiProvider{
		apiKey: apiKey,
		model:  model,
		client: &http.Client{Timeout: 15 * time.Second},
	}
}

func (g *GeminiProvider) url() string {
	return fmt.Sprintf(geminiBaseURL, g.model)
}

// Ping makes one cheap API call at startup so misconfiguration is caught early.
func (g *GeminiProvider) Ping(ctx context.Context) {
	log.Printf("gemini: running startup ping (model=%s)…", g.model)
	text, err := g.complete(ctx, "Reply with the single word: OK")
	if err != nil {
		log.Printf("gemini: startup ping FAILED — %v", err)
		return
	}
	log.Printf("gemini: startup ping OK — model replied: %q", strings.TrimSpace(text))
}

func (g *GeminiProvider) MapProblemToConcepts(ctx context.Context, req MapRequest) (MapResponse, error) {
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
		log.Printf("gemini: MapProblemToConcepts failed (falling back to raw tags): %v", err)
		return MapResponse{ConceptIDs: req.ProblemTags}, nil
	}

	// Gemini sometimes wraps JSON in markdown fences — strip them.
	resp = stripMarkdownFences(resp)

	var ids []string
	if jsonErr := json.Unmarshal([]byte(resp), &ids); jsonErr != nil {
		log.Printf("gemini: MapProblemToConcepts JSON parse failed (%v) — raw response: %q", jsonErr, resp)
		return MapResponse{ConceptIDs: req.ProblemTags}, nil
	}
	return MapResponse{ConceptIDs: ids}, nil
}

func (g *GeminiProvider) GenerateRecommendationReason(ctx context.Context, req ReasonRequest) (ReasonResponse, error) {
	prompt := fmt.Sprintf(
		`You are a competitive programming coach. Write ONE encouraging sentence (max 20 words) explaining
why a student with %.0f%% strength in %s should solve "%s" next.
Return ONLY the sentence, no quotes or extra text.`,
		req.ConceptStrength, req.ConceptName, req.ProblemTitle,
	)

	reason, err := g.complete(ctx, prompt)
	if err != nil {
		log.Printf("gemini: GenerateRecommendationReason failed (falling back to template): %v", err)
		return ReasonResponse{Reason: templateReason(req)}, nil
	}
	reason = strings.TrimSpace(reason)
	if reason == "" {
		log.Printf("gemini: GenerateRecommendationReason returned empty text — using template")
		return ReasonResponse{Reason: templateReason(req)}, nil
	}
	return ReasonResponse{Reason: reason}, nil
}

// ── HTTP types ────────────────────────────────────────────────────────────────

type geminiRequest struct {
	Contents         []geminiContent   `json:"contents"`
	GenerationConfig *geminiGenConfig  `json:"generationConfig,omitempty"`
}

type geminiGenConfig struct {
	MaxOutputTokens int `json:"maxOutputTokens,omitempty"`
}

type geminiContent struct {
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text string `json:"text"`
}

type geminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
		FinishReason  string `json:"finishReason"`
		SafetyRatings []struct {
			Category    string `json:"category"`
			Probability string `json:"probability"`
		} `json:"safetyRatings"`
	} `json:"candidates"`
	PromptFeedback *struct {
		BlockReason string `json:"blockReason"`
	} `json:"promptFeedback,omitempty"`
	Error *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Status  string `json:"status"`
	} `json:"error,omitempty"`
}

func (g *GeminiProvider) complete(ctx context.Context, prompt string) (string, error) {
	body, _ := json.Marshal(geminiRequest{
		Contents: []geminiContent{
			{Parts: []geminiPart{{Text: prompt}}},
		},
		GenerationConfig: &geminiGenConfig{MaxOutputTokens: 256},
	})

	url := g.url() + "?key=" + g.apiKey
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("content-type", "application/json")

	res, err := g.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("http: %w", err)
	}
	defer res.Body.Close()

	raw, _ := io.ReadAll(res.Body)

	// Non-2xx: log the full body so we can see exactly what went wrong.
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return "", fmt.Errorf("HTTP %d: %s", res.StatusCode, string(raw))
	}

	var gr geminiResponse
	if err := json.Unmarshal(raw, &gr); err != nil {
		return "", fmt.Errorf("decode JSON: %w — raw: %s", err, string(raw))
	}

	// Prompt was blocked before any candidate was generated.
	if gr.PromptFeedback != nil && gr.PromptFeedback.BlockReason != "" {
		return "", fmt.Errorf("prompt blocked: %s", gr.PromptFeedback.BlockReason)
	}

	// API-level error inside a 200 response (unusual but possible).
	if gr.Error != nil {
		return "", fmt.Errorf("api error %d (%s): %s", gr.Error.Code, gr.Error.Status, gr.Error.Message)
	}

	if len(gr.Candidates) == 0 {
		return "", fmt.Errorf("no candidates returned — raw: %s", string(raw))
	}

	cand := gr.Candidates[0]

	// Content was blocked mid-generation.
	if cand.FinishReason != "" && cand.FinishReason != "STOP" && cand.FinishReason != "MAX_TOKENS" {
		return "", fmt.Errorf("generation stopped: finishReason=%s", cand.FinishReason)
	}

	if len(cand.Content.Parts) == 0 {
		return "", fmt.Errorf("candidate has no parts — finishReason=%s raw: %s", cand.FinishReason, string(raw))
	}

	return cand.Content.Parts[0].Text, nil
}

// stripMarkdownFences removes ```json ... ``` wrappers that Gemini sometimes adds.
func stripMarkdownFences(s string) string {
	s = strings.TrimSpace(s)
	for _, fence := range []string{"```json", "```"} {
		if strings.HasPrefix(s, fence) {
			s = strings.TrimPrefix(s, fence)
			s = strings.TrimSuffix(s, "```")
			s = strings.TrimSpace(s)
		}
	}
	return s
}
