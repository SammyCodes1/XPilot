# XPilot — AI-Verified DeFi Trading Copilot

**Built for the OKX X Layer AI Season Hackathon**

---

## The Problem

DeFi traders increasingly rely on AI agents to analyze markets and execute trades, but there's a fundamental trust gap: when an AI agent places a trade on your behalf, how do you know it actually followed the reasoning it claims? Today's AI trading bots are black boxes — they might show you a summary of their "thinking," but that summary could be generated after the fact, cherry-picked, or outright fabricated. Without cryptographic proof that the reasoning preceded the execution, there's no way to audit an AI agent's decision-making. This erodes trust, makes it impossible to learn from past mistakes, and creates legal and regulatory risk around automated trading systems.

## How XPilot Solves It

XPilot introduces **on-chain attested reasoning** — a commit-reveal pattern applied to AI trading decisions. Before the agent executes any trade, it generates a structured reasoning document (market analysis, strategy rationale, expected outcomes) and posts a SHA-256 hash of that document to an X Layer smart contract along with a sequential nonce and timestamp. Only after the hash is confirmed on-chain does the agent proceed to execute the trade via the OKX DEX API. The full reasoning text is stored off-chain (indexed by the same hash), so anyone can later verify: take the published reasoning, hash it, and check that it matches the on-chain record that was committed *before* execution. This gives every trade a cryptographically verifiable paper trail.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                     X Layer L2                       │
│  ┌───────────────────────────────────────────────┐  │
│  │          XPilotVerifier (Smart Contract)       │  │
│  │  • commitReasoning(bytes32 hash, uint256 nonce)│  │
│  │  • executeTrade(bytes32 hash, TradeParams)     │  │
│  │  • reasoningRegistry: hash → (timestamp, nonce)│  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
           ▲                              │
           │ commitReasoning()            │ executeTrade()
           │                              ▼
  ┌────────┴────────┐          ┌─────────────────────┐
  │   XPilot Agent   │          │    OKX DEX API      │
  │  • Market data   │──────────▶  • Execute swap     │
  │  • AI reasoning  │          │  • Get quotes       │
  │  • Hash commit   │          └─────────────────────┘
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │  XPilot Web UI   │
  │  • Dashboard     │
  │  • Verify claims │
  │  • Track record  │
  └─────────────────┘
```

1. **Smart Contracts** (`/contracts`) — A Foundry Solidity project deployed to X Layer. One core contract, `XPilotVerifier`, stores reasoning hashes with their block timestamp and nonce, and exposes a `commitReasoning` function (write-only, callable only by the agent's authorized address) and a public `verifyReasoning` view that takes a plaintext reasoning string and returns whether it matches a previously committed hash. A secondary `TradeLogger` contract optionally records executed trade parameters for on-chain track-record display.

2. **AI Agent** (`/agent`) — A TypeScript Node.js service that runs on a schedule or trigger. It pulls market data (price feeds, on-chain metrics, DEX liquidity), constructs a prompt for an LLM (OpenAI / Claude / local model), parses the structured reasoning output, computes its SHA-256 hash, calls `commitReasoning` on X Layer, waits for confirmation, then optionally calls the OKX DEX API to execute the trade. Every decision is logged with its reasoning hash for later verification.

3. **Web Frontend** (`/web`) — A Next.js 14 App Router frontend. Displays a real-time dashboard of the agent's activity, a verification page where users paste reasoning text to check it against the on-chain hash, and a historical track record with performance metrics. Uses wagmi + viem for contract reads, Tailwind for styling.

4. **Docs** (`/docs`) — Architecture decision records, a judge-focused explainer, and integration guides for running the full system locally.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Blockchain** | Solidity, Foundry, X Layer (L2), viem |
| **Agent Backend** | Node.js, TypeScript, OpenAI/Claude API, OKX DEX API |
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, wagmi |
| **Monorepo** | pnpm workspaces, Turborepo |
| **CI/CD** | GitHub Actions (forge test + pnpm lint) |

## Quick Start

```bash
# Install all dependencies (root + subprojects)
pnpm install

# Contracts: compile & test
cd contracts && forge build && forge test

# Agent: start in dev mode
cd agent && pnpm dev

# Web: start frontend
cd web && pnpm dev
```

## License

MIT
