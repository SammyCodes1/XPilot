import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Candle } from "../src/types.js";

// Mock the config module before importing the module under test
vi.mock("../src/config.js", () => ({
  config: {
    okxApiBaseUrl: "https://www.okx.com",
    tradingPairs: ["ETH-USDT", "BTC-USDT"],
    scanIntervalMs: 300000,
  },
}));

vi.mock("../src/logger.js", () => ({
  logger: {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  },
}));

describe("OKX Market API client", () => {
  let fetchCandles: typeof import("../src/data/okxMarket.js").fetchCandles;
  let fetchMarkPrice: typeof import("../src/data/okxMarket.js").fetchMarkPrice;

  beforeEach(async () => {
    const mod = await import("../src/data/okxMarket.js");
    fetchCandles = mod.fetchCandles;
    fetchMarkPrice = mod.fetchMarkPrice;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchCandles", () => {
    it("parses OKX candle response correctly", async () => {
      // Mock a valid OKX API response (newest-first, as returned by real API)
      const mockResponse = {
        code: "0",
        msg: "",
        data: [
          ["1718000000000", "3500.00", "3520.00", "3490.00", "3515.00", "1234.56", "4321000", "1230", "1"],
          ["1717999700000", "3495.00", "3510.00", "3490.00", "3500.00", "1100.00", "3850000", "1100", "1"],
          ["1717999400000", "3500.00", "3505.00", "3480.00", "3495.00", "980.00", "3430000", "980", "1"],
        ],
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      const candles = await fetchCandles("ETH-USDT", "5m", 3);
      expect(candles).toHaveLength(3);

      // Should be reversed to chronological order
      expect(candles[0].timestamp).toBe(1717999400000);
      expect(candles[0].open).toBe(3500.00);
      expect(candles[0].close).toBe(3495.00);

      expect(candles[2].timestamp).toBe(1718000000000);
      expect(candles[2].close).toBe(3515.00);
    });

    it("throws on API error code", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: "51000", msg: "Invalid instrument ID", data: [] }),
          { status: 200 },
        ),
      );

      await expect(fetchCandles("INVALID", "5m", 3)).rejects.toThrow("Invalid instrument ID");
    });

    it("retries on 429 rate limit", async () => {
      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response("{}", { status: 429 }))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              code: "0",
              msg: "",
              data: [
                ["1718000000000", "100.0", "101.0", "99.0", "100.5", "500", "50000", "500", "1"],
              ],
            }),
            { status: 200 },
          ),
        );

      const candles = await fetchCandles("ETH-USDT", "5m", 1);
      expect(candles).toHaveLength(1);
    });
  });

  describe("fetchMarkPrice", () => {
    it("returns the mark price for a valid instrument", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: "0",
            msg: "",
            data: [{ instId: "ETH-USDT", markPx: "3515.42" }],
          }),
          { status: 200 },
        ),
      );

      const price = await fetchMarkPrice("ETH-USDT");
      expect(price).toBe(3515.42);
    });
  });
});
