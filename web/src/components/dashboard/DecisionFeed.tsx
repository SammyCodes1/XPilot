"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, Badge, MonoText, StatusPulse, Timeline } from "@/components/ui";
import type { OnChainDecision } from "@/lib/contracts";
import { fetchDecisionCount, fetchDecision } from "@/lib/contracts";
import type { AgentDecision } from "@/lib/agentApi";
import { fetchDecisions } from "@/lib/agentApi";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DecisionWithReveal = {
  onchain: OnChainDecision;
  agent?: AgentDecision; // enriched from agent API (reasoning text, tx hashes)
};

// ---------------------------------------------------------------------------
// Expandable decision row
// ---------------------------------------------------------------------------

function DecisionRow({ data }: { data: DecisionWithReveal }) {
  const [expanded, setExpanded] = useState(false);
  const d = data.onchain;
  const agent = data.agent;

  const actionLabel = d.action === 1 ? "BUY" : d.action === 2 ? "SELL" : "HOLD";
  const actionVariant = d.action === 1 ? "buy" : d.action === 2 ? "sell" : "hold";

  const timelineSteps = [
    {
      id: "commit",
      label: "Hash Committed",
      detail: agent?.committedTx ? (
        <MonoText truncate="middle" keep={6} copyable>
          {agent.committedTx}
        </MonoText>
      ) : (
        <span className="text-ink-400">
          TX {d.decisionHash.slice(0, 10)}…
        </span>
      ),
      status: "complete" as const,
    },
    {
      id: "reveal",
      label: "Reasoning Revealed",
      detail: d.revealed ? (
        agent?.revealedTx ? (
          <a
            href={`https://www.oklink.com/x-layer-testnet/tx/${agent.revealedTx}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ember hover:underline"
          >
            View on explorer →
          </a>
        ) : (
          <span className="text-success-600">Verified on-chain</span>
        )
      ) : (
        <span className="text-ink-400">Pending reveal</span>
      ),
      status: d.revealed ? ("complete" as const) : ("pending" as const),
    },
    {
      id: "execute",
      label: "Trade Executed",
      detail: agent?.executed ? (
        <span className="text-success-600">Executed via OKX DEX</span>
      ) : (
        <span className="text-ink-400">Not executed (EXECUTE_TRADES=off)</span>
      ),
      status: agent?.executed ? ("complete" as const) : ("pending" as const),
    },
    {
      id: "outcome",
      label: "Outcome Recorded",
      detail: d.outcomeRecorded ? (
        <span className={Number(d.pnlBps) >= 0 ? "text-success-600" : "text-danger-600"}>
          {Number(d.pnlBps) >= 0 ? "+" : ""}
          {Number(d.pnlBps)} bps
        </span>
      ) : (
        <span className="text-ink-400">Awaiting settlement</span>
      ),
      status: d.outcomeRecorded
        ? ("complete" as const)
        : ("pending" as const),
    },
  ];

  return (
    <div className="border-b border-border-light/60 last:border-b-0">
      {/* Summary row — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-cream-50"
      >
        {/* ID */}
        <span className="mono-data text-xs text-ink-400 w-10 shrink-0">
          #{d.id.toString()}
        </span>

        {/* Pair */}
        <span className="text-sm font-medium text-ink-700 w-20 shrink-0">
          {d.assetPair}
        </span>

        {/* Action badge */}
        <Badge variant={actionVariant} size="sm">
          {actionLabel}
        </Badge>

        {/* Confidence */}
        <span className="mono-data text-sm text-ink-600 shrink-0">
          {Math.round(Number(d.confidenceBps) / 100)}%
        </span>

        {/* Revealed status */}
        <span className="shrink-0">
          {d.revealed ? (
            <Badge variant="verified" size="sm">
              Verified
            </Badge>
          ) : (
            <Badge variant="unverified" size="sm">
              Pending
            </Badge>
          )}
        </span>

        {/* Spacer */}
        <span className="flex-1" />

        {/* Expand indicator */}
        <span className="mono-data text-xs text-ink-400 shrink-0">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-6 pb-5 animate-fade-in">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Timeline */}
            <div>
              <p className="mb-3 text-2xs font-semibold uppercase tracking-wider text-neutral-400">
                Audit Trail
              </p>
              <Timeline steps={timelineSteps} />
              <Link
                href={`/decisions/${d.id}`}
                className="mt-3 inline-flex items-center text-xs font-medium text-ember hover:underline"
              >
                Full detail →
              </Link>
            </div>

            {/* Reasoning preview */}
            <div>
              <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-neutral-400">
                Reasoning
              </p>
              {agent?.reasoning ? (
                <p className="text-sm text-ink-600 leading-relaxed line-clamp-4">
                  {agent.reasoning}
                </p>
              ) : (
                <p className="text-sm text-ink-400 italic">
                  {d.revealed
                    ? "Reasoning revealed on-chain — fetch the ReasoningRevealed event to view."
                    : "Reasoning not yet revealed."}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component — fetches + renders the decision feed
// ---------------------------------------------------------------------------

export function DecisionFeed() {
  const [decisions, setDecisions] = useState<DecisionWithReveal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const count = await fetchDecisionCount();
      const agentDecisions = await fetchDecisions();
      const agentMap = new Map(
        agentDecisions.map((d) => [d.decisionId, d]),
      );

      // Fetch latest 20 decisions from on-chain, newest first
      const ids: DecisionWithReveal[] = [];
      const start = Math.max(0, count - 20);
      for (let i = count - 1; i >= start; i--) {
        const onchain = await fetchDecision(i);
        if (onchain) {
          ids.push({ onchain, agent: agentMap.get(i) });
        }
      }
      setDecisions(ids);
    } catch {
      // Agent API may not be running — try on-chain only
      try {
        const count = await fetchDecisionCount();
        const ids: DecisionWithReveal[] = [];
        const start = Math.max(0, count - 20);
        for (let i = count - 1; i >= start; i--) {
          const onchain = await fetchDecision(i);
          if (onchain) {
            ids.push({ onchain });
          }
        }
        setDecisions(ids);
      } catch {
        // Both failed — probably network issue
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-3 py-8 text-sm text-ink-400">
          <StatusPulse status="analyzing" />
          Loading on-chain decisions…
        </div>
      </Card>
    );
  }

  if (decisions.length === 0) {
    return (
      <Card>
        <div className="py-12 text-center">
          <p className="text-sm text-ink-400">
            No decisions yet. Start the agent to see the first one appear here.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card noPadding>
      {decisions.map((d) => (
        <DecisionRow key={d.onchain.id.toString()} data={d} />
      ))}
    </Card>
  );
}
