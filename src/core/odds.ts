export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Remove overround (vig) so pYes + pNo = 1 */
export function removeOverround(pYes: number, pNo: number) {
  const s = pYes + pNo;
  if (s <= 0) return { pYes: 0.5, pNo: 0.5 };
  return { pYes: pYes / s, pNo: pNo / s };
}

/** Convert price (SOL per 1 SOL payout) to implied probability 0..1 (same number). */
export const priceToProb = (price: number) => clamp01(price);

/** Merge/trim an orderbook to fill up to target shares. Returns [avgPrice, sharesFilled, cost] */
export function simulateFill(
  side: "YES" | "NO",
  book: { bids: { price: number; size: number }[]; asks: { price: number; size: number }[] },
  targetAmountSOL: number
) {
  // For a BUY of YES, we lift the ASK; for BUY of NO, we lift the ASK on NO leg (same here).
  const ladder = [...book.asks].sort((a, b) => a.price - b.price); // from best price up
  let remainingSOL = targetAmountSOL;
  let acquiredShares = 0;
  let cost = 0;

  for (const lvl of ladder) {
    const lvlCostPerShare = lvl.price; // SOL per share
    const lvlMaxShares = lvl.size;
    const affordableShares = Math.min(lvlMaxShares, remainingSOL / lvlCostPerShare);
    if (affordableShares <= 0) break;
    acquiredShares += affordableShares;
    const spend = affordableShares * lvlCostPerShare;
    cost += spend;
    remainingSOL -= spend;
    if (remainingSOL <= 1e-9) break;
  }
  const avgPrice = acquiredShares > 0 ? cost / acquiredShares : 0;
  return { avgPrice, shares: acquiredShares, costSOL: cost, filled: remainingSOL <= 1e-9 };
}
