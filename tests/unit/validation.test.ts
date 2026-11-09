import { describe, expect, it } from "vitest";
import { checkoutSchema, debtPaymentSchema, partnershipUpdateSchema, profileSchema } from "@/lib/validation";

const base = { sellerId: "x", phone: "+998901234567", region: "tashkent_city", lat: null, lng: null, paymentMethod: "cash" };

describe("checkout", () => {
  it("yetkazishda manzil shart", () => {
    const r = checkoutSchema.safeParse({ ...base, address: "" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(["address"]);
  });
  it("olib ketishda manzil shart emas", () => expect(checkoutSchema.safeParse({ ...base, method: "pickup", address: "" }).success).toBe(true));
  it("usul ko'rsatilmasa — yetkazish", () => expect(checkoutSchema.parse({ ...base, address: "Chilonzor 1" }).method).toBe("delivery"));
  it("requestId formati", () => {
    expect(checkoutSchema.safeParse({ ...base, address: "Chilonzor 1", requestId: "abc" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, address: "Chilonzor 1", requestId: "3f2a9c1e-77aa-4c55-9a1d-0e5b2f1c9d00" }).success).toBe(true);
  });
  it("nasiya to'lov usuli qabul qilinadi", () => expect(checkoutSchema.safeParse({ ...base, address: "Chilonzor 1", paymentMethod: "credit" }).success).toBe(true));
});

describe("profil rekvizitlari", () => {
  const p = { name: "Kompaniya", region: "tashkent_city" };
  it("bo'sh qoldirsa bo'ladi", () => expect(profileSchema.safeParse(p).success).toBe(true));
  it("STIR 9 raqam", () => {
    expect(profileSchema.safeParse({ ...p, inn: "123456789" }).success).toBe(true);
    expect(profileSchema.safeParse({ ...p, inn: "12345" }).error?.issues[0]?.message).toBe("innFormat");
  });
  it("hisob raqami 20, MFO 5 raqam", () => {
    expect(profileSchema.safeParse({ ...p, bankAccount: "2020800000000000001" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...p, bankAccount: "20208000000000000001", mfo: "00014" }).success).toBe(true);
  });
  it("profilda nasiya tanlab bo'lmaydi", () => expect(profileSchema.safeParse({ ...p, paymentMethods: ["credit"] }).success).toBe(false));
});

describe("nasiya va to'lov", () => {
  it("limit manfiy bo'lmaydi, muddat 1–180 kun", () => {
    expect(partnershipUpdateSchema.safeParse({ action: "update", creditLimit: -1 }).success).toBe(false);
    expect(partnershipUpdateSchema.safeParse({ action: "update", paymentDays: 0 }).success).toBe(false);
    expect(partnershipUpdateSchema.safeParse({ action: "update", creditLimit: 5_000_000, paymentDays: 30 }).success).toBe(true);
  });
  it("to'lov summasi musbat butun son", () => {
    expect(debtPaymentSchema.safeParse({ amount: 0 }).success).toBe(false);
    expect(debtPaymentSchema.safeParse({ amount: 10.5 }).success).toBe(false);
    expect(debtPaymentSchema.parse({ amount: "150000" })).toEqual({ amount: 150000, note: "" });
  });
});
