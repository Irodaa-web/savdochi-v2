"use client";

import clsx from "clsx";
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { fmt, useI18n } from "@/i18n/client";
import { formatAmount } from "@/lib/catalog";
import { compactAmount, dayTicks, niceScale, peakIndex, toWeeks, type LabeledDay } from "@/lib/chart";

/** Bitta kun. `label` ("18-noy") va `full` ("Chorshanba, 18-noyabr") serverda tayyorlanadi. */
export type ChartDay = LabeledDay;

/** Ustunlar maydoni balandligi, px. X o'qi yorliqlari alohida qatorda — karta ichida aylantirish paydo bo'lmaydi. */
const PLOT_H = 184;
/** Maslahat oynasining taxminiy balandligi: maydondan pastga chiqib ketmasligi uchun. */
const TIP_H = 74;
/** Bir ustunga shundan kam joy qolsa (tor ekranda 90 kun), kunlar haftalarga jamlanadi. */
const MIN_SLOT_PX = 5;

/**
 * Savdo diagrammasi. Ustun ustiga olib borilsa, teginilsa yoki klaviatura bilan
 * (← → Home End) tanlansa — summa, sana va buyurtmalar soni chiqadi. Pastda jadval ko'rinishi bor.
 */
export function DailySalesChart({ days }: { days: ChartDay[] }) {
  const { t, locale } = useI18n();
  const d = t.dashboard;
  const titleId = useId();
  const [selected, setActive] = useState<number | null>(null);
  const [plotWidth, setPlotWidth] = useState<number | null>(null);
  /** Sensorli ekranda teginib tanlangan ustun boshqa joyga teginguncha ko'rinib turadi. */
  const pinned = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = plotRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => setPlotWidth(entries[0]!.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (selected === null || !pinned.current) return;
    const outside = (e: globalThis.PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      pinned.current = false;
      setActive(null);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [selected]);

  if (days.length === 0) return null;

  const weekly = plotWidth !== null && days.length > 31 && plotWidth / days.length < MIN_SLOT_PX;
  const series = weekly ? toWeeks(days) : days;
  const n = series.length;
  const active = selected !== null && selected < n ? selected : null;

  const values = series.map((x) => x.value);
  const { top, ticks } = niceScale(Math.max(0, ...values));
  const units = { thousand: d.chartThousand, million: d.chartMillion, billion: d.chartBillion };
  const tickLabels = ticks.map((v) => compactAmount(v, locale, units, top, 2));
  const gutter = `calc(${Math.max(...tickLabels.map((s) => s.length))}ch + 12px)`;
  const total = days.reduce((s, x) => s + x.value, 0);
  const totalOrders = days.reduce((s, x) => s + x.orders, 0);
  const peak = peakIndex(values);
  const sum = (v: number) => `${formatAmount(v)} ${t.common.sum}`;
  const ordersText = (k: number) => fmt(d.chartOrders, { n: k });
  const describe = (i: number) => `${series[i]!.full}: ${sum(series[i]!.value)}, ${ordersText(series[i]!.orders)}`;
  const pct = (v: number) => (v / top) * 100;
  const center = (i: number) => ((i + 0.5) / n) * 100;
  /** Ko'p ustunli davrda chetdagi yorliq kartadan chiqmasligi uchun chetga tekislanadi. */
  const anchor = (i: number): CSSProperties =>
    n > 10 && i === 0 ? { left: 0 } : n > 10 && i === n - 1 ? { right: 0 } : { left: `${center(i)}%`, transform: "translateX(-50%)" };

  const indexAt = (clientX: number) => {
    const r = plotRef.current!.getBoundingClientRect();
    return Math.min(n - 1, Math.max(0, Math.floor(((clientX - r.left) / r.width) * n)));
  };
  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    if (e.type === "pointerdown" && e.pointerType !== "mouse") pinned.current = true;
    setActive(indexAt(e.clientX));
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") return setActive(null);
    const cur = active ?? n - 1;
    const moves: Record<string, number> = { ArrowLeft: cur - 1, ArrowDown: cur - 1, ArrowRight: cur + 1, ArrowUp: cur + 1, PageDown: cur - 7, PageUp: cur + 7, Home: 0, End: n - 1 };
    const next = moves[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setActive(Math.min(n - 1, Math.max(0, next)));
  };

  const a = active === null ? null : series[active]!;
  let tip: CSSProperties = {};
  if (active !== null && a) {
    // Maslahat ustun uchi balandligida turadi, lekin maydondan chiqmaydi.
    const barTop = PLOT_H * (1 - pct(a.value) / 100);
    const tipTop = Math.min(Math.max(barTop - TIP_H / 2, 0), PLOT_H - TIP_H);
    // Ustun chap yarmida bo'lsa — maslahat o'ngida, aks holda chapida: ustunni hech qachon yopmaydi.
    tip = center(active) < 55 ? { top: tipTop, left: `calc(${center(active)}% + 18px)` } : { top: tipTop, right: `calc(${100 - center(active)}% + 18px)` };
  }

  return (
    <div ref={rootRef} className="@container">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 id={titleId} className="text-[15px] font-semibold">
          {weekly ? d.weekly : d.daily}
        </h3>
        <p className="text-[13px] text-muted">{fmt(d.chartAvg, { sum: sum(total / days.length) })}</p>
      </div>

      <div className="mt-7 flex">
        {/* Y o'qi: toza qiymatlar, bitta uslubda (0 / 0,5 mln / 1 mln). */}
        <div aria-hidden className="relative shrink-0 text-[11px] text-muted tabular-nums" style={{ width: gutter, height: PLOT_H }}>
          {ticks.map((v, i) => (
            <span key={v} className="absolute right-3 translate-y-1/2 leading-none whitespace-nowrap" style={{ bottom: `${pct(v)}%` }}>
              {tickLabels[i]}
            </span>
          ))}
        </div>

        <div
          ref={plotRef}
          role="slider"
          tabIndex={0}
          aria-labelledby={titleId}
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={n - 1}
          aria-valuenow={active ?? n - 1}
          aria-valuetext={describe(active ?? n - 1)}
          className="relative min-w-0 flex-1 touch-pan-y rounded-sm select-none"
          style={{ height: PLOT_H }}
          onPointerDown={onPointer}
          onPointerMove={onPointer}
          onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
          onKeyDown={onKey}
          onFocus={() => setActive((cur) => cur ?? n - 1)}
          onBlur={() => {
            pinned.current = false;
            setActive(null);
          }}
        >
          {/* Tanlangan ustun — butun balandlik bo'yicha yengil fon (bosiladigan maydon ustundan katta). */}
          {active !== null && (
            <div
              aria-hidden
              className="absolute inset-y-0 rounded-md bg-surface-2"
              style={{ left: `calc(${center(active)}% - min(${50 / n}%, 24px))`, width: `min(${100 / n}%, 48px)` }}
            />
          )}

          {ticks.map((v) => (
            <div key={v} aria-hidden className={clsx("absolute inset-x-0 h-px", v === 0 ? "bg-chart-axis" : "bg-line")} style={{ bottom: `${pct(v)}%` }} />
          ))}

          <div aria-hidden className="absolute inset-0 flex items-end overflow-hidden">
            {series.map((x, i) => (
              <div key={`${weekly ? "w" : "d"}${x.day}`} className="flex h-full min-w-0 flex-1 items-end justify-center">
                {x.value > 0 && (
                  <div
                    className={clsx(
                      "w-[min(24px,calc(100%_-_2px))] origin-bottom rounded-t-[4px] bg-chart transition-opacity duration-150 motion-safe:animate-[bar-rise_0.6s_cubic-bezier(0.2,0.8,0.2,1)_backwards]",
                      active !== null && active !== i && "opacity-35",
                    )}
                    style={{ height: `max(3px, ${pct(x.value)}%)`, animationDelay: `${Math.round((i / n) * 320)}ms` }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Eng yaxshi kun — yagona doimiy yorliq; qolgan qiymatlar maslahat va jadvalda. Tanlanganda maslahat ko'rsatadi. */}
          {peak >= 0 && active !== peak && (
            <span aria-hidden className="pointer-events-none absolute text-[11px] leading-none font-semibold whitespace-nowrap text-muted tabular-nums" style={{ ...anchor(peak), bottom: `calc(${pct(values[peak]!)}% + 6px)` }}>
              {compactAmount(values[peak]!, locale, units)}
            </span>
          )}

          {a && (
            <div aria-hidden className="pointer-events-none absolute z-10 w-max max-w-[220px] rounded-xl border border-line bg-surface px-3 py-2 shadow-[var(--c-shadow-tip)]" style={tip}>
              <div className="text-[15px] leading-tight font-bold tabular-nums">
                {formatAmount(a.value)} <span className="text-[12px] font-semibold text-muted">{t.common.sum}</span>
              </div>
              <div className="mt-1 text-[12px] leading-snug text-muted">{a.full}</div>
              <div className="text-[12px] leading-snug text-muted">{ordersText(a.orders)}</div>
            </div>
          )}
        </div>
      </div>

      {/* X o'qi: sanalar. Tor kartada yorliqlar siyraklashadi, bir-biriga tegmaydi. */}
      <div aria-hidden className="relative mt-2 h-4 text-[11px] leading-4 text-muted tabular-nums" style={{ marginLeft: gutter }}>
        {dayTicks(n).map(({ index, narrow }) => (
          <span key={series[index]!.day} className={clsx("absolute top-0 whitespace-nowrap", !narrow && !weekly && "@max-lg:hidden", active === index && "font-semibold text-text")} style={anchor(index)}>
            {series[index]!.label}
          </span>
        ))}
      </div>

      <details className="mt-4 border-t border-line pt-3">
        <summary className="w-fit cursor-pointer text-[13px] font-semibold text-accent select-none hover:underline">{d.chartTable}</summary>
        <div className="mt-3 max-h-80 overflow-auto rounded-xl border border-line">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">{d.chartDate}</th>
                <th className="px-3 py-2 text-right">{d.orders}</th>
                <th className="px-3 py-2 text-right">
                  {d.value}, {t.common.sum}
                </th>
              </tr>
            </thead>
            <tbody>
              {days
                .filter((x) => x.orders > 0)
                .reverse()
                .map((x) => (
                  <tr key={x.day} className="border-t border-line">
                    <td className="px-3 py-2">{x.full}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{x.orders}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatAmount(x.value)}</td>
                  </tr>
                ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line font-semibold">
                <td className="px-3 py-2">{d.chartTotal}</td>
                <td className="px-3 py-2 text-right tabular-nums">{totalOrders}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatAmount(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </details>
    </div>
  );
}
