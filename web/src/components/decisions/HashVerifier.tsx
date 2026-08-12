"use client";

import { useState, useEffect, useCallback } from "react";
import { keccak256, toBytes } from "viem";
import { Card, MonoText } from "@/components/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HashVerifierProps {
  reasoning: string;
  expectedHash: string; // 0x-prefixed bytes32 from the contract
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HashVerifier({
  reasoning,
  expectedHash,
  className = "",
}: HashVerifierProps) {
  const [computedHash, setComputedHash] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "computing" | "match" | "mismatch">(
    "computing",
  );
  const [showAnim, setShowAnim] = useState(false);

  // Compute keccak256 client-side (byte-identical to Solidity's keccak256(bytes(...)))
  useEffect(() => {
    setStatus("computing");
    // Small delay so the "computing" state is visible
    const t = setTimeout(() => {
      try {
        const hash = keccak256(toBytes(reasoning));
        setComputedHash(hash);
        const isMatch =
          hash.toLowerCase() === expectedHash.toLowerCase();
        setStatus(isMatch ? "match" : "mismatch");
        if (isMatch) {
          setShowAnim(true);
          const reset = setTimeout(() => setShowAnim(false), 2400);
          return () => clearTimeout(reset);
        }
      } catch {
        setStatus("mismatch");
      }
    }, 600);
    return () => clearTimeout(t);
  }, [reasoning, expectedHash]);

  return (
    <Card className={className}>
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          {/* Status icon */}
          <div className="shrink-0">
            {status === "computing" && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ember-100">
                <div className="h-3 w-3 rounded-full bg-ember animate-pulse-soft" />
              </div>
            )}
            {status === "match" && (
              <div
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-full bg-success-100",
                  showAnim && "animate-bounce",
                ].join(" ")}
              >
                <svg
                  className="h-4 w-4 text-success"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 8l3.5 3.5L13 5" />
                </svg>
              </div>
            )}
            {status === "mismatch" && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-danger-100">
                <svg
                  className="h-4 w-4 text-danger"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M5 5l6 6M11 5l-6 6" />
                </svg>
              </div>
            )}
          </div>

          {/* Label */}
          <div>
            <p className="text-sm font-semibold text-ink-700">
              {status === "computing" && "Computing hash…"}
              {status === "match" && "Hashes match — verified on-chain"}
              {status === "mismatch" && "Hashes do NOT match"}
            </p>
            <p className="text-xs text-ink-400 mt-0.5">
              {status === "match"
                ? "This reasoning was timestamped on-chain before any trade could execute."
                : status === "mismatch"
                  ? "The reasoning text does not match the hash stored in the contract. It may have been altered."
                  : "Computing keccak256 of the reasoning text client-side…"}
            </p>
          </div>
        </div>

        {/* Hash comparison */}
        <div className="grid gap-2 rounded-lg bg-cream-100 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <span className="text-2xs font-semibold uppercase tracking-wider text-neutral-400 shrink-0">
              On-chain
            </span>
            <MonoText truncate="middle" keep={10} copyable>
              {expectedHash}
            </MonoText>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-2xs font-semibold uppercase tracking-wider text-neutral-400 shrink-0">
              Computed
            </span>
            <MonoText truncate="middle" keep={10} copyable>
              {computedHash || "…"}
            </MonoText>
          </div>
          {status === "match" && (
            <div className="mt-1 text-center">
              <Badge variant="verified">✓ Identical</Badge>
            </div>
          )}
          {status === "mismatch" && (
            <div className="mt-1 text-center">
              <Badge variant="sell">✗ Mismatch</Badge>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
