import { describe, expect, it } from "vitest";
import { nextDeliveryDay, termsForRegion, type DeliverySchedule } from "@/lib/delivery";

describe("yetkazish jadvali", () => {
  const schedule: DeliverySchedule = {
    deliveryDays: [1, 2, 3, 4, 5, 6],
    deliveryFee: 30_000,
    minOrderTotal: 300_000,
    leadDays: 1,
    regionRules: [
      { region: "tashkent_city", days: [], fee: 0, minOrderTotal: null },
      { region: "samarkand", days: [2, 5], fee: 80_000, minOrderTotal: 1_000_000 },
    ],
  };

  it("viloyat qoidasi bo'lmasa — umumiy shartlar", () => {
    expect(termsForRegion(schedule, "andijan")).toEqual({ days: [1, 2, 3, 4, 5, 6], fee: 30_000, minOrderTotal: 300_000, leadDays: 1, custom: false });
  });
  it("viloyat qoidasi faqat berilgan qismini almashtiradi", () => {
    const t = termsForRegion(schedule, "tashkent_city");
    expect(t.fee).toBe(0);
    expect(t.minOrderTotal).toBe(300_000);
    expect(t.days).toEqual([1, 2, 3, 4, 5, 6]);
    expect(t.custom).toBe(true);
  });
  it("viloyat kunlari va narxi", () => {
    const t = termsForRegion(schedule, "samarkand");
    expect(t).toMatchObject({ days: [2, 5], fee: 80_000, minOrderTotal: 1_000_000 });
  });

  // 2026-11-20 — juma. Toshkent vaqti bilan hisoblanadi.
  const friday = new Date("2026-11-20T10:00:00Z");
  it("ertasi kun shanba — yetkazish kuni bo'lsa o'sha", () => expect(nextDeliveryDay([1, 2, 3, 4, 5, 6], 1, friday)).toBe("2026-11-21"));
  it("yakshanba yetkazilmasa — dushanbaga suriladi", () => expect(nextDeliveryDay([1, 2, 3, 4, 5, 6], 2, friday)).toBe("2026-11-23"));
  it("faqat seshanba/juma", () => expect(nextDeliveryDay([2, 5], 1, friday)).toBe("2026-11-24"));
  it("kunlar belgilanmagan — faqat muddat", () => expect(nextDeliveryDay([], 3, friday)).toBe("2026-11-23"));
  it("Toshkentda yarim tundan keyin — yangi kun", () => expect(nextDeliveryDay([], 0, new Date("2026-11-20T19:30:00Z"))).toBe("2026-11-21"));
});
