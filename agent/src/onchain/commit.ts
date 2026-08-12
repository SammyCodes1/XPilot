import { type Hash } from "viem";
import { getWalletClient, getPublicClient, hashReasoning } from "./client.js";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { Action, ACTION_TO_UINT8 } from "../types.js";

// Minimal ABI for the functions we call on DecisionLog.
const DECISION_LOG_ABI = [
  {
    type: "function",
    name: "commitDecision",
    inputs: [
      { name: "decisionHash", type: "bytes32" },
      { name: "assetPair", type: "string" },
      { name: "action", type: "uint8" },
      { name: "confidenceBps", type: "uint256" },
    ],
    outputs: [{ name: "decisionId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revealReasoning",
    inputs: [
      { name: "decisionId", type: "uint256" },
      { name: "reasoningText", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getDecision",
    inputs: [{ name: "decisionId", type: "uint256" }],
    outputs: [
      {
        name: "",
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
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CommitResult {
  decisionId: number;
  hash: Hash;
  commitTx: Hash;
  revealTx: Hash;
}

// ---------------------------------------------------------------------------
// Commit + Reveal
// ---------------------------------------------------------------------------

/**
 * Step 1: Hash the reasoning with keccak256 and commit it on-chain.
 * Step 2: Wait for the commit tx to be mined.
 * Step 3: Reveal the full reasoning text (verified on-chain against the hash).
 *
 * This two-step commit-then-reveal is the core trust mechanism:
 * the hash is timestamped BEFORE the full reasoning is published,
 * proving the reasoning existed before execution.
 */
export async function commitAndReveal(
  assetPair: string,
  action: Action,
  confidenceBps: number,
  reasoning: string,
): Promise<CommitResult> {
  const wallet = getWalletClient();
  const publicClient = getPublicClient();
  const account = wallet.account!;

  // 1. Hash the reasoning (keccak256, matching Solidity)
  const hash = hashReasoning(reasoning);
  logger.info(
    { hash, pair: assetPair, action, confidenceBps },
    "Step 1: Committing reasoning hash on-chain",
  );

  // 2. Call commitDecision
  const actionUint8 = ACTION_TO_UINT8[action];
  const commitTx = await wallet.writeContract({
    address: config.decisionLogAddress,
    abi: DECISION_LOG_ABI,
    functionName: "commitDecision",
    args: [hash, assetPair, actionUint8, BigInt(confidenceBps)],
    account,
    chain: wallet.chain,
  });

  logger.info({ commitTx }, "Commit tx submitted — waiting for confirmation");

  // 3. Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash: commitTx });
  if (receipt.status !== "success") {
    throw new Error(`Commit transaction reverted: ${commitTx}`);
  }

  // Extract the decisionId from the DecisionCommitted event
  // The event signature is: DecisionCommitted(uint256 indexed decisionId, ...)
  const decisionId = extractDecisionId(receipt, config.decisionLogAddress);
  logger.info({ decisionId, commitTx, block: receipt.blockNumber }, "Commit confirmed on-chain");

  // 4. Reveal the reasoning
  logger.info({ decisionId }, "Step 2: Revealing reasoning on-chain");

  const revealTx = await wallet.writeContract({
    address: config.decisionLogAddress,
    abi: DECISION_LOG_ABI,
    functionName: "revealReasoning",
    args: [BigInt(decisionId), reasoning],
    account,
    chain: wallet.chain,
  });

  const revealReceipt = await publicClient.waitForTransactionReceipt({ hash: revealTx });
  if (revealReceipt.status !== "success") {
    throw new Error(`Reveal transaction reverted: ${revealTx}`);
  }

  logger.info(
    { decisionId, revealTx, block: revealReceipt.blockNumber },
    "Reveal confirmed — reasoning is now verifiable on-chain",
  );

  return { decisionId, hash, commitTx, revealTx };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the decisionId from the DecisionCommitted event in the receipt logs.
 *
 * The event has signature topic:
 *   keccak256("DecisionCommitted(uint256,address,bytes32,string,uint8,uint256,uint256)")
 * The decisionId is the first indexed param, so it appears as the first topic after the signature.
 */
const DECISION_COMMITTED_SIG =
  "0xf6516afa1bfc9fcbe0edc606f87defb88fd604af29dbd6181807359fa240810b";

function extractDecisionId(
  receipt: { logs: { address: string; topics: string[] }[] },
  contractAddress: string,
): number {
  const addr = contractAddress.toLowerCase();
  for (const log of receipt.logs) {
    if (
      log.address.toLowerCase() === addr &&
      log.topics[0]?.toLowerCase() === DECISION_COMMITTED_SIG
    ) {
      // decisionId is indexed → stored in topics[1] as uint256
      return Number(BigInt(log.topics[1] ?? "0x0"));
    }
  }
  throw new Error("DecisionCommitted event not found in receipt logs");
}
