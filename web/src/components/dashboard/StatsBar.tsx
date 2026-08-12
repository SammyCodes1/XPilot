"use client";

import { useEffect, useState } from "react";
import { fetchDecisionCount } from "@/lib/contracts";

// ---------------------------------------------------------------------------
// Stat tile
// ---------------------------------------------------------------------------

function StatTile({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border-light bg-cream-surface px-5 py-4">
      <span className="text-2xs font-semibold uppercase tracking-wider text-neutral-400">
        {label}
      </span>
      <span
        className={
          mono
            ? "mono-data text-2xl font-semibold text-ink-800"
            : "text-2xl font-bold tracking-tight text-ink-800"
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

export function StatsBar() {
  const [onChainCount, setOnChainCount] = useState<number | null>(null);
  const [agentDecisions, setAgentDecisions] = useState<number>(0);

  useEffect(() => {
    // Fetch on-chain decision count
    fetchDecisionCount()
      .then(setOnChainCount)
      .catch(() => setOnChainCount(null));

    // Fetch agent decisions from REST API
    fetch("http://localhost:3001/decisions")
      .then((r) => r.json())
      .then((d) => setAgentDecisions(d.count ?? 0))
      .catch(() => {});
  }, []);

  // Compute win rate from agent decisions (placeholder until outcomes are recorded)
  const winRate = "—";

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile
        label="On-Chain Decisions"
        value={onChainCount !== null ? String(onChainCount) : "…"}
        mono
      />
      <StatTile label="Agent Cycles" value={String(agentDecisions)} mono />
      <StatTile label="Win Rate" value={winRate} mono />
      <StatTile label="Execution Mode" value="Off" />
    </div>
  );
}
