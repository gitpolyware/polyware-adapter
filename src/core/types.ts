export type Side = "YES" | "NO";

export type Market = {
  /** Global ID = `${venue}|${venueMarketId}` */
  id: string;
  venue: string;
  venueMarketId: string;
  symbol: string;              // e.g. "TEN", "BTC", etc.
  title: string;
  tags: string[];
  status: "open" | "closed" | "settled";
  endTime: number;             // ms epoch
  /** Price is cost (in SOL) per 1 SOL payout of the share */
  priceYes: number;            // 0..1 (fraction of SOL)
  priceNo: number;             // 0..1
  liquiditySOL: number;        // available liquidity (SOL)
  volume24hSOL: number;
};

export type OrderbookLevel = { price: number; size: number }; // price 0..1 SOL/share, size in shares
export type Orderbook = { bids: OrderbookLevel[]; asks: OrderbookLevel[]; ts: number };

export type QuoteRequest = {
  marketId: string;    // `${venue}|${venueMarketId}`
  side: Side;
  /** amount the user wants to spend, in SOL */
  amountSOL: number;
  /** if true, normalize Yes/No so pYes+pNo=1 (remove vig) for display/quote */
  removeVig?: boolean;
  maxSlippagePct?: number; // optional guard
};

export type Quote = {
  venue: string;
  marketId: string;
  side: Side;
  /** average execution price (SOL/share) */
  avgPrice: number;
  /** shares purchased (1 share pays 1 SOL if win) */
  shares: number;
  /** total cost in SOL (<= amountSOL) */
  costSOL: number;
  /** fees in SOL, if any (adapters can set 0) */
  feeSOL: number;
  /** whether fully filled */
  filled: boolean;
  /** venue specific meta (optional) */
  meta?: Record<string, unknown>;
};

export type RoutePlan = {
  marketId: string;
  side: Side;
  amountSOL: number;
  legs: Quote[];            // possibly split across venues
  totalCostSOL: number;
  blendedAvgPrice: number;  // (totalCost / totalShares)
  totalShares: number;
  fullyFilled: boolean;
};
