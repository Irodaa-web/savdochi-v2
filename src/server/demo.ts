import "server-only";
import { hashPassword } from "@/lib/auth/password";
import { connectDb } from "@/lib/db";
import { Conversation, Message } from "@/models/Chat";
import { nextSeq } from "@/models/Counter";
import { Order } from "@/models/Order";
import { Partnership } from "@/models/Partnership";
import { Product } from "@/models/Product";
import { StoreStock } from "@/models/StoreStock";
import { User } from "@/models/User";

/** Demo rejimi faqat DEMO_MODE=1 bo'lsa ishlaydi. */
export const demoEnabled = () => process.env.DEMO_MODE === "1";

const DEMO = {
  seller: { phone: "+998900000001", name: "Demo Oziq-ovqat MChJ", region: "tashkent_city" },
  seller2: { phone: "+998900000002", name: "Demo Ichimliklar Zavodi", region: "tashkent" },
  buyer: { phone: "+998900000011", name: "Demo Baraka Do‘koni", region: "tashkent_city" },
} as const;

/** Demo hisoblar va namuna ma'lumotlarni yaratadi (bir marta). Demo foydalanuvchini qaytaradi. */
export async function ensureDemo(role: "buyer" | "seller") {
  await connectDb();
  const existing = await User.findOne({ phone: role === "seller" ? DEMO.seller.phone : DEMO.buyer.phone });
  if (existing) return existing;

  const passwordHash = await hashPassword(crypto.randomUUID());
  const profile = {
    about: "Sinov uchun namuna kompaniya.",
    address: "Toshkent, Chilonzor tumani",
    deliveryRegions: ["tashkent_city", "tashkent"],
    deliveryDays: [1, 2, 3, 4, 5, 6],
    leadDays: 1,
    deliveryFee: 30000,
    minOrderTotal: 300000,
    paymentMethods: ["cash", "transfer", "card"],
  };
  const [seller, seller2, buyer] = await User.create([
    { ...DEMO.seller, role: "seller", passwordHash, verification: "verified", demo: true, profile },
    { ...DEMO.seller2, role: "seller", passwordHash, verification: "verified", demo: true, profile: { ...profile, deliveryFee: 0, minOrderTotal: 500000 } },
    { ...DEMO.buyer, role: "buyer", passwordHash, verification: "verified", demo: true, profile: { address: "Toshkent, Yunusobod 4-kvartal, 12-uy", lat: 41.3651, lng: 69.2847 } },
  ]);

  const products = await Product.create([
    { seller: seller!._id, name: "Paxta yog‘i, 5 l", category: "food", unit: "piece", price: 98000, minOrder: 10, stock: 400, packSize: 1, priceTiers: [{ min: 50, price: 94000 }, { min: 100, price: 91000 }], description: "Tozalangan paxta yog‘i." },
    { seller: seller!._id, name: "Un, oliy nav, 50 kg", category: "food", unit: "bag", price: 310000, minOrder: 5, stock: 120, packSize: 1, priceTiers: [{ min: 20, price: 299000 }] },
    { seller: seller!._id, name: "Shakar, 50 kg", category: "food", unit: "bag", price: 420000, minOrder: 2, stock: 80, packSize: 1 },
    { seller: seller!._id, name: "Guruch Lazer, 25 kg", category: "food", unit: "bag", price: 375000, minOrder: 4, stock: 60, packSize: 1 },
    { seller: seller2!._id, name: "Gazlangan suv, 1.5 l", category: "drinks", unit: "block", price: 36000, minOrder: 20, stock: 900, packSize: 6, priceTiers: [{ min: 100, price: 33000 }] },
    { seller: seller2!._id, name: "Sharbat, 1 l", category: "drinks", unit: "block", price: 72000, minOrder: 10, stock: 300, packSize: 12 },
  ]);

  await Partnership.create([
    { seller: seller!._id, buyer: buyer!._id, status: "active", requestedBy: "buyer", discount: 3, terms: "Har dushanba yetkazib berish. To‘lov 7 kun ichida.", shareStock: true },
    { seller: seller2!._id, buyer: buyer!._id, status: "pending", requestedBy: "seller" },
  ]);

  const p = products;
  const days = (n: number) => new Date(Date.now() - n * 86_400_000);
  const delivery = { phone: DEMO.buyer.phone, region: "tashkent_city", address: "Toshkent, Yunusobod 4-kvartal, 12-uy", lat: 41.3651, lng: 69.2847, date: null };
  const line = (i: number, q: number, price: number) => ({ product: p[i]!._id, name: p[i]!.name, unit: p[i]!.unit, quantity: q, unitPrice: price, total: q * price });
  const orderRows = [
    { items: [line(0, 20, 98000), line(1, 5, 310000)], status: "delivered", pay: "paid", at: 40 },
    { items: [line(0, 50, 94000)], status: "delivered", pay: "partial", at: 12 },
    { items: [line(2, 4, 420000), line(3, 4, 375000)], status: "new", pay: "unpaid", at: 0 },
  ] as const;
  for (const o of orderRows) {
    const subtotal = o.items.reduce((s, i) => s + i.total, 0);
    const discount = Math.round(subtotal * 0.03);
    const total = subtotal - discount + 30000;
    await Order.create({
      number: await nextSeq("order"),
      buyer: buyer!._id,
      seller: seller!._id,
      items: o.items,
      subtotal,
      discountPercent: 3,
      discount,
      deliveryFee: 30000,
      total,
      status: o.status,
      paymentMethod: "transfer",
      paymentStatus: o.pay,
      paidAmount: o.pay === "paid" ? total : o.pay === "partial" ? Math.round(total / 2) : 0,
      delivery,
      history: [{ status: "new", by: "buyer", at: days(o.at) }, ...(o.status === "delivered" ? [{ status: "delivered", by: "seller", at: days(o.at - 1) }] : [])],
      createdAt: days(o.at),
    });
  }

  await StoreStock.create([
    { buyer: buyer!._id, product: p[0]!._id, seller: seller!._id, name: p[0]!.name, unit: p[0]!.unit, quantity: 6, minLevel: 10 },
    { buyer: buyer!._id, product: p[1]!._id, seller: seller!._id, name: p[1]!.name, unit: p[1]!.unit, quantity: 4, minLevel: 2 },
  ]);

  const conv = await Conversation.create({ seller: seller!._id, buyer: buyer!._id, lastText: "Ertaga 10:00 da yetkazamiz.", lastAt: new Date(), unreadBuyer: 1 });
  await Message.create([
    { conversation: conv._id, sender: buyer!._id, text: "Assalomu alaykum! Paxta yog‘idan 50 ta kerak, chegirma bormi?", createdAt: new Date(Date.now() - 3 * 60_000) },
    { conversation: conv._id, sender: seller!._id, text: "Va alaykum assalom! 50 tadan 94 000 so‘m, hamkor sifatida yana 3% chegirma.", createdAt: new Date(Date.now() - 2 * 60_000) },
    { conversation: conv._id, sender: seller!._id, text: "Ertaga 10:00 da yetkazamiz.", createdAt: new Date(Date.now() - 60_000) },
  ]);

  return role === "seller" ? seller! : buyer!;
}
