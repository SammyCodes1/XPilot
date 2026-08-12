/**
 * XPilot End-to-End Integration Test
 *
 * Sanity-checks the full pipeline end-to-end against X Layer Testnet:
 *   1. Agent → trigger decision cycle
 *   2. Agent → commit + reveal on-chain
 *   3. On-chain → verify decision exists with revealed=true
 *   4. Web → verify dashboard and detail pages are reachable
 *
 * Usage:
 *   cd agent && npx tsx test/integration.test.ts
 *
 * Prerequisites:
 *   - Agent service running on http://localhost:3001
 *   - Web dev server running on http://localhost:3000
 *   - .env at project root with PRIVATE_KEY set
 */

import { createPublicClient, http, keccak256, toBytes } from "viem";
import { xLayerTestnet } from "../src/onchain/chain.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const AGENT_URL = process.env.AGENT_URL ?? "http://localhost:3001";
const WEB_URL = process.env.WEB_URL ?? "http://localhost:3000";
const DECISION_LOG = "0x208A8fD97286039eAA2CC7093a13f43B67f79521";

const DECISION_LOG_ABI = [
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
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}`);
    failed++;
  }
}

function log(step: string): void {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${step}`);
  console.log(`${"═".repeat(60)}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("XPilot E2E Integration Test");
  console.log(`Agent:  ${AGENT_URL}`);
  console.log(`Web:    ${WEB_URL}`);
  console.log(`Chain:  X Layer Testnet (1952)`);
  console.log(`Contract: ${DECISION_LOG}`);

  const client = createPublicClient({
    chain: xLayerTestnet,
    transport: http(),
  });

  // -----------------------------------------------------------------------
  // Step 1 — Agent health check
  // -----------------------------------------------------------------------
  log("Step 1: Agent health check");

  let healthOk = false;
  try {
    const resp = await fetch(`${AGENT_URL}/health`);
    const health = await resp.json();
    assert(resp.status === 200, "Agent /health returns 200");
    assert(health.status === "ok", `Agent status: ${health.status}`);
    assert(typeof health.demoMode === "boolean", `Demo mode: ${health.demoMode}`);
    healthOk = resp.status === 200 && health.status === "ok";
  } catch (err) {
    assert(false, `Agent unreachable: ${err}`);
    healthOk = false;
  }

  if (!healthOk) {
    console.error("\n❌ Agent not running. Start it with: cd agent && npx tsx src/index.ts");
    process.exit(1);
  }

  // -----------------------------------------------------------------------
  // Step 2 — Trigger decision cycle
  // -----------------------------------------------------------------------
  log("Step 2: Trigger POST /agent/run-once");

  let decisionId = -1;
  let reasoning = "";
  let reasoningHash = "";
  let commitTx = "";
  let revealTx = "";

  try {
    const resp = await fetch(`${AGENT_URL}/agent/run-once`, { method: "POST" });
    const result = await resp.json();
    assert(resp.status === 200, "Agent cycle returns 200");
    assert(result.success === true, `Cycle success: ${result.success}`);
    assert(result.decisions.length > 0, `Decisions produced: ${result.decisions.length}`);

    if (result.decisions.length > 0) {
      const d = result.decisions[0];
      decisionId = d.decisionId;
      reasoning = d.reasoning;
      reasoningHash = d.reasoningHash;
      commitTx = d.committedTx;
      revealTx = d.revealedTx;

      assert(decisionId >= 0, `Decision ID: ${decisionId}`);
      assert(d.action === "BUY" || d.action === "SELL" || d.action === "HOLD",
        `Action: ${d.action}`);
      assert(d.confidenceBps > 0 && d.confidenceBps <= 10000,
        `Confidence: ${d.confidenceBps} bps`);
      assert(commitTx !== null, `Commit TX: ${commitTx?.slice(0, 20)}…`);
      assert(revealTx !== null, `Reveal TX: ${revealTx?.slice(0, 20)}…`);
      assert(reasoning.length > 20, `Reasoning length: ${reasoning.length} chars`);
    }
  } catch (err) {
    assert(false, `Agent cycle failed: ${err}`);
  }

  if (decisionId < 0) {
    console.error("\n❌ No decision produced. Check agent logs.");
    process.exit(1);
  }

  // -----------------------------------------------------------------------
  // Step 3 — Verify on-chain
  // -----------------------------------------------------------------------
  log(`Step 3: Verify decision #${decisionId} on-chain`);

  try {
    const decision = await client.readContract({
      address: DECISION_LOG,
      abi: DECISION_LOG_ABI,
      functionName: "getDecision",
      args: [BigInt(decisionId)],
    });

    const oc = decision as unknown as {
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
    };

    assert(Number(oc.id) === decisionId, `On-chain ID matches: ${oc.id}`);
    assert(oc.assetPair.length > 0, `Asset pair: ${oc.assetPair}`);
    assert(oc.action === 1 || oc.action === 2 || oc.action === 0,
      `Action uint8: ${oc.action}`);
    assert(Number(oc.confidenceBps) > 0, `Confidence: ${oc.confidenceBps}`);
    assert(oc.revealed === true, `Revealed: ${oc.revealed} ✅`);
    assert(oc.outcomeRecorded === false, `Outcome recorded: ${oc.outcomeRecorded} (expected false)`);

    // Hash verification — the core trust guarantee
    const onChainHash = oc.decisionHash;
    const computedHash = keccak256(toBytes(reasoning));
    assert(
      onChainHash.toLowerCase() === computedHash.toLowerCase(),
      `Hash match: on-chain == computed\n    On-chain:  ${onChainHash}\n    Computed:  ${computedHash}`,
    );

    // Verify the hash the agent reported matches both
    assert(
      reasoningHash.toLowerCase() === onChainHash.toLowerCase(),
      "Agent-reported hash == on-chain hash",
    );
  } catch (err) {
    assert(false, `On-chain read failed: ${err}`);
  }

  // -----------------------------------------------------------------------
  // Step 4 — Verify agent history
  // -----------------------------------------------------------------------
  log("Step 4: Verify agent decision history");

  try {
    const resp = await fetch(`${AGENT_URL}/decisions`);
    const body = await resp.json();
    assert(resp.status === 200, "GET /decisions returns 200");
    assert(body.count > 0, `Decision count: ${body.count}`);

    // Verify the latest decision is ours
    const latest = body.decisions[0];
    assert(
      latest.decisionId === decisionId,
      `Latest decision ID: ${latest.decisionId}`,
    );
    assert(
      latest.revealedTx === revealTx,
      `Reveal TX in history matches`,
    );
  } catch (err) {
    assert(false, `Agent history fetch failed: ${err}`);
  }

  // -----------------------------------------------------------------------
  // Step 5 — Verify web app is reachable
  // -----------------------------------------------------------------------
  log("Step 5: Verify web app");

  try {
    const dashResp = await fetch(`${WEB_URL}/`);
    assert(dashResp.status === 200, `Dashboard returns ${dashResp.status}`);
    const dashHtml = await dashResp.text();
    assert(dashHtml.includes("XPilot"), "Dashboard contains 'XPilot'");

    const detailResp = await fetch(`${WEB_URL}/decisions/${decisionId}`);
    assert(detailResp.status === 200,
      `Decision detail page returns ${detailResp.status}`);
    const detailHtml = await detailResp.text();
    assert(detailHtml.includes("Verified"), "Detail page contains 'Verified'");
  } catch (err) {
    assert(false, `Web app unreachable: ${err}`);
  }

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  log("Results");
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Decision #${decisionId}: ${commitTx}`);
  console.log(`  Explorer: https://www.oklink.com/x-layer-testnet/tx/${commitTx}`);

  if (failed > 0) {
    console.error("\n❌ INTEGRATION TEST FAILED");
    process.exit(1);
  }

  console.log("\n✅ All integration tests passed.");
  console.log(`\nFull audit trail for decision #${decisionId}:`);
  console.log(`  Commit TX:  https://www.oklink.com/x-layer-testnet/tx/${commitTx}`);
  console.log(`  Reveal TX:  https://www.oklink.com/x-layer-testnet/tx/${revealTx}`);
  console.log(`  Contract:   https://www.oklink.com/x-layer-testnet/address/${DECISION_LOG}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
