import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { overdueReminderDay } = await import("@/server/reminders");

describe("qarz eslatmasi kunlari", () => {
  it("1, 3, 7 va keyin har hafta", () => {
    const days = Array.from({ length: 30 }, (_, i) => i + 1).filter(overdueReminderDay);
    expect(days).toEqual([1, 3, 7, 14, 21, 28]);
  });
});
