package graph

import (
	"context"
	"fmt"
	"log"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

// ── Data model ────────────────────────────────────────────────────────────────

// Concept is a DSA knowledge node in the graph.
type Concept struct {
	ID              string
	Name            string
	Description     string
	DifficultyLevel string // "beginner" | "intermediate" | "advanced"
}

// Dependency is a directed prerequisite edge: From must be known before To.
type Dependency struct {
	FromID string
	ToID   string
}

// ── Concept catalogue (~80 nodes) ─────────────────────────────────────────────

var AllConcepts = []Concept{
	// ── Foundations ──────────────────────────────────────────────────────────
	{"arrays", "Arrays", "Static and dynamic arrays, indexing, prefix sums, basic iteration", "beginner"},
	{"strings", "Strings", "String manipulation, character arrays, substring operations", "beginner"},
	{"math-basics", "Math Basics", "Arithmetic, GCD/LCM, parity, basic number properties", "beginner"},
	{"recursion", "Recursion", "Recursive thinking, base cases, call stack, memoisation intro", "beginner"},
	{"complexity", "Time & Space Complexity", "Big-O notation, analysing algorithm efficiency", "beginner"},

	// ── Sorting & Searching ───────────────────────────────────────────────────
	{"sorting", "Sorting", "Comparison sorts, counting sort, radix sort, sort stability", "beginner"},
	{"binary-search", "Binary Search", "Binary search on sorted arrays and on answer space", "beginner"},
	{"two-pointers", "Two Pointers", "Two-pointer technique on sorted or structured arrays", "beginner"},
	{"sliding-window", "Sliding Window", "Fixed and variable-size window over arrays/strings", "beginner"},
	{"ternary-search", "Ternary Search", "Search on strictly unimodal functions", "intermediate"},

	// ── Linear Data Structures ───────────────────────────────────────────────
	{"hashing", "Hashing", "Hash maps, hash sets, collision handling, open addressing", "beginner"},
	{"linked-lists", "Linked Lists", "Singly and doubly linked lists, fast/slow pointer tricks", "beginner"},
	{"stacks", "Stacks", "LIFO structure, monotonic stacks, expression evaluation", "beginner"},
	{"queues", "Queues", "FIFO structure, circular queues, BFS auxiliary", "beginner"},
	{"deque", "Deque", "Double-ended queue, sliding window max/min with monotonic deque", "intermediate"},
	{"priority-queue", "Priority Queue / Heap", "Min/max heap, heap sort, k-th largest queries", "intermediate"},

	// ── Trees ─────────────────────────────────────────────────────────────────
	{"trees", "Trees", "Rooted/unrooted trees, traversals, diameter, depth", "intermediate"},
	{"binary-trees", "Binary Trees", "Binary tree properties, inorder/preorder/postorder", "intermediate"},
	{"bst", "Binary Search Trees", "BST operations, balancing, ordered sets/maps", "intermediate"},
	{"segment-trees", "Segment Trees", "Range queries and point/range updates, lazy propagation", "advanced"},
	{"fenwick-trees", "Fenwick Trees (BIT)", "Binary indexed trees for prefix sums and range updates", "advanced"},
	{"sparse-table", "Sparse Table", "Static range min/max queries in O(1) after O(n log n) build", "advanced"},
	{"binary-lifting", "Binary Lifting", "Jump pointers for LCA and k-th ancestor queries", "advanced"},
	{"lca", "LCA (Lowest Common Ancestor)", "Lowest common ancestor via binary lifting or Euler tour", "advanced"},
	{"hld", "Heavy-Light Decomposition", "Path queries and updates on trees via segment tree", "advanced"},
	{"centroid-decomp", "Centroid Decomposition", "Divide-and-conquer on trees for path problems", "advanced"},

	// ── Graphs ────────────────────────────────────────────────────────────────
	{"graphs", "Graphs", "Graph representation, adjacency list/matrix, basic properties", "intermediate"},
	{"bfs", "BFS", "Breadth-first search, shortest path on unweighted graphs, 0-1 BFS", "intermediate"},
	{"dfs", "DFS", "Depth-first search, connected components, cycle detection", "intermediate"},
	{"topological-sort", "Topological Sort", "Kahn's algorithm and DFS-based topo sort on DAGs", "intermediate"},
	{"dijkstra", "Dijkstra", "Single-source shortest paths on non-negative weighted graphs", "intermediate"},
	{"bellman-ford", "Bellman-Ford", "Shortest paths with negative edges, negative cycle detection", "intermediate"},
	{"floyd-warshall", "Floyd-Warshall", "All-pairs shortest paths in O(V³)", "intermediate"},
	{"dsu", "Disjoint Set Union", "Union-Find with path compression and union by rank", "intermediate"},
	{"mst", "Minimum Spanning Tree", "Kruskal's (DSU-based) and Prim's (heap-based) MST", "intermediate"},
	{"scc", "Strongly Connected Components", "Tarjan's and Kosaraju's SCC algorithms", "advanced"},
	{"bridges-articulation", "Bridges & Articulation Points", "Finding bridges and cut vertices via DFS", "advanced"},
	{"bipartite-matching", "Bipartite Matching", "Hopcroft-Karp, Hungarian algorithm, König's theorem", "advanced"},
	{"network-flow", "Network Flow", "Max flow, min cut, Ford-Fulkerson, Dinic's algorithm", "advanced"},
	{"euler-path", "Euler Path / Circuit", "Hierholzer's algorithm, conditions for Euler path existence", "advanced"},
	{"two-sat", "2-SAT", "Boolean satisfiability with two literals per clause via SCC", "advanced"},

	// ── Dynamic Programming ───────────────────────────────────────────────────
	{"dp-1d", "1D Dynamic Programming", "Memoisation, tabulation, LIS, coin change, knapsack", "intermediate"},
	{"dp-2d", "2D Dynamic Programming", "Grid DP, LCS, edit distance, 2D knapsack", "intermediate"},
	{"tree-dp", "Tree DP", "DP on trees, rerooting technique, subtree DP", "advanced"},
	{"bitmask-dp", "Bitmask DP", "DP over subsets, TSP-style, profile DP", "advanced"},
	{"interval-dp", "Interval DP", "DP on intervals, matrix chain multiplication, burst balloons", "advanced"},
	{"dp-on-graphs", "DP on Graphs / DAGs", "Longest path, counting paths on DAGs, DP with topo sort", "advanced"},
	{"digit-dp", "Digit DP", "Counting integers with digit-level constraints", "advanced"},
	{"sos-dp", "SOS DP (Sum over Subsets)", "Fast subset sum enumeration over all 2^n subsets", "advanced"},

	// ── Math ──────────────────────────────────────────────────────────────────
	{"number-theory", "Number Theory", "Sieve of Eratosthenes, prime factorisation, Euler's totient", "intermediate"},
	{"modular-arithmetic", "Modular Arithmetic", "Modular inverse, Fermat's little theorem, CRT", "intermediate"},
	{"combinatorics", "Combinatorics", "Permutations, combinations, inclusion-exclusion, Catalan", "intermediate"},
	{"probability", "Probability", "Expected value, probability DP, linearity of expectation", "intermediate"},
	{"geometry", "Geometry", "Points, lines, convex hull, polygon area, rotating calipers", "intermediate"},
	{"matrix-expo", "Matrix Exponentiation", "Fast Fibonacci, linear recurrences via matrix power", "advanced"},
	{"fft", "FFT / NTT", "Fast Fourier Transform, number-theoretic transform, polynomial ops", "advanced"},
	{"game-theory", "Game Theory", "Nim, Sprague-Grundy theorem, impartial games", "advanced"},

	// ── General Techniques ────────────────────────────────────────────────────
	{"greedy", "Greedy", "Greedy choices, exchange arguments, interval scheduling, activity selection", "intermediate"},
	{"backtracking", "Backtracking", "Exhaustive search with pruning, N-queens, Sudoku", "intermediate"},
	{"divide-and-conquer", "Divide and Conquer", "Merge sort paradigm, D&C DP optimisation", "intermediate"},
	{"meet-in-middle", "Meet in the Middle", "Split search space, baby-step giant-step, MITM DP", "advanced"},

	// ── String Algorithms ─────────────────────────────────────────────────────
	{"hashing-string", "String Hashing", "Polynomial rolling hash for O(1) substring comparison", "intermediate"},
	{"kmp", "KMP", "Knuth-Morris-Pratt pattern matching, failure function", "advanced"},
	{"z-algorithm", "Z-Algorithm", "Z-function for O(n) pattern matching and string periods", "advanced"},
	{"trie", "Trie", "Prefix tree for string lookup, autocomplete, XOR-maximisation", "intermediate"},
	{"suffix-array", "Suffix Array", "SA-IS / DC3 construction, LCP array, substring queries", "advanced"},
	{"aho-corasick", "Aho-Corasick", "Multi-pattern matching automaton built on trie + KMP", "advanced"},
	{"manacher", "Manacher's Algorithm", "Longest palindromic substring in O(n)", "advanced"},

	// ── Advanced Data Structures ──────────────────────────────────────────────
	{"sqrt-decomp", "Sqrt Decomposition / Mo's", "Block decomposition, Mo's algorithm for offline range queries", "advanced"},
	{"persistent-ds", "Persistent Data Structures", "Persistent segment tree, functional approach to history queries", "advanced"},
	{"treap", "Treap / Implicit Treap", "Randomised BST supporting array-like split/merge operations", "advanced"},
}

// ── Dependency edges ─────────────────────────────────────────────────────────
// Edge meaning: FromID is a prerequisite for ToID.

var AllDependencies = []Dependency{
	// Foundations
	{"arrays", "sorting"},
	{"arrays", "binary-search"},
	{"arrays", "two-pointers"},
	{"arrays", "hashing"},
	{"arrays", "linked-lists"},
	{"arrays", "stacks"},
	{"arrays", "queues"},
	{"arrays", "dp-1d"},
	{"arrays", "fenwick-trees"},
	{"arrays", "sliding-window"},
	{"arrays", "graphs"},
	{"arrays", "prefix-sum"}, // conceptual — covered under arrays
	{"math-basics", "number-theory"},
	{"math-basics", "geometry"},
	{"math-basics", "game-theory"},
	{"recursion", "backtracking"},
	{"recursion", "divide-and-conquer"},
	{"recursion", "dp-1d"},
	{"recursion", "trees"},

	// Sorting & Searching
	{"sorting", "binary-search"},
	{"sorting", "two-pointers"},
	{"sorting", "greedy"},
	{"sorting", "suffix-array"},
	{"binary-search", "ternary-search"},
	{"two-pointers", "sliding-window"},

	// Linear DS
	{"queues", "bfs"},
	{"stacks", "dfs"},
	{"stacks", "deque"},
	{"queues", "deque"},
	{"hashing", "hashing-string"},

	// Trees
	{"linked-lists", "trees"},
	{"trees", "binary-trees"},
	{"trees", "binary-lifting"},
	{"trees", "tree-dp"},
	{"trees", "hld"},
	{"trees", "centroid-decomp"},
	{"trees", "euler-path"},
	{"binary-trees", "bst"},
	{"binary-trees", "segment-trees"},
	{"binary-trees", "priority-queue"},
	{"binary-lifting", "lca"},
	{"binary-lifting", "hld"},
	{"segment-trees", "persistent-ds"},
	{"segment-trees", "hld"},
	{"bst", "treap"},

	// Graphs
	{"graphs", "bfs"},
	{"graphs", "dfs"},
	{"graphs", "bellman-ford"},
	{"graphs", "floyd-warshall"},
	{"graphs", "dsu"},
	{"graphs", "euler-path"},
	{"bfs", "dijkstra"},
	{"bfs", "bipartite-matching"},
	{"dfs", "topological-sort"},
	{"dfs", "scc"},
	{"dfs", "bridges-articulation"},
	{"dfs", "euler-path"},
	{"priority-queue", "dijkstra"},
	{"priority-queue", "mst"},
	{"dsu", "mst"},
	{"scc", "two-sat"},
	{"bipartite-matching", "network-flow"},
	{"topological-sort", "dp-on-graphs"},

	// DP
	{"dp-1d", "dp-2d"},
	{"dp-1d", "bitmask-dp"},
	{"dp-1d", "digit-dp"},
	{"dp-1d", "dp-on-graphs"},
	{"dp-1d", "matrix-expo"},
	{"dp-1d", "game-theory"},
	{"dp-2d", "interval-dp"},
	{"dp-2d", "floyd-warshall"},
	{"bitmask-dp", "sos-dp"},
	{"trees", "tree-dp"},
	{"dp-1d", "tree-dp"},

	// Math
	{"number-theory", "modular-arithmetic"},
	{"number-theory", "combinatorics"},
	{"modular-arithmetic", "combinatorics"},
	{"modular-arithmetic", "fft"},
	{"combinatorics", "probability"},

	// General Techniques
	{"backtracking", "meet-in-middle"},
	{"hashing", "meet-in-middle"},
	{"divide-and-conquer", "binary-search"},

	// String Algorithms
	{"strings", "hashing-string"},
	{"strings", "kmp"},
	{"strings", "z-algorithm"},
	{"strings", "trie"},
	{"strings", "suffix-array"},
	{"strings", "manacher"},
	{"trie", "aho-corasick"},
	{"kmp", "aho-corasick"},
	{"two-pointers", "manacher"},

	// Advanced DS
	{"arrays", "sqrt-decomp"},
	{"sorting", "sqrt-decomp"},
	{"priority-queue", "treap"},
}

// ── Codeforces tag → concept ID mapping ──────────────────────────────────────
// Keys are lowercase CF problem tags exactly as returned by the API.
// A single tag can map to multiple concept IDs.

var CFTagMapping = map[string][]string{
	// General / broad
	"implementation":           {"arrays"},
	"brute force":              {"backtracking"},
	"constructive algorithms":  {"greedy"},
	"data structures":          {"arrays"},
	"interactive":              {"binary-search"},

	// Core algorithms
	"greedy":                   {"greedy"},
	"sortings":                 {"sorting"},
	"binary search":            {"binary-search"},
	"two pointers":             {"two-pointers"},
	"divide and conquer":       {"divide-and-conquer"},
	"meet in the middle":       {"meet-in-middle"},
	"ternary search":           {"ternary-search"},
	"backtracking":             {"backtracking"},
	"recursion":                {"recursion"},

	// Math
	"math":                     {"math-basics"},
	"number theory":            {"number-theory"},
	"modular arithmetic":       {"modular-arithmetic"},
	"combinatorics":            {"combinatorics"},
	"probabilities":            {"probability"},
	"geometry":                 {"geometry"},
	"matrices":                 {"matrix-expo"},
	"fft":                      {"fft"},
	"games":                    {"game-theory"},
	"chinese remainder theorem":{"number-theory", "modular-arithmetic"},
	"schedules":                {"greedy"},

	// DP
	"dp":                       {"dp-1d"},
	"bitmasks":                 {"bitmask-dp"},
	"digit dp":                 {"digit-dp"},
	"tree dp":                  {"tree-dp"},
	"interval dp":              {"interval-dp"},
	"sos dp":                   {"sos-dp"},
	"knapsack":                 {"dp-1d"},
	"lis":                      {"dp-1d"},
	"lcs":                      {"dp-2d"},

	// Data structures
	"hashing":                  {"hashing"},
	"expression parsing":       {"stacks"},
	"segment tree":             {"segment-trees"},
	"fenwick tree":             {"fenwick-trees"},
	"binary indexed tree":      {"fenwick-trees"},
	"sparse table":             {"sparse-table"},
	"sqrt decomposition":       {"sqrt-decomp"},
	"mo's algorithm":           {"sqrt-decomp"},
	"persistent data structures":{"persistent-ds"},
	"treap":                    {"treap"},
	"heap":                     {"priority-queue"},
	"priority queue":           {"priority-queue"},
	"deque":                    {"deque"},
	"linked list":              {"linked-lists"},
	"stack":                    {"stacks"},
	"queue":                    {"queues"},

	// Trees
	"trees":                    {"trees"},
	"bst":                      {"bst"},
	"binary search tree":       {"bst"},
	"lca":                      {"lca"},
	"euler tour":               {"trees", "dfs"},
	"heavy light decomposition":{"hld"},
	"centroid decomposition":   {"centroid-decomp"},
	"binary lifting":           {"binary-lifting"},
	"interval tree":            {"segment-trees"},

	// Graphs
	"graphs":                   {"graphs"},
	"dfs and similar":          {"dfs"},
	"dfs":                      {"dfs"},  // bare alias used in some contexts
	"bfs":                      {"bfs"},
	"shortest paths":           {"dijkstra", "bellman-ford"},
	"dsu":                      {"dsu"},
	"topological sort":         {"topological-sort"},
	"strongly connected components": {"scc"},
	"2-sat":                    {"two-sat"},
	"bridges":                  {"bridges-articulation"},
	"articulation points":      {"bridges-articulation"},
	"minimum spanning tree":    {"mst"},
	"flows":                    {"network-flow"},
	"bipartite":                {"bipartite-matching"},
	"matching":                 {"bipartite-matching"},
	"graph matchings":          {"bipartite-matching"},
	"eulerian path":            {"euler-path"},

	// Strings
	"strings":                  {"strings"},
	"string suffix structures": {"suffix-array", "aho-corasick"},
	"suffix array":             {"suffix-array"},
	"aho-corasick":             {"aho-corasick"},
	"trie":                     {"trie"},
	"kmp":                      {"kmp"},
	"z function":               {"z-algorithm"},
	"manacher":                 {"manacher"},
	"string hashing":           {"hashing-string"},
	"palindromes":              {"manacher", "hashing-string"},
	"convex hull":              {"geometry"},
	"prefix sum":               {"arrays"},
	"sliding window":           {"sliding-window"},
}

// MapTagsToConceptIDs converts a slice of CF problem tags to unique concept IDs.
// Tags that have no mapping are silently dropped (they won't affect skill scores).
func MapTagsToConceptIDs(tags []string) []string {
	seen := make(map[string]bool)
	var result []string
	for _, tag := range tags {
		ids, ok := CFTagMapping[tag]
		if !ok {
			continue
		}
		for _, id := range ids {
			if !seen[id] {
				seen[id] = true
				result = append(result, id)
			}
		}
	}
	return result
}

// ── SeedGraph ─────────────────────────────────────────────────────────────────

// SeedGraph upserts all concept nodes and dependency edges into Neo4j.
// It is idempotent — safe to call on every startup.
func SeedGraph(ctx context.Context, driver neo4j.DriverWithContext) error {
	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	// ── 1. Upsert concept nodes ───────────────────────────────────────────────
	log.Printf("graph seed: upserting %d concept nodes", len(AllConcepts))

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		for _, c := range AllConcepts {
			_, err := tx.Run(ctx, `
				MERGE (c:Concept {id: $id})
				SET c.name             = $name,
				    c.description      = $description,
				    c.difficulty_level = $difficultyLevel
			`, map[string]any{
				"id":              c.ID,
				"name":            c.Name,
				"description":     c.Description,
				"difficultyLevel": c.DifficultyLevel,
			})
			if err != nil {
				return nil, fmt.Errorf("upsert concept %s: %w", c.ID, err)
			}
		}
		return nil, nil
	})
	if err != nil {
		return fmt.Errorf("seed concepts: %w", err)
	}

	// ── 2. Upsert dependency edges ────────────────────────────────────────────
	// Filter out edges that reference non-existent concept IDs (e.g. "prefix-sum"
	// appears as a dep target but isn't a standalone concept node).
	knownIDs := make(map[string]bool, len(AllConcepts))
	for _, c := range AllConcepts {
		knownIDs[c.ID] = true
	}

	validDeps := make([]Dependency, 0, len(AllDependencies))
	for _, d := range AllDependencies {
		if knownIDs[d.FromID] && knownIDs[d.ToID] {
			validDeps = append(validDeps, d)
		}
	}

	log.Printf("graph seed: upserting %d dependency edges", len(validDeps))

	_, err = session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		for _, d := range validDeps {
			_, err := tx.Run(ctx, `
				MATCH (from:Concept {id: $fromID})
				MATCH (to:Concept   {id: $toID})
				MERGE (from)-[:REQUIRES]->(to)
			`, map[string]any{
				"fromID": d.FromID,
				"toID":   d.ToID,
			})
			if err != nil {
				return nil, fmt.Errorf("upsert edge %s→%s: %w", d.FromID, d.ToID, err)
			}
		}
		return nil, nil
	})
	if err != nil {
		return fmt.Errorf("seed dependencies: %w", err)
	}

	log.Printf("graph seed: complete")
	return nil
}
