/** Action enum matching DecisionLog.sol constants. */
export type Action = "HOLD" | "BUY" | "SELL";

/** Maps Action strings to the contract uint8 values. */
export const ACTION_TO_UINT8: Record<Action, number> = {
  HOLD: 0,
  BUY: 1,
  SELL: 2,
};

export const UINT8_TO_ACTION: Record<number, Action> = {
  0: "HOLD",
  1: "BUY",
  2: "SELL",
};

/** Structured decision returned by the AI model. */
export interface AIDecision {
  action: Action;
  /** Confidence in basis points (0–10000). */
  confidenceBps: number;
  /** Full human-readable reasoning — this is what gets hashed and revealed. */
  reasoning: string;
}

/** Raw decision validated from the LLM JSON output. */
export interface RawLLMDecision {
  action: string;
  confidenceBps: number;
  reasoning: string;
}

/** A single OHLCV candle returned by the OKX market API. */
export interface Candle {
  timestamp: number; // Unix ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Computed technical signals for a trading pair. */
export interface TechnicalSignals {
  pair: string;
  price: number;
  /** SMA-20 of closing prices. */
  sma20: number;
  /** SMA-50 of closing prices. */
  sma50: number;
  /** Momentum: (price / price[T-periods-ago] - 1) * 100 */
  momentum10: number;
  /** Annualised volatility (std-dev of log returns * sqrt(periods-per-year)). */
  volatility: number;
  /** Volume SMA-20 / volume. > 1 means higher-than-average volume. */
  volumeRatio: number;
  /** RSI-14 (0–100). */
  rsi14: number;
}

/** Status of a single decision in the agent's lifecycle. */
export interface DecisionRecord {
  decisionId: number;
  pair: string;
  action: Action;
  confidenceBps: number;
  reasoning: string;
  reasoningHash: string; // keccak256 hex
  committedTx: string | null;
  revealedTx: string | null;
  executed: boolean;
  outcomePnlBps: number | null;
  error: string | null;
  createdAt: string; // ISO timestamp
}
