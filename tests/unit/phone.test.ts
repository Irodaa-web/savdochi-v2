import { describe, expect, it } from "vitest";
import { formatPhone, normalizePhone } from "@/lib/phone";

describe("telefon raqami", () => {
  it.each(["90 123 45 67", "+998 (90) 123-45-67", "998901234567", "901234567"])("%s → +998901234567", (v) => expect(normalizePhone(v)).toBe("+998901234567"));
  it.each(["", "12345", "+7 900 123 45 67", "99890123456"])("%s rad etiladi", (v) => expect(normalizePhone(v)).toBeNull());
  it("formatlash", () => expect(formatPhone("+998901234567")).toBe("+998 90 123 45 67"));
});
