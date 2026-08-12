"use client";

import { useEffect, useState } from "react";
import { fetchDecision, fetchDecisionCount } from "@/lib/contracts";

// ---------------------------------------------------------------------------
// Stat tile
// ---------------------------------------------------------------------------

function StatTile({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: "positive" | "negative";
}) {
  const highlightClass =
    highlight === "positive"
      ? "text-success"
      : highlight === "negative"
        ? "text-danger"
        : "text-ink-800";

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border-light bg-cream-surface px-5 py-4">
      <span className="text-2xs font-semibold uppercase tracking-wider text-neutral-400">
        {label}
      </span>
      <span
        className={
          mono
            ? `mono-data text-2xl font-semibold ${highlightClass}`
            : `text-2xl font-bold tracking-tight ${highlightClass}`
        }
      >
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AGENT_API =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_AGENT_API ?? "http://localhost:3001"
    : "http://localhost:3001";

export function StatsBar() {
  const [onChainCount, setOnChainCount] = useState<number | null>(null);
  const [agentCycles, setAgentCycles] = useState<number>(0);
  const [winRate, setWinRate] = useState<string>("—");
  const [highlight, setHighlight] = useState<"positive" | "negative" | undefined>();

  useEffect(() => {
    async function load() {
      // On-chain decision count
      try {
        const count = await fetchDecisionCount();
        setOnChainCount(count);
      } catch {
        setOnChainCount(null);
      }

      // Agent cycles from REST API
      try {
        const resp = await fetch(`${AGENT_API}/decisions`);
        const data = await resp.json();
        setAgentCycles(data.count ?? 0);
      } catch {
        // agent may not be running
      }

      // Win rate — read outcomes from the last 50 on-chain decisions
      try {
        const count = await fetchDecisionCount();
        let wins = 0;
        let losses = 0;
        const start = Math.max(0, count - 50);

        for (let i = count - 1; i >= start; i--) {
          const d = await fetchDecision(i);
          if (d && d.outcomeRecorded) {
            const pnl = Number(d.pnlBps);
            if (pnl > 0) wins++;
            else if (pnl < 0) losses++;
            // pnlBps === 0 counts as neither
          }
        }

        const total = wins + losses;
        if (total > 0) {
          const rate = Math.round((wins / total) * 100);
          setWinRate(`${rate}%`);
          setHighlight(rate >= 50 ? "positive" : "negative");
        }
      } catch {
        // keep "—"
      }
    }

    load();
  }, []);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile
        label="On-Chain Decisions"
        value={onChainCount !== null ? String(onChainCount) : "…"}
        mono
      />
      <StatTile label="Agent Cycles" value={String(agentCycles)} mono />
      <StatTile
        label="Win Rate"
        value={winRate}
        mono
        highlight={highlight}
      />
      <StatTile label="Execution Mode" value="Off" />
    </div>
  );
}
