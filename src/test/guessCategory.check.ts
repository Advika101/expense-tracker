// Runnable self-check: `bun src/lib/guessCategory.check.ts`
import assert from "node:assert";
import type { Category, Expense } from "../types/expense";
import { buildHaystacks, guessCategory } from "../lib/guessCategory";

const cats: Category[] = [
  { id: "food", name: "Food & Dining", icon: "", color: "", createdAt: "" },
  { id: "travel", name: "Transport", icon: "", color: "", createdAt: "" },
  { id: "other", name: "Others", icon: "", color: "", createdAt: "" },
];

const mk = (category: string, description: string, tags: string[] = []): Expense => ({
  id: category + description,
  value: 1,
  category,
  description,
  tags,
  date: "2026-01-01",
  time: "10:00",
  isAdhoc: false,
  createdAt: "",
  updatedAt: "",
});

const past = buildHaystacks([
  mk("food", "coffee", ["morning"]),
  mk("food", "coffee with a friend"),
  mk("travel", "uber to office", ["cab"]),
]);

assert.equal(guessCategory("coffee", past), "food"); // 2 food matches vs 0
assert.equal(guessCategory("uber", past), "travel");
assert.equal(guessCategory("cab", past), "travel"); // matches a tag, not a description
assert.equal(guessCategory("something entirely new", past), undefined); // no categories → undefined

// Category-name matching works with NO history:
assert.equal(guessCategory("food", [], cats), "food"); // "food" ∈ "food & dining"
assert.equal(guessCategory("transport", [], cats), "travel");

// No match, but categories provided → falls back to "Others":
assert.equal(guessCategory("mystery", [], cats), "other");
assert.equal(guessCategory("coffee", past, cats), "food"); // history still wins over fallback

console.log("✓ guessCategory passed");
