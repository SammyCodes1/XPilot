# XPilot — Judge Briefing

## What We Built

XPilot is an **AI-verified DeFi trading copilot** that makes AI trading decisions auditable by committing a cryptographic hash of the agent's reasoning on-chain **before** executing any trade. This transforms the AI from a black box into a provably honest operator.

## Why It Matters

AI agents are increasingly used in DeFi, but current solutions have no way to prove that the agent actually used the reasoning it claims. An agent could execute a bad trade based on flawed analysis, then after the fact generate a plausible-sounding "explanation" that hides the real decision process. XPilot's commit-reveal pattern makes this impossible — the reasoning is timestamped on X Layer before the trade executes.

## How It Works (30-Second Version)

1. The AI agent analyzes market data and generates a trade recommendation with full reasoning
2. It hashes the reasoning (SHA-256) and posts just the hash to an X Layer smart contract
3. Only after the hash is confirmed on-chain does the agent execute the trade via OKX DEX
4. Anyone can verify: paste the claimed reasoning → it hashes to the same value committed before the trade

## Technical Highlights

- **On-chain verification**: Smart contract on X Layer stores reasoning hashes with block timestamps
- **Non-repudiation**: The commit-before-execute pattern proves the reasoning preceded the action
- **Full audit trail**: Every trade is linked to a verifiable reasoning record
- **OKX ecosystem**: Uses X Layer for settlement and OKX DEX API for execution

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Smart Contracts | Solidity, Foundry |
| Blockchain | X Layer (L2) |
| AI Agent | TypeScript, Node.js, LLM (GPT-4o / Claude) |
| Frontend | Next.js 14, Tailwind CSS, wagmi |
| DEX Integration | OKX DEX API |
| Monorepo | pnpm workspaces |

## Key Design Decisions

- **Hash on-chain, data off-chain**: Full reasoning text is too large for calldata; storing only the hash keeps gas costs minimal while maintaining verifiability
- **X Layer over Ethereum L1**: Lower costs for frequent commits, native OKX ecosystem integration
- **Commit-reveal over ZK**: Simpler, more explainable, and sufficient for the trust model — a zk-proof of reasoning would be overengineered for this use case
