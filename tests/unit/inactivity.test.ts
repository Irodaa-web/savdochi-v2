import { describe, expect, it } from "vitest";
import { DAY_MS, inactivityThresholds, planInactivity, type InactivityState } from "@/lib/inactivity";

const start = new Date("2026-11-01T09:00:00Z");
const after = (days: number, ms = 0) => new Date(start.getTime() + days * DAY_MS + ms);
const fresh = (over: Partial<InactivityState> = {}): InactivityState => ({
  lastActiveAt: start,
  inactive: false,
  blocked: false,
  demo: false,
  warned12At: null,
  warned14At: null,
  ...over,
});

describe("nofaollik qoidalari", () => {
  it("chegaralar: 12-kun ogohlantirish, 14-kun oxirgi, 15-kun nofaol", () => {
    expect(planInactivity(fresh(), after(12, -1))).toBe("none");
    expect(planInactivity(fresh(), after(12))).toBe("warn");
    expect(planInactivity(fresh(), after(14, -1))).toBe("warn");
    expect(planInactivity(fresh(), after(14))).toBe("finalWarn");
    expect(planInactivity(fresh(), after(15, -1))).toBe("finalWarn");
    expect(planInactivity(fresh(), after(15))).toBe("deactivate");
    expect(planInactivity(fresh(), after(40))).toBe("deactivate");
  });

  it("ogohlantirish takrorlanmaydi; o'tkazib yuborilgan bosqich keyingisiga to'sqinlik qilmaydi", () => {
    expect(planInactivity(fresh({ warned12At: after(12) }), after(13))).toBe("none");
    expect(planInactivity(fresh({ warned14At: after(14) }), after(14, 3_600_000))).toBe("none");
    // 12-kun ogohlantirishi yuborilmagan bo'lsa ham 14-kun oxirgi ogohlantirish ketadi.
    expect(planInactivity(fresh(), after(14, 1))).toBe("finalWarn");
    // Ogohlantirishlar yuborilmagan bo'lsa ham 15-kun hisob nofaol bo'ladi.
    expect(planInactivity(fresh(), after(16))).toBe("deactivate");
  });

  it("admin bloklagan, demo va allaqachon nofaol hisoblarga tegilmaydi", () => {
    expect(planInactivity(fresh({ blocked: true }), after(30))).toBe("none");
    expect(planInactivity(fresh({ demo: true }), after(30))).toBe("none");
    expect(planInactivity(fresh({ inactive: true }), after(30))).toBe("none");
  });

  it("bazadagi so'rov chegaralari qoidaga mos keladi", () => {
    for (const hours of [0, 1, 287, 288, 289, 335, 336, 337, 359, 360, 361, 500]) {
      const now = after(0, hours * 3_600_000);
      const th = inactivityThresholds(now);
      const plan = planInactivity(fresh(), now);
      const last = start.getTime();
      const expected =
        last <= th.inactive.getTime() ? "deactivate" : last <= th.finalWarn.getTime() ? "finalWarn" : last <= th.warn.getTime() ? "warn" : "none";
      expect(plan, `${hours} soat`).toBe(expected);
    }
  });

  it("vaqtni sun'iy o'tkazish: 20 kun, kuniga ikki marta ishga tushirish", () => {
    let state = fresh();
    const events: string[] = [];
    for (let day = 0; day <= 20; day++) {
      for (const run of [0, 6 * 3_600_000]) {
        const now = after(day, run);
        const action = planInactivity(state, now);
        if (action === "warn") state = { ...state, warned12At: now };
        if (action === "finalWarn") state = { ...state, warned14At: now };
        if (action === "deactivate") state = { ...state, inactive: true };
        if (action !== "none") events.push(`${day}:${action}`);
      }
    }
    expect(events).toEqual(["12:warn", "14:finalWarn", "15:deactivate"]);
    expect(state.inactive).toBe(true);

    // Qayta faollashtirishdan keyin hisob yangidan boshlanadi.
    const reactivatedAt = after(21);
    state = { ...state, inactive: false, lastActiveAt: reactivatedAt, warned12At: null, warned14At: null };
    expect(planInactivity(state, after(21 + 11))).toBe("none");
    expect(planInactivity(state, after(21 + 12))).toBe("warn");
  });
});
