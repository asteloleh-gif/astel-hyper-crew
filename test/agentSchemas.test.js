const test = require("node:test");
const assert = require("node:assert/strict");
const { z } = require("zod");
const {
  ResearchOutputSchema,
  ReviewOutputSchema,
  DistributionOutputSchema,
} = require("../src/agents/schemas");

test("research contract avoids unsupported URI format in structured outputs", () => {
  const jsonSchema = z.toJSONSchema(ResearchOutputSchema);
  assert.equal(JSON.stringify(jsonSchema).includes('"format":"uri"'), false);
});

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
