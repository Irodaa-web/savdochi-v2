import { describe, expect, it } from "vitest";
import { activeSalePrice, saleDay, salePercent, unitPriceFor } from "@/lib/catalog";
import { productSchema } from "@/lib/validation";

describe("unitPriceFor — narx pog'onalari", () => {
  const tiers = [
    { min: 50, price: 280_000 },
    { min: 10, price: 300_000 },
  ];
  it("pog'onaga yetmasa asosiy narx", () => expect(unitPriceFor(5, 310_000, tiers)).toBe(310_000));
  it("eng katta mos pog'ona tanlanadi (tartibdan qat'i nazar)", () => {
    expect(unitPriceFor(10, 310_000, tiers)).toBe(300_000);
    expect(unitPriceFor(49, 310_000, tiers)).toBe(300_000);
    expect(unitPriceFor(50, 310_000, tiers)).toBe(280_000);
  });
  it("pog'onasiz", () => expect(unitPriceFor(100, 1000, [])).toBe(1000));
});

describe("aksiya narxi", () => {
  const tiers = [{ min: 50, price: 280_000 }];
  const now = new Date("2026-11-20T10:00:00Z");
  it("aksiya pog'onadan arzon bo'lsa — aksiya narxi", () => expect(unitPriceFor(5, 310_000, tiers, 270_000)).toBe(270_000));
  it("pog'ona aksiyadan arzon bo'lsa — pog'ona narxi (xaridor ko'proq to'lamaydi)", () => expect(unitPriceFor(60, 310_000, tiers, 290_000)).toBe(280_000));
  it("muddati o'tgan aksiya amal qilmaydi", () => {
    expect(activeSalePrice({ salePrice: 270_000, saleUntil: new Date("2026-11-19T18:59:59Z") }, now)).toBeNull();
    expect(activeSalePrice({ salePrice: 270_000, saleUntil: new Date("2026-11-25T18:59:59Z") }, now)).toBe(270_000);
    expect(activeSalePrice({ salePrice: null, saleUntil: null }, now)).toBeNull();
  });
  it("foiz va sana", () => {
    expect(salePercent(100_000, 85_000)).toBe(15);
    expect(saleDay("2026-11-25T18:59:59Z")).toBe("25.11");
  });
});

describe("productSchema — aksiya", () => {
  const base = { name: "Shakar", category: "food", unit: "bag", price: 100_000, minOrder: 1, stock: 10, packSize: 1 };
  const future = new Date(Date.now() + 5 * 86_400_000).toISOString();
  it("aksiyasiz — null", () => {
    const r = productSchema.parse({ ...base, salePrice: "", saleUntil: "" });
    expect(r.salePrice).toBeNull();
    expect(r.saleUntil).toBeNull();
  });
  it("to'g'ri aksiya qabul qilinadi", () => expect(productSchema.safeParse({ ...base, salePrice: 85_000, saleUntil: future }).success).toBe(true));
  it("asosiy narxdan qimmat aksiya rad etiladi", () => expect(productSchema.safeParse({ ...base, salePrice: 120_000, saleUntil: future }).success).toBe(false));
  it("sanasiz yoki o'tgan sana rad etiladi", () => {
    expect(productSchema.safeParse({ ...base, salePrice: 85_000 }).success).toBe(false);
    expect(productSchema.safeParse({ ...base, salePrice: 85_000, saleUntil: "2020-01-01" }).success).toBe(false);
  });
});
