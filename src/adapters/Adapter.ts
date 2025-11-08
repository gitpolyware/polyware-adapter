import { Market, Orderbook, QuoteRequest, Quote } from "../core/types.js";

export abstract class Adapter {
  abstract readonly venue: string;

  /** list/stream markets from the venue (already normalized to SOL/share) */
  abstract listMarkets(params?: { query?: string; limit?: number }): Promise<Market[]>;

  /** lightweight orderbook: enough levels to quote */
  abstract getOrderbook(globalMarketId: string): Promise<Orderbook>;

  /** quote a fill for amount in SOL; must not exceed amount */
  abstract quote(req: QuoteRequest): Promise<Quote>;

  /** (optional) place an order; for now we simulate/ack only */
  async place(_q: Quote & { signature?: string; payload?: string }): Promise<{ accepted: boolean; id?: string }> {
    return { accepted: true, id: `${this.venue}-${Date.now()}` };
  }
}
