"use client";

import clsx from "clsx";
import { Camera, CheckCircle2, RefreshCw, X } from "lucide-react";
import { useRef, useState } from "react";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { PRODUCT_ANGLES, PRODUCT_IMAGES } from "@/lib/catalog";

/**
 * Mahsulot rasmlari — 4 tomondan: oldi, orqasi, yoni, yuqoridan.
 * Har bir katakka alohida rasm yuklanadi (Vercel Blob); saqlashda bo'sh kataklar tashlab yuboriladi.
 */
export function ImagesField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [slots, setSlots] = useState<(string | null)[]>(() => PRODUCT_ANGLES.map((_, i) => value[i] ?? null));
  const [target, setTarget] = useState(0);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const errors = t.errors as Record<string, string>;
  const filled = slots.filter(Boolean).length;

  function update(next: (string | null)[]) {
    setSlots(next);
    onChange(next.filter((s): s is string => Boolean(s)));
  }

  function pick(index: number) {
    setTarget(index);
    input.current?.click();
  }

  /** Bir nechta fayl tanlansa: tanlangan katakdan boshlab bo'sh kataklarga joylanadi. */
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const next = [...slots];
    const order = [target, ...PRODUCT_ANGLES.map((_, i) => i).filter((i) => i !== target && !next[i])];
    for (const [k, file] of Array.from(files).slice(0, order.length).entries()) {
      const index = order[k]!;
      setBusy(index);
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/v1/uploads", { method: "POST", body })
        .then((r) => r.json())
        .catch(() => null);
      if (res?.ok) {
        next[index] = res.data.url;
        update([...next]);
      } else {
        setError(errors[res?.fields?.file ?? res?.error ?? "SERVER_ERROR"] ?? errors.SERVER_ERROR!);
        break;
      }
    }
    setBusy(null);
    if (input.current) input.current.value = "";
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">{t.products.images}</h2>
          <p className="mt-1 text-[13px] text-muted">{t.products.imagesHint}</p>
        </div>
        <span
          className={clsx(
            "rounded-md px-2 py-0.5 text-[12px] font-semibold tabular-nums",
            filled === PRODUCT_IMAGES ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
          )}
        >
          {fmt(t.products.imagesCount, { n: filled })}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PRODUCT_ANGLES.map((angle, i) => {
          const src = slots[i];
          const label = t.products.angles[angle];
          return (
            <div key={angle} className="flex flex-col gap-1.5">
              <div className="relative aspect-square overflow-hidden rounded-lg border border-line bg-surface-2">
                {src ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={label} className="size-full object-cover" />
                    <div className="absolute top-1 right-1 flex gap-1">
                      <button type="button" onClick={() => pick(i)} aria-label={`${t.products.replaceImage}: ${label}`} title={t.products.replaceImage} className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white">
                        <RefreshCw size={13} aria-hidden />
                      </button>
                      <button type="button" onClick={() => update(slots.map((s, j) => (j === i ? null : s)))} aria-label={`${t.products.removeImage}: ${label}`} title={t.products.removeImage} className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white">
                        <X size={14} aria-hidden />
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => pick(i)}
                    className="flex size-full cursor-pointer flex-col items-center justify-center gap-1.5 border-2 border-dashed border-transparent text-[12px] text-muted hover:border-accent hover:text-accent disabled:cursor-wait"
                  >
                    {busy === i ? <span className="size-6 animate-spin rounded-full border-2 border-current border-r-transparent" /> : <Camera size={24} aria-hidden />}
                    {t.products.addImage}
                  </button>
                )}
                {busy === i && src && <span className="absolute inset-0 flex items-center justify-center bg-black/40"><span className="size-6 animate-spin rounded-full border-2 border-white border-r-transparent" /></span>}
              </div>
              <span className="flex items-center gap-1 text-[12px] font-medium">
                <span className="text-muted tabular-nums">{i + 1}.</span>
                {label}
                {src && <CheckCircle2 size={13} className="text-success" aria-hidden />}
              </span>
            </div>
          );
        })}
      </div>

      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => upload(e.target.files)} />
      {error && <p className="text-[13px] text-danger">{error}</p>}
      {!error && filled < PRODUCT_IMAGES && <p className="text-[13px] text-muted">{fmt(t.products.imagesMissing, { n: PRODUCT_IMAGES - filled })}</p>}
    </section>
  );
}
