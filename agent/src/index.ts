import { startServer } from "./server.js";
import { startScheduler, stopScheduler } from "./services/agentLoop.js";
import { config, isDemoMode } from "./config.js";
import { logger } from "./logger.js";

// ---------------------------------------------------------------------------
// Startup banner
// ---------------------------------------------------------------------------

logger.info("══════════════════════════════════════════");
logger.info("  XPilot Agent — AI-Verified Trading Copilot");
logger.info("══════════════════════════════════════════");
logger.info({ pairs: config.tradingPairs }, "Trading pairs");
logger.info({ rpc: config.rpcUrl, chainId: config.chainId }, "X Layer Testnet");
logger.info({ contract: config.decisionLogAddress }, "DecisionLog contract");
logger.info({ interval: config.scanIntervalMs }, "Scan interval (ms)");
logger.info({ enabled: config.executeTrades }, "Trade execution");
logger.info({ demo: isDemoMode() }, "Demo mode");
logger.info("══════════════════════════════════════════");

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

// Start the REST API
startServer();

// Start the background scheduler (periodic agent cycles)
startScheduler(config.scanIntervalMs);

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down");
  stopScheduler();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
