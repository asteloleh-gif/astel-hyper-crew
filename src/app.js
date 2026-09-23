const express = require("express");

function createApp({ orchestrator, projectRegistry, agentRegistry, apiToken = "" } = {}) {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.get("/health", (_req, res) => res.json({ status: "ok", service: "astel-hyper-crew", version: "0.1.0" }));
  app.use("/v1", (req, res, next) => {
    if (!apiToken) return res.status(503).json({ error: "INTERNAL_API_TOKEN_NOT_CONFIGURED" });
    if (req.get("authorization") !== `Bearer ${apiToken}`) return res.status(401).json({ error: "UNAUTHORIZED" });
    next();
  });
  app.get("/v1/projects", (_req, res) => res.json({ projects: projectRegistry.list() }));
  app.get("/v1/agents", (_req, res) => res.json({ agents: agentRegistry.list() }));
  app.get("/v1/runs", async (_req, res, next) => { try { res.json({ runs: await orchestrator.listRuns() }); } catch (e) { next(e); } });
  app.get("/v1/runs/:id", async (req, res, next) => { try { const run = await orchestrator.getRun(req.params.id); res.status(run ? 200 : 404).json(run || { error: "NOT_FOUND" }); } catch (e) { next(e); } });
  app.post("/v1/runs", async (req, res, next) => { try { res.status(201).json(await orchestrator.createRun(req.body)); } catch (e) { next(e); } });
  app.post("/v1/runs/:id/start", async (req, res, next) => { try { res.json(await orchestrator.start(req.params.id)); } catch (e) { next(e); } });
  app.post("/v1/runs/:id/decisions", async (req, res, next) => { try { res.json(await orchestrator.decide(req.params.id, req.body)); } catch (e) { next(e); } });
  app.use((error, _req, res, _next) => res.status(400).json({ error: "REQUEST_FAILED", message: error.message }));
  return app;
}

module.exports = { createApp };
