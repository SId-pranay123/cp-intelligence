# AI Concept Explainer

## What it does

When a user clicks "Explain" on any concept (in the heatmap, drill page, or knowledge graph),
a panel slides in with an AI-generated explanation tailored to their current skill level.

The explanation has four parts:
1. **What it is** — 2-sentence plain-English definition
2. **Key pattern** — the algorithmic template to recognise and apply this concept
3. **Common pitfall** — the mistake most people make (personalised if strength < 50)
4. **Practice entry point** — one specific problem recommended as the best starting point

## Implementation

### API route

`POST /api/explain` (Next.js route, calls Groq directly)

Request:
```json
{ "conceptId": "dp-1d", "conceptName": "DP 1D", "strength": 34 }
```

Response (streamed):
```json
{ "explanation": "..." }
```

### Prompt template

```
You are a competitive programming coach.
Explain the concept "{{conceptName}}" to a student whose current mastery is {{strength}}/100.

Structure your response as:

**What it is**
[2 sentences, plain English, no jargon]

**Key pattern**
[The template/approach to recognise and apply this — include pseudocode if helpful]

**Common pitfall**
[The mistake most people make at strength ~{{strength}}]

**Where to start**
[One specific Codeforces problem name and number that is the best entry point]

Be direct and concrete. Assume the student knows basic programming.
```

### Streaming

Use Groq's streaming API so the explanation appears word-by-word (better UX for a response
that takes 2–4 seconds to generate). The Next.js route returns a `ReadableStream`.

## Frontend

### Entry points
- "Explain ?" button on each concept badge in the heatmap
- "Explain" link in the knowledge graph node tooltip
- "Explain this concept" button at the top of the drill page

### UI: slide-in panel
A right-side panel (400px wide) slides in over the content (not a modal) with:
- Concept name + strength score in the header
- Streamed markdown rendered as it arrives
- "Close" button (×) in the corner

The panel does NOT block the rest of the page. Users can keep reading the heatmap while
the explanation loads.

### Caching
Cache explanations in `sessionStorage` keyed by `explain:${conceptId}:${Math.floor(strength/10)}`.
A user won't regenerate if they click the same concept twice in one session.

## Cost estimate
Groq llama-3.1-8b: ~$0.0001 per call. 100 users × 5 explains/day = $0.05/day. Negligible.

## Acceptance criteria
- [ ] "Explain" button visible on heatmap badges
- [ ] Panel slides in from the right on click
- [ ] Response streams in word-by-word
- [ ] Explanation is tailored to the user's strength score
- [ ] Session cache prevents duplicate API calls
- [ ] Panel can be dismissed without losing heatmap state

## Files to create / change
- `apps/web/src/app/api/explain/route.ts` — Groq streaming endpoint (new)
- `apps/web/src/components/explain-panel.tsx` — slide-in panel component (new)
- `apps/web/src/components/skill-heatmap.tsx` — add Explain button + panel trigger
- `apps/web/src/app/dashboard/drill/[conceptId]/page.tsx` — Explain button
