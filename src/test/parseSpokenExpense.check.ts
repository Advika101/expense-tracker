// Runnable self-check: `bun src/lib/parseSpokenExpense.check.ts`
import assert from "node:assert";
import { parseSpokenExpense, wordsToNumber } from "./parseSpokenExpense";

// Spelled-out numbers (what on-device dictation actually returns):
assert.equal(wordsToNumber("twenty five"), 25);
assert.equal(wordsToNumber("one hundred and twenty five"), 125);
assert.equal(wordsToNumber("thousand one hundred and twenty five"), 1125);
assert.equal(wordsToNumber("two lakh fifty thousand"), 250000);
assert.equal(wordsToNumber("just some words"), null);

assert.deepEqual(parseSpokenExpense("spent 300 on coffee"), { value: 300, description: "coffee" });
assert.deepEqual(parseSpokenExpense("I paid 1250.50 for groceries"), {
  value: 1250.5,
  description: "groceries",
});
assert.equal(parseSpokenExpense("250 rupees at Dominos")?.value, 250);
assert.equal(parseSpokenExpense("250 rupees at Dominos")?.description, "Dominos");
assert.equal(parseSpokenExpense("hello there"), null); // no amount → not an expense
assert.equal(parseSpokenExpense("spent 300 groceries")?.description, "groceries"); // no "on/for/at"

// Spoken-number transcript (the reported case):
assert.deepEqual(parseSpokenExpense("thousand one hundred and twenty five on am retail"), {
  value: 1125,
  description: "am retail",
});

console.log("✓ parseSpokenExpense passed");
