// Mirrors AllConcepts in apps/processor/internal/graph/seed.go.
// Used by the weakness heatmap to group and label the 71 concept nodes.

export interface ConceptMeta {
  id: string;
  name: string;
}

export interface ConceptGroup {
  label: string;
  concepts: ConceptMeta[];
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

export const TOTAL_CONCEPTS = CONCEPT_GROUPS.reduce(
  (sum, g) => sum + g.concepts.length,
  0,
);
