import { describe, expect, it } from "vitest";
import { ORDER_STATUSES, ORDER_TRANSITIONS, PAYMENT_METHODS, PROFILE_PAYMENT_METHODS } from "@/lib/orders";

const can = (side: "buyer" | "seller", from: (typeof ORDER_STATUSES)[number], to: (typeof ORDER_STATUSES)[number]) => (ORDER_TRANSITIONS[side][from] ?? []).includes(to);

describe("buyurtma holatlari", () => {
  it("kompaniya: yangi → tasdiqlangan → yo'lda → yetkazildi", () => {
    expect(can("seller", "new", "confirmed")).toBe(true);
    expect(can("seller", "confirmed", "shipped")).toBe(true);
    expect(can("seller", "shipped", "delivered")).toBe(true);
  });
  it("do'kon faqat yangi buyurtmani bekor qila oladi va yetkazilganini tasdiqlaydi", () => {
    expect(can("buyer", "new", "cancelled")).toBe(true);
    expect(can("buyer", "confirmed", "cancelled")).toBe(false);
    expect(can("buyer", "new", "confirmed")).toBe(false);
    expect(can("buyer", "shipped", "delivered")).toBe(true);
  });
  it("yo'lga chiqqan buyurtmani bekor qilib bo'lmaydi; yakuniy holatlardan o'tish yo'q", () => {
    expect(can("seller", "shipped", "cancelled")).toBe(false);
    for (const side of ["buyer", "seller"] as const) {
      expect(ORDER_TRANSITIONS[side].delivered ?? []).toEqual([]);
      expect(ORDER_TRANSITIONS[side].cancelled ?? []).toEqual([]);
    }
  });
  it("nasiya profil sozlamasida tanlanmaydi", () => {
    expect(PAYMENT_METHODS).toContain("credit");
    expect(PROFILE_PAYMENT_METHODS as readonly string[]).not.toContain("credit");
  });
});
