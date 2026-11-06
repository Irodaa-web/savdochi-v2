import "server-only";
import { readSheet } from "read-excel-file/node";
import en from "@/i18n/dictionaries/en";
import ru from "@/i18n/dictionaries/ru";
import uz from "@/i18n/dictionaries/uz";
import { CATEGORY_CODES, UNIT_CODES, type CategoryCode, type UnitCode } from "@/lib/catalog";
import { AppError } from "@/lib/api";
import { connectDb } from "@/lib/db";
import { fieldErrors, productSchema, type ProductInput } from "@/lib/validation";
import { Product } from "@/models/Product";

/** Excel'dan mahsulot yuklash: ustunlar sarlavha bo'yicha (uz/ru/en) avtomatik taniladi. */

export const IMPORT_MAX_ROWS = 1000;
export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;

type Field = "name" | "category" | "unit" | "price" | "minOrder" | "stock" | "packSize" | "description" | "images";

/** Sarlavha sinonimlari. Tartib muhim: aniqroq so'zlar oldin tekshiriladi. */
const HEADERS: [Field, string[]][] = [
  ["minOrder", ["min", "минимал", "мин.", "мин "]],
  ["packSize", ["dona soni", "o'ramda", "blokda", "qutida", "в упаков", "в блоке", "в коробке", "pack size", "per pack", "pieces per", "pcs per", "items per", "штук в", "шт. в", "kratnost", "кратност"]],
  ["images", ["rasm", "foto", "фото", "изображ", "картин", "image", "photo", "picture"]],
  ["description", ["tavsif", "izoh", "описан", "description", "comment", "комментар"]],
  ["category", ["kategoriya", "toifa", "turkum", "категор", "category"]],
  ["price", ["narx", "цена", "стоимост", "price", "cost"]],
  ["unit", ["birlik", "o'lchov", "единиц", "ед.", "ед ", "unit", "measure"]],
  ["stock", ["qoldiq", "ombor", "soni", "miqdor", "остаток", "склад", "количеств", "кол-во", "stock", "qty", "quantity"]],
  ["name", ["nomi", "nom", "mahsulot", "назван", "наименован", "товар", "name", "product", "title"]],
];

/** Birlik yozuvlari: lug'atdagi nomlardan tashqari keng tarqalgan qisqartmalar. */
const UNIT_ALIASES: Record<string, UnitCode> = {
  "шт": "piece", "pcs": "piece", "piece": "piece", "pieces": "piece", "ta": "piece", "dona": "piece",
  "упак": "pack", "упаковка": "pack", "pachka": "pack", "paket": "pack", "пакет": "pack",
  "kilogramm": "kg", "килограмм": "kg", "kilo": "kg",
  "litr": "litre", "литр": "litre", "liter": "litre", "litre": "litre", "l": "litre", "л": "litre",
  "korobka": "box", "karobka": "box", "box": "box", "мешок": "bag", "qop": "bag", "bag": "bag",
};

/** Apostroflar, katta-kichik harf va ortiqcha bo'shliqlarni bir xil ko'rinishga keltiradi. */
export function norm(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[‘’ʻʼ`´ʹ]/g, "'")
    .replace(/[\s ]+/g, " ")
    .replace(/[*:]+$/g, "")
    .trim();
}

const CATEGORY_LOOKUP = new Map<string, CategoryCode>();
const UNIT_LOOKUP = new Map<string, UnitCode>(Object.entries(UNIT_ALIASES));
for (const dict of [uz, ru, en]) {
  for (const code of CATEGORY_CODES) CATEGORY_LOOKUP.set(norm(dict.categories[code]), code);
  for (const code of UNIT_CODES) UNIT_LOOKUP.set(norm(dict.units[code]).replace(/\.$/, ""), code);
}
for (const code of CATEGORY_CODES) CATEGORY_LOOKUP.set(code, code);
for (const code of UNIT_CODES) UNIT_LOOKUP.set(code, code);

function matchCategory(raw: unknown): CategoryCode | null {
  const v = norm(raw);
  if (!v) return null;
  const exact = CATEGORY_LOOKUP.get(v);
  if (exact) return exact;
  for (const [label, code] of CATEGORY_LOOKUP) if (label.length > 3 && (v.includes(label) || label.includes(v))) return code;
  return null;
}

function matchUnit(raw: unknown): UnitCode | null {
  const v = norm(raw).replace(/\.$/, "");
  if (!v) return null;
  return UNIT_LOOKUP.get(v) ?? null;
}

/** "310 000", "310,000 so'm", 310000 → 310000. Bo'sh bo'lsa — undefined. */
function parseNumber(raw: unknown): number | undefined {
  if (typeof raw === "number") return raw;
  let s = String(raw ?? "").replace(/[\s ]/g, "");
  if (!s) return undefined;
  s = s.replace(/[^\d.,-]/g, "");
  // Bitta vergul va undan keyin 1-2 raqam — o'nlik kasr; aks holda minglik ajratuvchi.
  s = /^-?\d+,\d{1,2}$/.test(s) ? s.replace(",", ".") : s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) && s !== "" ? n : NaN;
}

/** So'm va dona — butun son; kasr bo'lsa yaxlitlanadi. */
function whole(n: number | undefined): number | undefined {
  return typeof n === "number" && Number.isFinite(n) ? Math.round(n) : n;
}

export type ImportRow = {
  /** Excel'dagi qator raqami (1 dan). */
  row: number;
  name: string;
  category: CategoryCode | null;
  unit: UnitCode | null;
  price: number | null;
  stock: number | null;
  action: "create" | "update" | "error";
  /** Maydon → xato kaliti (errors lug'atidagi). */
  errors: Record<string, string>;
};

export type ImportResult = {
  rows: ImportRow[];
  /** Qaysi ustunlar topildi (foydalanuvchiga ko'rsatish uchun). */
  columns: Field[];
  created: number;
  updated: number;
  failed: number;
  committed: boolean;
};

type Parsed = { row: ImportRow; input?: ProductInput };

/**
 * Varaqni tahlil qiladi (bazasiz, sinash oson): sarlavha qatorini topadi, har bir qatorni tekshiradi.
 * existingNames — sotuvchining mavjud mahsulot nomlari (norm ko'rinishida): ular yangilanadi.
 */
export function analyzeSheet(sheet: unknown[][], existingNames: Set<string>): { columns: Map<Field, number>; parsed: Parsed[] } {
  // Sarlavha qatori: birinchi 10 qatordan "nomi" ustuni topilgan birinchisi.
  let headerIndex = -1;
  let columns = new Map<Field, number>();
  for (let i = 0; i < Math.min(sheet.length, 10); i++) {
    const found = mapHeaders(sheet[i] ?? []);
    if (found.has("name") && found.size >= 2) {
      headerIndex = i;
      columns = found;
      break;
    }
  }
  if (headerIndex < 0) throw new AppError("INVALID_INPUT", { file: "excelNoHeader" });

  const dataRows = sheet.slice(headerIndex + 1).map((cells, i) => ({ cells, row: headerIndex + i + 2 }));
  const nonEmpty = dataRows.filter(({ cells }) => cells.some((c) => norm(c) !== ""));
  if (!nonEmpty.length) throw new AppError("INVALID_INPUT", { file: "excelEmpty" });
  if (nonEmpty.length > IMPORT_MAX_ROWS) throw new AppError("INVALID_INPUT", { file: "excelTooMany" });

  const seen = new Set<string>();
  const parsed: Parsed[] = nonEmpty.map(({ cells, row }) => {
    const cell = (f: Field) => (columns.has(f) ? cells[columns.get(f)!] : undefined);
    const name = String(cell("name") ?? "").trim();
    const category = matchCategory(cell("category")) ?? "other";
    const unit = matchUnit(cell("unit"));
    const price = whole(parseNumber(cell("price")));
    const stock = whole(parseNumber(cell("stock")));
    const minOrder = whole(parseNumber(cell("minOrder")));
    const packSize = whole(parseNumber(cell("packSize")));
    const images = String(cell("images") ?? "")
      .split(/[\s,;]+/)
      .filter((u) => /^https?:\/\//i.test(u))
      .slice(0, 4);

    const result = productSchema.safeParse({
      name,
      category,
      unit: unit ?? "",
      price: price ?? "",
      minOrder: minOrder ?? 1,
      stock: stock ?? 0,
      packSize: packSize ?? 1,
      description: String(cell("description") ?? "").trim().slice(0, 2000),
      images,
      priceTiers: [],
    });

    const key = norm(name);
    const errors: Record<string, string> = result.success ? {} : fieldErrors(result.error);
    if (key && seen.has(key)) errors.name = "excelDuplicate";
    seen.add(key);

    const view: ImportRow = {
      row,
      name,
      category,
      unit,
      price: typeof price === "number" && Number.isFinite(price) ? price : null,
      stock: typeof stock === "number" && Number.isFinite(stock) ? stock : null,
      action: Object.keys(errors).length ? "error" : existingNames.has(key) ? "update" : "create",
      errors,
    };
    return { row: view, input: result.success ? result.data : undefined };
  });
  return { columns, parsed };
}

/** Faylni o'qiydi, tahlil qiladi; commit=true bo'lsa xatosiz qatorlarni saqlaydi. */
export async function importProducts(sellerId: string, file: Buffer, commit: boolean): Promise<ImportResult> {
  let sheet: unknown[][];
  try {
    sheet = (await readSheet(file)) as unknown[][];
  } catch {
    throw new AppError("INVALID_INPUT", { file: "excelInvalid" });
  }

  await connectDb();
  const existing = await Product.find({ seller: sellerId, active: true }, { name: 1 }).lean();
  const existingByName = new Map(existing.map((p) => [norm(p.name), p._id]));
  const { columns, parsed } = analyzeSheet(sheet, new Set(existingByName.keys()));

  const ok = parsed.filter((p) => p.row.action !== "error" && p.input);
  const toCreate = ok.filter((p) => p.row.action === "create");
  const toUpdate = ok.filter((p) => p.row.action === "update");

  if (commit && ok.length) {
    if (toCreate.length) await Product.insertMany(toCreate.map((p) => ({ ...p.input!, seller: sellerId })));
    if (toUpdate.length) {
      // Yangilashda faqat faylda bor ustunlar o'zgaradi (masalan, rasmlar yoki tavsif o'chib ketmaydi).
      await Product.bulkWrite(
        toUpdate.map((p) => {
          const input = p.input!;
          const set: Partial<ProductInput> = {};
          for (const f of columns.keys()) {
            if (f === "images" && !input.images.length) continue;
            if (f === "description" && !input.description) continue;
            (set as Record<string, unknown>)[f] = input[f];
          }
          return { updateOne: { filter: { _id: existingByName.get(norm(input.name)), seller: sellerId }, update: { $set: set } } };
        }),
      );
    }
  }

  return {
    rows: parsed.map((p) => p.row),
    columns: [...columns.keys()],
    created: toCreate.length,
    updated: toUpdate.length,
    failed: parsed.length - ok.length,
    committed: commit && ok.length > 0,
  };
}

function mapHeaders(cells: unknown[]): Map<Field, number> {
  const out = new Map<Field, number>();
  cells.forEach((cell, index) => {
    const h = norm(cell);
    if (!h) return;
    for (const [field, words] of HEADERS) {
      if (out.has(field)) continue;
      if (words.some((w) => h.includes(w))) {
        out.set(field, index);
        return;
      }
    }
  });
  return out;
}
