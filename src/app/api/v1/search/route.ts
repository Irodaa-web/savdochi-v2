import { ok } from "@/lib/api";
import { withUser } from "@/server/handler";
import { listCatalog, listSuppliers } from "@/server/products";

/**
 * Yuqoridagi umumiy qidiruv uchun tezkor takliflar: 5 ta mahsulot va 5 ta kompaniya.
 * To'liq natija katalog sahifasida ochiladi.
 */
export const GET = withUser(null, async (user, request) => {
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (q.length < 2) return ok({ products: [], companies: [], totalProducts: 0 });
  const [catalog, suppliers] = await Promise.all([listCatalog({ q, demo: user.demo }), listSuppliers({ q, demo: user.demo })]);
  return ok({
    products: catalog.items.slice(0, 5).map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      unit: p.unit,
      category: p.category,
      image: p.images[0] ?? null,
      seller: p.seller.name,
    })),
    companies: suppliers.slice(0, 5).map((s) => ({ id: s.id, name: s.name, region: s.region, verified: s.verified, productCount: s.productCount })),
    totalProducts: catalog.total,
  });
});
