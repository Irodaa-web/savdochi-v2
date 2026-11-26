import Image from "next/image";

/** Platformaning o'z rasm omboridagi rasm (Vercel Blob) optimallashtiriladi; boshqasi — o'zgarishsiz. */
const isBlob = (src: string) => /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(src);

/** Kompaniya logotipi yoki banneri — ota element o'lchamini to'liq egallaydi (fill). */
export function BrandImage({ src, alt = "", sizes, priority = false, className }: { src: string; alt?: string; sizes: string; priority?: boolean; className?: string }) {
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized={!isBlob(src)} className={className ?? "object-cover"} />;
}

/** Banner bo'lmasa — nomdan kelib chiqadigan barqaror rang (har kompaniya o'z rangida, hammasi ko'k gammada). */
const COVERS = [
  "from-blue-600 via-indigo-500 to-sky-400",
  "from-sky-600 via-blue-500 to-cyan-400",
  "from-indigo-600 via-blue-600 to-violet-400",
  "from-cyan-600 via-sky-500 to-blue-400",
  "from-blue-700 via-sky-600 to-teal-400",
];
export function coverFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COVERS[h % COVERS.length]!;
}

/** Nomidan bosh harflar: "Demo Oziq-ovqat MChJ" → "DO". */
export function initials(name: string): string {
  const words = name.split(/[\s,]+/).filter((w) => /\p{L}/u.test(w));
  return words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
}
