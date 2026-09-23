const { z } = require("zod");

function createEdieTools({ sdk, analyticsService } = {}) {
  if (!sdk?.tool || !analyticsService) return [];

  const daysSchema = z.number().int().min(1).max(3650).default(7);
  const projectSchema = z.string().nullable().default(null);

  return [
    sdk.tool({
      name: "analytics_overview",
      description: "Read the normalized Astel analytics overview: metrics by source, known AI/tool costs, and source sync health. Use this before making claims about current performance.",
      parameters: z.object({
        days: daysSchema,
        projectId: projectSchema,
      }),
      execute: async ({ days, projectId }) => analyticsService.overview({ days, projectId }),
    }),
    sdk.tool({
      name: "analytics_content",
      description: "Read latest normalized content metrics from connected sources such as YouTube and Social Engine.",
      parameters: z.object({
        days: daysSchema,
        projectId: projectSchema,
        limit: z.number().int().min(1).max(500).default(100),
      }),
      execute: async ({ days, projectId, limit }) => analyticsService.content({ days, projectId, limit }),
    }),
    sdk.tool({
      name: "analytics_costs",
      description: "Read AI/tool cost ledger and token usage. Costs are only treated as exact when the ledger has a known price; unknown-cost rows remain explicitly unknown.",
      parameters: z.object({
        days: daysSchema,
        projectId: projectSchema,
        groupBy: z.enum(["agent", "model", "provider", "source", "service"]).default("agent"),
      }),
      execute: async ({ days, projectId, groupBy }) => analyticsService.costs({ days, projectId, groupBy }),
    }),
    sdk.tool({
      name: "analytics_agents",
      description: "Read Hyper Crew agent requests, token usage and attributable AI cost by agent.",
      parameters: z.object({
        days: daysSchema,
        projectId: projectSchema,
      }),
      execute: async ({ days, projectId }) => analyticsService.agents({ days, projectId }),
    }),
    sdk.tool({
      name: "analytics_sync",
      description: "Refresh configured read-only analytics connectors. Use only when the owner explicitly asks for fresh/current analytics or a refresh.",
      parameters: z.object({
        days: z.number().int().min(1).max(365).default(30),
        connectorIds: z.array(z.string()).nullable().default(null),
      }),
      execute: async ({ days, connectorIds }) => analyticsService.sync({ days, connectorIds }),
    }),
  ];
}

module.exports = { createEdieTools };
