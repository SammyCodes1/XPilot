import { Candle, TechnicalSignals } from "../types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple Moving Average over the last `period` close prices. */
function sma(closes: number[], period: number): number {
  if (closes.length < period) return closes[closes.length - 1] ?? 0;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

/** Standard deviation of log-returns. */
function stddevLogReturns(closes: number[]): number {
  if (closes.length < 2) return 0;
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1]));
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance);
}

/** RSI-14 (Wilder's smoothing). */
function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50; // neutral if insufficient data

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta > 0) avgGain += delta;
    else avgLoss += -delta;
  }
  avgGain /= period;
  avgLoss /= period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/**
 * Compute a transparent, explainable set of technical signals from OHLCV data.
 *
 * Signals computed:
 *  - SMA-20 / SMA-50 crossover (bullish when fast > slow)
 *  - 10-period momentum (%)
 *  - Annualised volatility
 *  - Volume ratio (recent volume / SMA-20 volume)
 *  - RSI-14
 */
export function computeSignals(pair: string, candles: Candle[]): TechnicalSignals {
  if (candles.length < 2) {
    throw new Error(`Need at least 2 candles for ${pair}, got ${candles.length}`);
  }

  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  const price = closes[closes.length - 1];

  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);

  // Momentum: % change over last 10 periods
  const momentum10 =
    closes.length >= 10
      ? ((price - closes[closes.length - 10]) / closes[closes.length - 10]) * 100
      : 0;

  // Annualised volatility (assuming 5m bars → ~105120 periods/year)
  const periodVol = stddevLogReturns(closes);
  const annualisedVol = periodVol * Math.sqrt(105120);

  // Volume ratio: recent 5-period average / SMA-20 of volume
  const recentVolAvg =
    volumes.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, volumes.length);
  const sma20Vol = sma(volumes, 20);
  const volumeRatio = sma20Vol > 0 ? recentVolAvg / sma20Vol : 1;

  const rsi14 = rsi(closes, 14);

  return { pair, price, sma20, sma50, momentum10, volatility: annualisedVol, volumeRatio, rsi14 };
}

/**
 * Return a human-readable summary of the signals for the LLM prompt.
 */
export function signalsToText(s: TechnicalSignals): string {
  const smaCrossover =
    s.sma20 > s.sma50 ? "BULLISH (SMA-20 above SMA-50)" : "BEARISH (SMA-20 below SMA-50)";
  return [
    `Pair: ${s.pair}`,
    `Current price: ${s.price}`,
    `SMA-20: ${s.sma20.toFixed(4)} | SMA-50: ${s.sma50.toFixed(4)} → ${smaCrossover}`,
    `10-period momentum: ${s.momentum10.toFixed(2)}%`,
    `Annualised volatility: ${(s.volatility * 100).toFixed(2)}%`,
    `Volume ratio (recent/avg): ${s.volumeRatio.toFixed(2)}`,
    `RSI-14: ${s.rsi14.toFixed(1)}`,
  ].join("\n");
}
