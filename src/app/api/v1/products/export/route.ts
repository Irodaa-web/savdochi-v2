import writeXlsxFile from "write-excel-file/node";
import { getDictionary, getLocale } from "@/i18n/server";
import { withUser } from "@/server/handler";
import { listSellerProducts } from "@/server/products";

/**
 * Kompaniya mahsulotlari Excel faylida. Ustunlar import shabloni bilan bir xil —
 * fayl tahrirlanib qayta yuklanishi mumkin (nomi bo'yicha yangilanadi).
 */
export const GET = withUser("seller", async (user) => {
  const t = getDictionary(await getLocale());
  const p = t.products;
  const products = await listSellerProducts(user.id);
  const header = [p.name, p.category, p.unit, p.price, p.minOrder, p.stock, p.packSize, p.description, p.importImagesCol].map((value) => ({
    value,
    fontWeight: "bold" as const,
  }));
  const rows = products.map((x) => [
    { type: String, value: x.name },
    { type: String, value: t.categories[x.category] ?? x.category },
    { type: String, value: t.units[x.unit] ?? x.unit },
    { type: Number, value: x.price },
    { type: Number, value: x.minOrder },
    { type: Number, value: x.stock },
    { type: Number, value: x.packSize },
    { type: String, value: x.description },
    { type: String, value: x.images.join(" ") },
  ]);
  const buffer = await writeXlsxFile([header, ...rows], {
    columns: [{ width: 34 }, { width: 22 }, { width: 14 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 40 }, { width: 50 }],
  }).toBuffer();
  const day = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="savdochi-mahsulotlar-${day}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
});
