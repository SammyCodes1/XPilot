import type { Metadata } from "next";
import { Web3Provider } from "@/providers/Web3Provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "XPilot — AI-Verified Trading Copilot",
  description:
    "On-chain attested reasoning for every DeFi trade. Verify the agent's thinking, not just its actions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-cream text-ink antialiased">
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
