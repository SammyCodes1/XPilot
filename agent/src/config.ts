import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env from the project root (parent of /agent) so a single .env
// serves all subprojects.
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "..", "..", ".env") });

/**
 * Centralised configuration sourced from environment variables.
 * All values have sensible defaults for testnet development.
 */
export const config = {
  // --- X Layer Testnet ---
  rpcUrl: process.env.X_LAYER_TESTNET_RPC ?? "https://testrpc.xlayer.tech",
  chainId: 1952,
  privateKey: (process.env.PRIVATE_KEY ?? "0x00") as `0x${string}`,

  // --- Deployed contracts ---
  decisionLogAddress: (process.env.DECISION_LOG_ADDRESS ??
    "0x208A8fD97286039eAA2CC7093a13f43B67f79521") as `0x${string}`,

  // --- OKX Market API ---
  okxApiBaseUrl: "https://www.okx.com",
  tradingPairs: ["ETH-USDT", "OKB-USDT", "BTC-USDT"] as string[],
  /** Polling interval in milliseconds (default 5 min). */
  scanIntervalMs: parseInt(process.env.AGENT_SCAN_INTERVAL_MS ?? "300000", 10),

  // --- Decision engine ---
  minConfidenceBps: parseInt(process.env.AGENT_MIN_CONFIDENCE ?? "75", 10),

  /** Which LLM provider to use: "anthropic" | "deepseek" | "openai". */
  llmProvider: (process.env.LLM_PROVIDER ?? "deepseek") as "anthropic" | "deepseek" | "openai",

  /** Anthropic API key (env ANTHROPIC_API_KEY). */
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",

  /** DeepSeek API key (env DEEPSEEK_API_KEY). OpenAI-compatible endpoint. */
  deepseekApiKey: process.env.DEEPSEEK_API_KEY ?? "",
  deepseekModel: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
  deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",

  /** OpenAI API key (env OPENAI_API_KEY). */
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o",

  // --- Execution ---
  /** If true, actually submit trades via OKX DEX after commit+reveal. */
  executeTrades: process.env.EXECUTE_TRADES === "true",
  okxApiKey: process.env.OKX_API_KEY ?? "",
  okxApiSecret: process.env.OKX_API_SECRET ?? "",
  okxApiPassphrase: process.env.OKX_API_PASSPHRASE ?? "",

  // --- Server ---
  // Render sets PORT; AGENT_PORT is used locally
  port: parseInt(process.env.PORT ?? process.env.AGENT_PORT ?? "3001", 10),

  // --- Logging ---
  logLevel: process.env.AGENT_LOG_LEVEL ?? "info",
} as const;

/** True when no real API key is configured for the selected provider. */
export const isDemoMode = (): boolean => {
  switch (config.llmProvider) {
    case "deepseek":
      return !config.deepseekApiKey || config.deepseekApiKey === "" || config.deepseekApiKey.startsWith("sk-your_");
    case "openai":
      return !config.openaiApiKey || config.openaiApiKey === "" || config.openaiApiKey.startsWith("sk-your_");
    case "anthropic":
    default:
      return !config.anthropicApiKey || config.anthropicApiKey.startsWith("sk-ant-your_") || config.anthropicApiKey === "";
  }
};
