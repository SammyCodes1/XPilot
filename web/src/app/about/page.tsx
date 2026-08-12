"use client";

import { Card, Timeline, MonoText } from "@/components/ui";
import { Navbar } from "@/components/shared/Navbar";

// ---------------------------------------------------------------------------
// Demo timeline for the about page
// ---------------------------------------------------------------------------

const DEMO_TIMELINE = [
  {
    id: "1",
    label: "1. Agent analyzes market data",
    detail:
      "The AI agent pulls live OHLCV candles from the OKX Market API and computes technical signals (SMA crossover, RSI, momentum, volatility).",
    status: "complete" as const,
  },
  {
    id: "2",
    label: "2. Agent generates reasoning",
    detail:
      "The signals are passed to an LLM (Claude by default) with a strict system prompt requiring a JSON-only decision: action, confidenceBps, and a detailed, explainable reasoning string.",
    status: "complete" as const,
  },
  {
    id: "3",
    label: "3. Hash is committed on-chain",
    detail:
      "The agent computes keccak256(reasoningText) and calls commitDecision() on the DecisionLog smart contract deployed on X Layer. The hash — and only the hash — is stored with a block timestamp. This proves the reasoning existed AT THIS MOMENT, before any trade.",
    status: "complete" as const,
  },
  {
    id: "4",
    label: "4. Reasoning is revealed",
    detail:
      "After the commit transaction is confirmed, the agent calls revealReasoning() with the full plaintext. The contract verifies keccak256(text) == storedHash and reverts if it doesn't match. The text is emitted in an event (not stored, to save gas).",
    status: "complete" as const,
  },
  {
    id: "5",
    label: "5. Trade executes (optional)",
    detail:
      "Only after both commit and reveal succeed, and only if EXECUTE_TRADES=true, the agent submits the trade via the OKX DEX API. The reasoning is already on-chain by this point — no after-the-fact fabrication possible.",
    status: "pending" as const,
  },
  {
    id: "6",
    label: "6. Outcome is recorded",
    detail:
      "Once the position closes, the agent calls recordOutcome() with the realized PnL in basis points, building a fully verifiable historical track record.",
    status: "pending" as const,
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-cream">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-12 sm:px-8 sm:py-16">
        {/* ============================================================ */}
        {/* Hero                                                         */}
        {/* ============================================================ */}

        <section className="mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-ember mb-3">
            How It Works
          </p>
          <h1 className="text-4xl font-bold tracking-tighter text-ink-800 sm:text-5xl">
            Trust, but verify.
          </h1>
          <p className="mt-4 text-lg text-ink-400 leading-relaxed max-w-xl">
            XPilot is an AI trading copilot where every decision leaves a
            cryptographic paper trail. The agent commits a hash of its reasoning
            on-chain <em>before</em> it can execute a trade — making its
            decisions auditable, not opaque.
          </p>
        </section>

        {/* ============================================================ */}
        {/* The Problem                                                   */}
        {/* ============================================================ */}

        <section className="mb-12">
          <h2 className="text-2xl font-bold tracking-tight text-ink-800 mb-4">
            The Problem
          </h2>
          <Card>
            <p className="text-sm text-ink-600 leading-relaxed">
              AI agents are increasingly used in DeFi to analyze markets and
              place trades. But there&apos;s a fundamental trust gap:{" "}
              <strong>
                how do you know the agent actually used the reasoning it claims?
              </strong>{" "}
              Today&apos;s AI trading bots are black boxes — they might show you
              a summary of their &ldquo;thinking,&rdquo; but that summary could
              be generated after the fact, cherry-picked, or outright
              fabricated. Without cryptographic proof that the reasoning
              preceded the execution, there&apos;s no way to audit an AI
              agent&apos;s decision-making.
            </p>
          </Card>
        </section>

        {/* ============================================================ */}
        {/* The Solution                                                  */}
        {/* ============================================================ */}

        <section className="mb-12">
          <h2 className="text-2xl font-bold tracking-tight text-ink-800 mb-4">
            How XPilot Solves It
          </h2>
          <Card>
            <p className="text-sm text-ink-600 leading-relaxed">
              XPilot uses a <strong>commit-reveal pattern</strong> adapted for
              AI reasoning. Before the agent can execute any trade:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-ink-600 leading-relaxed">
              <li className="flex gap-2">
                <span className="text-ember font-bold shrink-0">1.</span>
                It{" "}
                <strong>
                  generates a structured reasoning document
                </strong>{" "}
                with its market analysis, strategy rationale, and expected
                outcomes.
              </li>
              <li className="flex gap-2">
                <span className="text-ember font-bold shrink-0">2.</span>
                It{" "}
                <strong>
                  hashes that reasoning with keccak256
                </strong>{" "}
                and posts ONLY the hash to an X Layer smart contract — along
                with a block timestamp.
              </li>
              <li className="flex gap-2">
                <span className="text-ember font-bold shrink-0">3.</span>
                Only after the hash is confirmed on-chain does the agent{" "}
                <strong>reveal the full reasoning text</strong> (which the
                contract verifies against the stored hash).
              </li>
            </ul>
            <p className="mt-3 text-sm text-ink-600 leading-relaxed">
              Anyone can verify: take the published reasoning, hash it with
              keccak256, and check that it matches the on-chain record timestamped{" "}
              <em>before the trade</em>. This is the same pattern that
              decentralized oracles and layer-2 rollups use for data integrity —
              applied to AI agent decision-making.
            </p>
          </Card>
        </section>

        {/* ============================================================ */}
        {/* The Flow                                                      */}
        {/* ============================================================ */}

        <section className="mb-12">
          <h2 className="text-2xl font-bold tracking-tight text-ink-800 mb-4">
            The Decision Flow
          </h2>
          <Card>
            <Timeline steps={DEMO_TIMELINE} />
          </Card>
        </section>

        {/* ============================================================ */}
        {/* Tech Stack                                                    */}
        {/* ============================================================ */}

        <section className="mb-12">
          <h2 className="text-2xl font-bold tracking-tight text-ink-800 mb-4">
            Tech Stack
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { layer: "Smart Contracts", tech: "Solidity, Foundry, X Layer L2" },
              { layer: "AI Agent", tech: "TypeScript, Node.js, Claude API, OKX DEX" },
              { layer: "Frontend", tech: "Next.js 14, Tailwind, wagmi, viem" },
              { layer: "Verification", tech: "keccak256 hashing, on-chain commit-reveal" },
            ].map((item) => (
              <Card key={item.layer}>
                <span className="text-2xs font-semibold uppercase tracking-wider text-neutral-400">
                  {item.layer}
                </span>
                <p className="mt-1 text-sm font-medium text-ink-700">
                  {item.tech}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/* Verify Yourself                                               */}
        {/* ============================================================ */}

        <section>
          <h2 className="text-2xl font-bold tracking-tight text-ink-800 mb-4">
            Verify a Decision Yourself
          </h2>
          <Card>
            <p className="text-sm text-ink-600 leading-relaxed">
              Visit any decision page on this dashboard. You&apos;ll see the
              agent&apos;s full reasoning text alongside its on-chain hash. The
              page re-computes <MonoText>keccak256(reasoning)</MonoText>{" "}
              client-side using the same cryptographic function the contract
              uses. If the hashes match, the reasoning is genuine — it was
              timestamped on-chain before any trade could execute.
            </p>
            <p className="mt-3 text-sm text-ink-600 leading-relaxed">
              You don&apos;t need to trust us. The math is verifiable by
              anyone, directly from the X Layer blockchain.
            </p>
          </Card>
        </section>
      </main>
    </div>
  );
}
