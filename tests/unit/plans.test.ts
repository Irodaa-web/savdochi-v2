import { describe, expect, it } from "vitest";
import { atLimit, daysLeft, effectivePlan, planFor, planHas, PLANS } from "@/lib/plans";

const DAY = 86_400_000;
const future = (days: number) => new Date(Date.now() + days * DAY);

describe("tariflar", () => {
  it("narx va chegaralar kelishilgandek", () => {
    expect(PLANS.free).toMatchObject({ price: 0, products: 10, staff: 0 });
    expect(PLANS.standard).toMatchObject({ price: 99_000, products: 100, staff: 2 });
    expect(PLANS.premium).toMatchObject({ price: 249_000, products: null, staff: null });
  });

  it("imkoniyatlar: Standart — analitika va Telegram; Premium — hammasi", () => {
    expect(planHas("free", "analytics")).toBe(false);
    expect(planHas("standard", "analytics")).toBe(true);
    expect(planHas("standard", "telegram")).toBe(true);
    expect(planHas("standard", "excel")).toBe(false);
    expect(planHas("standard", "sale")).toBe(false);
    for (const f of ["analytics", "telegram", "excel", "sale", "boost"] as const) expect(planHas("premium", f)).toBe(true);
    expect(planFor("analytics")).toBe("standard");
    expect(planFor("excel")).toBe("premium");
  });

  it("amaldagi tarif: muddati tugagan pullik tarif — Bepul", () => {
    expect(effectivePlan({ role: "seller", plan: "premium", subscriptionUntil: future(5) })).toBe("premium");
    expect(effectivePlan({ role: "seller", plan: "standard", subscriptionUntil: future(-1) })).toBe("free");
    expect(effectivePlan({ role: "seller", plan: "standard", subscriptionUntil: null })).toBe("standard");
    expect(effectivePlan({ role: "seller", plan: "free", subscriptionUntil: future(30) })).toBe("free");
  });

  it("eski hisob (plan maydonisiz): obuna amalda — Premium, tugagan — Bepul", () => {
    expect(effectivePlan({ role: "seller", subscriptionUntil: null })).toBe("premium");
    expect(effectivePlan({ role: "seller", subscriptionUntil: future(3) })).toBe("premium");
    expect(effectivePlan({ role: "seller", subscriptionUntil: future(-3) })).toBe("free");
    expect(effectivePlan({ role: "buyer" })).toBe("free");
  });

  it("chegara va qolgan kunlar", () => {
    expect(atLimit(10, 9)).toBe(false);
    expect(atLimit(10, 10)).toBe(true);
    expect(atLimit(0, 0)).toBe(true);
    expect(atLimit(null, 10_000)).toBe(false);
    expect(daysLeft({ role: "seller", plan: "premium", subscriptionUntil: future(13.5) })).toBe(14);
    expect(daysLeft({ role: "seller", plan: "premium", subscriptionUntil: null })).toBeNull();
    expect(daysLeft({ role: "seller", plan: "free" })).toBeNull();
  });
});
