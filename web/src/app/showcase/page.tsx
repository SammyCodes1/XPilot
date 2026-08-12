"use client";

import { useState } from "react";
import {
  Button,
  Card,
  Badge,
  StatusPulse,
  MonoText,
  DataTable,
  Timeline,
} from "@/components/ui";

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const DEMO_DECISIONS = [
  {
    id: 3,
    pair: "ETH-USDT",
    action: "BUY" as const,
    confidence: 7500,
    hash: "0xeee64d626ac4ad917caeb7d1c783a9d9405664154ce02f4cb163a0e5c45a1bb4",
    commitTx: "0xda5ed768c9320783d04099c31c1d6fe705ff6affd64c553d87f7b40b591877b9",
    timestamp: "2 min ago",
  },
  {
    id: 2,
    pair: "ETH-USDT",
    action: "SELL" as const,
    confidence: 6500,
    hash: "0x48c1042a2b4fa9837fd8160fb17a7d6629e5f33dd51b5b8a601803e52d8709ba",
    commitTx: "0x6a7bc34e9d663ffa38a98a146b95214b2d66a0c77acc38dd63bbb0838e259db2",
    timestamp: "5 min ago",
  },
  {
    id: 1,
    pair: "ETH-USDT",
    action: "SELL" as const,
    confidence: 6500,
    hash: "0xd02e6a78106480377e2277410db85c87a8b44b4515b46f39e5735d83b18c273b",
    commitTx: "0xe498c00a4f77aaa8049b7d8e2b74b4bdc664803364965e1651de7455be84643d",
    timestamp: "8 min ago",
  },
];

const DECISION_COLUMNS = [
  {
    key: "id",
    header: "ID",
    render: (r: (typeof DEMO_DECISIONS)[number]) => (
      <span className="mono-data text-ink-400">#{r.id}</span>
    ),
  },
  {
    key: "pair",
    header: "Pair",
    render: (r: (typeof DEMO_DECISIONS)[number]) => (
      <span className="font-medium">{r.pair}</span>
    ),
  },
  {
    key: "action",
    header: "Action",
    render: (r: (typeof DEMO_DECISIONS)[number]) => (
      <Badge
        variant={r.action === "BUY" ? "buy" : r.action === "SELL" ? "sell" : "hold"}
        size="sm"
      >
        {r.action}
      </Badge>
    ),
  },
  {
    key: "confidence",
    header: "Confidence",
    align: "right" as const,
    render: (r: (typeof DEMO_DECISIONS)[number]) => (
      <span className="mono-data">{r.confidence / 100}%</span>
    ),
  },
  {
    key: "hash",
    header: "Hash",
    render: (r: (typeof DEMO_DECISIONS)[number]) => (
      <MonoText truncate="middle" keep={6} copyable>
        {r.hash}
      </MonoText>
    ),
  },
  {
    key: "time",
    header: "When",
    render: (r: (typeof DEMO_DECISIONS)[number]) => (
      <span className="text-ink-400">{r.timestamp}</span>
    ),
  },
];

const DEMO_TIMELINE = [
  {
    id: "1",
    label: "Decision Committed",
    detail: (
      <span>
        Hash{" "}
        <code className="mono-data text-2xs">
          0x48c104…ba
        </code>{" "}
        timestamped on-chain
      </span>
    ),
    status: "complete" as const,
  },
  {
    id: "2",
    label: "Reasoning Revealed",
    detail: (
      <span>
        Full reasoning text verified against hash — TX{" "}
        <code className="mono-data text-2xs">0x05d8…43</code>
      </span>
    ),
    status: "complete" as const,
  },
  {
    id: "3",
    label: "Trade Execution",
    detail: <span>Awaiting EXECUTE_TRADES flag (currently disabled)</span>,
    status: "pending" as const,
  },
  {
    id: "4",
    label: "Outcome Recorded",
    detail: <span>PnL logged after position closes</span>,
    status: "pending" as const,
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ShowcasePage() {
  const [agentStatus, setAgentStatus] = useState<
    "idle" | "analyzing" | "committed" | "revealed" | "executed" | "error"
  >("idle");

  const cycleStatus = () => {
    const order: (typeof agentStatus)[] = [
      "idle",
      "analyzing",
      "committed",
      "revealed",
      "executed",
      "idle",
    ];
    const idx = order.indexOf(agentStatus);
    setAgentStatus(order[(idx + 1) % order.length]);
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-12">
      {/* ================================================================ */}
      {/* Hero                                                        */}
      {/* ================================================================ */}

      <section className="mb-22">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-ember">
              Design System
            </p>
            <h1 className="text-5xl font-bold tracking-tighter text-ink-800">
              XPilot Component
              <br />
              Showcase
            </h1>
            <p className="max-w-lg text-lg text-ink-400 leading-relaxed">
              Warm, agentic, credible. Built for an AI trading copilot
              dashboard where every number is precise, every state is visible,
              and the on-chain audit trail is the hero.
            </p>
          </div>

          {/* Live agent status demo */}
          <Card className="w-full sm:w-72 shrink-0">
            <div className="flex flex-col gap-4">
              <p className="text-2xs font-semibold uppercase tracking-wider text-neutral-400">
                Agent Status
              </p>
              <StatusPulse status={agentStatus} />
              <Button
                variant="secondary"
                size="sm"
                onClick={cycleStatus}
                className="self-start"
              >
                Cycle state
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* ================================================================ */}
      {/* Palette                                                     */}
      {/* ================================================================ */}

      <Section title="Palette" description="Warm cream base with burnt ember accents. Ink for text. No pure black, no harsh red.">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
          {[
            { name: "Cream", hex: "#F7F1E6", className: "bg-cream" },
            {
              name: "Surface",
              hex: "#FDFAF3",
              className: "bg-cream-surface border border-border",
            },
            { name: "Ember", hex: "#FF6B2C", className: "bg-ember" },
            { name: "Ink", hex: "#1F1B16", className: "bg-ink-800" },
            { name: "Success", hex: "#3B8258", className: "bg-success" },
            { name: "Danger", hex: "#C45642", className: "bg-danger" },
            { name: "Neutral", hex: "#AFA599", className: "bg-neutral" },
            {
              name: "Border",
              hex: "#E7DFCF",
              className: "bg-border border border-border-medium",
            },
          ].map((swatch) => (
            <div key={swatch.name} className="space-y-2">
              <div
                className={[
                  "h-16 rounded-lg border border-black/5",
                  swatch.className,
                ].join(" ")}
              />
              <p className="text-2xs font-medium text-ink-600">
                {swatch.name}
              </p>
              <p className="mono-data text-2xs text-ink-400">{swatch.hex}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ================================================================ */}
      {/* Typography                                                  */}
      {/* ================================================================ */}

      <Section
        title="Typography"
        description="Inter / Geist for UI. JetBrains Mono for all numeric data — the mono-for-data pattern that makes financial dashboards feel credible."
      >
        <div className="grid gap-8 sm:grid-cols-2">
          <div className="space-y-4">
            <p className="text-2xs font-semibold uppercase tracking-wider text-neutral-400">
              Sans — Headings + Body
            </p>
            <div className="space-y-2">
              <p className="text-5xl font-bold tracking-tighter text-ink-800">
                Hero number
              </p>
              <p className="text-3xl font-bold tracking-tight text-ink-700">
                Section heading
              </p>
              <p className="text-xl font-semibold text-ink-700">
                Card heading
              </p>
              <p className="text-base text-ink-600">
                Body text — 15px / 1.6 leading. Warm, readable, generous
                breathing room. The agent&apos;s reasoning should feel
                comfortable to read, not cramped.
              </p>
              <p className="text-sm text-ink-400">
                Small body — supporting details, metadata, timestamps.
              </p>
              <p className="text-2xs font-semibold uppercase tracking-wider text-neutral-400">
                Overline / Label
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-2xs font-semibold uppercase tracking-wider text-neutral-400">
              Mono — Data &amp; Code
            </p>
            <div className="space-y-3">
              <p className="mono-data text-lg text-ink-800">
                0x208A8fD97286039eAA2CC7093a13f43B67f79521
              </p>
              <p className="mono-data text-base text-ink-600">
                keccak256(reasoning) → 0x48c104
              </p>
              <p className="mono-data text-sm text-ink-500">
                $3,208.45 · 6,500 bps · RSI 54.8
              </p>
              <p className="mono-data text-xs text-ink-400">
                TX: 0x6a7bc34e9d663ffa38a98a146b95214b2d66a0c77acc38dd63bbb0838e259db2
              </p>
              <p className="mono-data text-2xs text-neutral-400">
                Block #38,020,097 · 2026-08-11T20:13:20Z
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ================================================================ */}
      {/* Buttons                                                     */}
      {/* ================================================================ */}

      <Section title="Button" description="Four variants, three sizes. Warm hover states with smooth 150ms transitions. Focus rings match the ember accent.">
        <div className="space-y-6">
          {(["primary", "secondary", "ghost", "danger"] as const).map(
            (variant) => (
              <div key={variant} className="flex flex-wrap items-center gap-3">
                <span className="w-20 text-xs font-medium text-ink-400 capitalize">
                  {variant}
                </span>
                <Button variant={variant} size="sm">
                  Small
                </Button>
                <Button variant={variant} size="md">
                  Medium
                </Button>
                <Button variant={variant} size="lg">
                  Large
                </Button>
                <Button variant={variant} disabled>
                  Disabled
                </Button>
                <Button variant={variant} loading>
                  Loading
                </Button>
              </div>
            ),
          )}
        </div>
      </Section>

      {/* ================================================================ */}
      {/* Badges                                                      */}
      {/* ================================================================ */}

      <Section title="Badge" description="Semantic badges for BUY, SELL, HOLD, and verification status. Uppercase, tightly tracked, with a subtle check icon on verified states.">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="buy">BUY</Badge>
          <Badge variant="buy" size="sm">
            BUY
          </Badge>
          <Badge variant="sell">SELL</Badge>
          <Badge variant="hold">HOLD</Badge>
          <Badge variant="verified">Verified</Badge>
          <Badge variant="unverified">Unverified</Badge>
          <Badge variant="neutral">Neutral</Badge>
        </div>
      </Section>

      {/* ================================================================ */}
      {/* StatusPulse                                                 */}
      {/* ================================================================ */}

      <Section
        title="StatusPulse"
        description="The agent's heartbeat. 'Analyzing' has a soft amber pulse animation. Other states are static colored dots. Click the buttons to see transitions."
      >
        <div className="flex flex-wrap items-center gap-4">
          <StatusPulse status="idle" />
          <StatusPulse status="analyzing" />
          <StatusPulse status="committed" />
          <StatusPulse status="revealed" />
          <StatusPulse status="executed" />
          <StatusPulse status="error" />
        </div>
      </Section>

      {/* ================================================================ */}
      {/* MonoText                                                    */}
      {/* ================================================================ */}

      <Section title="MonoText" description="The mono-for-data pattern. All hashes, addresses, prices, and scores render in JetBrains Mono with tabular-nums. Truncation options and a copy-on-click affordance.">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <MonoText>0x8d99cE3A2543f398c13b9D299B4D9258B5019703</MonoText>
            <span className="text-xs text-ink-400">Full address</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <MonoText truncate="middle" keep={6} copyable>
              0x208A8fD97286039eAA2CC7093a13f43B67f79521
            </MonoText>
            <span className="text-xs text-ink-400">
              Truncated middle + copyable
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <MonoText truncate="middle" keep={8} copyable>
              0x6a7bc34e9d663ffa38a98a146b95214b2d66a0c77acc38dd63bbb0838e259db2
            </MonoText>
            <span className="text-xs text-ink-400">
              TX hash — 8 chars each side
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <MonoText>$3,208.45</MonoText>
            <span className="text-xs text-ink-400">Price</span>
          </div>
        </div>
      </Section>

      {/* ================================================================ */}
      {/* Card                                                        */}
      {/* ================================================================ */}

      <Section title="Card" description="Surface panels with a 1px warm border, optional header and footer, and generous internal padding. No heavy shadows — depth comes from the border and the cream layering.">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <p className="text-sm font-semibold text-ink-700">Default card</p>
            <p className="mt-2 text-sm text-ink-400">
              Standard padding, no header or footer. Perfect for short content
              blocks.
            </p>
          </Card>

          <Card
            header="With Header"
            footer="Footer — secondary metadata, links, or actions"
          >
            <p className="text-sm text-ink-600">
              Cards can have a header with a bottom border and a footer with a
              top border. The body takes standard 24px padding.
            </p>
          </Card>

          <Card header="Agent Decision" noPadding>
            <DataTable
              columns={DECISION_COLUMNS.slice(0, 4)}
              data={DEMO_DECISIONS.slice(0, 3)}
              keyExtractor={(r) => String(r.id)}
            />
          </Card>
        </div>
      </Section>

      {/* ================================================================ */}
      {/* DataTable                                                   */}
      {/* ================================================================ */}

      <Section title="DataTable" description="Clean, minimal data grids with uppercase header labels, hover row highlighting, and proper mono-data alignment. Designed for decision logs and on-chain records.">
        <Card noPadding>
          <DataTable
            columns={DECISION_COLUMNS}
            data={DEMO_DECISIONS}
            keyExtractor={(r) => String(r.id)}
          />
        </Card>
      </Section>

      {/* ================================================================ */}
      {/* Timeline                                                    */}
      {/* ================================================================ */}

      <Section title="Timeline" description="The on-chain audit trail, made visible. Each decision flows through commit → reveal → execute → outcome. Completed steps show in success green, current step pulses in ember, pending steps are muted. This IS the product differentiator — it deserves prominence.">
        <div className="grid gap-8 sm:grid-cols-2">
          <Card header="Decision #2 Audit Trail">
            <Timeline steps={DEMO_TIMELINE} />
          </Card>

          <Card header="All States">
            <Timeline
              steps={[
                {
                  id: "a",
                  label: "Complete step",
                  detail: (
                    <span>
                      TX{" "}
                      <code className="mono-data text-2xs">
                        0x6a7b…db2
                      </code>
                    </span>
                  ),
                  status: "complete",
                },
                {
                  id: "b",
                  label: "Current step — in progress",
                  detail: (
                    <span className="text-ember-600">
                      Waiting for transaction confirmation
                    </span>
                  ),
                  status: "current",
                },
                {
                  id: "c",
                  label: "Pending step",
                  status: "pending",
                },
                {
                  id: "d",
                  label: "Error — transaction reverted",
                  detail: (
                    <span className="text-danger-600">
                      Insufficient gas
                    </span>
                  ),
                  status: "error",
                },
              ]}
            />
          </Card>
        </div>
      </Section>

      {/* ================================================================ */}
      {/* Footer                                                      */}
      {/* ================================================================ */}

      <footer className="mt-22 border-t border-border-light pt-8 text-center">
        <p className="text-sm text-ink-400">
          XPilot Design System — Built for the OKX X Layer AI Season Hackathon
        </p>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section helper
// ---------------------------------------------------------------------------

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-18">
      <div className="mb-6 max-w-2xl">
        <h2 className="text-2xl font-bold tracking-tight text-ink-800">
          {title}
        </h2>
        <p className="mt-1.5 text-sm text-ink-400 leading-relaxed">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}
