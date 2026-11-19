export interface SpokenExpense {
  value: number;
  description?: string;
}

const SMALL: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
// Multipliers, incl. Indian lakh/crore since the default recognition language is en-IN.
// ponytail: "hundred" is treated as a plain scale, so nested forms like "five hundred thousand"
//           won't compound correctly. Fine for expense amounts; revisit if that ever shows up.
const SCALES: Record<string, number> = {
  hundred: 100, thousand: 1000, lakh: 100000, million: 1000000, crore: 10000000,
};

// Convert spelled-out numbers to a value: "thousand one hundred and twenty five" → 1125.
// Returns null if no number words are present.
export function wordsToNumber(text: string): number | null {
  const tokens = text.toLowerCase().replace(/-/g, " ").split(/\s+/).filter(Boolean);
  let current = 0;
  let total = 0;
  let matched = false;

  for (const tok of tokens) {
    if (tok === "and") continue;
    if (tok in SMALL) {
      current += SMALL[tok];
      matched = true;
    } else if (tok in SCALES) {
      total += (current || 1) * SCALES[tok];
      current = 0;
      matched = true;
    }
    // any other word (rupees, spent, …) is ignored
  }

  return matched ? total + current : null;
}

// Parse a dictated expense like "spent 300 on coffee" or "thousand one hundred on retail".
// Returns null when there's no positive amount. Caller fills category/date/time.
// ponytail: regex + a compact words-to-number pass. Swap for a local SLM only if real phrasing
//           breaks it — don't ship a model to read a number out of a sentence.
export function parseSpokenExpense(text: string): SpokenExpense | null {
  // Split off the description first: the phrase after "on" / "for" / "at".
  const after = text.match(/(?:\bon\b|\bfor\b|\bat\b)\s+(.+)$/i);
  const amountPart = after ? text.slice(0, after.index) : text;

  // Amount: prefer digits ("1250.50"), else spelled-out words ("thousand one hundred…").
  const digits = amountPart.match(/\d+(?:[.,]\d{1,2})?/);
  const value = digits ? Number(digits[0].replace(",", ".")) : wordsToNumber(amountPart);
  if (value === null || !Number.isFinite(value) || value <= 0) return null;

  // Description: the phrase after on/for/at; else strip the number + filler words from the rest.
  const description = (
    after?.[1] ??
    amountPart
      .replace(/\d+(?:[.,]\d{1,2})?/, " ")
      .replace(/\b(i|spent|paid|rupees?|rs|inr|dollars?|bucks|on|for|at|a|an|the)\b/gi, " ")
      .replace(/\s+/g, " ")
  ).trim();

  return { value, description: description || undefined };
}
