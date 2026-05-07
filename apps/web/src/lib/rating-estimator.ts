// Concept tier map — which CF rating band each concept first becomes relevant.
// Tier weights: 1→1.0, 2→1.5, 3→2.0, 4→2.5, 5→3.0, 6→4.0
const CONCEPT_TIER: Record<string, number> = {
  // Tier 1 — 800-1099
  arrays: 1, strings: 1, 'math-basics': 1, recursion: 1, complexity: 1,
  sorting: 1, hashing: 1, 'linked-lists': 1, stacks: 1, queues: 1,

  // Tier 2 — 1100-1399
  'binary-search': 2, 'two-pointers': 2, 'sliding-window': 2, deque: 2,
  'priority-queue': 2, trees: 2, 'binary-trees': 2, bst: 2, graphs: 2,
  bfs: 2, dfs: 2, 'dp-1d': 2, greedy: 2, backtracking: 2, 'hashing-string': 2,

  // Tier 3 — 1400-1699
  'ternary-search': 3, 'segment-trees': 3, 'fenwick-trees': 3,
  'topological-sort': 3, dijkstra: 3, dsu: 3, 'dp-2d': 3,
  'divide-and-conquer': 3, kmp: 3, 'z-algorithm': 3, trie: 3,
  'number-theory': 3, 'modular-arithmetic': 3, 'game-theory': 3,
  'binary-lifting': 3, mst: 3, 'sparse-table': 3, lca: 3,

  // Tier 4 — 1700-1999
  scc: 4, 'bridges-articulation': 4, 'bipartite-matching': 4,
  'bellman-ford': 4, 'floyd-warshall': 4, 'tree-dp': 4, 'bitmask-dp': 4,
  'interval-dp': 4, 'dp-on-graphs': 4, 'digit-dp': 4, 'meet-in-middle': 4,
  'sqrt-decomp': 4, 'matrix-expo': 4, geometry: 4, 'euler-path': 4,
  manacher: 4, 'suffix-array': 4, combinatorics: 4, probability: 4,

  // Tier 5 — 2000-2399
  'network-flow': 5, hld: 5, 'centroid-decomp': 5, 'sos-dp': 5,
  'two-sat': 5, 'aho-corasick': 5, 'persistent-ds': 5, treap: 5,

  // Tier 6 — 2400+
  fft: 6,
};

const TIER_WEIGHT: Record<number, number> = {
  1: 1.0, 2: 1.5, 3: 2.0, 4: 2.5, 5: 3.0, 6: 4.0,
};

export function estimateRating(strengths: Record<string, number>): number {
  let weightedSum = 0;
  let maxPossible = 0;

  for (const [conceptId, tier] of Object.entries(CONCEPT_TIER)) {
    const weight = TIER_WEIGHT[tier];
    const strength = strengths[conceptId] ?? 0;
    weightedSum += strength * weight;
    maxPossible += 100 * weight;
  }

  if (maxPossible === 0) return 0;
  const ratio = weightedSum / maxPossible;
  return Math.round(Math.max(800, Math.min(3500, 800 + ratio * 2700)));
}

export function ratingGapMessage(estimated: number, actual: number): string {
  const gap = estimated - actual;
  if (gap > 300) return 'Strong fundamentals — more contest practice needed';
  if (gap > 0)   return 'Well matched with your contest performance';
  if (gap > -300) return 'Contest-hardened — concept depth is the next unlock';
  return 'Contest experience well ahead of concept coverage';
}

const CF_CACHE_KEY = (handle: string) => `cf_rating:${handle}`;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function fetchActualRating(handle: string): Promise<number | null> {
  try {
    const cacheRaw = localStorage.getItem(CF_CACHE_KEY(handle));
    if (cacheRaw) {
      const { rating, ts } = JSON.parse(cacheRaw) as { rating: number; ts: number };
      if (Date.now() - ts < CACHE_TTL_MS) return rating;
    }
  } catch {}

  try {
    const res = await fetch(
      `https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    const data = await res.json();
    const rating: number = data?.result?.[0]?.rating ?? null;
    if (rating != null) {
      localStorage.setItem(CF_CACHE_KEY(handle), JSON.stringify({ rating, ts: Date.now() }));
    }
    return rating ?? null;
  } catch {
    return null;
  }
}
