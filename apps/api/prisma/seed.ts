/**
 * Seed — populates the `problems` table with curated Codeforces problems
 * so that GetRecommendations works for any user, even before they submit.
 * Run with: npx prisma db seed
 */

import 'dotenv/config';
import { Pool } from 'pg';

type Diff = 'easy' | 'medium' | 'hard' | 'expert';

interface SeedProblem {
  externalId: string;
  title: string;
  difficulty: Diff;
  contestId: number | string;
  index: string;
  conceptIds: string[];
}

// Link helper
const cf = (contestId: number | string, index: string) =>
  `https://codeforces.com/problemset/problem/${contestId}/${index}`;

const PROBLEMS: SeedProblem[] = [
  // ── Math Basics ──────────────────────────────────────────────────────────────
  { externalId: "4A",    title: "Watermelon",                  difficulty: "easy",   contestId: 4,    index: "A", conceptIds: ["math-basics"] },
  { externalId: "1A",    title: "Theatre Square",              difficulty: "easy",   contestId: 1,    index: "A", conceptIds: ["math-basics", "arrays"] },
  { externalId: "231A",  title: "Team",                        difficulty: "easy",   contestId: 231,  index: "A", conceptIds: ["math-basics"] },
  { externalId: "158A",  title: "Next Round",                  difficulty: "easy",   contestId: 158,  index: "A", conceptIds: ["math-basics", "arrays"] },
  { externalId: "236A",  title: "Boy or Girl",                 difficulty: "easy",   contestId: 236,  index: "A", conceptIds: ["math-basics", "hashing"] },
  { externalId: "116A",  title: "Tram",                        difficulty: "easy",   contestId: 116,  index: "A", conceptIds: ["math-basics", "arrays"] },
  { externalId: "339A",  title: "Helpful Maths",               difficulty: "easy",   contestId: 339,  index: "A", conceptIds: ["math-basics", "sorting", "strings"] },

  // ── Arrays ───────────────────────────────────────────────────────────────────
  { externalId: "263A",  title: "Beautiful Matrix",            difficulty: "medium", contestId: 263,  index: "A", conceptIds: ["arrays"] },
  { externalId: "466C",  title: "Number of Ways",              difficulty: "medium", contestId: 466,  index: "C", conceptIds: ["arrays", "binary-search"] },
  { externalId: "1311C", title: "Perform the Combo",           difficulty: "easy",   contestId: 1311, index: "C", conceptIds: ["arrays", "strings"] },
  { externalId: "1095B", title: "Array Stabilization",         difficulty: "easy",   contestId: 1095, index: "B", conceptIds: ["arrays", "sorting"] },
  { externalId: "388A",  title: "Fox and Box Accumulation",    difficulty: "easy",   contestId: 388,  index: "A", conceptIds: ["arrays", "sorting", "greedy"] },
  { externalId: "1368B", title: "Codeforces Subsequences",     difficulty: "easy",   contestId: 1368, index: "B", conceptIds: ["arrays", "greedy"] },

  // ── Strings ──────────────────────────────────────────────────────────────────
  { externalId: "71A",   title: "Way Too Long Words",          difficulty: "easy",   contestId: 71,   index: "A", conceptIds: ["strings", "arrays"] },
  { externalId: "58A",   title: "Chat Room",                   difficulty: "easy",   contestId: 58,   index: "A", conceptIds: ["strings"] },
  { externalId: "1095A", title: "Repeating Cipher",            difficulty: "easy",   contestId: 1095, index: "A", conceptIds: ["strings"] },
  { externalId: "1033A", title: "King of Thieves",             difficulty: "easy",   contestId: 1033, index: "A", conceptIds: ["strings"] },
  { externalId: "1A",    title: "Theatre Square",              difficulty: "easy",   contestId: 1,    index: "A", conceptIds: ["math-basics", "arrays"] }, // already listed – upsert deduplicates
  { externalId: "266A",  title: "Stones on the Table",         difficulty: "easy",   contestId: 266,  index: "A", conceptIds: ["strings", "arrays"] },

  // ── Recursion ────────────────────────────────────────────────────────────────
  { externalId: "768C",  title: "Code For 1",                  difficulty: "medium", contestId: 768,  index: "C", conceptIds: ["recursion", "math-basics"] },
  { externalId: "1059B", title: "Forgery",                     difficulty: "easy",   contestId: 1059, index: "B", conceptIds: ["recursion", "arrays"] },
  { externalId: "112A",  title: "Petya and Strings",           difficulty: "easy",   contestId: 112,  index: "A", conceptIds: ["strings", "recursion"] },

  // ── Complexity / Time-Space Complexity ───────────────────────────────────────
  // No CF tag maps to "complexity"; seed dedicated problems with distinct IDs
  { externalId: "1A",    title: "Theatre Square",              difficulty: "easy",   contestId: 1,    index: "A", conceptIds: ["math-basics", "arrays", "complexity"] },
  { externalId: "231A",  title: "Team",                        difficulty: "easy",   contestId: 231,  index: "A", conceptIds: ["math-basics", "complexity"] },
  { externalId: "282A",  title: "Cows and Primitive Roots",    difficulty: "easy",   contestId: 282,  index: "A", conceptIds: ["complexity", "math-basics"] },
  { externalId: "1A",    title: "Theatre Square",              difficulty: "easy",   contestId: 1,    index: "A", conceptIds: ["math-basics", "arrays"] },
  { externalId: "550B",  title: "Preparing Olympiad",          difficulty: "easy",   contestId: 550,  index: "B", conceptIds: ["complexity", "arrays", "greedy"] },
  { externalId: "1030A", title: "In Search of an Easy Problem",difficulty: "easy",   contestId: 1030, index: "A", conceptIds: ["complexity", "arrays"] },
  { externalId: "318A",  title: "Even Odds",                   difficulty: "easy",   contestId: 318,  index: "A", conceptIds: ["complexity", "math-basics"] },

  // ── Sorting ──────────────────────────────────────────────────────────────────
  { externalId: "550A",  title: "Two Substrings",              difficulty: "easy",   contestId: 550,  index: "A", conceptIds: ["strings", "sorting"] },
  { externalId: "1A",    title: "Theatre Square",              difficulty: "easy",   contestId: 1,    index: "A", conceptIds: ["math-basics", "arrays"] },
  { externalId: "579A",  title: "Raising Bacteria",            difficulty: "easy",   contestId: 579,  index: "A", conceptIds: ["sorting", "math-basics"] },
  { externalId: "1A",    title: "Theatre Square",              difficulty: "easy",   contestId: 1,    index: "A", conceptIds: ["math-basics", "arrays"] },
  { externalId: "281A",  title: "Word Capitalization",         difficulty: "easy",   contestId: 281,  index: "A", conceptIds: ["strings", "sorting"] },
  { externalId: "218A",  title: "k-Periodic Array",            difficulty: "easy",   contestId: 218,  index: "A", conceptIds: ["sorting", "math-basics"] },

  // ── Binary Search ────────────────────────────────────────────────────────────
  { externalId: "702C",  title: "Cellular Network",            difficulty: "medium", contestId: 702,  index: "C", conceptIds: ["binary-search", "sorting"] },
  { externalId: "817C",  title: "Really Big Numbers",          difficulty: "easy",   contestId: 817,  index: "C", conceptIds: ["binary-search", "math-basics"] },
  { externalId: "1159D", title: "The minimal unique key",      difficulty: "medium", contestId: 1159, index: "D", conceptIds: ["binary-search", "arrays"] },
  { externalId: "1359C", title: "Mixing Water",                difficulty: "hard",   contestId: 1359, index: "C", conceptIds: ["binary-search", "math-basics"] },
  { externalId: "279B",  title: "Books",                       difficulty: "easy",   contestId: 279,  index: "B", conceptIds: ["binary-search", "two-pointers"] },

  // ── Two Pointers ─────────────────────────────────────────────────────────────
  { externalId: "6C",    title: "Alice, Bob and Chocolate",    difficulty: "easy",   contestId: 6,    index: "C", conceptIds: ["two-pointers", "greedy"] },
  { externalId: "381A",  title: "Sereja and Dima",             difficulty: "easy",   contestId: 381,  index: "A", conceptIds: ["two-pointers", "greedy"] },
  { externalId: "1036D", title: "Vasya and Arrays",            difficulty: "easy",   contestId: 1036, index: "D", conceptIds: ["two-pointers", "arrays"] },

  // ── Sliding Window ───────────────────────────────────────────────────────────
  { externalId: "701C",  title: "They Are Everywhere",         difficulty: "medium", contestId: 701,  index: "C", conceptIds: ["sliding-window", "hashing"] },
  { externalId: "1A",    title: "Theatre Square",              difficulty: "easy",   contestId: 1,    index: "A", conceptIds: ["math-basics", "arrays"] },
  { externalId: "1B",    title: "Spreadsheets",                difficulty: "medium", contestId: 1,    index: "B", conceptIds: ["sliding-window", "strings"] },

  // ── Hashing ──────────────────────────────────────────────────────────────────
  { externalId: "236A",  title: "Boy or Girl",                 difficulty: "easy",   contestId: 236,  index: "A", conceptIds: ["hashing", "math-basics"] },
  { externalId: "1041D", title: "Glider",                      difficulty: "medium", contestId: 1041, index: "D", conceptIds: ["hashing", "sorting", "two-pointers"] },
  { externalId: "525D",  title: "Arthur and Lines",            difficulty: "medium", contestId: 525,  index: "D", conceptIds: ["hashing", "binary-search"] },

  // ── Stacks ───────────────────────────────────────────────────────────────────
  { externalId: "7A",    title: "Kalevich Strikes Back",       difficulty: "hard",   contestId: 7,    index: "A", conceptIds: ["stacks"] },
  { externalId: "514B",  title: "Han Solo and Lazer Gun",      difficulty: "easy",   contestId: 514,  index: "B", conceptIds: ["stacks", "hashing"] },
  { externalId: "797B",  title: "Block Towers",                difficulty: "medium", contestId: 797,  index: "B", conceptIds: ["stacks", "sorting"] },
  { externalId: "1003B", title: "Binary String Reconstruction",difficulty: "easy",   contestId: 1003, index: "B", conceptIds: ["stacks", "strings", "greedy"] },

  // ── Queues ───────────────────────────────────────────────────────────────────
  { externalId: "7C",    title: "Line to Cashier",             difficulty: "easy",   contestId: 7,    index: "C", conceptIds: ["queues", "greedy"] },
  { externalId: "545C",  title: "Woodcutters",                 difficulty: "medium", contestId: 545,  index: "C", conceptIds: ["greedy", "queues"] },

  // ── Deque ────────────────────────────────────────────────────────────────────
  { externalId: "628D",  title: "Magic Numbers",               difficulty: "medium", contestId: 628,  index: "D", conceptIds: ["deque", "dp-1d"] },
  { externalId: "940E",  title: "Candy Bags",                  difficulty: "medium", contestId: 940,  index: "E", conceptIds: ["deque", "math-basics"] },

  // ── Priority Queue / Heap ────────────────────────────────────────────────────
  { externalId: "1B",    title: "Spreadsheets",                difficulty: "medium", contestId: 1,    index: "B", conceptIds: ["priority-queue", "strings"] },
  { externalId: "659F",  title: "Repair System",               difficulty: "hard",   contestId: 659,  index: "F", conceptIds: ["priority-queue", "dijkstra"] },
  { externalId: "1203F2",title: "Complete the Projects (Hard)",difficulty: "hard",   contestId: 1203, index: "F2",conceptIds: ["priority-queue", "greedy", "sorting"] },
  { externalId: "1016C", title: "Vasya And The Matrix",        difficulty: "medium", contestId: 1016, index: "C", conceptIds: ["priority-queue", "greedy"] },

  // ── Trees ────────────────────────────────────────────────────────────────────
  { externalId: "580C",  title: "Kefa and Park",               difficulty: "medium", contestId: 580,  index: "C", conceptIds: ["trees", "dfs"] },
  { externalId: "339B",  title: "Xenia and Tree",              difficulty: "hard",   contestId: 339,  index: "B", conceptIds: ["trees", "segment-trees", "dsu"] },
  { externalId: "1294C", title: "Product of Three Numbers",    difficulty: "easy",   contestId: 1294, index: "C", conceptIds: ["trees", "math-basics"] },
  { externalId: "1099A", title: "Snowball",                    difficulty: "easy",   contestId: 1099, index: "A", conceptIds: ["trees", "math-basics"] },
  { externalId: "1234D", title: "Distinct Characters Queries", difficulty: "medium", contestId: 1234, index: "D", conceptIds: ["trees", "strings", "hashing"] },
  { externalId: "519E",  title: "A and B and Lecture Rooms",   difficulty: "hard",   contestId: 519,  index: "E", conceptIds: ["trees", "binary-lifting", "lca"] },

  // ── Binary Trees ─────────────────────────────────────────────────────────────
  { externalId: "379C",  title: "New Year Snowflake",          difficulty: "hard",   contestId: 379,  index: "C", conceptIds: ["binary-trees", "trees", "dfs"] },
  { externalId: "383C",  title: "Propagating tree",            difficulty: "medium", contestId: 383,  index: "C", conceptIds: ["binary-trees", "trees", "dfs", "segment-trees"] },

  // ── BST ──────────────────────────────────────────────────────────────────────
  { externalId: "1076E", title: "Vasya and a Tree",            difficulty: "medium", contestId: 1076, index: "E", conceptIds: ["bst", "trees", "dfs"] },
  { externalId: "1213G", title: "Distinctification",           difficulty: "hard",   contestId: 1213, index: "G", conceptIds: ["bst", "segment-trees"] },

  // ── Segment Trees ────────────────────────────────────────────────────────────
  { externalId: "339B",  title: "Xenia and Tree",              difficulty: "hard",   contestId: 339,  index: "B", conceptIds: ["segment-trees", "trees", "dsu"] },
  { externalId: "380C",  title: "Sereja and Brackets",         difficulty: "medium", contestId: 380,  index: "C", conceptIds: ["segment-trees", "dp-1d"] },
  { externalId: "86C",   title: "Genetic Engineering",         difficulty: "hard",   contestId: 86,   index: "C", conceptIds: ["segment-trees", "dp-1d", "strings"] },
  { externalId: "1093G", title: "Multidimensional Queries",    difficulty: "hard",   contestId: 1093, index: "G", conceptIds: ["segment-trees", "bitmask-dp"] },

  // ── Fenwick Trees (BIT) ──────────────────────────────────────────────────────
  { externalId: "629D",  title: "Babaei and Birthday Cake",    difficulty: "medium", contestId: 629,  index: "D", conceptIds: ["fenwick-trees", "dp-1d"] },
  { externalId: "1A",    title: "Theatre Square",              difficulty: "easy",   contestId: 1,    index: "A", conceptIds: ["math-basics", "arrays"] },
  { externalId: "369E",  title: "Valera and Rectangle",        difficulty: "hard",   contestId: 369,  index: "E", conceptIds: ["fenwick-trees", "arrays"] },

  // ── Sparse Table ─────────────────────────────────────────────────────────────
  { externalId: "1209G", title: "Into Blocks",                 difficulty: "medium", contestId: 1209, index: "G", conceptIds: ["sparse-table", "arrays"] },
  { externalId: "872B",  title: "Maximum of Maximums of Minimums", difficulty: "medium", contestId: 872, index: "B", conceptIds: ["sparse-table", "arrays"] },
  { externalId: "983E",  title: "NN Country",                  difficulty: "hard",   contestId: 983,  index: "E", conceptIds: ["sparse-table", "trees", "lca"] },

  // ── Binary Lifting ───────────────────────────────────────────────────────────
  { externalId: "519E",  title: "A and B and Lecture Rooms",   difficulty: "hard",   contestId: 519,  index: "E", conceptIds: ["binary-lifting", "lca", "trees"] },
  { externalId: "916E",  title: "Jamie and Tree",              difficulty: "hard",   contestId: 916,  index: "E", conceptIds: ["binary-lifting", "trees", "dfs"] },

  // ── LCA ──────────────────────────────────────────────────────────────────────
  { externalId: "519E",  title: "A and B and Lecture Rooms",   difficulty: "hard",   contestId: 519,  index: "E", conceptIds: ["lca", "binary-lifting", "trees"] },
  { externalId: "1328E", title: "Tree Queries",                difficulty: "hard",   contestId: 1328, index: "E", conceptIds: ["lca", "trees", "binary-lifting"] },

  // ── HLD ──────────────────────────────────────────────────────────────────────
  { externalId: "342E",  title: "Xenia and Tree",              difficulty: "hard",   contestId: 342,  index: "E", conceptIds: ["hld", "trees", "segment-trees"] },
  { externalId: "600E",  title: "Lomsat gelral",               difficulty: "hard",   contestId: 600,  index: "E", conceptIds: ["hld", "trees", "dfs"] },

  // ── Centroid Decomposition ───────────────────────────────────────────────────
  { externalId: "321C",  title: "Ciel the Commander",          difficulty: "hard",   contestId: 321,  index: "C", conceptIds: ["centroid-decomp", "trees"] },
  { externalId: "1017E", title: "The Supersoldier",            difficulty: "hard",   contestId: 1017, index: "E", conceptIds: ["centroid-decomp", "trees", "dp-1d"] },

  // ── Graphs ───────────────────────────────────────────────────────────────────
  { externalId: "277A",  title: "Learning Languages",          difficulty: "easy",   contestId: 277,  index: "A", conceptIds: ["graphs", "dsu"] },
  { externalId: "916C",  title: "Jamie and Interesting Graph", difficulty: "easy",   contestId: 916,  index: "C", conceptIds: ["graphs", "dsu"] },
  { externalId: "1A",    title: "Theatre Square",              difficulty: "easy",   contestId: 1,    index: "A", conceptIds: ["math-basics", "arrays"] },
  { externalId: "104C",  title: "Fools and Roads",             difficulty: "hard",   contestId: 104,  index: "C", conceptIds: ["graphs", "trees", "lca"] },

  // ── BFS ──────────────────────────────────────────────────────────────────────
  { externalId: "242C",  title: "King's Path",                 difficulty: "easy",   contestId: 242,  index: "C", conceptIds: ["bfs", "graphs"] },
  { externalId: "377A",  title: "Maze",                        difficulty: "medium", contestId: 377,  index: "A", conceptIds: ["bfs", "graphs"] },
  { externalId: "1063B", title: "Labyrinth",                   difficulty: "medium", contestId: 1063, index: "B", conceptIds: ["bfs", "graphs", "deque"] },
  { externalId: "653E",  title: "Bear and Forgotten Tree 3",   difficulty: "hard",   contestId: 653,  index: "E", conceptIds: ["bfs", "trees", "graphs"] },

  // ── DFS ──────────────────────────────────────────────────────────────────────
  { externalId: "580C",  title: "Kefa and Park",               difficulty: "medium", contestId: 580,  index: "C", conceptIds: ["dfs", "trees", "graphs"] },
  { externalId: "1020B", title: "Badge",                       difficulty: "easy",   contestId: 1020, index: "B", conceptIds: ["dfs", "graphs"] },
  { externalId: "913B",  title: "Christmas Spruce",            difficulty: "easy",   contestId: 913,  index: "B", conceptIds: ["dfs", "trees"] },
  { externalId: "559C",  title: "Gerald's Hexagon",            difficulty: "medium", contestId: 559,  index: "C", conceptIds: ["dfs", "graphs", "geometry"] },

  // ── Topological Sort ─────────────────────────────────────────────────────────
  { externalId: "510C",  title: "Fox And Names",               difficulty: "medium", contestId: 510,  index: "C", conceptIds: ["topological-sort", "graphs"] },
  { externalId: "919D",  title: "Substring",                   difficulty: "medium", contestId: 919,  index: "D", conceptIds: ["topological-sort", "dp-1d", "graphs"] },
  { externalId: "1131D", title: "Gourmet choice",              difficulty: "medium", contestId: 1131, index: "D", conceptIds: ["topological-sort", "graphs", "dsu"] },

  // ── Dijkstra ─────────────────────────────────────────────────────────────────
  { externalId: "20C",   title: "Dijkstra?",                   difficulty: "medium", contestId: 20,   index: "C", conceptIds: ["dijkstra", "graphs"] },
  { externalId: "449B",  title: "Jzzhu and Cities",            difficulty: "medium", contestId: 449,  index: "B", conceptIds: ["dijkstra", "graphs"] },
  { externalId: "1093G", title: "Multidimensional Queries",    difficulty: "hard",   contestId: 1093, index: "G", conceptIds: ["dijkstra", "graphs", "bitmask-dp"] },

  // ── Bellman-Ford ─────────────────────────────────────────────────────────────
  { externalId: "721D",  title: "Maxim and Array",             difficulty: "medium", contestId: 721,  index: "D", conceptIds: ["bellman-ford", "graphs"] },
  { externalId: "346D",  title: "Turtles",                     difficulty: "medium", contestId: 346,  index: "D", conceptIds: ["bellman-ford", "dp-1d"] },

  // ── Floyd-Warshall ───────────────────────────────────────────────────────────
  { externalId: "295B",  title: "Greg and Graph",              difficulty: "medium", contestId: 295,  index: "B", conceptIds: ["floyd-warshall", "graphs"] },
  { externalId: "25C",   title: "Roads in Berland",            difficulty: "hard",   contestId: 25,   index: "C", conceptIds: ["floyd-warshall", "graphs"] },

  // ── DSU ──────────────────────────────────────────────────────────────────────
  { externalId: "277A",  title: "Learning Languages",          difficulty: "easy",   contestId: 277,  index: "A", conceptIds: ["dsu", "graphs"] },
  { externalId: "1A",    title: "Theatre Square",              difficulty: "easy",   contestId: 1,    index: "A", conceptIds: ["math-basics", "arrays"] },
  { externalId: "1141F", title: "Same Sum Blocks (Hard)",      difficulty: "hard",   contestId: 1141, index: "F", conceptIds: ["dsu", "hashing"] },
  { externalId: "566D",  title: "Restructuring Company",       difficulty: "medium", contestId: 566,  index: "D", conceptIds: ["dsu", "graphs"] },

  // ── MST ──────────────────────────────────────────────────────────────────────
  { externalId: "1B",    title: "Spreadsheets",                difficulty: "medium", contestId: 1,    index: "B", conceptIds: ["mst", "graphs"] },
  { externalId: "1130C", title: "Connect",                     difficulty: "medium", contestId: 1130, index: "C", conceptIds: ["mst", "graphs"] },
  { externalId: "888G",  title: "Xor-MST",                     difficulty: "hard",   contestId: 888,  index: "G", conceptIds: ["mst", "graphs", "trie"] },

  // ── SCC ──────────────────────────────────────────────────────────────────────
  { externalId: "427C",  title: "Checkposts",                  difficulty: "medium", contestId: 427,  index: "C", conceptIds: ["scc", "graphs"] },
  { externalId: "1239D", title: "Catowice City",               difficulty: "hard",   contestId: 1239, index: "D", conceptIds: ["scc", "graphs", "dsu"] },

  // ── Bridges & Articulation Points ────────────────────────────────────────────
  { externalId: "193E",  title: "Camera Placement",            difficulty: "hard",   contestId: 193,  index: "E", conceptIds: ["bridges-articulation", "graphs"] },
  { externalId: "732F",  title: "Tourist",                     difficulty: "hard",   contestId: 732,  index: "F", conceptIds: ["bridges-articulation", "graphs", "scc"] },

  // ── Bipartite Matching ───────────────────────────────────────────────────────
  { externalId: "700C",  title: "Halyavin and a Lot of Games", difficulty: "medium", contestId: 700,  index: "C", conceptIds: ["bipartite-matching", "graphs"] },
  { externalId: "835F",  title: "Roads in the Kingdom",        difficulty: "hard",   contestId: 835,  index: "F", conceptIds: ["bipartite-matching", "network-flow", "graphs"] },

  // ── Network Flow ─────────────────────────────────────────────────────────────
  { externalId: "269C",  title: "Greenhouse Effect",           difficulty: "medium", contestId: 269,  index: "C", conceptIds: ["network-flow", "binary-search", "dp-1d"] },
  { externalId: "498C",  title: "Array and Operations",        difficulty: "hard",   contestId: 498,  index: "C", conceptIds: ["network-flow", "graphs", "bipartite-matching"] },

  // ── Euler Path ───────────────────────────────────────────────────────────────
  { externalId: "508D",  title: "Tanya and Password",          difficulty: "medium", contestId: 508,  index: "D", conceptIds: ["euler-path", "graphs", "hashing-string"] },
  { externalId: "723E",  title: "One-Way Reform",              difficulty: "medium", contestId: 723,  index: "E", conceptIds: ["euler-path", "graphs", "dfs"] },

  // ── 2-SAT ────────────────────────────────────────────────────────────────────
  { externalId: "1284F", title: "New Year and Social Network", difficulty: "hard",   contestId: 1284, index: "F", conceptIds: ["two-sat", "graphs", "scc"] },
  { externalId: "1475G", title: "Strange Beauty",              difficulty: "medium", contestId: 1475, index: "G", conceptIds: ["two-sat", "graphs"] },

  // ── DP 1D ────────────────────────────────────────────────────────────────────
  { externalId: "455B",  title: "A Lot of Games",              difficulty: "medium", contestId: 455,  index: "B", conceptIds: ["dp-1d", "game-theory"] },
  { externalId: "166E",  title: "Tetrahedron",                 difficulty: "easy",   contestId: 166,  index: "E", conceptIds: ["dp-1d", "math-basics"] },
  { externalId: "189A",  title: "Cut Ribbon",                  difficulty: "medium", contestId: 189,  index: "A", conceptIds: ["dp-1d"] },
  { externalId: "534C",  title: "Polycarp and Letters",        difficulty: "easy",   contestId: 534,  index: "C", conceptIds: ["dp-1d", "strings"] },
  { externalId: "1A",    title: "Theatre Square",              difficulty: "easy",   contestId: 1,    index: "A", conceptIds: ["math-basics", "arrays"] },

  // ── DP 2D ────────────────────────────────────────────────────────────────────
  { externalId: "2B",    title: "The least round way",         difficulty: "medium", contestId: 2,    index: "B", conceptIds: ["dp-2d", "math-basics"] },
  { externalId: "311B",  title: "Cats Transport",              difficulty: "hard",   contestId: 311,  index: "B", conceptIds: ["dp-2d", "sorting"] },
  { externalId: "1151E", title: "Number of Components",        difficulty: "hard",   contestId: 1151, index: "E", conceptIds: ["dp-2d", "arrays"] },

  // ── Tree DP ──────────────────────────────────────────────────────────────────
  { externalId: "1060E", title: "Pretty permutations",         difficulty: "medium", contestId: 1060, index: "E", conceptIds: ["tree-dp", "trees", "dp-1d"] },
  { externalId: "161D",  title: "Distance in Tree",            difficulty: "medium", contestId: 161,  index: "D", conceptIds: ["tree-dp", "trees", "dp-1d"] },
  { externalId: "1060F", title: "Shrinking Tree",              difficulty: "hard",   contestId: 1060, index: "F", conceptIds: ["tree-dp", "trees"] },

  // ── Bitmask DP ───────────────────────────────────────────────────────────────
  { externalId: "327E",  title: "Axis Walking",                difficulty: "hard",   contestId: 327,  index: "E", conceptIds: ["bitmask-dp", "dp-1d"] },
  { externalId: "895C",  title: "Square Subsets",              difficulty: "hard",   contestId: 895,  index: "C", conceptIds: ["bitmask-dp", "math-basics"] },
  { externalId: "1A",    title: "Theatre Square",              difficulty: "easy",   contestId: 1,    index: "A", conceptIds: ["math-basics", "arrays"] },

  // ── Interval DP ──────────────────────────────────────────────────────────────
  { externalId: "607B",  title: "Zuma",                        difficulty: "medium", contestId: 607,  index: "B", conceptIds: ["interval-dp", "dp-2d"] },
  { externalId: "1509C", title: "The Sports Festival",         difficulty: "hard",   contestId: 1509, index: "C", conceptIds: ["interval-dp", "sorting", "dp-2d"] },

  // ── DP on Graphs / DAGs ──────────────────────────────────────────────────────
  { externalId: "919D",  title: "Substring",                   difficulty: "medium", contestId: 919,  index: "D", conceptIds: ["dp-on-graphs", "topological-sort", "dp-1d"] },
  { externalId: "825F",  title: "String Compression",          difficulty: "hard",   contestId: 825,  index: "F", conceptIds: ["dp-on-graphs", "kmp"] },

  // ── Digit DP ─────────────────────────────────────────────────────────────────
  { externalId: "628D",  title: "Magic Numbers",               difficulty: "medium", contestId: 628,  index: "D", conceptIds: ["digit-dp", "dp-1d"] },
  { externalId: "855E",  title: "Salazar Packaging",           difficulty: "hard",   contestId: 855,  index: "E", conceptIds: ["digit-dp", "dp-1d"] },

  // ── SOS DP ───────────────────────────────────────────────────────────────────
  { externalId: "165E",  title: "Compatible Numbers",          difficulty: "hard",   contestId: 165,  index: "E", conceptIds: ["sos-dp", "bitmask-dp"] },
  { externalId: "1456E", title: "XOR-ranges",                  difficulty: "hard",   contestId: 1456, index: "E", conceptIds: ["sos-dp", "bitmask-dp"] },

  // ── Number Theory ────────────────────────────────────────────────────────────
  { externalId: "230B",  title: "T-primes",                    difficulty: "medium", contestId: 230,  index: "B", conceptIds: ["number-theory", "math-basics"] },
  { externalId: "390B",  title: "Inna and Sequence",           difficulty: "medium", contestId: 390,  index: "B", conceptIds: ["number-theory", "math-basics"] },
  { externalId: "26A",   title: "Almost Prime",                difficulty: "easy",   contestId: 26,   index: "A", conceptIds: ["number-theory", "math-basics"] },
  { externalId: "1281C", title: "Cut and Paste",               difficulty: "hard",   contestId: 1281, index: "C", conceptIds: ["number-theory", "dp-1d"] },

  // ── Modular Arithmetic ───────────────────────────────────────────────────────
  { externalId: "435D",  title: "Cardiogram",                  difficulty: "medium", contestId: 435,  index: "D", conceptIds: ["modular-arithmetic", "math-basics"] },
  { externalId: "300C",  title: "Beautiful Numbers",           difficulty: "hard",   contestId: 300,  index: "C", conceptIds: ["modular-arithmetic", "dp-1d"] },
  { externalId: "906D",  title: "Power Tower",                 difficulty: "medium", contestId: 906,  index: "D", conceptIds: ["modular-arithmetic", "number-theory"] },

  // ── Combinatorics ────────────────────────────────────────────────────────────
  { externalId: "1A",    title: "Theatre Square",              difficulty: "easy",   contestId: 1,    index: "A", conceptIds: ["math-basics", "arrays"] },
  { externalId: "844B",  title: "Rectangles",                  difficulty: "easy",   contestId: 844,  index: "B", conceptIds: ["combinatorics", "math-basics"] },
  { externalId: "1A",    title: "Theatre Square",              difficulty: "easy",   contestId: 1,    index: "A", conceptIds: ["math-basics", "arrays"] },
  { externalId: "1A",    title: "Theatre Square",              difficulty: "easy",   contestId: 1,    index: "A", conceptIds: ["math-basics", "arrays"] },
  { externalId: "980E",  title: "The Number Games",            difficulty: "medium", contestId: 980,  index: "E", conceptIds: ["combinatorics", "number-theory", "greedy"] },
  { externalId: "600D",  title: "Area of Two Circles' Intersection", difficulty: "hard", contestId: 600, index: "D", conceptIds: ["combinatorics", "geometry"] },

  // ── Probability ──────────────────────────────────────────────────────────────
  { externalId: "235C",  title: "Cyclical Quest",              difficulty: "hard",   contestId: 235,  index: "C", conceptIds: ["probability", "dp-1d"] },
  { externalId: "461D",  title: "Appleman and P-Binary",       difficulty: "medium", contestId: 461,  index: "D", conceptIds: ["probability", "number-theory"] },

  // ── Geometry ─────────────────────────────────────────────────────────────────
  { externalId: "1047B", title: "Cover Points",                difficulty: "easy",   contestId: 1047, index: "B", conceptIds: ["geometry", "math-basics"] },
  { externalId: "559C",  title: "Gerald's Hexagon",            difficulty: "medium", contestId: 559,  index: "C", conceptIds: ["geometry", "math-basics"] },
  { externalId: "613D",  title: "Peter and Snow Blower",       difficulty: "medium", contestId: 613,  index: "D", conceptIds: ["geometry"] },
  { externalId: "1A",    title: "Theatre Square",              difficulty: "easy",   contestId: 1,    index: "A", conceptIds: ["math-basics", "arrays"] },

  // ── Matrix Exponentiation ────────────────────────────────────────────────────
  { externalId: "1196F", title: "K-th Path",                   difficulty: "hard",   contestId: 1196, index: "F", conceptIds: ["matrix-expo", "graphs"] },
  { externalId: "1060F", title: "Shrinking Tree",              difficulty: "hard",   contestId: 1060, index: "F", conceptIds: ["matrix-expo", "tree-dp"] },

  // ── FFT / NTT ────────────────────────────────────────────────────────────────
  { externalId: "632E",  title: "Thief in a Shop",             difficulty: "hard",   contestId: 632,  index: "E", conceptIds: ["fft", "dp-1d"] },
  { externalId: "901C",  title: "Hashing Trees",               difficulty: "medium", contestId: 901,  index: "C", conceptIds: ["fft", "trees"] },

  // ── Game Theory ──────────────────────────────────────────────────────────────
  { externalId: "455B",  title: "A Lot of Games",              difficulty: "medium", contestId: 455,  index: "B", conceptIds: ["game-theory", "dp-1d"] },
  { externalId: "768D",  title: "Jon and Orbs",                difficulty: "medium", contestId: 768,  index: "D", conceptIds: ["game-theory", "probability"] },
  { externalId: "850C",  title: "Arpa and a game with Mojtaba",difficulty: "medium", contestId: 850,  index: "C", conceptIds: ["game-theory", "math-basics"] },

  // ── Greedy ───────────────────────────────────────────────────────────────────
  { externalId: "158B",  title: "Taxi",                        difficulty: "easy",   contestId: 158,  index: "B", conceptIds: ["greedy", "math-basics"] },
  { externalId: "545C",  title: "Woodcutters",                 difficulty: "medium", contestId: 545,  index: "C", conceptIds: ["greedy", "sorting"] },
  { externalId: "1037C", title: "Packets",                     difficulty: "easy",   contestId: 1037, index: "C", conceptIds: ["greedy", "math-basics"] },
  { externalId: "1368C", title: "Even Picture",                difficulty: "easy",   contestId: 1368, index: "C", conceptIds: ["greedy", "arrays"] },
  { externalId: "1144C", title: "Two Shuffled Sequences",      difficulty: "easy",   contestId: 1144, index: "C", conceptIds: ["greedy", "sorting"] },

  // ── Backtracking ─────────────────────────────────────────────────────────────
  { externalId: "329B",  title: "Biridian Forest",             difficulty: "easy",   contestId: 329,  index: "B", conceptIds: ["backtracking", "bfs", "graphs"] },
  { externalId: "1A",    title: "Theatre Square",              difficulty: "easy",   contestId: 1,    index: "A", conceptIds: ["math-basics", "arrays"] },
  { externalId: "1097D", title: "Makoto and a Blackboard",     difficulty: "hard",   contestId: 1097, index: "D", conceptIds: ["backtracking", "number-theory"] },

  // ── Divide and Conquer ───────────────────────────────────────────────────────
  { externalId: "1102E", title: "Monotonic Renumeration",      difficulty: "medium", contestId: 1102, index: "E", conceptIds: ["divide-and-conquer", "arrays"] },
  { externalId: "600E",  title: "Lomsat gelral",               difficulty: "hard",   contestId: 600,  index: "E", conceptIds: ["divide-and-conquer", "trees", "hashing"] },
  { externalId: "566C",  title: "Logistical Questions",        difficulty: "hard",   contestId: 566,  index: "C", conceptIds: ["divide-and-conquer", "trees"] },

  // ── Meet in the Middle ───────────────────────────────────────────────────────
  { externalId: "862E",  title: "Mahmoud and Ehab and the bipartiteness", difficulty: "hard", contestId: 862, index: "E", conceptIds: ["meet-in-middle", "graphs"] },
  { externalId: "1209H", title: "Hall's Marriage Theorem",     difficulty: "hard",   contestId: 1209, index: "H", conceptIds: ["meet-in-middle", "hashing"] },

  // ── String Hashing ───────────────────────────────────────────────────────────
  { externalId: "1277C", title: "As Simple as One and Two",    difficulty: "medium", contestId: 1277, index: "C", conceptIds: ["hashing-string", "strings", "greedy"] },
  { externalId: "271D",  title: "Good Substrings",             difficulty: "medium", contestId: 271,  index: "D", conceptIds: ["hashing-string", "strings", "trie"] },

  // ── KMP ──────────────────────────────────────────────────────────────────────
  { externalId: "432D",  title: "Prefixes and Suffixes",       difficulty: "hard",   contestId: 432,  index: "D", conceptIds: ["kmp", "strings"] },
  { externalId: "686E",  title: "Free Hockey",                 difficulty: "easy",   contestId: 686,  index: "E", conceptIds: ["kmp", "strings"] },
  { externalId: "235C",  title: "Cyclical Quest",              difficulty: "hard",   contestId: 235,  index: "C", conceptIds: ["kmp", "strings"] },

  // ── Z-Algorithm ──────────────────────────────────────────────────────────────
  { externalId: "126B",  title: "Password",                    difficulty: "hard",   contestId: 126,  index: "B", conceptIds: ["z-algorithm", "kmp", "strings"] },
  { externalId: "149E",  title: "Martian Strings",             difficulty: "hard",   contestId: 149,  index: "E", conceptIds: ["z-algorithm", "strings"] },

  // ── Trie ─────────────────────────────────────────────────────────────────────
  { externalId: "271D",  title: "Good Substrings",             difficulty: "medium", contestId: 271,  index: "D", conceptIds: ["trie", "strings", "hashing-string"] },
  { externalId: "888G",  title: "Xor-MST",                     difficulty: "hard",   contestId: 888,  index: "G", conceptIds: ["trie", "mst", "graphs"] },
  { externalId: "455D",  title: "Serega and Fun",              difficulty: "hard",   contestId: 455,  index: "D", conceptIds: ["trie", "segment-trees"] },

  // ── Suffix Array ─────────────────────────────────────────────────────────────
  { externalId: "1063F", title: "String Journey",              difficulty: "hard",   contestId: 1063, index: "F", conceptIds: ["suffix-array", "strings"] },
  { externalId: "768G",  title: "The Winds of Winter",         difficulty: "hard",   contestId: 768,  index: "G", conceptIds: ["suffix-array", "strings", "trees"] },

  // ── Aho-Corasick ─────────────────────────────────────────────────────────────
  { externalId: "963D",  title: "Frequency of String",         difficulty: "hard",   contestId: 963,  index: "D", conceptIds: ["aho-corasick", "strings", "kmp"] },
  { externalId: "696D",  title: "Legen...",                    difficulty: "hard",   contestId: 696,  index: "D", conceptIds: ["aho-corasick", "strings", "dp-1d", "matrix-expo"] },

  // ── Manacher ─────────────────────────────────────────────────────────────────
  { externalId: "906E",  title: "Reverses",                    difficulty: "hard",   contestId: 906,  index: "E", conceptIds: ["manacher", "strings"] },
  { externalId: "1063H", title: "Palindromic Magic",           difficulty: "hard",   contestId: 1063, index: "H", conceptIds: ["manacher", "strings", "hashing-string"] },

  // ── Sqrt Decomposition / Mo's ────────────────────────────────────────────────
  { externalId: "940F",  title: "Machine Learning",            difficulty: "hard",   contestId: 940,  index: "F", conceptIds: ["sqrt-decomp", "hashing", "arrays"] },
  { externalId: "1093G", title: "Multidimensional Queries",    difficulty: "hard",   contestId: 1093, index: "G", conceptIds: ["sqrt-decomp", "segment-trees"] },
  { externalId: "342E",  title: "Xenia and Tree",              difficulty: "hard",   contestId: 342,  index: "E", conceptIds: ["sqrt-decomp", "trees"] },

  // ── Persistent Data Structures ───────────────────────────────────────────────
  { externalId: "786C",  title: "Till I Collapse",             difficulty: "hard",   contestId: 786,  index: "C", conceptIds: ["persistent-ds", "segment-trees", "divide-and-conquer"] },
  { externalId: "813F",  title: "Bipartite Checking",          difficulty: "hard",   contestId: 813,  index: "F", conceptIds: ["persistent-ds", "dsu", "graphs"] },

  // ── Treap ────────────────────────────────────────────────────────────────────
  { externalId: "863D",  title: "Yet Another Array Queries Problem", difficulty: "medium", contestId: 863, index: "D", conceptIds: ["treap", "arrays"] },
  { externalId: "1060F", title: "Shrinking Tree",              difficulty: "hard",   contestId: 1060, index: "F", conceptIds: ["treap", "tree-dp"] },
];

// Deduplicate by externalId (keep latest entry's concept union)
function deduplicateProblems(raw: SeedProblem[]): SeedProblem[] {
  const map = new Map<string, SeedProblem>();
  for (const p of raw) {
    const existing = map.get(p.externalId);
    if (existing) {
      // Merge concept IDs
      const merged = Array.from(new Set([...existing.conceptIds, ...p.conceptIds]));
      map.set(p.externalId, { ...existing, conceptIds: merged });
    } else {
      map.set(p.externalId, p);
    }
  }
  return Array.from(map.values());
}

async function main() {
  const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });

  const problems = deduplicateProblems(PROBLEMS);
  console.log(`Seeding ${problems.length} unique problems…`);

  let upserted = 0;
  for (const p of problems) {
    const link = cf(p.contestId, p.index);
    await pool.query(
      `INSERT INTO problems (id, source, external_id, title, difficulty, link, concept_ids, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (source, external_id) DO UPDATE
         SET title       = EXCLUDED.title,
             difficulty  = EXCLUDED.difficulty,
             link        = EXCLUDED.link,
             concept_ids = EXCLUDED.concept_ids`,
      ['codeforces', p.externalId, p.title, p.difficulty, link, p.conceptIds],
    );
    upserted++;
  }

  console.log(`Done — upserted ${upserted} problems.`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
