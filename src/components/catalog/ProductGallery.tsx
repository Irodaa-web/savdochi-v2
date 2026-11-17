"use client";

import clsx from "clsx";
import { useState } from "react";
import { ProductImage } from "@/components/catalog/ProductImage";
import { useI18n } from "@/i18n/client";
import { PRODUCT_ANGLES } from "@/lib/catalog";

/** Mahsulot rasmlari: katta rasm va 4 tomondan kichik rasmlar (bosilganda almashadi). */
export function ProductGallery({ images, name, category = "other" }: { images: string[]; name: string; category?: string }) {
  const { t } = useI18n();
  const [active, setActive] = useState(0);
  const angleLabel = (i: number) => {
    const angle = PRODUCT_ANGLES[i];
    return angle ? t.products.angles[angle] : `${i + 1}`;
  };

  if (!images.length) {
    return <ProductImage src={null} name={name} category={category} className="aspect-[16/9] w-full rounded-xl border border-line" />;
  }

  const current = images[Math.min(active, images.length - 1)]!;
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <ProductImage
          key={current}
          src={current}
          name={name}
          category={category}
          alt={`${name} — ${angleLabel(active)}`}
          fit="contain"
          className="aspect-[4/3] w-full rounded-xl border border-line bg-surface-2 sm:aspect-[16/10]"
        />
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
              <ProductImage src={src} name={name} category={category} className="aspect-square w-full rounded-md" />
              <span className="truncate px-0.5 text-[11px] text-muted">{angleLabel(i)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
