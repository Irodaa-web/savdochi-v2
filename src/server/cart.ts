import "server-only";
import type { ClientSession } from "mongoose";
import { isValidObjectId } from "mongoose";
import { AppError } from "@/lib/api";
import { activeSalePrice, unitPriceFor } from "@/lib/catalog";
import { nextDeliveryDay, termsForRegion } from "@/lib/delivery";
import { connectDb } from "@/lib/db";
import type { PaymentMethod } from "@/lib/orders";
import { Cart, type CartDoc } from "@/models/Cart";
import { Partnership } from "@/models/Partnership";
import { Product, type ProductDoc } from "@/models/Product";
import { User, type Profile } from "@/models/User";
import { creditInfo } from "./debts";
import { sellerCanSell } from "./products";
import { profileOf } from "./profile";

export type CartLine = {
  productId: string;
  name: string;
  unit: string;
  image: string | null;
  quantity: number;
  minOrder: number;
  stock: number;
  unitPrice: number;
  /** Aksiya narxi qo'llanganmi. */
  onSale: boolean;
  total: number;
  /** Buyurtma berishga to'sqinlik qiladigan muammo. */
  problem: "unavailable" | "belowMin" | "outOfStock" | null;
};

export type CartGroup = {
  seller: { id: string; name: string; verified: boolean; logo: string };
  /**
   * deliveryFee / minOrderTotal — tanlangan viloyat uchun amaldagisi; deliveryDays/regionRules — butun jadval
   * (do'kon buyurtma formasida boshqa viloyat tanlasa, shartlar brauzerda qayta hisoblanadi).
   */
  terms: Pick<Profile, "deliveryFee" | "minOrderTotal" | "paymentMethods" | "deliveryRegions" | "leadDays" | "pickup" | "deliveryDays" | "regionRules"> & {
    address: string;
    /** Shu viloyatga eng yaqin yetkazish kuni (YYYY-MM-DD). */
    nextDelivery: string;
    /** Umumiy jadval (viloyat qoidasidan oldingi) — boshqa viloyatlar uchun hisoblashda kerak. */
    base: { deliveryFee: number; minOrderTotal: number };
  };
  lines: CartLine[];
  subtotal: number;
  discountPercent: number;
  discount: number;
  deliveryFee: number;
  total: number;
  belowMinTotal: boolean;
  canOrder: boolean;
  /** Nasiya: hamkorlik limiti va bo'sh qismi (nasiya berilmagan bo'lsa null). */
  credit: { limit: number; used: number; available: number; days: number } | null;
};

export type CartView = { groups: CartGroup[]; count: number };

/**
 * Savatni sotuvchilar bo'yicha guruhlab, narx va to'siqlarni hisoblaydi.
 * region — yetkazish viloyati (berilmasa — do'konning o'z viloyati): yetkazish narxi va minimal summa shunga qarab.
 */
export async function getCart(buyerId: string, region?: string): Promise<CartView> {
  await connectDb();
  const where = region ?? (await User.findById(buyerId, { region: 1 }).lean())?.region;
  const cart = await Cart.findOne({ buyer: buyerId }).lean<CartDoc>();
  const items = cart?.items ?? [];
  if (!items.length) return { groups: [], count: 0 };

  const products = await Product.find({ _id: { $in: items.map((i) => i.product) } }).lean<ProductDoc[]>();
  const productBy = new Map(products.map((p) => [String(p._id), p]));
  const sellerIds = [...new Set(products.map((p) => String(p.seller)))];
  const [sellers, partnerships] = await Promise.all([
    User.find({ _id: { $in: sellerIds } }, { name: 1, verification: 1, profile: 1, blocked: 1, demo: 1, logo: 1 }).lean(),
    Partnership.find({ buyer: buyerId, seller: { $in: sellerIds }, status: "active" }, { seller: 1, discount: 1 }).lean(),
  ]);
  const sellerBy = new Map(sellers.map((s) => [String(s._id), s]));
  const discountBy = new Map(partnerships.map((p) => [String(p.seller), p.discount]));

  const groups = new Map<string, CartGroup>();
  for (const item of items) {
    const p = productBy.get(String(item.product));
    if (!p) continue;
    const sellerId = String(p.seller);
    const seller = sellerBy.get(sellerId);
    if (!seller) continue;
    let group = groups.get(sellerId);
    if (!group) {
      const profile = profileOf(seller);
      const local = termsForRegion(profile, where);
      group = {
        seller: { id: sellerId, name: seller.name, verified: seller.verification === "verified", logo: seller.logo ?? "" },
        terms: {
          deliveryFee: local.fee,
          minOrderTotal: local.minOrderTotal,
          deliveryDays: profile.deliveryDays,
          regionRules: profile.regionRules ?? [],
          nextDelivery: nextDeliveryDay(local.days, profile.leadDays),
          base: { deliveryFee: profile.deliveryFee, minOrderTotal: profile.minOrderTotal },
          paymentMethods: profile.paymentMethods.length ? profile.paymentMethods : (["cash"] as PaymentMethod[]),
          deliveryRegions: profile.deliveryRegions,
          leadDays: profile.leadDays,
          pickup: profile.pickup,
          address: profile.address,
        },
        lines: [],
        subtotal: 0,
        discountPercent: discountBy.get(sellerId) ?? 0,
        discount: 0,
        deliveryFee: local.fee,
        total: 0,
        belowMinTotal: false,
        canOrder: true,
        credit: null,
      };
      groups.set(sellerId, group);
    }
    const sellerOk = !seller.blocked && !seller.demo && seller.verification === "verified";
    const salePrice = activeSalePrice(p);
    const unitPrice = unitPriceFor(item.quantity, p.price, p.priceTiers ?? [], salePrice);
    const problem: CartLine["problem"] = !p.active || p.hiddenByAdmin || !sellerOk ? "unavailable" : item.quantity < p.minOrder ? "belowMin" : item.quantity > p.stock ? "outOfStock" : null;
    group.lines.push({
      productId: String(p._id),
      name: p.name,
      unit: p.unit,
      image: p.images?.[0] ?? null,
      quantity: item.quantity,
      minOrder: p.minOrder,
      stock: p.stock,
      unitPrice,
      onSale: salePrice != null && unitPrice === salePrice,
      total: unitPrice * item.quantity,
      problem,
    });
  }

  for (const g of groups.values()) {
    // Sotuvdan chiqqanlardan tashqari hammasi hisobga olinadi — muammoli qatorlar alohida ko'rsatiladi.
    g.subtotal = g.lines.filter((l) => l.problem !== "unavailable").reduce((s, l) => s + l.total, 0);
    g.discount = Math.round((g.subtotal * g.discountPercent) / 100);
    g.total = g.subtotal - g.discount + g.deliveryFee;
    g.belowMinTotal = g.subtotal < g.terms.minOrderTotal;
    g.canOrder = g.subtotal > 0 && !g.belowMinTotal && g.lines.every((l) => !l.problem);
  }
  // Nasiya faqat limit berilgan faol hamkorga, to'lov usuli sifatida qo'shiladi.
  await Promise.all(
    [...groups.values()].map(async (g) => {
      g.credit = await creditInfo(g.seller.id, buyerId);
      if (g.credit) g.terms.paymentMethods = [...g.terms.paymentMethods, "credit"];
    }),
  );
  return { groups: [...groups.values()], count: items.length };
}

export async function cartCount(buyerId: string): Promise<number> {
  await connectDb();
  const cart = await Cart.findOne({ buyer: buyerId }, { items: 1 }).lean<CartDoc>();
  return cart?.items.length ?? 0;
}

/** Miqdorni o'rnatadi (0 — olib tashlaydi). `add` bo'lsa mavjud miqdorga qo'shadi. */
export async function setCartItem(buyerId: string, productId: string, quantity: number, add = false): Promise<number> {
  if (!isValidObjectId(productId)) throw new AppError("NOT_FOUND");
  await connectDb();
  const product = await Product.findOne({ _id: productId, active: true, hiddenByAdmin: { $ne: true } }, { minOrder: 1, seller: 1 }).lean();
  if (!product && quantity > 0) throw new AppError("NOT_FOUND");
  // Sotuvchi sotolmaydi (tasdiqlanmagan, bloklangan, yashirilgan, obunasi tugagan) — savatga ham qo'shilmaydi.
  if (product && quantity > 0 && !(await sellerCanSell(product.seller))) throw new AppError("NOT_FOUND");

  const cart = (await Cart.findOne({ buyer: buyerId })) ?? new Cart({ buyer: buyerId, items: [] });
  const existing = cart.items.find((i) => String(i.product) === productId);
  const next = add ? (existing?.quantity ?? 0) + quantity : quantity;
  if (next <= 0) {
    cart.items = cart.items.filter((i) => String(i.product) !== productId);
  } else if (existing) {
    existing.quantity = next;
  } else {
    cart.items.push({ product: product!._id, quantity: Math.max(next, product!.minOrder) });
  }
  if (cart.items.length > 100) throw new AppError("INVALID_INPUT");
  await cart.save();
  return cart.items.length;
}

export type BulkAddResult = { added: { name: string; quantity: number }[]; skipped: { name: string; reason: "unavailable" | "outOfStock" }[] };

/**
 * Bir nechta mahsulotni savatga birdaniga qo'shadi (kam qolganlarni to'ldirish, doimiy ro'yxat).
 * Miqdor minimal buyurtma va qoldiq oralig'iga keltiriladi; savatda ko'proq bo'lsa — kamaytirilmaydi.
 * Sotuvdan chiqqan yoki tugagan mahsulotlar o'tkazib yuboriladi va ro'yxatda qaytariladi.
 */
export async function addManyToCart(buyerId: string, items: { productId: string; quantity: number }[]): Promise<BulkAddResult> {
  await connectDb();
  const ids = items.map((i) => i.productId).filter((id) => isValidObjectId(id));
  const products = await Product.find({ _id: { $in: ids } }, { name: 1, active: 1, hiddenByAdmin: 1, minOrder: 1, stock: 1, seller: 1 }).lean();
  const blocked = new Set(
    (await User.find({ _id: { $in: products.map((p) => p.seller) }, $or: [{ blocked: true }, { demo: true }, { verification: { $ne: "verified" } }] }, { _id: 1 }).lean()).map((u) => String(u._id)),
  );
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const cart = (await Cart.findOne({ buyer: buyerId })) ?? new Cart({ buyer: buyerId, items: [] });
  const result: BulkAddResult = { added: [], skipped: [] };
  for (const item of items) {
    const p = byId.get(item.productId);
    if (!p) continue;
    if (!p.active || p.hiddenByAdmin || blocked.has(String(p.seller))) {
      result.skipped.push({ name: p.name, reason: "unavailable" });
      continue;
    }
    if (p.stock < p.minOrder) {
      result.skipped.push({ name: p.name, reason: "outOfStock" });
      continue;
    }
    const quantity = Math.min(p.stock, Math.max(p.minOrder, Math.floor(item.quantity)));
    const existing = cart.items.find((i) => String(i.product) === item.productId);
    if (existing) existing.quantity = Math.max(existing.quantity, quantity);
    else cart.items.push({ product: p._id, quantity });
    result.added.push({ name: p.name, quantity });
  }
  if (cart.items.length > 100) throw new AppError("INVALID_INPUT");
  if (result.added.length) await cart.save();
  return result;
}

export async function removeCartItems(buyerId: string, productIds: string[], session?: ClientSession): Promise<void> {
  await Cart.updateOne({ buyer: buyerId }, { $pull: { items: { product: { $in: productIds } } } }, { session });
}
