import express, { type Request, type Response } from "express";
import { runOnce, getDecisionHistory, getDecisionById } from "./services/agentLoop.js";
import { config, isDemoMode } from "./config.js";
import { logger } from "./logger.js";

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /decisions
 * Returns all recorded decisions (most recent first).
 */
app.get("/decisions", (_req: Request, res: Response) => {
  const decisions = getDecisionHistory();
  // Return most recent first
  const sorted = [...decisions].reverse();
  res.json({ count: sorted.length, decisions: sorted });
});

/**
 * GET /decisions/:id
 * Returns a single decision by its on-chain decisionId.
 */
app.get("/decisions/:id", (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid decision ID" });
    return;
  }

  const decision = getDecisionById(id);
  if (!decision) {
    res.status(404).json({ error: `Decision ${id} not found` });
    return;
  }

  res.json(decision);
});

/**
 * POST /agent/run-once
 * Manually triggers one full decision cycle. Useful for demos and testing.
 */
app.post("/agent/run-once", async (_req: Request, res: Response) => {
  logger.info("Manual trigger: /agent/run-once");

  try {
    const records = await runOnce();
    res.json({
      success: true,
      message:
        records.length > 0
          ? `Cycle complete — ${records.length} decision(s) recorded`
          : "Cycle completed but no decisions were produced",
      decisions: records,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err: message }, "/agent/run-once failed");
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /health
 * Simple health check.
 */
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    demoMode: isDemoMode(),
    tradeExecutionEnabled: config.executeTrades,
    uptime: process.uptime(),
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

export function startServer(port?: number): ReturnType<typeof app.listen> {
  const p = port ?? config.port;
  return app.listen(p, () => {
    logger.info({ port: p }, "XPilot Agent REST API listening");
  });
}

export { app };
