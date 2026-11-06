import "server-only";
import { isValidObjectId, type FilterQuery } from "mongoose";
import { connectDb } from "@/lib/db";
import type { CategoryCode, PriceTier, UnitCode } from "@/lib/catalog";
import type { RegionCode } from "@/lib/regions";
import type { ProductInput } from "@/lib/validation";
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
  active: boolean;
  seller: { id: string; name: string; region: RegionCode; verified: boolean };
};

type SellerInfo = { _id: unknown; name: string; region: RegionCode; verification: string };

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

export type CatalogQuery = { q?: string; category?: CategoryCode; seller?: string; page?: number };
export const PAGE_SIZE = 24;

/** Katalog: faqat faol mahsulotlar, bloklanmagan sotuvchilardan. */
export async function listCatalog(query: CatalogQuery): Promise<{ items: ProductView[]; total: number; page: number; pages: number }> {
  await connectDb();
  const filter: FilterQuery<ProductDoc> = { active: true };
  if (query.category) filter.category = query.category;
  if (query.seller && isValidObjectId(query.seller)) filter.seller = query.seller;
  const q = query.q?.trim();
  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 80);
    filter.name = { $regex: escaped, $options: "i" };
  }
  const blocked = await User.find({ blocked: true }, { _id: 1 }).lean();
  if (blocked.length) filter.seller = { ...(filter.seller ? { $eq: filter.seller } : {}), $nin: blocked.map((b) => b._id) };

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

/** Katalogni bitta sotuvchi bo'yicha ko'rsatganda sarlavha uchun. */
export async function getProductSeller(sellerId: string): Promise<string | null> {
  if (!isValidObjectId(sellerId)) return null;
  await connectDb();
  const seller = await User.findOne({ _id: sellerId, role: "seller" }, { name: 1 }).lean<{ name: string }>();
  return seller?.name ?? null;
}

export type SupplierView ={ id: string; name: string; region: RegionCode; verified: boolean; productCount: number };

export async function listSuppliers(region?: RegionCode): Promise<SupplierView[]> {
  await connectDb();
  const filter: Record<string, unknown> = { role: "seller", blocked: false };
  if (region) filter.region = region;
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
