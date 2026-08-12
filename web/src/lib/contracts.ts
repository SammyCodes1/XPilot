import { createPublicClient, http, type PublicClient } from "viem";
import { xLayerTestnet } from "./chain";

// ---------------------------------------------------------------------------
// Deployed addresses (testnet)
// ---------------------------------------------------------------------------

export const DECISION_LOG_ADDRESS =
  "0x208A8fD97286039eAA2CC7093a13f43B67f79521" as const;

export const COPILOT_REGISTRY_ADDRESS =
  "0xD79B24B2503246AE61dc1BF6C8a08cF61F7D057d" as const;

// ---------------------------------------------------------------------------
// DecisionLog ABI (minimal — only the functions the frontend calls)
// ---------------------------------------------------------------------------

export const DECISION_LOG_ABI = [
  {
    type: "function",
    name: "decisionCount",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getDecision",
    inputs: [{ name: "decisionId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "agentAddr", type: "address" },
          { name: "decisionHash", type: "bytes32" },
          { name: "assetPair", type: "string" },
          { name: "action", type: "uint8" },
          { name: "confidenceBps", type: "uint256" },
          { name: "timestamp", type: "uint256" },
          { name: "revealed", type: "bool" },
          { name: "outcomeRecorded", type: "bool" },
          { name: "pnlBps", type: "int256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAgentDecisionCount",
    inputs: [{ name: "agentAddr", type: "address" }],
    outputs: [{ name: "count", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getDecisionIdsByAgent",
    inputs: [
      { name: "agentAddr", type: "address" },
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [
      { name: "ids", type: "uint256[]" },
      { name: "total", type: "uint256" },
    ],
    stateMutability: "view",
  },
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OnChainDecision {
  id: bigint;
  agentAddr: string;
  decisionHash: string;
  assetPair: string;
  action: number;
  confidenceBps: bigint;
  timestamp: bigint;
  revealed: boolean;
  outcomeRecorded: boolean;
  pnlBps: bigint;
}

// ---------------------------------------------------------------------------
// Public client (lazy singleton)
// ---------------------------------------------------------------------------

let _client: PublicClient | null = null;

export function getPublicClient(): PublicClient {
  if (!_client) {
    _client = createPublicClient({
      chain: xLayerTestnet,
      transport: http(),
    });
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

export async function fetchDecisionCount(): Promise<number> {
  const client = getPublicClient();
  const count = await client.readContract({
    address: DECISION_LOG_ADDRESS,
    abi: DECISION_LOG_ABI,
    functionName: "decisionCount",
  });
  return Number(count);
}

export async function fetchDecision(id: number): Promise<OnChainDecision | null> {
  try {
    const client = getPublicClient();
    const decision = await client.readContract({
      address: DECISION_LOG_ADDRESS,
      abi: DECISION_LOG_ABI,
      functionName: "getDecision",
      args: [BigInt(id)],
    });
    return decision as unknown as OnChainDecision;
  } catch {
    return null;
  }
}
