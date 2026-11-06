import "server-only";
import { isValidObjectId } from "mongoose";
import { AppError } from "@/lib/api";
import { unitPriceFor } from "@/lib/catalog";
import { connectDb } from "@/lib/db";
import type { PaymentMethod } from "@/lib/orders";
import { Cart, type CartDoc } from "@/models/Cart";
import { Partnership } from "@/models/Partnership";
import { Product, type ProductDoc } from "@/models/Product";
import { User, type Profile } from "@/models/User";
import { profileOf, subscriptionActive } from "./profile";

export type CartLine = {
  productId: string;
  name: string;
  unit: string;
  image: string | null;
  quantity: number;
  minOrder: number;
  stock: number;
  unitPrice: number;
  total: number;
  /** Buyurtma berishga to'sqinlik qiladigan muammo. */
  problem: "unavailable" | "belowMin" | "outOfStock" | null;
};

export type CartGroup = {
  seller: { id: string; name: string; verified: boolean };
  terms: Pick<Profile, "deliveryFee" | "minOrderTotal" | "paymentMethods" | "deliveryRegions" | "leadDays">;
  lines: CartLine[];
  subtotal: number;
  discountPercent: number;
  discount: number;
  deliveryFee: number;
  total: number;
  belowMinTotal: boolean;
  canOrder: boolean;
};

export type CartView = { groups: CartGroup[]; count: number };

/** Savatni sotuvchilar bo'yicha guruhlab, narx va to'siqlarni hisoblaydi. */
export async function getCart(buyerId: string): Promise<CartView> {
  await connectDb();
  const cart = await Cart.findOne({ buyer: buyerId }).lean<CartDoc>();
  const items = cart?.items ?? [];
  if (!items.length) return { groups: [], count: 0 };

  const products = await Product.find({ _id: { $in: items.map((i) => i.product) } }).lean<ProductDoc[]>();
  const productBy = new Map(products.map((p) => [String(p._id), p]));
  const sellerIds = [...new Set(products.map((p) => String(p.seller)))];
  const [sellers, partnerships] = await Promise.all([
    User.find({ _id: { $in: sellerIds } }, { name: 1, verification: 1, profile: 1, blocked: 1, subscriptionUntil: 1 }).lean(),
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
      group = {
        seller: { id: sellerId, name: seller.name, verified: seller.verification === "verified" },
        terms: {
          deliveryFee: profile.deliveryFee,
          minOrderTotal: profile.minOrderTotal,
          paymentMethods: profile.paymentMethods.length ? profile.paymentMethods : (["cash"] as PaymentMethod[]),
          deliveryRegions: profile.deliveryRegions,
          leadDays: profile.leadDays,
        },
        lines: [],
        subtotal: 0,
        discountPercent: discountBy.get(sellerId) ?? 0,
        discount: 0,
        deliveryFee: profile.deliveryFee,
        total: 0,
        belowMinTotal: false,
        canOrder: true,
      };
      groups.set(sellerId, group);
    }
    const sellerOk = !seller.blocked && subscriptionActive(seller.subscriptionUntil);
    const unitPrice = unitPriceFor(item.quantity, p.price, p.priceTiers ?? []);
    const problem: CartLine["problem"] = !p.active || !sellerOk ? "unavailable" : item.quantity < p.minOrder ? "belowMin" : item.quantity > p.stock ? "outOfStock" : null;
    group.lines.push({
      productId: String(p._id),
      name: p.name,
      unit: p.unit,
      image: p.images?.[0] ?? null,
      quantity: item.quantity,
      minOrder: p.minOrder,
      stock: p.stock,
      unitPrice,
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
  const product = await Product.findOne({ _id: productId, active: true }, { minOrder: 1 }).lean();
  if (!product && quantity > 0) throw new AppError("NOT_FOUND");

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

export async function removeCartItems(buyerId: string, productIds: string[]): Promise<void> {
  await Cart.updateOne({ buyer: buyerId }, { $pull: { items: { product: { $in: productIds } } } });
}
