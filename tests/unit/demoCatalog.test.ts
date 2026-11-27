import { describe, expect, it } from "vitest";
import { CATEGORY_CODES, UNIT_CODES } from "@/lib/catalog";
import { DEMO_PRODUCTS } from "@/lib/demoCatalog";

describe("demo katalog", () => {
  it("rasmlar https va 4 tadan oshmaydi, tavsif bor", () => {
    for (const p of DEMO_PRODUCTS) {
      expect(p.images.length, p.name).toBeLessThanOrEqual(4);
      for (const img of p.images) {
        expect(img.length, p.name).toBeLessThanOrEqual(500);
        expect(new URL(img).protocol, p.name).toBe("https:");
      }
      expect(p.description.length, p.name).toBeGreaterThan(20);
    }
  });

  it("kategoriya, birlik, narx va nomlar to'g'ri", () => {
    const names = new Set<string>();
    for (const p of DEMO_PRODUCTS) {
      expect(CATEGORY_CODES).toContain(p.category);
      expect(UNIT_CODES).toContain(p.unit);
      expect(p.price).toBeGreaterThan(0);
      expect(p.packSize).toBeGreaterThanOrEqual(1);
      for (const t of p.priceTiers) expect(t.price, p.name).toBeLessThan(p.price);
      expect(names.has(p.name), p.name).toBe(false);
      names.add(p.name);
    }
  });
});
