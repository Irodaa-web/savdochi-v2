import writeXlsxFile from "write-excel-file/node";
import { getDictionary, getLocale } from "@/i18n/server";
import { withUser } from "@/server/handler";

/** Tayyor Excel shablon: joriy tildagi sarlavhalar va 2 ta namuna qator. */
export const GET = withUser("seller", async () => {
  const t = getDictionary(await getLocale());
  const p = t.products;
  const header = [p.name, p.category, p.unit, p.price, p.minOrder, p.stock, p.packSize, p.description, p.importImagesCol].map((value) => ({
    value,
    fontWeight: "bold" as const,
  }));
  const rows = [
    header,
    [p.importSample1, t.categories.food, t.units.piece, 98000, 10, 300, 1, "", ""],
    [p.importSample2, t.categories.drinks, t.units.block, 36000, 20, 500, 6, "", ""],
  ];
  const buffer = await writeXlsxFile(rows, { columns: [{ width: 34 }, { width: 22 }, { width: 14 }, { width: 22 }, { width: 16 }, { width: 18 }, { width: 18 }, { width: 30 }, { width: 40 }] }).toBuffer();
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="savdochi-mahsulotlar.xlsx"',
    },
  });
});
