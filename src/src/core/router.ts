import { adapters, getAdapterByVenue } from "../registry.js";
import { QuoteRequest, RoutePlan } from "./types.js";

/** Ask all adapters for a quote, pick cheapest (or split across two if needed) */
export async function routeBest(req: QuoteRequest): Promise<RoutePlan> {
  // First try single-venue quotes on the *exact* market (global ID pins the venue already).
  const legs = [];
  const oneVenueQuote = await getAdapterByVenue(req.marketId.split("|")[0])!.quote(req);
  legs.push(oneVenueQuote);

  // If not fully filled, try to split with any other adapter having a market of the same title (future work).
  // For now we keep single-leg; split logic placeholder:
  // if (!oneVenueQuote.filled) { ... }

  const totalCostSOL = legs.reduce((s, q) => s + q.costSOL + (q.feeSOL || 0), 0);
  const totalShares = legs.reduce((s, q) => s + q.shares, 0);
  const blendedAvgPrice = totalShares > 0 ? totalCostSOL / totalShares : 0;

  return {
    marketId: req.marketId,
    side: req.side,
    amountSOL: req.amountSOL,
    legs,
    totalCostSOL,
    blendedAvgPrice,
    totalShares,
    fullyFilled: legs.every(l => l.filled),
  };
}
