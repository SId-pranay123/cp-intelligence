# Knowledge Graph

## Overview

The knowledge graph is a directed graph of 71 DSA concept nodes connected by ~93 prerequisite edges. It lives in Neo4j and is the backbone of the skill tracking and recommendation system. Every user has a set of `HAS_SKILL` edges to concept nodes, each carrying a strength score. The graph structure determines which concepts are "unlocked" (all prerequisites met) and therefore eligible for recommendations.

## Neo4j Schema

### Node types

```cypher
// Concept node — created once at startup, shared across all users
(c:Concept {
  id: "binary-search",        // stable identifier used everywhere
  name: "Binary Search",
  description: "...",
  difficulty_level: 2,        // 1 (easiest) to 5 (hardest)
  cfTags: ["binary search"]   // Codeforces tags that map to this concept
})

// User node — created on registration
(u:User { id: "uuid-..." })
```

### Edge types

```cypher
// Skill edge — one per (user, concept) pair, created on first activity
(u:User)-[:HAS_SKILL {
  strength: 72.5,             // raw score 0–100
  decayed_strength: 68.0,     // time-decayed score (used for display)
  last_practiced: 1714000000  // Unix timestamp
}]->(c:Concept)

// Prerequisite edge — static, seeded once at startup
(prereq:Concept)-[:REQUIRES]->(concept:Concept)
```

## Concept Nodes (71 total)

### Foundations (5)

| ID | Name | Difficulty |
|---|---|---|
| `arrays` | Arrays | 1 |
| `strings` | Strings | 1 |
| `math-basics` | Math Basics | 1 |
| `recursion` | Recursion | 2 |
| `complexity` | Complexity Analysis | 1 |

### Sorting & Searching (5)

| ID | Name | Difficulty |
|---|---|---|
| `sorting` | Sorting | 2 |
| `binary-search` | Binary Search | 2 |
| `two-pointers` | Two Pointers | 2 |
| `sliding-window` | Sliding Window | 2 |
| `ternary-search` | Ternary Search | 3 |

### Linear Structures (6)

| ID | Name | Difficulty |
|---|---|---|
| `hashing` | Hashing | 2 |
| `linked-lists` | Linked Lists | 2 |
| `stacks` | Stacks | 2 |
| `queues` | Queues | 2 |
| `deque` | Deque | 2 |
| `priority-queue` | Priority Queue | 2 |

### Trees (10)

| ID | Name | Difficulty |
|---|---|---|
| `trees` | Trees | 3 |
| `binary-trees` | Binary Trees | 3 |
| `bst` | Binary Search Trees | 3 |
| `segment-trees` | Segment Trees | 4 |
| `fenwick-trees` | Fenwick Trees | 4 |
| `sparse-table` | Sparse Table | 4 |
| `binary-lifting` | Binary Lifting | 4 |
| `lca` | Lowest Common Ancestor | 4 |
| `hld` | Heavy-Light Decomposition | 5 |
| `centroid-decomp` | Centroid Decomposition | 5 |

### Graphs (15)

| ID | Name | Difficulty |
|---|---|---|
| `graphs` | Graph Theory | 3 |
| `bfs` | Breadth-First Search | 3 |
| `dfs` | Depth-First Search | 3 |
| `topological-sort` | Topological Sort | 3 |
| `dijkstra` | Dijkstra's Algorithm | 4 |
| `bellman-ford` | Bellman-Ford | 4 |
| `floyd-warshall` | Floyd-Warshall | 4 |
| `dsu` | Disjoint Set Union | 3 |
| `mst` | Minimum Spanning Tree | 4 |
| `scc` | Strongly Connected Components | 4 |
| `bridges-articulation` | Bridges & Articulation Points | 4 |
| `bipartite-matching` | Bipartite Matching | 4 |
| `network-flow` | Network Flow | 5 |
| `euler-path` | Euler Path & Circuit | 4 |
| `two-sat` | 2-SAT | 5 |

### Dynamic Programming (8)

| ID | Name | Difficulty |
|---|---|---|
| `dp-1d` | 1D DP | 3 |
| `dp-2d` | 2D DP | 3 |
| `tree-dp` | Tree DP | 4 |
| `bitmask-dp` | Bitmask DP | 4 |
| `interval-dp` | Interval DP | 4 |
| `dp-on-graphs` | DP on Graphs | 4 |
| `digit-dp` | Digit DP | 5 |
| `sos-dp` | Sum over Subsets DP | 5 |

### Math (8)

| ID | Name | Difficulty |
|---|---|---|
| `number-theory` | Number Theory | 3 |
| `modular-arithmetic` | Modular Arithmetic | 3 |
| `combinatorics` | Combinatorics | 3 |
| `probability` | Probability | 3 |
| `geometry` | Computational Geometry | 4 |
| `matrix-expo` | Matrix Exponentiation | 4 |
| `fft` | Fast Fourier Transform | 5 |
| `game-theory` | Game Theory | 4 |

### General Techniques (4)

| ID | Name | Difficulty |
|---|---|---|
| `greedy` | Greedy Algorithms | 2 |
| `backtracking` | Backtracking | 3 |
| `divide-and-conquer` | Divide and Conquer | 3 |
| `meet-in-middle` | Meet in the Middle | 4 |

### String Algorithms (7)

| ID | Name | Difficulty |
|---|---|---|
| `hashing-string` | String Hashing | 3 |
| `kmp` | KMP Algorithm | 4 |
| `z-algorithm` | Z-Algorithm | 4 |
| `trie` | Trie | 3 |
| `suffix-array` | Suffix Array | 5 |
| `aho-corasick` | Aho-Corasick | 5 |
| `manacher` | Manacher's Algorithm | 4 |

### Advanced Structures (3)

| ID | Name | Difficulty |
|---|---|---|
| `sqrt-decomp` | Square Root Decomposition | 4 |
| `persistent-ds` | Persistent Data Structures | 5 |
| `treap` | Treap | 5 |

## Prerequisite Edges (~93 total)

Key dependency chains:

```
arrays → sorting, binary-search, two-pointers, hashing, stacks, queues, dp-1d, graphs
stacks → dfs, deque
queues → bfs, deque
dfs → topological-sort, scc, bridges-articulation
bfs → dijkstra, bipartite-matching
dp-1d → dp-2d, bitmask-dp, digit-dp, tree-dp, matrix-expo
trees → binary-trees, bst, segment-trees, fenwick-trees, sparse-table, binary-lifting, tree-dp, hld, centroid-decomp
graphs → dfs, bfs, dsu, mst, bellman-ford, floyd-warshall, euler-path
dijkstra → network-flow
dsu → mst, two-sat
binary-lifting → lca
lca → hld
math-basics → number-theory, modular-arithmetic, combinatorics, probability, game-theory
number-theory → fft
strings → hashing-string, kmp, z-algorithm, trie, manacher
hashing-string → suffix-array, aho-corasick
recursion → divide-and-conquer, backtracking, meet-in-middle
```

The full edge list is defined in `apps/processor/graph/seed.go`. Edges are immutable after seed.

## Graph Seeding

`SeedGraph()` runs automatically on Go processor startup. It uses idempotent `MERGE` queries so re-running never duplicates data:

```cypher
MERGE (c:Concept {id: $id})
SET c.name = $name,
    c.description = $description,
    c.difficulty_level = $difficulty_level,
    c.cfTags = $cfTags

MERGE (a:Concept {id: $from})
MERGE (b:Concept {id: $to})
MERGE (a)-[:REQUIRES]->(b)
```

## Skill Score Computation

When NestJS sends a `ProcessSubmissions` gRPC call, the Go processor:

1. Groups submissions by concept (via the `concept_ids` array on each problem)
2. For each concept, counts accepted and attempted problems
3. Computes a raw strength score (0–100) based on acceptance rate and problem difficulty
4. Writes or updates `HAS_SKILL` edges with MERGE:

```cypher
MERGE (u:User {id: $userId})-[s:HAS_SKILL]->(c:Concept {id: $conceptId})
SET s.strength = CASE WHEN $strength > s.strength THEN $strength ELSE s.strength END,
    s.last_practiced = $timestamp
```

Note: strength never decreases from reprocessing (it can only decay over time via the `decayed_strength` field).

## Unlocked Concept Query

A concept is "unlocked" for a user if all its prerequisites have `strength >= 60` (or it has no prerequisites). The Cypher query used by the recommendations engine:

```cypher
MATCH (c:Concept)
WHERE NOT (c)<-[:REQUIRES]-()
   OR ALL(prereq IN [(c)<-[:REQUIRES]-(p) | p]
          WHERE (u)-[:HAS_SKILL {strength: prereq}]->(prereq)
            AND prereq.strength >= 60)
OPTIONAL MATCH (u:User {id: $userId})-[s:HAS_SKILL]->(c)
WITH c, s
WHERE s IS NULL OR s.strength < 60
RETURN c.id, coalesce(s.strength, 0) AS strength
ORDER BY strength ASC
LIMIT 5
```

This returns up to 5 unlocked weak concepts sorted weakest-first. See [recommendations.md](recommendations.md) for how these are turned into problem recommendations.
