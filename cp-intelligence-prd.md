# CP Intelligence Platform — Product Document

---

## 1. Problem Statement

Competitive programmers and interview preppers grind for months without direction. They solve hundreds of problems but still fail interviews. Current platforms like Leetcode and Codeforces are **problem banks, not coaches** — they show you problems but have no intelligence about what you specifically need to practice next.

There is no platform today that:
- Understands your actual skill gaps, not just problem count
- Connects your activity across multiple platforms into one picture
- Tells you exactly what to do today and why
- Gets smarter the more you use it

---

## 2. Who Is This For

Someone who:
- Is actively preparing for software engineering interviews
- Already knows the basics but is stuck in unfocused grinding
- Practices regularly but isn't sure if they're actually improving
- Wants to target specific companies but doesn't know what to focus on

Not for complete beginners. Not for people already cracking FAANG consistently.

---

## 3. What It Solves

### Problem 1: Unfocused grinding
Users solve random problems with no clear direction. More problems ≠ better preparation. This platform tells you exactly which concept to focus on next and why.

### Problem 2: No cross-platform unified view
Your Codeforces rating, Leetcode history, and CSES progress live in silos. No single place shows your complete skill picture.

### Problem 3: Quantity over quality tracking
Two users can both have "solved 50 graph problems" but one solved them first try and one needed 10 attempts. Current platforms treat them identically. Real skill is not just what you solved — it's how you solved it.

### Problem 4: No concept dependency awareness
Platforms recommend problems by topic tags. They don't know that you need to master BFS before Dijkstra, or arrays before DP. This platform understands concept dependencies and respects them.

### Problem 5: No memory of improvement
Users have no clear way to see if they're actually getting better over time. Progress feels invisible which kills motivation.

---

## 4. Core Value Proposition

> "Tell me where you are, tell me where you want to go — I'll tell you exactly what to practice today."

Not a problem bank. An **intelligence layer** on top of existing platforms.

---

## 5. How It Works (User Perspective)

1. Connect your Codeforces account
2. Platform analyzes your entire history and builds your skill profile
3. You see a visual map of your knowledge — strong areas, weak areas, untouched areas
4. Every day you get 2-3 problems to solve with a clear reason why
5. After solving, you rate your confidence
6. Your skill profile updates, tomorrow's recommendations improve
7. Over time you see measurable progress

---

## 6. Features

### Core (V1)
- Codeforces account sync (auto-fetch full submission history)
- Knowledge graph of DSA concepts with your skill level overlaid
- Weakness heatmap — visual map, dark spots = gaps
- Daily practice plan — 2-3 problems with links and reason why
- Confidence rating after solving — system adjusts based on your input
- Progress diff — compare your skill profile 30/60/90 days ago vs today

### Extended (V2)
- Leetcode integration
- System design practice mode:
  - Get a question, write your answer
  - AI gives structured feedback
  - Tracks your system design thinking over time
- Social layer:
  - Compare knowledge graphs with friends
  - See where you're stronger or weaker relative to peers
  - Friendly nudges ("Your friend just covered a topic you haven't touched")

### Company Targeting (Parallel feature, V2)
- Tell the platform which company you're targeting
- Platform builds a personalized training path toward that company
- Each company has a "fingerprint" — known problem patterns, difficulty distribution, interview rounds
- Gap analysis: "You're 60% ready for Google — here's exactly what's missing"
- Interview readiness score that updates daily as you practice

---

## 7. Why This Is Different

| | Leetcode | Codeforces | This Platform |
|--|----------|------------|---------------|
| Problem recommendations | Generic study plans | None | Personalized to your gaps |
| Cross-platform | No | No | Yes |
| Concept dependency awareness | No | No | Yes |
| Tracks how you solved, not just what | No | No | Yes |
| Progress visibility | Minimal | Rating only | Full skill map over time |
| Company targeting | Partial | No | Yes |

---

## 8. Success Metrics

- Users' Codeforces rating improves over time
- Users return daily (recommendations are useful enough to come back)
- Time to solve problems in previously weak areas decreases
- Users report feeling more directed in their preparation

---

## 9. V1 Scope (Minimum to prove core value)

- Codeforces sync only
- Knowledge graph for DSA only
- Daily recommendations with links
- Weakness heatmap
- Confidence rating
- Progress diff

System design, social features, and company targeting come after V1 proves value.

---

## 10. Open Questions

- How granular should concept nodes be? (e.g. is "Tree DP" its own node or under both Trees and DP?)
- Leetcode API is limited/paid — how do we handle this at scale?
- How do we handle problems that span multiple concepts?
- What is the right decay rate for skills not practiced recently?
