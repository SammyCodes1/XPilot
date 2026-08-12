"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { type ReactNode, useState } from "react";
import { xLayerTestnet } from "@/lib/chain";

// ---------------------------------------------------------------------------
// wagmi config — read-only works without a connected wallet
// ---------------------------------------------------------------------------

const wagmiConfig = createConfig({
  chains: [xLayerTestnet],
  transports: {
    [xLayerTestnet.id]: http(),
  },
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
