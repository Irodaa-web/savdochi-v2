import "server-only";
import { isValidObjectId, Types, type FilterQuery } from "mongoose";
import { connectDb } from "@/lib/db";
import type { CategoryCode, PriceTier, UnitCode } from "@/lib/catalog";
import type { RegionCode } from "@/lib/regions";
import type { ProductInput } from "@/lib/validation";
import { Cart } from "@/models/Cart";
import { Order } from "@/models/Order";
import { Product, type ProductDoc } from "@/models/Product";
import { User } from "@/models/User";

/** Mijozga yuboriladigan mahsulot ko'rinishi (Mongo obyektlarisiz). */
export type ProductView = {
  id: string;
  name: string;
  category: CategoryCode;
  unit: UnitCode;
  price: number;
  priceTiers: PriceTier[];
  minOrder: number;
  stock: number;
  packSize: number;
  description: string;
  images: string[];
  active: boolean;
  seller: { id: string; name: string; region: RegionCode; verified: boolean };
};

type SellerInfo = { _id: unknown; name: string; region: RegionCode; verification: string };

/** Katalogda ko'rinmaydigan sotuvchilar: bloklangan yoki obunasi tugagan. */
/**
 * Katalogdan yashiriladigan sotuvchilar (bloklangan yoki obunasi tugagan).
 * Har katalog so'rovida bazaga bormaslik uchun server xotirasida 60 soniya saqlanadi.
 */
let hiddenCache: { at: number; ids: unknown[] } | null = null;
async function hiddenSellers(): Promise<unknown[]> {
  if (hiddenCache && Date.now() - hiddenCache.at < 60_000) return hiddenCache.ids;
  const rows = await User.find({ role: "seller", $or: [{ blocked: true }, { subscriptionUntil: { $ne: null, $lt: new Date() } }] }, { _id: 1 }).lean();
  hiddenCache = { at: Date.now(), ids: rows.map((r) => r._id) };
  return hiddenCache.ids;
}

function toView(p: ProductDoc, seller: SellerInfo | undefined): ProductView {
  return {
    id: String(p._id),
    name: p.name,
    category: p.category,
    unit: p.unit,
    price: p.price,
    priceTiers: (p.priceTiers ?? []).map((t) => ({ min: t.min, price: t.price })),
    minOrder: p.minOrder,
    stock: p.stock,
    packSize: p.packSize,
    description: p.description,
    images: p.images ?? [],
    active: p.active,
    seller: {
      id: String(p.seller),
      name: seller?.name ?? "—",
      region: seller?.region ?? "tashkent_city",
      verified: seller?.verification === "verified",
    },
  };
}

async function withSellers(products: ProductDoc[]): Promise<ProductView[]> {
  const ids = [...new Set(products.map((p) => String(p.seller)))];
  const sellers = await User.find({ _id: { $in: ids } }, { name: 1, region: 1, verification: 1 }).lean<SellerInfo[]>();
  const byId = new Map(sellers.map((s) => [String(s._id), s]));
  return products.map((p) => toView(p, byId.get(String(p.seller))));
}

export type CatalogQuery = { q?: string; category?: CategoryCode; seller?: string; page?: number; ids?: string[] };
export const PAGE_SIZE = 24;

/** Katalog: faqat faol mahsulotlar, bloklanmagan sotuvchilardan. */
export async function listCatalog(query: CatalogQuery): Promise<{ items: ProductView[]; total: number; page: number; pages: number }> {
  await connectDb();
  const filter: FilterQuery<ProductDoc> = { active: true };
  if (query.category) filter.category = query.category;
  if (query.seller && isValidObjectId(query.seller)) filter.seller = query.seller;
  if (query.ids) filter._id = { $in: query.ids.filter((id) => isValidObjectId(id)) };
  const q = query.q?.trim();
  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 80);
    filter.name = { $regex: escaped, $options: "i" };
  }
  const hidden = await hiddenSellers();
  if (hidden.length) filter.seller = { ...(filter.seller ? { $eq: filter.seller } : {}), $nin: hidden };

  const page = Math.max(1, query.page ?? 1);
  const [docs, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean<ProductDoc[]>(),
    Product.countDocuments(filter),
  ]);
  return { items: await withSellers(docs), total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getProduct(id: string): Promise<ProductView | null> {
  if (!isValidObjectId(id)) return null;
  await connectDb();
  const doc = await Product.findById(id).lean<ProductDoc>();
  if (!doc) return null;
  const [view] = await withSellers([doc]);
  return view ?? null;
}

export async function listSellerProducts(sellerId: string): Promise<ProductView[]> {
  await connectDb();
  const docs = await Product.find({ seller: sellerId, active: true }).sort({ updatedAt: -1 }).lean<ProductDoc[]>();
  return withSellers(docs);
}

export async function createProduct(sellerId: string, input: ProductInput): Promise<ProductView> {
  await connectDb();
  const doc = await Product.create({ ...input, seller: sellerId });
  const [view] = await withSellers([doc.toObject() as ProductDoc]);
  return view!;
}

/** Faqat egasi o'zgartira oladi. Topilmasa yoki egasi boshqa bo'lsa — null. */
export async function updateProduct(sellerId: string, id: string, input: ProductInput): Promise<ProductView | null> {
  if (!isValidObjectId(id)) return null;
  await connectDb();
  const doc = await Product.findOneAndUpdate({ _id: id, seller: sellerId, active: true }, { $set: input }, { new: true, runValidators: true }).lean<ProductDoc>();
  if (!doc) return null;
  const [view] = await withSellers([doc]);
  return view ?? null;
}

/** O'chirish o'rniga arxivlash: eski buyurtmalar mahsulotni ko'rsata oladi. */
export async function archiveProduct(sellerId: string, id: string): Promise<boolean> {
  if (!isValidObjectId(id)) return false;
  await connectDb();
  const res = await Product.updateOne({ _id: id, seller: sellerId, active: true }, { $set: { active: false } });
  return res.modifiedCount === 1;
}

/** Do'kon saqlagan mahsulotlar. */
export async function listFavorites(buyerId: string): Promise<ProductView[]> {
  await connectDb();
  const u = await User.findById(buyerId, { favorites: 1 }).lean();
  const ids = (u?.favorites ?? []).map(String);
  if (!ids.length) return [];
  return (await listCatalog({ ids, page: 1 })).items;
}

export async function toggleFavorite(buyerId: string, productId: string): Promise<boolean> {
  if (!isValidObjectId(productId)) return false;
  await connectDb();
  const u = await User.findById(buyerId, { favorites: 1 });
  if (!u) return false;
  const has = u.favorites.some((f) => String(f) === productId);
  await User.updateOne({ _id: buyerId }, has ? { $pull: { favorites: productId } } : { $addToSet: { favorites: productId } });
  return !has;
}

export async function isFavorite(buyerId: string, productId: string): Promise<boolean> {
  if (!isValidObjectId(productId)) return false;
  await connectDb();
  return (await User.countDocuments({ _id: buyerId, favorites: productId })) > 0;
}

/** Katalogni bitta sotuvchi bo'yicha ko'rsatganda sarlavha uchun. */
export async function getProductSeller(sellerId: string): Promise<string | null> {
  if (!isValidObjectId(sellerId)) return null;
  await connectDb();
  const seller = await User.findOne({ _id: sellerId, role: "seller" }, { name: 1 }).lean<{ name: string }>();
  return seller?.name ?? null;
}

export type SupplierView = { id: string; name: string; region: RegionCode; verified: boolean; productCount: number };

export type SupplierQuery = { region?: RegionCode; q?: string };

/** Kompaniyalar ro'yxati va qidiruvi: nomi bo'yicha (?q=) va viloyat bo'yicha (?region=). */
export async function listSuppliers(query: SupplierQuery = {}): Promise<SupplierView[]> {
  await connectDb();
  const filter: Record<string, unknown> = { role: "seller", blocked: false, $or: [{ subscriptionUntil: null }, { subscriptionUntil: { $gt: new Date() } }] };
  const and: Record<string, unknown>[] = [];
  // Viloyat: kompaniya shu yerda joylashgan yoki shu yerga yetkazib beradi.
  if (query.region) and.push({ $or: [{ region: query.region }, { "profile.deliveryRegions": query.region }] });
  const q = query.q?.trim();
  if (q) and.push({ name: { $regex: q.slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } });
  if (and.length) filter.$and = and;
  const sellers = await User.find(filter, { name: 1, region: 1, verification: 1 }).sort({ verification: -1, name: 1 }).limit(200).lean<SellerInfo[]>();
  const counts = await Product.aggregate<{ _id: unknown; n: number }>([
    { $match: { active: true, seller: { $in: sellers.map((s) => s._id) } } },
    { $group: { _id: "$seller", n: { $sum: 1 } } },
  ]);
  const countBy = new Map(counts.map((c) => [String(c._id), c.n]));
  return sellers.map((s) => ({
    id: String(s._id),
    name: s.name,
    region: s.region,
    verified: s.verification === "verified",
    productCount: countBy.get(String(s._id)) ?? 0,
  }));
}

export type RankedProduct = { product: ProductView; value: number };

/**
 * Kompaniyaning eng yaxshi mahsulotlari:
 * - bestSelling — bekor qilinmagan buyurtmalardagi jami sotilgan miqdor bo'yicha;
 * - popular — nechta do'kon tanlagan: buyurtma qilgan yoki saqlagan (sevimlilar) do'konlar soni bo'yicha.
 * Bazaga 2 bosqichda: uchta agregatsiya parallel, keyin ikkala ro'yxat uchun bitta katalog so'rovi
 * (u faqat faol mahsulotlarni qaytaradi — arxivlanganlar shu yerda tushib qoladi).
 */
export async function getSellerHighlights(sellerId: string, limit = 4): Promise<{ bestSelling: RankedProduct[]; popular: RankedProduct[] }> {
  if (!isValidObjectId(sellerId)) return { bestSelling: [], popular: [] };
  await connectDb();
  const seller = new Types.ObjectId(sellerId);
  // Arxivlangan mahsulotlar keyin chiqarib tashlanadi — zaxira bilan olinadi.
  const take = limit * 3;

  const [sold, buyers, saved] = await Promise.all([
    Order.aggregate<{ _id: Types.ObjectId; value: number }>([
      { $match: { seller, status: { $ne: "cancelled" } } },
      { $unwind: "$items" },
      { $group: { _id: "$items.product", value: { $sum: "$items.quantity" } } },
      { $sort: { value: -1 } },
      { $limit: take },
    ]),
    Order.aggregate<{ _id: { product: Types.ObjectId; buyer: Types.ObjectId } }>([
      { $match: { seller, status: { $ne: "cancelled" } } },
      { $unwind: "$items" },
      { $group: { _id: { product: "$items.product", buyer: "$buyer" } } },
    ]),
    User.aggregate<{ _id: { product: Types.ObjectId; buyer: Types.ObjectId } }>([
      { $match: { role: "buyer", "favorites.0": { $exists: true } } },
      { $unwind: "$favorites" },
      { $lookup: { from: Product.collection.name, localField: "favorites", foreignField: "_id", pipeline: [{ $match: { seller } }, { $project: { _id: 1 } }], as: "p" } },
      { $match: { "p.0": { $exists: true } } },
      { $group: { _id: { product: "$favorites", buyer: "$_id" } } },
    ]),
  ]);

  // Bir do'kon ham buyurtma qilib, ham saqlagan bo'lsa — bir marta sanaladi.
  const shops = new Map<string, Set<string>>();
  for (const { _id } of [...buyers, ...saved]) {
    const key = String(_id.product);
    if (!shops.has(key)) shops.set(key, new Set());
    shops.get(key)!.add(String(_id.buyer));
  }
  const popularRows = [...shops.entries()]
    .map(([id, set]) => ({ id, value: set.size }))
    .sort((a, b) => b.value - a.value)
    .slice(0, take);
  const soldRows = sold.map((r) => ({ id: String(r._id), value: r.value }));

  const ids = [...new Set([...soldRows, ...popularRows].map((r) => r.id))];
  if (!ids.length) return { bestSelling: [], popular: [] };
  const { items } = await listCatalog({ ids, seller: sellerId, page: 1 });
  const byId = new Map(items.map((p) => [p.id, p]));
  const rank = (rows: { id: string; value: number }[]) =>
    rows.flatMap((r) => {
      const product = byId.get(r.id);
      return product ? [{ product, value: r.value }] : [];
    }).slice(0, limit);
  return { bestSelling: rank(soldRows), popular: rank(popularRows) };
}

export type CartStat = { shops: number; quantity: number };

/**
 * Sotuvchi mahsulotlari nechta do'kon savatida turibdi (hali buyurtma qilinmagan).
 * Bloklangan do'konlar hisobga olinmaydi.
 * byProduct: productId → { shops, quantity }; shops — kamida bitta mahsuloti savatda turgan do'konlar soni.
 */
export async function cartStatsForSeller(sellerId: string): Promise<{ byProduct: Map<string, CartStat>; shops: number }> {
  const empty = { byProduct: new Map<string, CartStat>(), shops: 0 };
  if (!isValidObjectId(sellerId)) return empty;
  await connectDb();
  const [products, blockedUsers] = await Promise.all([Product.find({ seller: sellerId, active: true }, { _id: 1 }).lean(), User.find({ role: "buyer", blocked: true }, { _id: 1 }).lean()]);
  const productIds = products.map((p) => p._id);
  if (!productIds.length) return empty;
  const blocked = blockedUsers.map((u) => u._id);
  const match = { "items.product": { $in: productIds }, ...(blocked.length ? { buyer: { $nin: blocked } } : {}) };
  const [rows, buyers] = await Promise.all([
    Cart.aggregate<{ _id: Types.ObjectId; shops: number; quantity: number }>([
      { $match: match },
      { $unwind: "$items" },
      { $match: { "items.product": { $in: productIds } } },
      { $group: { _id: "$items.product", buyers: { $addToSet: "$buyer" }, quantity: { $sum: "$items.quantity" } } },
      { $project: { shops: { $size: "$buyers" }, quantity: 1 } },
    ]),
    Cart.distinct("buyer", match),
  ]);
  return { byProduct: new Map(rows.map((r) => [String(r._id), { shops: r.shops, quantity: r.quantity }])), shops: buyers.length };
}
