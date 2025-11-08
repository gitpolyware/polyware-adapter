import express from "express";
import cors from "cors";
import { z } from "zod";
import { adapters, getAdapterByVenue } from "./registry.js";
import { parseGlobalId } from "./registry.js";
import { normalizeMarket } from "./core/normalize.js";
import { routeBest } from "./core/router.js";
import { verifySignMessage } from "./util/solana.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/", (_, res) => res.json({ name: "Polyware Adapter API", adapters: adapters.map(a => a.venue) }));

/** List markets across adapters (merged, no dedupe for now) */
app.get("/api/markets", async (req, res) => {
  const query = String(req.query.query || "");
  const limit = Number(req.query.limit || 50);
  const removeVig = String(req.query.removeVig || "true") === "true";
  const venue = req.query.venue ? String(req.query.venue) : null;

  const tasks = (venue ? adapters.filter(a => a.venue === venue) : adapters)
    .map(a => a.listMarkets({ query, limit }));

  const lists = await Promise.all(tasks);
  const out = lists.flat().slice(0, limit).map(m => normalizeMarket(m, removeVig));
  res.json(out);
});

/** Orderbook for a global market id */
app.get("/api/markets/:id/orderbook", async (req, res) => {
  const id = req.params.id;
  const { venue } = parseGlobalId(id);
  const ad = getAdapterByVenue(venue);
  if (!ad) return res.status(404).json({ error: "venue not found" });
  const ob = await ad.getOrderbook(id);
  res.json(ob);
});

/** Quote (single-market) + simple router */
app.get("/api/quote", async (req, res) => {
  const schema = z.object({
    marketId: z.string(),
    side: z.enum(["YES", "NO"]),
    amountSOL: z.coerce.number().positive(),
    removeVig: z.coerce.boolean().optional(),
    maxSlippagePct: z.coerce.number().optional()
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const plan = await routeBest(parsed.data);
  res.json(plan);
});

/** Route & accept order (signature checked, no on-chain submit here) */
app.post("/api/route", async (req, res) => {
  const schema = z.object({
    marketId: z.string(),
    side: z.enum(["YES", "NO"]),
    amountSOL: z.number().positive(),
    payload: z.string(),            // same payload user signed
    signatureB64: z.string(),
    publicKey: z.string()
  });
  const r = schema.safeParse(req.body);
  if (!r.success) return res.status(400).json(r.error.flatten());

  const ok = verifySignMessage(r.data.payload, r.data.signatureB64, r.data.publicKey);
  if (!ok) return res.status(401).json({ error: "invalid signature" });

  // compute route (single leg for now)
  const plan = await routeBest({ marketId: r.data.marketId, side: r.data.side, amountSOL: r.data.amountSOL });
  // "place" per leg (simulated)
  for (const leg of plan.legs) {
    const { venue } = parseGlobalId(leg.marketId);
    const ad = getAdapterByVenue(venue)!;
    await ad.place({ ...leg, signature: r.data.signatureB64, payload: r.data.payload });
  }

  res.json({ ok: true, plan });
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`Polyware Adapter API running on :${PORT}`));
