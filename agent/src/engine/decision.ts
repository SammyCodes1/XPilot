import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { config, isDemoMode } from "../config.js";
import { AIDecision, RawLLMDecision, TechnicalSignals, Action } from "../types.js";
import { logger } from "../logger.js";
import { signalsToText } from "./signals.js";

// ---------------------------------------------------------------------------
// System prompt (shared across all providers)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are XPilot, an AI trading copilot. Your job is to analyse market data and produce
a clear, explainable trading recommendation.

## Output Format

You MUST respond with a single JSON object and nothing else. No markdown, no preamble.

{
  "action": "BUY" | "SELL" | "HOLD",
  "confidenceBps": <number 0-10000, where 10000 = 100%>,
  "reasoning": "<detailed, step-by-step reasoning explaining WHY you chose this action. Include which signals drove the decision and any risks you considered. Be specific and reference the actual numbers provided.>"
}

## Rules
- action MUST be exactly "BUY", "SELL", or "HOLD".
- confidenceBps MUST be an integer between 0 and 10000.
- reasoning MUST be detailed, reference the specific signal values, and explain the trade-off considered.
- If the signals are mixed or unclear, lean toward HOLD with lower confidence.
- Never recommend a trade based on a single signal alone. Always consider the full picture.
- You are an explainable system — your reasoning is your reputation.`;

// ---------------------------------------------------------------------------
// Entry point — routes to the right provider
// ---------------------------------------------------------------------------

/**
 * Generate a trading decision using the configured LLM provider.
 * Falls back to a rule-based demo engine if no API key is configured.
 */
export async function generateDecision(
  signals: TechnicalSignals[],
): Promise<AIDecision> {
  if (isDemoMode()) {
    logger.warn(
      `No ${config.llmProvider} API key configured — using demo decision engine`,
    );
    return demoDecision(signals);
  }

  switch (config.llmProvider) {
    case "deepseek":
      return callDeepSeek(signals);
    case "openai":
      return callOpenAI(signals);
    case "anthropic":
    default:
      return callAnthropic(signals);
  }
}

// ---------------------------------------------------------------------------
// DeepSeek (OpenAI-compatible endpoint)
// ---------------------------------------------------------------------------

async function callDeepSeek(signals: TechnicalSignals[]): Promise<AIDecision> {
  const client = new OpenAI({
    apiKey: config.deepseekApiKey,
    baseURL: config.deepseekBaseUrl,
  });

  const signalTexts = signals.map((s) => signalsToText(s));
  const userMessage = buildUserMessage(signalTexts);

  logger.info(
    { provider: "deepseek", model: config.deepseekModel },
    "Calling DeepSeek API",
  );

  const start = Date.now();
  const completion = await client.chat.completions.create({
    model: config.deepseekModel,
    max_tokens: 1024,
    temperature: 0.3, // low temperature for consistent structured output
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  const duration = Date.now() - start;
  logger.info(
    { duration, usage: completion.usage },
    "DeepSeek API response received",
  );

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!raw) {
    throw new Error("DeepSeek returned empty response");
  }

  logger.debug({ raw }, "Raw LLM response");
  return parseDecision(raw);
}

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------

async function callOpenAI(signals: TechnicalSignals[]): Promise<AIDecision> {
  const client = new OpenAI({ apiKey: config.openaiApiKey });

  const signalTexts = signals.map((s) => signalsToText(s));
  const userMessage = buildUserMessage(signalTexts);

  logger.info(
    { provider: "openai", model: config.openaiModel },
    "Calling OpenAI API",
  );

  const start = Date.now();
  const completion = await client.chat.completions.create({
    model: config.openaiModel,
    max_tokens: 1024,
    temperature: 0.3,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  const duration = Date.now() - start;
  logger.info(
    { duration, usage: completion.usage },
    "OpenAI API response received",
  );

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!raw) {
    throw new Error("OpenAI returned empty response");
  }

  logger.debug({ raw }, "Raw LLM response");
  return parseDecision(raw);
}

// ---------------------------------------------------------------------------
// Anthropic (kept as an option, not removed)
// ---------------------------------------------------------------------------

async function callAnthropic(signals: TechnicalSignals[]): Promise<AIDecision> {
  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  const signalTexts = signals.map((s) => signalsToText(s));
  const userMessage = buildUserMessage(signalTexts);

  logger.info(
    { provider: "anthropic", model: config.anthropicModel },
    "Calling Anthropic API",
  );

  const start = Date.now();
  const msg = await client.messages.create({
    model: config.anthropicModel,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const duration = Date.now() - start;
  logger.info({ duration, usage: msg.usage }, "Anthropic API response received");

  const textBlock = msg.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Anthropic returned no text content");
  }

  const raw = textBlock.text.trim();
  logger.debug({ raw }, "Raw LLM response");
  return parseDecision(raw);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildUserMessage(signalTexts: string[]): string {
  return `Analyse the following market data and produce a trading recommendation.

## Market Data

${signalTexts.join("\n\n---\n\n")}

## Task

Based on the signals above, what is your recommended action? Remember to output ONLY valid JSON.`;
}

// ---------------------------------------------------------------------------
// Demo / mock decision engine (no API key required)
// ---------------------------------------------------------------------------

function demoDecision(signals: TechnicalSignals[]): AIDecision {
  const s = signals[0];
  if (!s) {
    return {
      action: "HOLD",
      confidenceBps: 0,
      reasoning: "No market data available.",
    };
  }

  let action: Action = "HOLD";
  let confidenceBps = 5000;

  const bullishSignals: string[] = [];
  const bearishSignals: string[] = [];

  if (s.sma20 > s.sma50) bullishSignals.push("SMA-20 above SMA-50 (bullish crossover)");
  else bearishSignals.push("SMA-20 below SMA-50 (bearish crossover)");

  if (s.momentum10 > 1) bullishSignals.push(`positive momentum (${s.momentum10.toFixed(2)}%)`);
  else if (s.momentum10 < -1) bearishSignals.push(`negative momentum (${s.momentum10.toFixed(2)}%)`);

  if (s.rsi14 < 30) bullishSignals.push(`RSI oversold (${s.rsi14.toFixed(1)})`);
  else if (s.rsi14 > 70) bearishSignals.push(`RSI overbought (${s.rsi14.toFixed(1)})`);

  if (s.volumeRatio > 1.3) {
    if (bullishSignals.length > bearishSignals.length) {
      bullishSignals.push("high volume confirming bullish move");
    } else if (bearishSignals.length > bullishSignals.length) {
      bearishSignals.push("high volume confirming bearish move");
    }
  }

  const totalBullish = bullishSignals.length;
  const totalBearish = bearishSignals.length;

  if (totalBullish > totalBearish) {
    action = "BUY";
    confidenceBps = Math.min(5000 + totalBullish * 1500, 9500);
  } else if (totalBearish > totalBullish) {
    action = "SELL";
    confidenceBps = Math.min(5000 + totalBearish * 1500, 9500);
  } else {
    action = "HOLD";
    confidenceBps = 3000;
  }

  const reasoning = [
    `[DEMO MODE — no ${config.llmProvider} API key configured]`,
    `Pair: ${s.pair} @ ${s.price}`,
    `SMA-20: ${s.sma20.toFixed(4)} | SMA-50: ${s.sma50.toFixed(4)}`,
    `Momentum (10p): ${s.momentum10.toFixed(2)}%`,
    `RSI-14: ${s.rsi14.toFixed(1)}`,
    `Volatility (ann.): ${(s.volatility * 100).toFixed(2)}%`,
    `Volume ratio: ${s.volumeRatio.toFixed(2)}`,
    ``,
    `Bullish signals: ${bullishSignals.join("; ") || "none"}`,
    `Bearish signals: ${bearishSignals.join("; ") || "none"}`,
    ``,
    `Decision: ${action} with ${confidenceBps} bps confidence (${totalBullish}B vs ${totalBearish}S).`,
  ].join("\n");

  return { action, confidenceBps, reasoning };
}

// ---------------------------------------------------------------------------
// Parsing & validation (shared)
// ---------------------------------------------------------------------------

const VALID_ACTIONS = new Set(["BUY", "SELL", "HOLD"]);

function parseDecision(raw: string): AIDecision {
  let cleaned = raw;
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  let parsed: RawLLMDecision;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `Failed to parse LLM response as JSON. Raw: ${raw.slice(0, 500)}`,
    );
  }

  if (!VALID_ACTIONS.has(parsed.action)) {
    throw new Error(
      `Invalid action "${parsed.action}". Must be BUY, SELL, or HOLD.`,
    );
  }

  const confidenceBps = Number(parsed.confidenceBps);
  if (
    !Number.isInteger(confidenceBps) ||
    confidenceBps < 0 ||
    confidenceBps > 10000
  ) {
    throw new Error(
      `Invalid confidenceBps "${parsed.confidenceBps}". Must be integer 0-10000.`,
    );
  }

  const reasoning = String(parsed.reasoning ?? "").trim();
  if (reasoning.length < 20) {
    throw new Error(
      "Reasoning is too short — must be at least 20 characters.",
    );
  }

  return {
    action: parsed.action as Action,
    confidenceBps,
    reasoning,
  };
}
