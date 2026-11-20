import { describe, expect, it } from "vitest";
import { staffApiAllowed, staffPageAllowed } from "@/lib/staff";

const api = (role: "manager" | "agent" | "warehouse", method: string, path: string) => staffApiAllowed(role, `/api/v1${path}`, method);

describe("xodim huquqlari — API", () => {
  it("egaga tegishli sozlamalar hamma xodimga yopiq", () => {
    for (const role of ["manager", "agent", "warehouse"] as const) {
      expect(api(role, "PUT", "/profile")).toBe(false);
      expect(api(role, "PUT", "/profile/payments")).toBe(false);
      expect(api(role, "GET", "/profile/payments")).toBe(false);
      expect(api(role, "POST", "/telegram/link")).toBe(false);
      expect(api(role, "GET", "/staff")).toBe(false);
      expect(api(role, "POST", "/staff")).toBe(false);
      expect(api(role, "PATCH", "/staff/abc")).toBe(false);
      expect(api(role, "GET", "/admin/users")).toBe(false);
      // Xodim o'z parolini almashtira oladi.
      expect(api(role, "POST", "/profile/password")).toBe(true);
    }
  });
  it("menejer: buyurtma, mahsulot, qarz, hisobot", () => {
    expect(api("manager", "PATCH", "/orders/1")).toBe(true);
    expect(api("manager", "POST", "/orders/1/edit")).toBe(true);
    expect(api("manager", "POST", "/products")).toBe(true);
    expect(api("manager", "PATCH", "/products/1")).toBe(true);
    expect(api("manager", "POST", "/debts/1/payments")).toBe(true);
    expect(api("manager", "GET", "/reports")).toBe(true);
    expect(api("manager", "GET", "/orders/export")).toBe(true);
  });
  it("agent: ko'rish, mijozlar, chat — o'zgartirish yo'q", () => {
    expect(api("agent", "GET", "/orders")).toBe(true);
    expect(api("agent", "GET", "/chats")).toBe(true);
    expect(api("agent", "POST", "/partnerships")).toBe(true);
    expect(api("agent", "PATCH", "/orders/1")).toBe(false);
    expect(api("agent", "PATCH", "/products/1")).toBe(false);
    expect(api("agent", "PATCH", "/products/1/stock")).toBe(false);
    expect(api("agent", "GET", "/debts")).toBe(false);
    expect(api("agent", "GET", "/reports")).toBe(false);
  });
  it("omborchi: holat va qoldiq — narx, qarz, mijoz yopiq", () => {
    expect(api("warehouse", "PATCH", "/orders/1")).toBe(true);
    expect(api("warehouse", "PATCH", "/products/1/stock")).toBe(true);
    expect(api("warehouse", "PATCH", "/products/1")).toBe(false);
    expect(api("warehouse", "POST", "/products")).toBe(false);
    expect(api("warehouse", "POST", "/orders/1/edit")).toBe(false);
    expect(api("warehouse", "GET", "/debts")).toBe(false);
    expect(api("warehouse", "GET", "/partnerships")).toBe(false);
    expect(api("warehouse", "GET", "/chats")).toBe(false);
  });
  it("ro'yxatda yo'q yo'l — yopiq", () => {
    expect(api("manager", "GET", "/something-new")).toBe(false);
    expect(api("manager", "DELETE", "/orders/1")).toBe(false);
  });
});

describe("xodim huquqlari — sahifalar", () => {
  it("profil va xodimlar sahifasi hech bir xodimga ochiq emas", () => {
    for (const role of ["manager", "agent", "warehouse"] as const) {
      expect(staffPageAllowed(role, "/profile")).toBe(false);
      expect(staffPageAllowed(role, "/staff")).toBe(false);
      expect(staffPageAllowed(role, "/admin")).toBe(false);
    }
  });
  it("prefiks aniq solishtiriladi (/products-x ochiq emas)", () => {
    expect(staffPageAllowed("warehouse", "/products")).toBe(true);
    expect(staffPageAllowed("warehouse", "/products/1/edit")).toBe(true); // sahifaning o'zi menejerga cheklangan
    expect(staffPageAllowed("warehouse", "/productsx")).toBe(false);
    expect(staffPageAllowed("warehouse", "/debts")).toBe(false);
    expect(staffPageAllowed("agent", "/partners/1")).toBe(true);
    expect(staffPageAllowed("agent", "/dashboard")).toBe(false);
  });
});

describe("omborchi narxlarni ko'rmaydi", () => {
  it("katalog va hisob-faktura yopiq", () => {
    expect(staffPageAllowed("warehouse", "/catalog")).toBe(false);
    expect(staffPageAllowed("warehouse", "/print/invoice/1")).toBe(false);
    expect(staffPageAllowed("agent", "/catalog")).toBe(true);
  });
});
