"use client";

import clsx from "clsx";
import { Apple, BrickWall, Cpu, CupSoda, type LucideIcon, Shapes, SprayCan } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { isOptimizable, isWikimediaThumb, wikimediaLoader } from "@/lib/images";

// Rasm yo'q mahsulot: kategoriya rangidagi yumshoq gradient va kategoriya belgisi (oddiy harflar o'rniga).
const TONES: Record<string, string> = {
  food: "bg-gradient-to-br from-amber-50 via-amber-100 to-orange-200 text-amber-700 dark:from-amber-950/60 dark:via-amber-900/40 dark:to-orange-900/50 dark:text-amber-200",
  drinks: "bg-gradient-to-br from-sky-50 via-sky-100 to-blue-200 text-sky-700 dark:from-sky-950/60 dark:via-sky-900/40 dark:to-blue-900/50 dark:text-sky-200",
  household: "bg-gradient-to-br from-emerald-50 via-emerald-100 to-teal-200 text-emerald-700 dark:from-emerald-950/60 dark:via-emerald-900/40 dark:to-teal-900/50 dark:text-emerald-200",
  construction: "bg-gradient-to-br from-stone-100 via-stone-200 to-orange-100 text-stone-700 dark:from-stone-900/70 dark:via-stone-800/60 dark:to-stone-700/50 dark:text-stone-200",
  electronics: "bg-gradient-to-br from-violet-50 via-violet-100 to-indigo-200 text-violet-700 dark:from-violet-950/60 dark:via-violet-900/40 dark:to-indigo-900/50 dark:text-violet-200",
  other: "bg-gradient-to-br from-slate-50 via-slate-100 to-blue-100 text-slate-600 dark:from-slate-900/70 dark:via-slate-800/60 dark:to-blue-950/50 dark:text-slate-300",
};
const ICONS: Record<string, LucideIcon> = { food: Apple, drinks: CupSoda, household: SprayCan, construction: BrickWall, electronics: Cpu, other: Shapes };

/** Mahsulot nomining bosh harflari: "Paxta yog‘i, 5 l" → "PY". */
export function initialsOf(name: string): string {
  const words = name.split(/[\s,]+/).filter((w) => /\p{L}/u.test(w));
  return words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
}

/** Katalog kartasi uchun standart o'lcham (ekran kengligiga nisbatan) — brauzer shunga mos nusxani oladi. */
export const CARD_SIZES = "(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

/**
 * Mahsulot rasmi. Yuklanayotganda porlaydi (skeleton), yuklangach silliq paydo bo'ladi.
 * Rasm yo'q yoki yuklanmasa — kategoriya rangidagi fon, kategoriya belgisi va bosh harflar ko'rinadi.
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
    const Icon = ICONS[category] ?? Shapes;
    return (
      <div
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={clsx("relative flex items-center justify-center overflow-hidden", TONES[category] ?? TONES.other, className)}
      >
        <span aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.7),transparent_40%)] dark:opacity-20" />
        <span aria-hidden className="absolute -right-6 -bottom-6 size-24 rounded-full bg-white/30 dark:bg-white/5" />
        <span className="relative flex flex-col items-center gap-1.5">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-white/70 shadow-sm ring-1 ring-black/5 backdrop-blur-sm dark:bg-white/10 dark:ring-white/10">
            <Icon size={24} strokeWidth={1.75} aria-hidden />
          </span>
          <span className="text-[12px] font-semibold tracking-wide opacity-70">{initialsOf(name)}</span>
        </span>
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
