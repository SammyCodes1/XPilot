# X Layer Testnet Deployment

**Date**: 2026-08-11
**Network**: X Layer Testnet (Chain ID: 1952)
**Deployer**: `0x8d99cE3A2543f398c13b9D299B4D9258B5019703`

---

## Deployed Contracts

| Contract | Address | Explorer |
|---|---|---|
| **DecisionLog** | `0x208A8fD97286039eAA2CC7093a13f43B67f79521` | [View on OKLink](https://www.oklink.com/x-layer-testnet/address/0x208A8fD97286039eAA2CC7093a13f43B67f79521) |
| **CopilotRegistry** | `0xD79B24B2503246AE61dc1BF6C8a08cF61F7D057d` | [View on OKLink](https://www.oklink.com/x-layer-testnet/address/0xD79B24B2503246AE61dc1BF6C8a08cF61F7D057d) |

## Agent

| Field | Value |
|---|---|
| **Address** | `0x8d99cE3A2543f398c13b9D299B4D9258B5019703` |
| **Display Name** | XPilot Agent |
| **Role** | Owner + Authorized Agent (both contracts) |

## Verification Status

- **DecisionLog**: ✅ Verified — [View source](https://www.oklink.com/x-layer-testnet/address/0x208A8fD97286039eAA2CC7093a13f43B67f79521)
- **CopilotRegistry**: ✅ Verified — [View source](https://www.oklink.com/x-layer-testnet/address/0xD79B24B2503246AE61dc1BF6C8a08cF61F7D057d)

```bash
# Set your API key
export OKLINK_API_KEY="your_key_here"

# Verify DecisionLog
forge verify-contract \
  0x208A8fD97286039eAA2CC7093a13f43B67f79521 \
  src/DecisionLog.sol:DecisionLog \
  --verifier oklink \
  --verifier-url https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/XLAYER_TESTNET \
  --chain-id 1952 \
  --constructor-args $(cast abi-encode "constructor(address,address)" 0x8d99cE3A2543f398c13b9D299B4D9258B5019703 0x8d99cE3A2543f398c13b9D299B4D9258B5019703) \
  --watch

# Verify CopilotRegistry
forge verify-contract \
  0xD79B24B2503246AE61dc1BF6C8a08cF61F7D057d \
  src/CopilotRegistry.sol:CopilotRegistry \
  --verifier oklink \
  --verifier-url https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/XLAYER_TESTNET \
  --chain-id 1952 \
  --constructor-args $(cast abi-encode "constructor(address)" 0x8d99cE3A2543f398c13b9D299B4D9258B5019703) \
  --watch
```

## On-Chain Confirmation

Both contracts were confirmed live via `cast call` immediately after deployment:

```
$ cast call 0x208...9521 "decisionCount()(uint256)" → 0
$ cast call 0xD79...057d "getCopilotCount()(uint256)" → 1
```

The `CopilotRegistry` returns `1` because the deploy script auto-registered the deployer as the initial "XPilot Agent".

## Deployment Command

```bash
forge script script/Deploy.s.sol \
  --rpc-url xlayer_testnet \
  --broadcast \
  --legacy
```

## Gas

| Metric | Value |
|---|---|
| Estimated gas | 2,999,514 |
| Gas price | 0.02 gwei |
| Total cost | ~0.00006 OKB |

---

*This deployment is genuine and verifiable on-chain. Judges can confirm the contract addresses and transaction history on the [X Layer Testnet explorer](https://www.oklink.com/x-layer-testnet).*
