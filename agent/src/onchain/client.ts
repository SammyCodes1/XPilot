import {
  createWalletClient,
  createPublicClient,
  http,
  keccak256,
  toBytes,
  type Hash,
  type WalletClient,
  type PublicClient,
  type Transport,
  type Chain,
  type Account,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { xLayerTestnet } from "./chain.js";
import { config } from "../config.js";
import { logger } from "../logger.js";

// ---------------------------------------------------------------------------
// Clients (lazy — created once, reused)
// ---------------------------------------------------------------------------

let _walletClient: WalletClient<Transport, Chain, Account> | null = null;
let _publicClient: PublicClient<Transport, Chain> | null = null;

/** Normalise a private key string: strip 0x if present, re-add, create account. */
function getAccount(): Account {
  let key = config.privateKey;
  if (key.startsWith("0x")) key = key.slice(2) as `0x${string}`;
  return privateKeyToAccount(`0x${key}`);
}

export function getWalletClient(): WalletClient<Transport, Chain, Account> {
  if (!_walletClient) {
    const account = getAccount();
    _walletClient = createWalletClient({
      chain: xLayerTestnet,
      transport: http(config.rpcUrl),
      account,
    });
    logger.info({ address: account.address }, "Wallet client initialised");
  }
  return _walletClient;
}

export function getPublicClient(): PublicClient<Transport, Chain> {
  if (!_publicClient) {
    _publicClient = createPublicClient({
      chain: xLayerTestnet,
      transport: http(config.rpcUrl),
    });
  }
  return _publicClient;
}

// ---------------------------------------------------------------------------
// Hashing (MUST match Solidity's keccak256(bytes(reasoningText)))
// ---------------------------------------------------------------------------

/**
 * Hash a reasoning string using keccak256, matching Solidity's
 * `keccak256(bytes(reasoningText))` byte-for-byte.
 *
 * Uses viem's `toBytes` (UTF-8 encoding) which is what Solidity's
 * `bytes(string)` does internally via `abi.encodePacked`.
 */
export function hashReasoning(reasoning: string): Hash {
  return keccak256(toBytes(reasoning));
}
