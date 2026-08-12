"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, Badge, MonoText, StatusPulse } from "@/components/ui";
import { Navbar } from "@/components/shared/Navbar";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { DecisionFeed } from "@/components/dashboard/DecisionFeed";
import { fetchDecisions, type AgentDecision } from "@/lib/agentApi";
import { xLayerTestnet } from "@/lib/chain";

// ---------------------------------------------------------------------------
// Hero recommendation — the agent's current call, big and bold
// ---------------------------------------------------------------------------

function HeroRecommendation({ decision }: { decision: AgentDecision | null }) {
  if (!decision) {
    return (
      <Card className="text-center py-10 sm:py-14">
        <StatusPulse status="idle" />
        <p className="mt-4 text-sm text-ink-400">
          Agent is idle. Waiting for the next decision cycle.
        </p>
      </Card>
    );
  }

  const actionVariant =
    decision.action === "BUY"
      ? "buy"
      : decision.action === "SELL"
        ? "sell"
        : "hold";

  return (
    <Card>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: the call */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-ember">
              Current Recommendation
            </span>
            <StatusPulse
              status={
                decision.revealedTx
                  ? "revealed"
                  : decision.committedTx
                    ? "committed"
                    : "analyzing"
              }
            />
          </div>

          {/* The big numbers */}
          <div className="space-y-1">
            <p className="mono-data text-5xl font-bold tracking-tighter text-ink-800">
              {decision.pair}
            </p>
            <div className="flex items-center gap-4">
              <Badge variant={actionVariant} size="md">
                {decision.action}
              </Badge>
              <span className="mono-data text-3xl font-semibold text-ink-700">
                {Math.round(decision.confidenceBps / 100)}%
              </span>
              <span className="text-sm text-ink-400">confidence</span>
            </div>
          </div>
        </div>

        {/* Right: tx links */}
        <div className="flex flex-col gap-2 sm:items-end">
          {decision.committedTx && (
            <a
              href={`${xLayerTestnet.blockExplorers?.default.url}/tx/${decision.committedTx}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ember hover:underline"
            >
              Commit TX <MonoText truncate="middle" keep={6}>{decision.committedTx}</MonoText>
            </a>
          )}
          {decision.revealedTx && (
            <a
              href={`${xLayerTestnet.blockExplorers?.default.url}/tx/${decision.revealedTx}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-success hover:underline"
            >
              Reveal TX <MonoText truncate="middle" keep={6}>{decision.revealedTx}</MonoText>
            </a>
          )}
        </div>
      </div>

      {/* Reasoning excerpt */}
      {decision.reasoning && (
        <div className="mt-5 border-t border-border-light pt-4">
          <p className="text-sm text-ink-600 leading-relaxed line-clamp-3">
            {decision.reasoning}
          </p>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [latestDecision, setLatestDecision] = useState<AgentDecision | null>(
    null,
  );

  const refresh = useCallback(async () => {
    try {
      const decisions = await fetchDecisions();
      setLatestDecision(decisions[0] ?? null);
    } catch {
      // Agent API may not be running
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-8 sm:px-8 sm:py-12 lg:px-12">
        {/* ============================================================ */}
        {/* Hero                                                         */}
        {/* ============================================================ */}

        <section className="mb-10">
          <HeroRecommendation decision={latestDecision} />
        </section>

        {/* ============================================================ */}
        {/* Stats                                                        */}
        {/* ============================================================ */}

        <section className="mb-10">
          <StatsBar />
        </section>

        {/* ============================================================ */}
        {/* Decision Feed                                                */}
        {/* ============================================================ */}

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-ink-800">
              Decision History
            </h2>
            <span className="text-xs text-ink-400">
              Auto-refreshes every 30s
            </span>
          </div>
          <DecisionFeed />
        </section>
      </main>
    </div>
  );
}
