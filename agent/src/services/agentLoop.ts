import { fetchAllCandles } from "../data/okxMarket.js";
import { computeSignals } from "../engine/signals.js";
import { generateDecision } from "../engine/decision.js";
import { commitAndReveal } from "../onchain/commit.js";
import { executeTrade } from "../execution/okxDex.js";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { DecisionRecord, Candle, TechnicalSignals } from "../types.js";

// ---------------------------------------------------------------------------
// In-memory decision store (survives across cycles within the same process)
// ---------------------------------------------------------------------------

const decisionHistory: DecisionRecord[] = [];

export function getDecisionHistory(): readonly DecisionRecord[] {
  return decisionHistory;
}

export function getDecisionById(id: number): DecisionRecord | undefined {
  return decisionHistory.find((d) => d.decisionId === id);
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

let running = false;

/**
 * Run one complete decision cycle:
 *  1. Fetch live candles from OKX
 *  2. Compute technical signals
 *  3. Generate AI decision (Anthropic or demo fallback)
 *  4. Commit reasoning hash on-chain
 *  5. Reveal reasoning text on-chain
 *  6. (Optionally) execute trade via OKX DEX
 */
export async function runOnce(): Promise<DecisionRecord[]> {
  if (running) {
    logger.warn("Agent cycle already in progress — skipping");
    return [];
  }
  running = true;

  const newRecords: DecisionRecord[] = [];
  const startTime = Date.now();

  try {
    // -----------------------------------------------------------------------
    // Phase 1 — Ingest market data
    // -----------------------------------------------------------------------
    logger.info({ pairs: config.tradingPairs }, "Phase 1: Fetching market data");
    const candlesByPair = await fetchAllCandles("5m", 100);

    if (candlesByPair.size === 0) {
      logger.error("No candle data retrieved — aborting cycle");
      return [];
    }

    // -----------------------------------------------------------------------
    // Phase 2 — Compute signals for each pair with sufficient data
    // -----------------------------------------------------------------------
    logger.info("Phase 2: Computing technical signals");
    const signalsByPair = new Map<string, TechnicalSignals>();
    for (const [pair, candles] of candlesByPair) {
      if (candles.length < 50) {
        logger.warn({ pair, candles: candles.length }, "Insufficient candle data, skipping");
        continue;
      }
      try {
        const signals = computeSignals(pair, candles);
        signalsByPair.set(pair, signals);
        logger.info(
          { pair, price: signals.price, rsi: signals.rsi14.toFixed(1) },
          "Signals computed",
        );
      } catch (err) {
        logger.error({ err, pair }, "Signal computation failed");
      }
    }

    if (signalsByPair.size === 0) {
      logger.error("No signals computed — aborting cycle");
      return [];
    }

    // -----------------------------------------------------------------------
    // Phase 3 — Generate AI decision
    // -----------------------------------------------------------------------
    logger.info("Phase 3: Generating AI decision");
    const signalsArray = Array.from(signalsByPair.values());
    const decision = await generateDecision(signalsArray);
    logger.info(
      { action: decision.action, confidence: decision.confidenceBps },
      "AI decision generated",
    );

    // Pick the primary pair (first one with signals)
    const primaryPair = signalsArray[0].pair;

    // -----------------------------------------------------------------------
    // Phase 4 — Commit hash on-chain
    // Phase 5 — Reveal reasoning on-chain
    // -----------------------------------------------------------------------
    logger.info("Phase 4+5: Committing and revealing on-chain");
    let commitResult: Awaited<ReturnType<typeof commitAndReveal>>;
    let commitError: string | null = null;

    try {
      commitResult = await commitAndReveal(
        primaryPair,
        decision.action,
        decision.confidenceBps,
        decision.reasoning,
      );
    } catch (err) {
      commitError = err instanceof Error ? err.message : String(err);
      logger.error({ err: commitError }, "On-chain commit/reveal failed");
      // Still record the decision even if on-chain tx failed
    }

    // -----------------------------------------------------------------------
    // Phase 6 — (Optional) Execute trade
    // -----------------------------------------------------------------------
    let executed = false;
    if (!commitError && commitResult!) {
      logger.info("Phase 6: Trade execution (if enabled)");
      if (config.executeTrades && decision.action !== "HOLD") {
        const execResult = await executeTrade({
          pair: primaryPair,
          action: decision.action,
          amountUsdt: 100, // Default small test size
        });
        executed = execResult.executed;
      }
    }

    // -----------------------------------------------------------------------
    // Record
    // -----------------------------------------------------------------------
    const record: DecisionRecord = {
      decisionId: commitResult?.decisionId ?? -1,
      pair: primaryPair,
      action: decision.action,
      confidenceBps: decision.confidenceBps,
      reasoning: decision.reasoning,
      reasoningHash: commitResult?.hash ?? "",
      committedTx: commitResult?.commitTx ?? null,
      revealedTx: commitResult?.revealTx ?? null,
      executed,
      outcomePnlBps: null,
      error: commitError,
      createdAt: new Date().toISOString(),
    };
    decisionHistory.push(record);
    newRecords.push(record);

    const elapsed = Date.now() - startTime;
    logger.info(
      {
        decisionId: record.decisionId,
        action: record.action,
        tx: record.committedTx,
        elapsed,
      },
      "Agent cycle complete",
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err: message }, "Agent cycle failed with unhandled error");
  } finally {
    running = false;
  }

  return newRecords;
}

// ---------------------------------------------------------------------------
// Scheduled polling
// ---------------------------------------------------------------------------

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startScheduler(intervalMs?: number): void {
  const interval = intervalMs ?? config.scanIntervalMs;
  if (intervalHandle) {
    logger.warn("Scheduler already running");
    return;
  }
  logger.info({ intervalMs: interval }, "Starting agent scheduler");
  // Run once immediately, then on interval
  runOnce().catch((err) => logger.error({ err }, "Initial agent cycle failed"));
  intervalHandle = setInterval(() => {
    runOnce().catch((err) => logger.error({ err }, "Scheduled agent cycle failed"));
  }, interval);
}

export function stopScheduler(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info("Scheduler stopped");
  }
}
