const test = require("node:test");
const assert = require("node:assert/strict");
const { ReviewOutputSchema, DistributionOutputSchema } = require("../src/agents/schemas");

test("review contract accepts explicit decisions", () => {
  const value = ReviewOutputSchema.parse({
    decision: "PASS",
    notes: "Ready for Oleg",
    risks: [],
    unsupportedClaims: [],
    revisionInstructions: [],
  });
  assert.equal(value.decision, "PASS");
});

test("distribution contract cannot claim published mode", () => {
  assert.throws(() => DistributionOutputSchema.parse({
    mode: "PUBLISHED",
    destinations: [],
    warnings: [],
  }));
});
