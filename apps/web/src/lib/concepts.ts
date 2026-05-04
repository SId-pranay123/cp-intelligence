// Mirrors AllConcepts + AllDependencies in apps/processor/internal/graph/seed.go.

export interface ConceptMeta {
  id: string;
  name: string;
}

export interface ConceptGroup {
  label: string;
  concepts: ConceptMeta[];
}

export interface ConceptEdge {
  from: string;
  to: string;
}

export const CONCEPT_GROUPS: ConceptGroup[] = [
  {
    label: 'Foundations',
    concepts: [
      { id: 'arrays', name: 'Arrays' },
      { id: 'strings', name: 'Strings' },
      { id: 'math-basics', name: 'Math Basics' },
      { id: 'recursion', name: 'Recursion' },
      { id: 'complexity', name: 'Complexity' },
    ],
  },
  {
    label: 'Sorting & Searching',
    concepts: [
      { id: 'sorting', name: 'Sorting' },
      { id: 'binary-search', name: 'Binary Search' },
      { id: 'two-pointers', name: 'Two Pointers' },
      { id: 'sliding-window', name: 'Sliding Window' },
      { id: 'ternary-search', name: 'Ternary Search' },
    ],
  },
  {
    label: 'Linear Structures',
    concepts: [
      { id: 'hashing', name: 'Hashing' },
      { id: 'linked-lists', name: 'Linked Lists' },
      { id: 'stacks', name: 'Stacks' },
      { id: 'queues', name: 'Queues' },
      { id: 'deque', name: 'Deque' },
      { id: 'priority-queue', name: 'Priority Queue' },
    ],
  },
  {
    label: 'Trees',
    concepts: [
      { id: 'trees', name: 'Trees' },
      { id: 'binary-trees', name: 'Binary Trees' },
      { id: 'bst', name: 'BST' },
      { id: 'segment-trees', name: 'Segment Trees' },
      { id: 'fenwick-trees', name: 'Fenwick Trees' },
      { id: 'sparse-table', name: 'Sparse Table' },
      { id: 'binary-lifting', name: 'Binary Lifting' },
      { id: 'lca', name: 'LCA' },
      { id: 'hld', name: 'HLD' },
      { id: 'centroid-decomp', name: 'Centroid Decomp' },
    ],
  },
  {
    label: 'Graphs',
    concepts: [
      { id: 'graphs', name: 'Graphs' },
      { id: 'bfs', name: 'BFS' },
      { id: 'dfs', name: 'DFS' },
      { id: 'topological-sort', name: 'Topo Sort' },
      { id: 'dijkstra', name: 'Dijkstra' },
      { id: 'bellman-ford', name: 'Bellman-Ford' },
      { id: 'floyd-warshall', name: 'Floyd-Warshall' },
      { id: 'dsu', name: 'DSU' },
      { id: 'mst', name: 'MST' },
      { id: 'scc', name: 'SCC' },
      { id: 'bridges-articulation', name: 'Bridges & AP' },
      { id: 'bipartite-matching', name: 'Bipartite Match' },
      { id: 'network-flow', name: 'Network Flow' },
      { id: 'euler-path', name: 'Euler Path' },
      { id: 'two-sat', name: '2-SAT' },
    ],
  },
  {
    label: 'Dynamic Programming',
    concepts: [
      { id: 'dp-1d', name: '1D DP' },
      { id: 'dp-2d', name: '2D DP' },
      { id: 'tree-dp', name: 'Tree DP' },
      { id: 'bitmask-dp', name: 'Bitmask DP' },
      { id: 'interval-dp', name: 'Interval DP' },
      { id: 'dp-on-graphs', name: 'DP on Graphs' },
      { id: 'digit-dp', name: 'Digit DP' },
      { id: 'sos-dp', name: 'SOS DP' },
    ],
  },
  {
    label: 'Math',
    concepts: [
      { id: 'number-theory', name: 'Number Theory' },
      { id: 'modular-arithmetic', name: 'Modular Arith' },
      { id: 'combinatorics', name: 'Combinatorics' },
      { id: 'probability', name: 'Probability' },
      { id: 'geometry', name: 'Geometry' },
      { id: 'matrix-expo', name: 'Matrix Expo' },
      { id: 'fft', name: 'FFT / NTT' },
      { id: 'game-theory', name: 'Game Theory' },
    ],
  },
  {
    label: 'General Techniques',
    concepts: [
      { id: 'greedy', name: 'Greedy' },
      { id: 'backtracking', name: 'Backtracking' },
      { id: 'divide-and-conquer', name: 'D&C' },
      { id: 'meet-in-middle', name: 'Meet in Middle' },
    ],
  },
  {
    label: 'String Algorithms',
    concepts: [
      { id: 'hashing-string', name: 'String Hashing' },
      { id: 'kmp', name: 'KMP' },
      { id: 'z-algorithm', name: 'Z-Algorithm' },
      { id: 'trie', name: 'Trie' },
      { id: 'suffix-array', name: 'Suffix Array' },
      { id: 'aho-corasick', name: 'Aho-Corasick' },
      { id: 'manacher', name: "Manacher's" },
    ],
  },
  {
    label: 'Advanced Structures',
    concepts: [
      { id: 'sqrt-decomp', name: 'Sqrt Decomp' },
      { id: 'persistent-ds', name: 'Persistent DS' },
      { id: 'treap', name: 'Treap' },
    ],
  },
];

// Mirrors AllDependencies in seed.go. Edge means: from is a prereq for to.
export const CONCEPT_EDGES: ConceptEdge[] = [
  // Foundations
  { from: 'arrays', to: 'sorting' },
  { from: 'arrays', to: 'binary-search' },
  { from: 'arrays', to: 'two-pointers' },
  { from: 'arrays', to: 'hashing' },
  { from: 'arrays', to: 'linked-lists' },
  { from: 'arrays', to: 'stacks' },
  { from: 'arrays', to: 'queues' },
  { from: 'arrays', to: 'dp-1d' },
  { from: 'arrays', to: 'fenwick-trees' },
  { from: 'arrays', to: 'sliding-window' },
  { from: 'arrays', to: 'graphs' },
  { from: 'arrays', to: 'sqrt-decomp' },
  { from: 'math-basics', to: 'number-theory' },
  { from: 'math-basics', to: 'geometry' },
  { from: 'math-basics', to: 'game-theory' },
  { from: 'recursion', to: 'backtracking' },
  { from: 'recursion', to: 'divide-and-conquer' },
  { from: 'recursion', to: 'dp-1d' },
  { from: 'recursion', to: 'trees' },
  // Sorting & Searching
  { from: 'sorting', to: 'binary-search' },
  { from: 'sorting', to: 'two-pointers' },
  { from: 'sorting', to: 'greedy' },
  { from: 'sorting', to: 'suffix-array' },
  { from: 'sorting', to: 'sqrt-decomp' },
  { from: 'binary-search', to: 'ternary-search' },
  { from: 'divide-and-conquer', to: 'binary-search' },
  { from: 'two-pointers', to: 'sliding-window' },
  { from: 'two-pointers', to: 'manacher' },
  // Linear Structures
  { from: 'queues', to: 'bfs' },
  { from: 'queues', to: 'deque' },
  { from: 'stacks', to: 'dfs' },
  { from: 'stacks', to: 'deque' },
  { from: 'hashing', to: 'hashing-string' },
  { from: 'hashing', to: 'meet-in-middle' },
  // Trees
  { from: 'linked-lists', to: 'trees' },
  { from: 'trees', to: 'binary-trees' },
  { from: 'trees', to: 'binary-lifting' },
  { from: 'trees', to: 'tree-dp' },
  { from: 'trees', to: 'hld' },
  { from: 'trees', to: 'centroid-decomp' },
  { from: 'trees', to: 'euler-path' },
  { from: 'binary-trees', to: 'bst' },
  { from: 'binary-trees', to: 'segment-trees' },
  { from: 'binary-trees', to: 'priority-queue' },
  { from: 'binary-lifting', to: 'lca' },
  { from: 'binary-lifting', to: 'hld' },
  { from: 'segment-trees', to: 'persistent-ds' },
  { from: 'segment-trees', to: 'hld' },
  { from: 'bst', to: 'treap' },
  { from: 'priority-queue', to: 'treap' },
  // Graphs
  { from: 'graphs', to: 'bfs' },
  { from: 'graphs', to: 'dfs' },
  { from: 'graphs', to: 'bellman-ford' },
  { from: 'graphs', to: 'floyd-warshall' },
  { from: 'graphs', to: 'dsu' },
  { from: 'graphs', to: 'euler-path' },
  { from: 'bfs', to: 'dijkstra' },
  { from: 'bfs', to: 'bipartite-matching' },
  { from: 'dfs', to: 'topological-sort' },
  { from: 'dfs', to: 'scc' },
  { from: 'dfs', to: 'bridges-articulation' },
  { from: 'dfs', to: 'euler-path' },
  { from: 'priority-queue', to: 'dijkstra' },
  { from: 'priority-queue', to: 'mst' },
  { from: 'dsu', to: 'mst' },
  { from: 'scc', to: 'two-sat' },
  { from: 'bipartite-matching', to: 'network-flow' },
  { from: 'topological-sort', to: 'dp-on-graphs' },
  // Dynamic Programming
  { from: 'dp-1d', to: 'dp-2d' },
  { from: 'dp-1d', to: 'bitmask-dp' },
  { from: 'dp-1d', to: 'digit-dp' },
  { from: 'dp-1d', to: 'dp-on-graphs' },
  { from: 'dp-1d', to: 'matrix-expo' },
  { from: 'dp-1d', to: 'game-theory' },
  { from: 'dp-1d', to: 'tree-dp' },
  { from: 'dp-2d', to: 'interval-dp' },
  { from: 'dp-2d', to: 'floyd-warshall' },
  { from: 'bitmask-dp', to: 'sos-dp' },
  // Math
  { from: 'number-theory', to: 'modular-arithmetic' },
  { from: 'number-theory', to: 'combinatorics' },
  { from: 'modular-arithmetic', to: 'combinatorics' },
  { from: 'modular-arithmetic', to: 'fft' },
  { from: 'combinatorics', to: 'probability' },
  // General Techniques
  { from: 'backtracking', to: 'meet-in-middle' },
  // Strings
  { from: 'strings', to: 'hashing-string' },
  { from: 'strings', to: 'kmp' },
  { from: 'strings', to: 'z-algorithm' },
  { from: 'strings', to: 'trie' },
  { from: 'strings', to: 'suffix-array' },
  { from: 'strings', to: 'manacher' },
  { from: 'trie', to: 'aho-corasick' },
  { from: 'kmp', to: 'aho-corasick' },
];

export const TOTAL_CONCEPTS = CONCEPT_GROUPS.reduce(
  (sum, g) => sum + g.concepts.length,
  0,
);
