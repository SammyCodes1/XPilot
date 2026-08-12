"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi";
import { xLayerTestnet } from "@/lib/chain";
import { MonoText } from "@/components/ui";

// ---------------------------------------------------------------------------
// Nav link helper
// ---------------------------------------------------------------------------

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active =
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={[
        "text-sm font-medium transition-colors duration-150",
        active
          ? "text-ink-800"
          : "text-ink-400 hover:text-ink-600",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Wallet button
// ---------------------------------------------------------------------------

function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address, chainId: xLayerTestnet.id });

  // Connected state
  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        {/* Balance */}
        {balance && (
          <span className="mono-data text-xs text-ink-400">
            {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
          </span>
        )}

        {/* Address + disconnect */}
        <button
          onClick={() => disconnect()}
          className="flex items-center gap-2 rounded-lg border border-border bg-cream-surface px-3 py-1.5 text-xs font-medium text-ink-600 transition-colors hover:bg-cream-100"
          title="Click to disconnect"
        >
          <span className="h-2 w-2 rounded-full bg-success-400" />
          <MonoText truncate="middle" keep={4}>
            {address}
          </MonoText>
        </button>
      </div>
    );
  }

  // Disconnected — show available connectors
  const okxConnector = connectors.find((c) => c.name.includes("OKX"));
  const metaConnector = connectors.find(
    (c) => c.name === "MetaMask" || c.name.includes("MetaMask"),
  );
  const injected = okxConnector ?? metaConnector ?? connectors[0];

  return (
    <button
      onClick={() => injected && connect({ connector: injected })}
      className="inline-flex items-center rounded-lg bg-ember px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ember-600"
    >
      Connect Wallet
    </button>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border-light bg-cream/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 sm:px-8 lg:px-12">
        {/* Left: brand + nav */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="h-7 w-7 rounded-lg bg-ember flex items-center justify-center">
              <span className="text-xs font-bold text-white">X</span>
            </span>
            <span className="text-base font-bold tracking-tight text-ink-800">
              XPilot
            </span>
          </Link>

          <div className="hidden sm:flex items-center gap-6">
            <NavLink href="/" label="Dashboard" />
            <NavLink href="/about" label="About" />
          </div>
        </div>

        {/* Right: wallet */}
        <div className="flex items-center gap-4">
          <WalletButton />
        </div>
      </div>
    </nav>
  );
}
