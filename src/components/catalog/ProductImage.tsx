"use client";

import clsx from "clsx";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { isOptimizable, isWikimediaThumb, wikimediaLoader } from "@/lib/images";

const TONES: Record<string, string> = {
  food: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  drinks: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100",
  household: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  construction: "bg-stone-200 text-stone-900 dark:bg-stone-700/60 dark:text-stone-100",
  electronics: "bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100",
  other: "bg-surface-2 text-muted",
};

/** Mahsulot nomining bosh harflari: "Paxta yog‘i, 5 l" → "PY". */
export function initialsOf(name: string): string {
  const words = name.split(/[\s,]+/).filter((w) => /\p{L}/u.test(w));
  return words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
}

/** Katalog kartasi uchun standart o'lcham (ekran kengligiga nisbatan) — brauzer shunga mos nusxani oladi. */
export const CARD_SIZES = "(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

/**
 * Mahsulot rasmi. Yuklanayotganda porlaydi (skeleton), yuklangach silliq paydo bo'ladi.
 * Rasm yo'q yoki yuklanmasa — kategoriya rangi va bosh harflar ko'rinadi.
 * Kerakli kenglikdagi kichik nusxa olinadi (`sizes`): telefonda katalog bir necha baravar tez ochiladi.
 */
export function ProductImage({
  src,
  name,
  category = "other",
  alt = "",
  fit = "cover",
  sizes = CARD_SIZES,
  priority = false,
  className,
}: {
  src: string | null | undefined;
  name: string;
  category?: string;
  alt?: string;
  fit?: "cover" | "contain";
  /** Rasm sahifada qancha joy egallashi (CSS `sizes`). */
  sizes?: string;
  /** Birinchi ekrandagi asosiy rasm — kechiktirmasdan yuklanadi. */
  priority?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<"loading" | "loaded" | "error">(src ? "loading" : "error");

  useEffect(() => {
    setState(src ? "loading" : "error");
    const el = ref.current;
    // Rasm keshdan tez yuklansa onLoad ishlamay qolishi mumkin — shuni tekshiramiz.
    if (src && el?.complete) setState(el.naturalWidth > 0 ? "loaded" : "error");
  }, [src]);

  if (!src || state === "error") {
    return (
      <div
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={clsx("flex items-center justify-center font-bold tracking-tight", TONES[category] ?? TONES.other, className)}
      >
        <span className="text-[22px] opacity-80">{initialsOf(name)}</span>
      </div>
    );
  }

  const wikimedia = isWikimediaThumb(src);
  return (
    <div className={clsx("relative overflow-hidden", className)}>
      {state === "loading" && <div aria-hidden className="absolute inset-0 animate-pulse bg-surface-2 motion-reduce:animate-none" />}
      <Image
        ref={ref}
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        loader={wikimedia ? wikimediaLoader : undefined}
        unoptimized={!wikimedia && !isOptimizable(src)}
        onLoad={() => setState("loaded")}
        onError={() => setState("error")}
        className={clsx(
          "transition-opacity duration-300 motion-reduce:transition-none",
          fit === "contain" ? "object-contain" : "object-cover",
          state === "loaded" ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
