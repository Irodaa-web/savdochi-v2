import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
process.env.AUTH_SECRET = "unit-test-secret-unit-test-secret-1234";
const { clickSign } = await import("@/server/onlinePay");
const { open, seal } = await import("@/lib/secretBox");

describe("Click imzosi", () => {
  const f = { click_trans_id: "123", service_id: "11", merchant_trans_id: "abc", amount: "1000", action: "0", sign_time: "2026-11-11 10:00:00" };
  it("prepare: merchant_prepare_id qatnashmaydi", () => {
    expect(clickSign(f, "S")).toBe(createHash("md5").update("12311Sabc10000" + f.sign_time).digest("hex"));
  });
  it("complete: merchant_prepare_id qatnashadi", () => {
    const c = { ...f, action: "1", merchant_prepare_id: "7" };
    expect(clickSign(c, "S")).toBe(createHash("md5").update("12311Sabc7" + "1000" + "1" + f.sign_time).digest("hex"));
  });
});

describe("kalitlarni shifrlash", () => {
  it("shifrlab-ochish va buzilgan matn", () => {
    const sealed = seal("payme-secret");
    expect(sealed).not.toContain("payme-secret");
    expect(open(sealed)).toBe("payme-secret");
    expect(open(sealed.slice(0, -4) + "AAAA")).toBeNull();
    expect(seal("x")).not.toBe(seal("x"));
  });
});
