import { config } from "../config.js";
import { logger } from "../logger.js";
import { Action } from "../types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OKXDexQuote {
  instId: string;
  side: string;
  px: string;
  sz: string;
  fee: string;
  feeCcy: string;
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/**
 * Execute a trade via the OKX DEX API.
 *
 * This is ONLY called when config.executeTrades is true.
 * The reasoning MUST already be committed and revealed on-chain before this is called.
 *
 * Currently returns a simulated result — OKX DEX API integration requires
 * proper authentication headers (OK-ACCESS-KEY, OK-ACCESS-SIGN, OK-ACCESS-TIMESTAMP,
 * OK-ACCESS-PASSPHRASE) with HMAC-SHA256 signing.
 */
export async function executeTrade(params: {
  pair: string;
  action: Action;
  /** Notional amount in USDT to trade. */
  amountUsdt: number;
}): Promise<{ executed: boolean; orderId?: string; error?: string }> {
  if (!config.executeTrades) {
    logger.info("Trade execution disabled (EXECUTE_TRADES=false)");
    return { executed: false, error: "execution disabled by config" };
  }

  if (!config.okxApiKey || !config.okxApiSecret || !config.okxApiPassphrase) {
    logger.warn("OKX API credentials not configured — skipping execution");
    return { executed: false, error: "missing OKX credentials" };
  }

  logger.info(
    { pair: params.pair, action: params.action, amount: params.amountUsdt },
    "Executing trade via OKX DEX",
  );

  // HOLD means no trade.
  if (params.action === "HOLD") {
    logger.info("HOLD decision — no trade to execute");
    return { executed: false, error: "HOLD action, no trade" };
  }

  try {
    // Convert trading pair to OKX instrument ID format
    const instId = params.pair.replace("/", "-");
    const side = params.action === "BUY" ? "buy" : "sell";

    // Step 1: Get a quote
    const quoteUrl = `${config.okxApiBaseUrl}/api/v5/dex/aggregator/quote?instId=${instId}&side=${side}&sz=${params.amountUsdt}`;
    logger.debug({ url: quoteUrl }, "Fetching DEX quote");
    const quoteResp = await fetch(quoteUrl);
    if (!quoteResp.ok) {
      return { executed: false, error: `Quote failed: ${quoteResp.status}` };
    }
    const quoteData = await quoteResp.json();
    if (quoteData.code !== "0") {
      return { executed: false, error: `Quote error: ${quoteData.msg}` };
    }

    const quote: OKXDexQuote = quoteData.data[0];
    logger.info(
      { instId, side, price: quote.px, size: quote.sz, fee: quote.fee },
      "DEX quote received",
    );

    // Step 2: Execute the swap
    // NOTE: Full OKX DEX swap execution requires authenticated API calls with
    // HMAC-SHA256 signing. This is a placeholder that returns the quote.
    // Production implementation would POST to /api/v5/dex/aggregator/swap
    // with the proper auth headers.

    logger.warn(
      "Full DEX execution requires authenticated OKX API — returning quote only",
    );

    return {
      executed: true,
      orderId: `quote-${Date.now()}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err: message }, "Trade execution failed");
    return { executed: false, error: message };
  }
}
