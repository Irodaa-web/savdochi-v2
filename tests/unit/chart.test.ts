import { describe, expect, it } from "vitest";
import { formatDay } from "@/i18n/format";
import { compactAmount, dayTicks, fillDays, niceScale, peakIndex, periodStart, toWeeks } from "@/lib/chart";

const uz = { thousand: "{n} ming", million: "{n} mln", billion: "{n} mlrd" };
const en = { thousand: "{n}K", million: "{n}M", billion: "{n}B" };

describe("diagramma shkalasi", () => {
  it("toza qadamlar va eng katta qiymatni qamrab oladi", () => {
    expect(niceScale(4_350_000)).toEqual({ top: 5_000_000, step: 1_000_000, ticks: [0, 1e6, 2e6, 3e6, 4e6, 5e6] });
    expect(niceScale(2_000_000).top).toBe(2_000_000);
    expect(niceScale(930_000).ticks).toEqual([0, 200_000, 400_000, 600_000, 800_000, 1_000_000]);
    expect(niceScale(1_100_000).step).toBe(250_000);
    expect(niceScale(3)).toEqual({ top: 3, step: 1, ticks: [0, 1, 2, 3] });
    expect(niceScale(7).ticks).toEqual([0, 2, 4, 6, 8]);
    for (const max of [1, 3, 99, 12_345, 987_654, 31_000_000, 4_200_000_000]) {
      const s = niceScale(max);
      expect(s.top).toBeGreaterThanOrEqual(max);
      expect(s.ticks.length).toBeGreaterThanOrEqual(2);
      expect(s.ticks.length).toBeLessThanOrEqual(6);
      expect(s.ticks[0]).toBe(0);
    }
  });

  it("savdo bo'lmasa ham ishlaydi", () => {
    expect(niceScale(0)).toEqual({ top: 1, step: 1, ticks: [0, 1] });
  });
});

describe("ixcham summa", () => {
  it("bitta o'qda bitta uslub: birlik eng katta belgi bo'yicha", () => {
    expect([0, 250_000, 500_000, 1_000_000].map((v) => compactAmount(v, "uz", uz, 1_000_000, 2))).toEqual(["0", "0,25 mln", "0,5 mln", "1 mln"]);
    expect([0, 250_000, 750_000].map((v) => compactAmount(v, "uz", uz, 750_000, 2))).toEqual(["0", "250 ming", "750 ming"]);
  });

  it("10 000 dan kichik — to'liq; en — nuqta bilan", () => {
    expect(compactAmount(2_500, "uz", uz)).toBe("2 500");
    expect(compactAmount(4_349_000, "uz", uz)).toBe("4,3 mln");
    expect(compactAmount(4_349_000, "en", en)).toBe("4.3M");
    expect(compactAmount(2_500_000_000, "ru", { thousand: "{n} тыс.", million: "{n} млн", billion: "{n} млрд" })).toBe("2,5 млрд");
  });
});

describe("sana yorliqlari", () => {
  it("bugundan orqaga teng qadam; tor ekranda ikki baravar siyrak", () => {
    const wide = (n: number) => dayTicks(n).map((x) => x.index);
    const narrow = (n: number) => dayTicks(n).filter((x) => x.narrow).map((x) => x.index);
    expect(wide(7)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(narrow(7)).toEqual([0, 2, 4, 6]);
    expect(wide(30)).toEqual([4, 9, 14, 19, 24, 29]);
    expect(narrow(30)).toEqual([9, 19, 29]);
    expect(wide(90)).toEqual([14, 29, 44, 59, 74, 89]);
    expect(narrow(90)).toEqual([29, 59, 89]);
    expect(dayTicks(0)).toEqual([]);
  });

  it("serverda tayyorlanadigan sana matni Toshkent kuni bo'yicha", () => {
    expect(formatDay("2026-11-18", "uz", "short")).toContain("18");
    expect(formatDay("2026-11-18", "uz", "long")).toMatch(/^Chorshanba, 18/);
    expect(formatDay("2026-01-01", "en", "long")).toContain("1 January");
  });
});

describe("hisobot davri — to'liq kalendar kunlar (Toshkent)", () => {
  it("davr Toshkent yarim tunidan boshlanadi, oxirgi kun — bugun", () => {
    const at = (iso: string) => periodStart(Date.parse(iso), 7).toISOString();
    expect(at("2026-11-18T03:00:00Z")).toBe("2026-11-11T19:00:00.000Z"); // Toshkentda 18-noyabr, 08:00
    expect(at("2026-11-17T19:30:00Z")).toBe("2026-11-11T19:00:00.000Z"); // Toshkentda 18-noyabr, 00:30
    expect(at("2026-11-17T18:59:00Z")).toBe("2026-11-10T19:00:00.000Z"); // Toshkentda hali 17-noyabr
  });

  it("har bir kun bitta ustun: 7 kun — 7 ta, savdosiz kun — 0", () => {
    const since = periodStart(Date.parse("2026-11-18T03:00:00Z"), 7);
    const filled = fillDays(since, 7, [
      { _id: "2026-11-18", value: 500, orders: 2 },
      { _id: "2026-11-12", value: 100, orders: 1 },
    ]);
    expect(filled.map((x) => x.day)).toEqual(["2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18"]);
    expect(filled[0]).toEqual({ day: "2026-11-12", value: 100, orders: 1 });
    expect(filled[6]).toEqual({ day: "2026-11-18", value: 500, orders: 2 });
    expect(filled[3]).toEqual({ day: "2026-11-15", value: 0, orders: 0 });
    expect(fillDays(periodStart(Date.now(), 90), 90, [])).toHaveLength(90);
  });
});

describe("tor ekranda haftalarga jamlash", () => {
  it("bugundan orqaga 7 kunlik bo'laklar; yig'indilar saqlanadi", () => {
    const days = Array.from({ length: 90 }, (_, i) => ({ day: `d${i}`, value: i + 1, orders: 1, label: `L${i}`, full: `F${i}` }));
    const weeks = toWeeks(days);
    expect(weeks).toHaveLength(13);
    expect(weeks.at(-1)).toMatchObject({ day: "d83", label: "L89", full: "L83 – L89", orders: 7 });
    expect(weeks[0]).toMatchObject({ day: "d0", label: "L5", full: "L0 – L5", orders: 6 });
    expect(weeks.reduce((s, w) => s + w.value, 0)).toBe(days.reduce((s, x) => s + x.value, 0));
    expect(toWeeks(days.slice(0, 1))).toEqual([{ day: "d0", value: 1, orders: 1, label: "L0", full: "L0" }]);
  });
});

describe("eng yaxshi kun", () => {
  it("eng katta qiymat, teng bo'lsa eng so'nggisi; savdo bo'lmasa -1", () => {
    expect(peakIndex([0, 5, 2, 5, 1])).toBe(3);
    expect(peakIndex([0, 0, 0])).toBe(-1);
  });
});
