import mongoose from "mongoose";
import { NextResponse } from "next/server";
import type { SessionUser } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import { cartCount, getCart } from "@/server/cart";
import { listConversations, unreadChats } from "@/server/chat";
import { listDebts } from "@/server/debts";
import { listOrders } from "@/server/orders";
import { listPartners } from "@/server/partners";
import { cartStatsForSeller, getSellerHighlights, listCatalog, listSellerProducts, listSuppliers } from "@/server/products";
import { getProfile, getSellerPublic } from "@/server/profile";
import { sellerReport } from "@/server/reports";
import { listMyStock, lowStockAcrossPartners } from "@/server/stock";
import { demoEnabled } from "@/server/demo";

export const dynamic = "force-dynamic";

/**
 * Diagnostika (faqat DEMO_MODE=1): demo hisoblar bilan har bir sahifaning server qismini
 * (sessiya + ma'lumot so'rovlari) bajarib, vaqt va bazaga murojaatlar sonini qaytaradi.
 * Faqat o'qiydi. Sekin sahifani topish uchun: /api/v1/health/pages
 */
export async function GET() {
  if (!demoEnabled()) return NextResponse.json({ ok: false }, { status: 404 });
  const t0 = Date.now();
  await connectDb();
  const connectMs = Date.now() - t0;

  const [sellerDoc, buyerDoc] = await Promise.all([User.findOne({ phone: "+998900000001" }).lean(), User.findOne({ phone: "+998900000011" }).lean()]);
  if (!sellerDoc || !buyerDoc) return NextResponse.json({ ok: false, error: "demo yo'q — avval demo bilan kiring" }, { status: 404 });
  const asUser = (u: typeof sellerDoc): SessionUser => ({
    id: String(u._id),
    role: u.role,
    name: u.name,
    phone: u.phone,
    region: u.region,
    verification: u.verification,
    isAdmin: false,
    demo: true,
    subscriptionUntil: u.subscriptionUntil ? new Date(u.subscriptionUntil).toISOString() : null,
  });
  const seller = asUser(sellerDoc);
  const buyer = asUser(buyerDoc);
  // Har sahifa avval sessiyani tekshiradi (getSessionUser — bitta User so'rovi).
  const session = (id: string) => User.findById(id).lean();

  const pages: Record<string, () => Promise<unknown>> = {
    "seller /dashboard": async () => {
      await session(seller.id);
      await Promise.all([listSellerProducts(seller.id), sellerReport(seller.id, 30), listOrders(seller, { status: "open", limit: 8 }), lowStockAcrossPartners(seller.id), listDebts(seller)]);
    },
    "seller /products": async () => {
      await session(seller.id);
      await Promise.all([listSellerProducts(seller.id), cartStatsForSeller(seller.id)]);
    },
    "seller /orders": async () => (await session(seller.id), listOrders(seller, {})),
    "seller /partners": async () => (await session(seller.id), listPartners(seller)),
    "seller /debts": async () => (await session(seller.id), listDebts(seller)),
    "seller /chat": async () => (await session(seller.id), listConversations(seller)),
    "buyer /catalog": async () => {
      await session(buyer.id);
      await Promise.all([listSuppliers({}), listCatalog({ page: 1 })]);
    },
    "buyer /suppliers/:id": async () => {
      await session(buyer.id);
      await getSellerPublic(seller.id);
      await getSellerHighlights(seller.id);
    },
    "buyer /cart": async () => (await session(buyer.id), Promise.all([getCart(buyer.id), getProfile(buyer.id)])),
    "buyer /orders": async () => (await session(buyer.id), listOrders(buyer, {})),
    "buyer /stock": async () => (await session(buyer.id), listMyStock(buyer.id)),
    "buyer /partners": async () => (await session(buyer.id), listPartners(buyer)),
    "api /badges": async () => {
      await session(buyer.id);
      await Promise.all([cartCount(buyer.id), unreadChats(buyer), Notification.countDocuments({ user: buyer.id, read: false })]);
    },
  };

  let queries = 0;
  mongoose.set("debug", () => void queries++);
  const results: { page: string; ms: number; warmMs: number; queries: number }[] = [];
  try {
    for (const [page, run] of Object.entries(pages)) {
      queries = 0;
      const a = Date.now();
      await run();
      const ms = Date.now() - a;
      const q = queries;
      const b = Date.now();
      await run();
      results.push({ page, ms, warmMs: Date.now() - b, queries: q });
    }
  } finally {
    mongoose.set("debug", false);
  }
  const pings: number[] = [];
  for (let i = 0; i < 3; i++) {
    const t = Date.now();
    await mongoose.connection.db!.admin().ping();
    pings.push(Date.now() - t);
  }
  return NextResponse.json(
    { ok: true, region: process.env.VERCEL_REGION ?? null, connectMs, dbPingMs: Math.min(...pings), totalMs: Date.now() - t0, results: results.sort((x, y) => y.warmMs - x.warmMs) },
    { headers: { "cache-control": "no-store" } },
  );
}
