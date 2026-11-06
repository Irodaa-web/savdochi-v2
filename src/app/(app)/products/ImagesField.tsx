"use client";

import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { useI18n } from "@/i18n/client";

const MAX = 6;

/** Mahsulot rasmlari: Vercel Blob'ga yuklanadi, manzillar formaga qaytadi. */
export function ImagesField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errors = t.errors as Record<string, string>;

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    const urls = [...value];
    for (const file of Array.from(files).slice(0, MAX - value.length)) {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/v1/uploads", { method: "POST", body }).then((r) => r.json()).catch(() => null);
      if (res?.ok) urls.push(res.data.url);
      else setError(errors[res?.fields?.file ?? res?.error ?? "SERVER_ERROR"] ?? errors.SERVER_ERROR!);
    }
    onChange(urls);
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
      <div>
        <h2 className="font-semibold">{t.products.images}</h2>
        <p className="mt-1 text-[13px] text-muted">{t.products.imagesHint}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {value.map((src, i) => (
          <div key={src} className="relative size-24 overflow-hidden rounded-lg border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="size-full object-cover" />
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={t.products.removeImage} className="absolute top-1 right-1 flex size-6 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white">
              <X size={14} aria-hidden />
            </button>
          </div>
        ))}
        {value.length < MAX && (
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-[12px] text-muted hover:border-accent hover:text-accent disabled:opacity-60">
            {busy ? <span className="size-5 animate-spin rounded-full border-2 border-current border-r-transparent" /> : <ImagePlus size={22} aria-hidden />}
            {t.products.addImage}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => upload(e.target.files)} />
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </section>
  );
}
