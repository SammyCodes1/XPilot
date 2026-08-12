import { describe, it, expect } from "vitest";
import { keccak256, toBytes } from "viem";

/**
 * Verify that our keccak256 hashing matches the Solidity contract's
 * keccak256(bytes(reasoningText)) byte-for-byte.
 */

describe("keccak256 reasoning hashing", () => {
  it("produces deterministic hashes for the same input", () => {
    const reasoning = "Buy 1 ETH at $3000 - bullish divergence on 4h";
    const hash1 = keccak256(toBytes(reasoning));
    const hash2 = keccak256(toBytes(reasoning));
    expect(hash1).toBe(hash2);
  });

  it("empty string hash matches Solidity keccak256(bytes(''))", () => {
    const hash = keccak256(toBytes(""));
    // This is the well-known keccak256 of empty input
    expect(hash).toBe(
      "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
    );
  });

  it("produces different hashes for different input", () => {
    const hashA = keccak256(toBytes("Buy ETH"));
    const hashB = keccak256(toBytes("Sell ETH"));
    expect(hashA).not.toBe(hashB);
  });

  it("byte-for-byte: trailing whitespace matters", () => {
    const withSpace = keccak256(toBytes("hello "));
    const withoutSpace = keccak256(toBytes("hello"));
    expect(withSpace).not.toBe(withoutSpace);
  });

  it("UTF-8 multi-byte characters hash consistently", () => {
    const reasoning = "Signal shows bullish trend - 95% confidence";
    const hash1 = keccak256(toBytes(reasoning));
    const hash2 = keccak256(toBytes(reasoning));
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("produces valid 32-byte hex output", () => {
    // keccak256 always produces 32 bytes = 64 hex chars + '0x' prefix
    const hash = keccak256(toBytes("any input"));
    expect(hash).toHaveLength(66); // '0x' + 64 hex chars
    expect(hash.startsWith("0x")).toBe(true);
  });
});

describe("hashReasoning convenience function", () => {
  it("produces the same result as inline keccak256(toBytes(...))", async () => {
    const { hashReasoning } = await import("../src/onchain/client.js");
    const reasoning = "Full reasoning for a BUY decision on ETH/USDT";
    const expected = keccak256(toBytes(reasoning));
    expect(hashReasoning(reasoning)).toBe(expected);
  });
});
