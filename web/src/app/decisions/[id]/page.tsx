"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  Badge,
  MonoText,
  StatusPulse,
  Button,
  Timeline,
} from "@/components/ui";
import { Navbar } from "@/components/shared/Navbar";
import { HashVerifier } from "@/components/decisions/HashVerifier";
import { fetchDecision, type OnChainDecision } from "@/lib/contracts";
import {
  fetchDecisionById,
  type AgentDecision,
} from "@/lib/agentApi";
import { xLayerTestnet } from "@/lib/chain";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DecisionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);

  const [onchain, setOnchain] = useState<OnChainDecision | null>(null);
  const [agent, setAgent] = useState<AgentDecision | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [oc, ag] = await Promise.all([
          fetchDecision(id),
          fetchDecisionById(id),
        ]);
        if (!oc) {
          setError(`Decision #${id} not found on-chain.`);
          return;
        }
        setOnchain(oc);
        setAgent(ag);
      } catch {
        setError("Failed to load decision data. Check network or contract availability.");
      } finally {
        setLoading(false);
      }
    }
    if (!isNaN(id)) load();
  }, [id]);

  // -----------------------------------------------------------------------
  // Loading / error / not found
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-cream">
        <Navbar />
        <main className="mx-auto max-w-3xl px-6 py-16 text-center">
          <StatusPulse status="analyzing" />
          <p className="mt-4 text-sm text-ink-400">
            Loading decision #{id}…
          </p>
        </main>
      </div>
    );
  }

  if (error || !onchain) {
    return (
      <div className="min-h-screen bg-cream">
        <Navbar />
        <main className="mx-auto max-w-3xl px-6 py-16 text-center">
          <p className="text-danger-600 text-sm font-medium">{error ?? "Decision not found."}</p>
          <Link href="/" className="mt-4 inline-block text-sm text-ember hover:underline">
            ← Back to Dashboard
          </Link>
        </main>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Derived state
  // -----------------------------------------------------------------------

  const url = xLayerTestnet.blockExplorers?.default.url ?? "#";
  const actionLabel =
    onchain.action === 1 ? "BUY" : onchain.action === 2 ? "SELL" : "HOLD";
  const actionVariant =
    onchain.action === 1 ? "buy" : onchain.action === 2 ? "sell" : "hold";

  const commitUrl = agent?.committedTx
    ? `${url}/tx/${agent.committedTx}`
    : null;
  const revealUrl = agent?.revealedTx
    ? `${url}/tx/${agent.revealedTx}`
    : null;

  const timelineSteps = [
    {
      id: "commit",
      label: "Hash Committed",
      detail: commitUrl ? (
        <a href={commitUrl} target="_blank" rel="noopener noreferrer" className="text-ember hover:underline">
          View commit TX on explorer →
        </a>
      ) : (
        <span className="text-ink-400">
          Stored at block timestamp {new Date(Number(onchain.timestamp) * 1000).toISOString()}
        </span>
      ),
      status: "complete" as const,
    },
    {
      id: "reveal",
      label: "Reasoning Revealed",
      detail: onchain.revealed ? (
        revealUrl ? (
          <a href={revealUrl} target="_blank" rel="noopener noreferrer" className="text-success hover:underline">
            View reveal TX on explorer →
          </a>
        ) : (
          <span className="text-success-600">Revealed on-chain ✓</span>
        )
      ) : (
        <span className="text-ink-400">Not yet revealed</span>
      ),
      status: onchain.revealed ? ("complete" as const) : ("pending" as const),
    },
    {
      id: "outcome",
      label: "Outcome Recorded",
      detail: onchain.outcomeRecorded ? (
        <span className={Number(onchain.pnlBps) >= 0 ? "text-success-600" : "text-danger-600"}>
          PnL: {Number(onchain.pnlBps) >= 0 ? "+" : ""}{Number(onchain.pnlBps)} bps
        </span>
      ) : (
        <span className="text-ink-400">Awaiting outcome</span>
      ),
      status: onchain.outcomeRecorded ? ("complete" as const) : ("pending" as const),
    },
  ];

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-8 sm:px-8 sm:py-12">
        {/* Back link */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-ink-600 transition-colors"
        >
          ← Back to Dashboard
        </Link>

        {/* ============================================================ */}
        {/* Header                                                       */}
        {/* ============================================================ */}

        <Card className="mb-8">
          <div className="flex flex-col gap-5">
            {/* Top row */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="mono-data text-sm text-ink-400">
                Decision #{id}
              </span>
              <Badge variant={actionVariant} size="md">
                {actionLabel}
              </Badge>
              <Badge
                variant={onchain.revealed ? "verified" : "unverified"}
                size="sm"
              >
                {onchain.revealed ? "Verified on-chain" : "Pending reveal"}
              </Badge>
            </div>

            {/* Hero numbers */}
            <div className="space-y-1">
              <p className="mono-data text-4xl font-bold tracking-tighter text-ink-800 sm:text-5xl">
                {onchain.assetPair}
              </p>
              <p className="mono-data text-2xl font-semibold text-ink-700">
                {Math.round(Number(onchain.confidenceBps) / 100)}% confidence
              </p>
            </div>

            {/* Metadata row */}
            <div className="grid gap-2 rounded-lg bg-cream-100 px-4 py-3 sm:grid-cols-2">
              <div>
                <span className="text-2xs font-semibold uppercase tracking-wider text-neutral-400">
                  Decision Hash
                </span>
                <div className="mt-0.5">
                  <MonoText truncate="middle" keep={8} copyable>
                    {onchain.decisionHash}
                  </MonoText>
                </div>
              </div>
              <div>
                <span className="text-2xs font-semibold uppercase tracking-wider text-neutral-400">
                  Agent
                </span>
                <div className="mt-0.5">
                  <MonoText truncate="middle" keep={6}>
                    {onchain.agentAddr}
                  </MonoText>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ============================================================ */}
        {/* Hash Verification — the "trust but verify" moment              */}
        {/* ============================================================ */}

        {agent?.reasoning ? (
          <section className="mb-8">
            <HashVerifier
              reasoning={agent.reasoning}
              expectedHash={onchain.decisionHash}
            />
          </section>
        ) : onchain.revealed ? (
          <section className="mb-8">
            <Card>
              <p className="text-sm text-ink-400">
                This decision has been revealed on-chain, but the reasoning
                text is only available in the{" "}
                <code className="mono-data text-2xs">ReasoningRevealed</code>{" "}
                event. The agent API can provide it when the agent service is
                running.
              </p>
            </Card>
          </section>
        ) : null}

        {/* ============================================================ */}
        {/* Full Reasoning                                               */}
        {/* ============================================================ */}

        {agent?.reasoning && (
          <section className="mb-8">
            <Card
              header="Agent Reasoning"
              footer="This reasoning was committed on-chain with a keccak256 hash before any trade could execute."
            >
              <pre className="whitespace-pre-wrap text-sm text-ink-600 leading-relaxed font-sans">
                {agent.reasoning}
              </pre>
            </Card>
          </section>
        )}

        {/* ============================================================ */}
        {/* Audit Trail                                                  */}
        {/* ============================================================ */}

        <section className="mb-8">
          <Card header="Audit Trail">
            <Timeline steps={timelineSteps} />
          </Card>
        </section>

        {/* ============================================================ */}
        {/* Explorer Links                                               */}
        {/* ============================================================ */}

        <section>
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-medium text-ink-700">
                View on Explorer
              </span>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`${url}/address/${xLayerTestnet.id === 1952 ? "0x208A8fD97286039eAA2CC7093a13f43B67f79521" : "#"}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="secondary" size="sm">
                    DecisionLog Contract →
                  </Button>
                </a>
                {commitUrl && (
                  <a href={commitUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="secondary" size="sm">
                      Commit TX →
                    </Button>
                  </a>
                )}
                {revealUrl && (
                  <a href={revealUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="secondary" size="sm">
                      Reveal TX →
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}
