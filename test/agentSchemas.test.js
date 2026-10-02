const test = require("node:test");
const assert = require("node:assert/strict");
const { z } = require("zod");
const {
  ResearchOutputSchema,
  ReviewOutputSchema,
  VisualOutputSchema,
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


test("visual contract produces an editor-ready draft", () => {
  const value = VisualOutputSchema.parse({
    mode: "DRAFT",
    concept: "Fast character fact",
    hookFrame: "Character close-up with one-line hook",
    palette: ["black", "white", "pink", "lime"],
    typography: ["condensed bold"],
    shots: [{
      order: 0,
      purpose: "hook",
      sourceHint: "T2-S005",
      onScreenText: "JASON WAS IN THE ARMY?",
      treatment: "sharp proof window over soft moving background",
    }],
    assets: [],
    editorHandoff: ["Keep the first cut under two seconds"],
  });
  assert.equal(value.mode, "DRAFT");
  assert.equal(value.shots[0].purpose, "hook");
});
