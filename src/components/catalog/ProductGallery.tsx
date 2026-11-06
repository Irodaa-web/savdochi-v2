"use client";

import clsx from "clsx";
import { Package } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { PRODUCT_ANGLES } from "@/lib/catalog";

/** Mahsulot rasmlari: katta rasm va 4 tomondan kichik rasmlar (bosilganda almashadi). */
export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const { t } = useI18n();
  const [active, setActive] = useState(0);
  const angleLabel = (i: number) => {
    const angle = PRODUCT_ANGLES[i];
    return angle ? t.products.angles[angle] : `${i + 1}`;
  };

  if (!images.length) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center rounded-xl border border-line bg-surface-2 text-muted/50">
        <Package size={56} strokeWidth={1.2} aria-hidden />
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)]!;
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current} alt={`${name} — ${angleLabel(active)}`} className="aspect-[4/3] w-full rounded-xl border border-line bg-surface-2 object-contain sm:aspect-[16/10]" />
        <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[12px] font-medium text-white">{angleLabel(active)}</span>
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={i === active}
              aria-label={angleLabel(i)}
              className={clsx(
                "flex cursor-pointer flex-col gap-1 rounded-lg border-2 p-0.5 text-left transition-colors",
                i === active ? "border-accent" : "border-transparent hover:border-line",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" className="aspect-square w-full rounded-md object-cover" />
              <span className="truncate px-0.5 text-[11px] text-muted">{angleLabel(i)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
