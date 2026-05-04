// Exact mirror of CFTagMapping in apps/processor/internal/graph/seed.go.
// Keep in sync when entries are added or renamed there.
const TAG_MAP: Record<string, string[]> = {
  // General
  'implementation':             ['arrays'],
  'brute force':                ['backtracking'],
  'constructive algorithms':    ['greedy'],
  'data structures':            ['arrays'],
  'interactive':                ['binary-search'],
  'greedy':                     ['greedy'],
  'sortings':                   ['sorting'],
  'binary search':              ['binary-search'],
  'two pointers':               ['two-pointers'],
  'divide and conquer':         ['divide-and-conquer'],
  'meet in the middle':         ['meet-in-middle'],
  'ternary search':             ['ternary-search'],
  'backtracking':               ['backtracking'],
  'recursion':                  ['recursion'],

  // Math
  'math':                       ['math-basics'],
  'number theory':              ['number-theory'],
  'modular arithmetic':         ['modular-arithmetic'],
  'combinatorics':              ['combinatorics'],
  'probabilities':              ['probability'],
  'geometry':                   ['geometry'],
  'matrices':                   ['matrix-expo'],
  'fft':                        ['fft'],
  'games':                      ['game-theory'],
  'chinese remainder theorem':  ['number-theory', 'modular-arithmetic'],
  'schedules':                  ['greedy'],

  // DP
  'dp':                         ['dp-1d'],
  'bitmasks':                   ['bitmask-dp'],
  'digit dp':                   ['digit-dp'],
  'tree dp':                    ['tree-dp'],
  'interval dp':                ['interval-dp'],
  'sos dp':                     ['sos-dp'],
  'knapsack':                   ['dp-1d'],
  'lis':                        ['dp-1d'],
  'lcs':                        ['dp-2d'],

  // Data structures
  'hashing':                    ['hashing'],
  'expression parsing':         ['stacks'],
  'segment tree':               ['segment-trees'],
  'fenwick tree':               ['fenwick-trees'],
  'binary indexed tree':        ['fenwick-trees'],
  'sparse table':               ['sparse-table'],
  'sqrt decomposition':         ['sqrt-decomp'],
  "mo's algorithm":             ['sqrt-decomp'],
  'persistent data structures': ['persistent-ds'],
  'treap':                      ['treap'],
  'heap':                       ['priority-queue'],
  'priority queue':             ['priority-queue'],
  'deque':                      ['deque'],
  'linked list':                ['linked-lists'],
  'stack':                      ['stacks'],
  'queue':                      ['queues'],
  'trees':                      ['trees'],
  'bst':                        ['bst'],
  'binary search tree':         ['bst'],
  'lca':                        ['lca'],
  'euler tour':                 ['trees', 'dfs'],
  'heavy light decomposition':  ['hld'],
  'centroid decomposition':     ['centroid-decomp'],
  'binary lifting':             ['binary-lifting'],
  'interval tree':              ['segment-trees'],

  // Graphs
  'graphs':                     ['graphs'],
  'bfs':                        ['bfs'],
  'dfs':                        ['dfs'],
  'dfs and similar':            ['dfs'],
  'shortest paths':             ['dijkstra'],
  'topological sort':           ['topological-sort'],
  'strongly connected components': ['scc'],
  '2-sat':                      ['two-sat'],
  'bridges':                    ['bridges-articulation'],
  'articulation points':        ['bridges-articulation'],
  'minimum spanning tree':      ['mst'],
  'flows':                      ['network-flow'],
  'bipartite':                  ['bipartite-matching'],
  'matching':                   ['bipartite-matching'],
  'graph matchings':            ['bipartite-matching'],
  'eulerian path':              ['euler-path'],

  // Strings
  'strings':                    ['strings'],
  'string suffix structures':   ['suffix-array', 'aho-corasick'],
  'suffix array':               ['suffix-array'],
  'aho-corasick':               ['aho-corasick'],
  'trie':                       ['trie'],
  'kmp':                        ['kmp'],
  'z function':                 ['z-algorithm'],
  'manacher':                   ['manacher'],
  'string hashing':             ['hashing-string'],
  'palindromes':                ['manacher', 'hashing-string'],
  'convex hull':                ['geometry'],
  'prefix sum':                 ['arrays'],
  'sliding window':             ['sliding-window'],
};

export function mapTagsToConceptIds(tags: string[]): string[] {
  const seen = new Set<string>();
  for (const tag of tags) {
    const concepts = TAG_MAP[tag.toLowerCase()];
    if (concepts) {
      for (const c of concepts) seen.add(c);
    }
  }
  return [...seen];
}

export function ratingToDifficulty(rating: number | undefined): string {
  if (!rating) return 'unknown';
  if (rating < 1200) return 'easy';
  if (rating <= 1600) return 'medium';
  if (rating <= 2000) return 'hard';
  return 'expert';
}
