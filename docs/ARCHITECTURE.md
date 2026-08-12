# XPilot — Architecture Notes

## Decision Record

### ADR-001: Commit-Reveal for AI Reasoning

**Decision**: Use a single `commitReasoning(bytes32)` call before every trade, with the full reasoning stored off-chain and referenced by its sha256 hash.

**Alternatives considered**:
- Post reasoning as calldata directly: too expensive on L2 for long-form reasoning text.
- zk-proof of reasoning: too complex for the hackathon scope; sha256 + off-chain storage is simpler and equally verifiable.
- No on-chain proof at all: defeats the purpose — we need the timestamp guarantee that reasoning existed before execution.

### ADR-002: X Layer as the Settlement Chain

**Decision**: Deploy contracts to X Layer (OKX's L2) rather than Ethereum mainnet.

**Rationale**:
- Lower gas costs for frequent commit transactions.
- Native integration with OKX ecosystem (DEX API, wallet).
- Hackathon requirement: this is for the OKX X Layer AI Season.

### ADR-003: Monorepo with pnpm Workspaces

**Decision**: Use pnpm workspaces for the web and agent packages. Contracts are a separate Foundry project (not an npm package) but live in the same repo for co-location.

## System Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  MARKET DATA  │     │   AI MODEL   │     │  X LAYER L2  │
│  (CCXT,       │────▶│  (GPT-4o /   │────▶│  (commit     │
│   CoinGecko)  │     │   Claude)    │     │   reasoning) │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                                  ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   DASHBOARD  │     │  OKX DEX API │     │   TX MINED   │
│   (Next.js)  │◀────│  (execute    │◀────│   (reasoning │
│              │     │   trade)     │     │    committed)│
└──────────────┘     └──────────────┘     └──────────────┘
```

1. Agent fetches market data every `AGENT_SCAN_INTERVAL_MS`
2. Data is structured into a prompt for the LLM
3. LLM returns structured JSON with: `{ reasoning, action, token, amount, confidence }`
4. Agent computes `sha256(reasoningText)` and calls `commitReasoning(hash)` on X Layer
5. Agent waits for block confirmation
6. If confidence > `AGENT_MIN_CONFIDENCE`, agent calls OKX DEX API to execute
7. Frontend polls contract events and displays the agent's track record

## Contract Design

A single `XPilotVerifier` contract:
- `commitReasoning(bytes32)` — only callable by the authorized agent EOA
- `verifyReasoning(string)` — public view; returns (committed: bool, timestamp: uint256)
- Events emitted for every commit so the frontend can build a timeline without polling state

## Security Considerations

- Agent private key must be a dedicated hot wallet with only enough X Layer native token for gas
- Trade size capped at `AGENT_MAX_TRADE_USD`
- Minimum confidence threshold prevents low-quality trades
- Reasoning hash is content-addressed — can't be forged after the fact
