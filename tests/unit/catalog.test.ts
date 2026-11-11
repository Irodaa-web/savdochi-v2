import { describe, expect, it } from "vitest";
import { unitPriceFor } from "@/lib/catalog";

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
