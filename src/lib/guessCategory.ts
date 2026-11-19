import type { Category, Expense } from "@/types/expense";

// Guess a category id from the spoken words by scoring two signals:
//   1. history — how often those words appear in past expenses (learns your habits)
//   2. category names — a direct match, so it works even with zero history
// Returns the highest-scoring category id; when nothing matches it falls back to the
// "Others" category so the field always ends up set (never left stale). Returns undefined
// only if categories weren't provided / there's no "Others".
//
// ponytail: substring frequency count over data we already have (zero deps). Swap the body
//           for embedding nearest-neighbour search (all-MiniLM / EmbeddingGemma) only if fuzzy
//           phrasing ("flat white" ≠ "coffee") proves too dumb — the signature can stay the same.

// One searchable string per past expense. Build once (buildHaystacks) and keep it —
// don't recompute per keystroke/dictation, it grows with history.
export type Haystack = { category: string; text: string };

export function buildHaystacks(past: Expense[]): Haystack[] {
  return past.map((e) => ({
    category: e.category,
    text: `${e.description ?? ""} ${e.tags.join(" ")}`.toLowerCase(),
  }));
}

export function guessCategory(
  description: string,
  past: Haystack[],
  categories: Category[] = [],
): string | undefined {
  const fallback = categories.find((c) => c.name === "Others")?.id;

  const words = description
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3); // skip noise words like "a", "on"
  if (!words.length) return fallback;

  const score: Record<string, number> = {};

  // 1. History: what category did I use last time I mentioned this?
  for (const e of past) {
    if (words.some((w) => e.text.includes(w))) {
      score[e.category] = (score[e.category] ?? 0) + 1;
    }
  }

  // 2. Category names: "food" → "Food & Dining", works with no history at all.
  for (const c of categories) {
    const name = c.name.toLowerCase();
    if (words.some((w) => name.includes(w))) {
      score[c.id] = (score[c.id] ?? 0) + 2; // weight a direct name hit above one history hit
    }
  }

  return Object.entries(score).sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback;
}
