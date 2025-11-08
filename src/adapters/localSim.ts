import { Adapter } from "./Adapter.js";
import { Market, Orderbook, QuoteRequest, Quote } from "../core/types.js";
import { normalizeMarket } from "../core/normalize.js";
import { simulateFill } from "../core/odds.js";
import demo from "../../data/demo.json" assert { type: "json" };

export class LocalSimAdapter extends Adapter {
  readonly venue = "local-sim";
  private list: Market[];

  constructor() {
    this.list = demo.map((d: any, i: number) => {
      const m: Market = {
        id: `local-sim|SIM${i}`,
        venue: "local-sim",
        venueMarketId: `SIM${i}`,
        symbol: d.symbol ?? "SIM",
        title: d.title,
        tags: d.tags ?? [],
        status: d.status ?? "open",
        endTime: d.endTime ?? Date.now() + 86_400_000,
        priceYes: d.priceYes,
        priceNo: d.priceNo,
        liquiditySOL: d.liquiditySOL ?? 1000,
        volume24hSOL: d.volume24hSOL ?? 50_000,
      };
      return normalizeMarket(m, true);
    });
  }

  async listMarkets(params?: { query?: string; limit?: number }): Promise<Market[]> {
    let arr = this.list;
    if (params?.query) {
      const q = params.query.toLowerCase();
      arr = arr.filter(m => m.title.toLowerCase().includes(q));
    }
    if (params?.limit) arr = arr.slice(0, params.limit);
    return arr;
  }

  async getOrderbook(globalMarketId: string): Promise<Orderbook> {
    const m = this.list.find(x => x.id === globalMarketId);
    if (!m) throw new Error("Market not found");
    const mid = m.priceYes;
    const asks = Array.from({ length: 10 }, (_, i) => ({ price: Math.min(0.99, mid + i * 0.008), size: 120 - i * 8 }));
    const bids = Array.from({ length: 10 }, (_, i) => ({ price: Math.max(0.01, mid - i * 0.008), size: 120 - i * 8 }));
    return { bids, asks, ts: Date.now() };
  }

  async quote(req: QuoteRequest): Promise<Quote> {
    const ob = await this.getOrderbook(req.marketId);
    const { avgPrice, shares, costSOL, filled } = simulateFill(req.side, ob, req.amountSOL);
    // small venue fee example: 0.2%
    const fee = costSOL * 0.002;
    return { venue: this.venue, marketId: req.marketId, side: req.side, avgPrice, shares, costSOL, feeSOL: fee, filled };
  }
}
