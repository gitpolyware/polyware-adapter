import { Market } from "./types.js";
import { removeOverround, clamp01 } from "./odds.js";

/** Ensure priceYes/priceNo sane, optional vig removal */
export function normalizeMarket(m: Market, doRemoveVig = false): Market {
  let priceYes = clamp01(m.priceYes);
  let priceNo = clamp01(m.priceNo);
  if (doRemoveVig) {
    const r = removeOverround(priceYes, priceNo);
    priceYes = r.pYes;
    priceNo = r.pNo;
  }
  return { ...m, priceYes, priceNo };
}
