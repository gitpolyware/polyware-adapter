import { Adapter } from "./Adapter.js";
import { Market, Orderbook, QuoteRequest, Quote } from "../core/types.js";
import { normalizeMarket } from "../core/normalize.js";
import { simulateFill } from "../core/odds.js";

function randBetween(a: number, b: number) { return a + Math.random() * (b - a); }

export class DemoPredictAdapter extends Adapter {
  readonly venue = "demo-predict";

  private cache: Market[] | null = null;

  async listMarkets(params?: { query?: string; limit?: number }): Promise<Market[]> {
    if (!this.cache) {
      // generate 30 synthetic markets
      const titles = [
        "Will the Tennessee Titans win Super Bowl 2026?",
        "Xi Jinping out in 2025?",
        "ETH flips BTC in market cap before 2027?",
        "Apple releases foldable iPhone by 2026?",
        "US CPI YoY < 2% by Q4 2026?"
      ];
      const now = Date.now();
      const out: Market[] = [];
      for (let i = 0; i < 30; i++) {
        const t = titles[i % titles.length] + ` [D${i}]`;
        const yes = Math.round(randBetween(0.05, 0.95) * 100) / 100;
        const no = Math.round((1 - yes) * 100) / 100;
        const idLocal = `MK${1000 + i}`;
        out.push({
          id: `${this.venue}|${idLocal}`,
          venue: this.venue,
          venueMarketId: idLocal,
          symbol: "DMO",
          title: t,
          tags: [],
          status: "open",
          endTime: now + 1000 * 60 * 60 * 24 * (60 + i),
          priceYes: yes,
          priceNo: no,
          liquiditySOL: Math.round(randBetween(200, 3000)),
          volume24hSOL: Math.round(randBetween(10_000, 900_000)),
        });
      }
      this.cache = out;
    }
    let arr = this.cache;
    if (params?.query) {
      const q = params.query.toLowerCase();
      arr = arr.filter(m => m.title.toLowerCase().includes(q));
    }
    if (params?.limit) arr = arr.slice(0, params.limit);
    return arr.map(m => normalizeMarket(m, true));
  }

  async getOrderbook(globalMarketId: string): Promise<Orderbook> {
    // derive a centered price from market
    const m = (await this.listMarkets()).find(x => x.id === globalMarketId);
    if (!m) throw new Error("Market not found");
    const mid = m.priceYes;
    // build symmetric asks ladder
    const asks = Array.from({ length: 12 }, (_, i) => {
      const price = Math.min(0.99, Math.max(0.01, mid + i * 0.01));
      const size = Math.max(5, 200 - i * 10);
      return { price, size };
    });
    const bids = Array.from({ length: 12 }, (_, i) => {
      const price = Math.max(0.01, Math.min(0.99, mid - i * 0.01));
      const size = Math.max(5, 200 - i * 10);
      return { price, size };
    });
    return { bids, asks, ts: Date.now() };
  }

  async quote(req: QuoteRequest): Promise<Quote> {
    const ob = await this.getOrderbook(req.marketId);
    const { avgPrice, shares, costSOL, filled } = simulateFill(req.side, ob, req.amountSOL);
    return {
      venue: this.venue,
      marketId: req.marketId,
      side: req.side,
      avgPrice,
      shares,
      costSOL,
      feeSOL: 0,
      filled,
    };
  }
}
