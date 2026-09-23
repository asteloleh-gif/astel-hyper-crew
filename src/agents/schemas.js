const { z } = require("zod");

const SourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  // OpenAI Structured Outputs supports only a subset of JSON Schema.\n  // z.string().url() emits format: "uri", which response_format rejects.\n  // Keep the wire schema as a string and require absolute HTTP(S) URLs in the prompt.\n  url: z.string().min(1),
  publishedAt: z.string().nullable(),
  supportedClaims: z.array(z.string()),
});

const ResearchOutputSchema = z.object({
  queries: z.array(z.string()),
  sources: z.array(SourceSchema),
  findings: z.array(z.object({
    claim: z.string(),
    sourceIds: z.array(z.string()),
    confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  })),
  summary: z.string(),
  gaps: z.array(z.string()),
});

const StrategyOutputSchema = z.object({
  objective: z.string(),
  audience: z.string(),
  angle: z.string(),
  hook: z.string(),
  keyPoints: z.array(z.string()),
  sourceIds: z.array(z.string()),
  platforms: z.array(z.enum(["threads", "instagram", "facebook", "youtube", "pinterest", "tiktok"])),
  language: z.enum(["ru", "uk", "en", "multi"]),
  contentType: z.enum(["post", "short-video", "carousel", "pin", "content-package"]),
});

const CopyOutputSchema = z.object({
  language: z.enum(["ru", "uk", "en", "multi"]),
  variants: z.array(z.object({
    platform: z.enum(["threads", "instagram", "facebook", "youtube", "pinterest", "tiktok"]),
    text: z.string().min(1),
    cta: z.string(),
    hashtags: z.array(z.string()),
  })),
  sourceIds: z.array(z.string()),
});

const ReviewOutputSchema = z.object({
  decision: z.enum(["PASS", "REVISE", "REJECT"]),
  notes: z.string(),
  risks: z.array(z.string()),
  unsupportedClaims: z.array(z.string()),
  revisionInstructions: z.array(z.string()),
});

const DistributionOutputSchema = z.object({
  mode: z.literal("DRAFT"),
  destinations: z.array(z.object({
    connectorId: z.enum(["social-engine", "distribution-engine"]),
    platform: z.enum(["threads", "instagram", "facebook", "youtube", "pinterest", "tiktok"]),
    accountKey: z.string(),
    format: z.string(),
    copyVariantIndex: z.number().int().nonnegative(),
    scheduledFor: z.string().nullable(),
    reason: z.string(),
  })),
  warnings: z.array(z.string()),
});

module.exports = {
  ResearchOutputSchema,
  StrategyOutputSchema,
  CopyOutputSchema,
  ReviewOutputSchema,
  DistributionOutputSchema,
};
