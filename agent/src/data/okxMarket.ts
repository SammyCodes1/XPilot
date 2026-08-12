import { config } from "../config.js";
import { Candle } from "../types.js";
import { logger } from "../logger.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OKXCandleResponse {
  code: string;
  msg: string;
  data: string[][]; // ["ts","o","h","l","c","vol","volCcy","volCcyQuote","confirm"]
}

// ---------------------------------------------------------------------------
// Retry / backoff
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Generic fetch with exponential-backoff retry and rate-limit handling.
 */
async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const resp = await fetch(url);
    if (resp.ok) return resp;

    // Rate-limited — back off and retry
    if (resp.status === 429) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      logger.warn({ url, attempt, delay }, "Rate-limited by OKX API, retrying");
      await sleep(delay);
      continue;
    }

    // Server error — retry
    if (resp.status >= 500) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      logger.warn({ url, status: resp.status, attempt, delay }, "OKX API server error, retrying");
      await sleep(delay);
      continue;
    }

    throw new Error(`OKX API error ${resp.status}: ${resp.statusText}`);
  }
  throw new Error(`OKX API request failed after ${retries} retries: ${url}`);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch recent OHLCV candles for a trading pair from the OKX Market API.
 *
 * @param instId  OKX instrument ID, e.g. "ETH-USDT"
 * @param bar     Candle size, e.g. "5m", "15m", "1H"
 * @param limit   Number of candles (max 300)
 */
export async function fetchCandles(
  instId: string,
  bar = "5m",
  limit = 100,
): Promise<Candle[]> {
  const url = `${config.okxApiBaseUrl}/api/v5/market/candles?instId=${instId}&bar=${bar}&limit=${limit}`;
  logger.debug({ instId, bar, limit }, "Fetching candles from OKX");

  const resp = await fetchWithRetry(url);
  const json: OKXCandleResponse = await resp.json();

  if (json.code !== "0") {
    throw new Error(`OKX API error: ${json.msg} (code ${json.code})`);
  }

  // OKX returns candles newest-first; reverse to chronological order.
  const raw = json.data.reverse();

  return raw.map((row) => ({
    timestamp: parseInt(row[0], 10),
    open: parseFloat(row[1]),
    high: parseFloat(row[2]),
    low: parseFloat(row[3]),
    close: parseFloat(row[4]),
    volume: parseFloat(row[5]),
  }));
}

/**
 * Fetch the latest price (mark price) for a single instrument.
 */
export async function fetchMarkPrice(instId: string): Promise<number> {
  const url = `${config.okxApiBaseUrl}/api/v5/market/mark-price?instId=${instId}`;
  const resp = await fetchWithRetry(url);
  const json = await resp.json();

  if (json.code !== "0" || !json.data?.length) {
    throw new Error(`OKX mark-price error: ${json.msg}`);
  }
  return parseFloat(json.data[0].markPx);
}

/**
 * Fetch candles for all configured trading pairs.
 * Falls back to synthetic data when the real API is unreachable.
 */
export async function fetchAllCandles(
  bar = "5m",
  limit = 100,
): Promise<Map<string, Candle[]>> {
  const results = new Map<string, Candle[]>();
  const pairs = config.tradingPairs;

  const promises = pairs.map(async (pair) => {
    try {
      const candles = await fetchCandles(pair, bar, limit);
      results.set(pair, candles);
      logger.info({ pair, candles: candles.length }, "Fetched candles from OKX");
    } catch (err) {
      logger.warn({ err, pair }, "OKX API unavailable — generating synthetic data");
      try {
        const synthetic = generateSyntheticCandles(pair, limit);
        results.set(pair, synthetic);
        logger.info({ pair, candles: synthetic.length }, "Generated synthetic candles");
      } catch (synthErr) {
        logger.error({ err: synthErr, pair }, "Failed to generate synthetic candles");
      }
    }
  });

  await Promise.all(promises);
  return results;
}

// ---------------------------------------------------------------------------
// Synthetic data fallback — used when the real OKX API is unreachable.
// Generates realistic-looking OHLCV data so the full pipeline can still
// be demonstrated end-to-end (especially for hackathon demos in constrained
// network environments).
// ---------------------------------------------------------------------------

/** Approximate starting prices for known pairs (used as seed for synth data). */
const BASE_PRICES: Record<string, number> = {
  "ETH-USDT": 3200,
  "BTC-USDT": 82000,
  "OKB-USDT": 42,
};

/**
 * Generate plausible synthetic OHLCV candles for a trading pair.
 * Produces a random walk with mean-reverting tendencies that looks
 * realistic enough for technical signal computation.
 */
export function generateSyntheticCandles(instId: string, count: number): Candle[] {
  const basePrice = BASE_PRICES[instId] ?? 100;
  const candles: Candle[] = [];
  const now = Date.now();
  const barMs = 5 * 60 * 1000; // 5-minute bars

  let price = basePrice;
  // Volatility proportional to base price (higher-value assets fluctuate more)
  const volatility = basePrice * 0.002; // ~0.2% per bar

  for (let i = count - 1; i >= 0; i--) {
    // Random walk with slight mean reversion
    const drift = (basePrice - price) * 0.001; // mean-reversion toward base
    const shock = (Math.random() - 0.5) * 2 * volatility;
    const open = price;

    price = open + drift + shock;
    if (price < basePrice * 0.85) price = basePrice * 0.85; // floor at -15%
    if (price > basePrice * 1.15) price = basePrice * 1.15; // cap at +15%

    const intraBarVol = Math.abs(shock) * 0.5;
    const high = Math.max(open, price) + Math.random() * intraBarVol;
    const low = Math.min(open, price) - Math.random() * intraBarVol;
    const close = price;
    const volume = (basePrice * 10 + Math.random() * basePrice * 50) * (0.5 + Math.random());

    candles.push({
      timestamp: now - i * barMs,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume: Math.round(volume),
    });
  }

  return candles;
}
