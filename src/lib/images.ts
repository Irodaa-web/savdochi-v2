/**
 * Rasm manzillari: o'lchamiga mos nusxani tanlash.
 *
 * - Vercel Blob (kompaniyalar yuklagan rasmlar) — Next.js rasm optimizatsiyasi orqali
 *   kerakli kenglikda WebP qilib beriladi (next.config: images.remotePatterns).
 * - Wikimedia Commons — o'zining tayyor eskizlari (standart kengliklar), optimizatsiyasiz.
 * - Boshqa manzillar (Excel importdagi havolalar) — o'zgarishsiz (ochiq proksi bo'lmasligi uchun).
 */

/** Wikimedia CDN'da tayyor turadigan eskiz kengliklari. */
export const WIKIMEDIA_STEPS = [120, 250, 330, 500, 960, 1280, 1920] as const;

const WIKIMEDIA_THUMB = /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\/.+\/\d+px-[^/]+$/;
const BLOB_HOST = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//;

export function isWikimediaThumb(src: string): boolean {
  return WIKIMEDIA_THUMB.test(src);
}

export function isOptimizable(src: string): boolean {
  return BLOB_HOST.test(src);
}

/**
 * next/image yuklagichi (Wikimedia uchun): so'ralgan kenglikning kamida 75% iga teng eng kichik tayyor eskiz.
 * Masalan, 640 px so'ralsa — 500 px (ko'zga farqi sezilmaydi, hajmi ~3 baravar kichik).
 */
export function wikimediaLoader({ src, width }: { src: string; width: number }): string {
  const step = WIKIMEDIA_STEPS.find((s) => s >= width * 0.75) ?? WIKIMEDIA_STEPS[WIKIMEDIA_STEPS.length - 1];
  return src.replace(/\/\d+px-([^/]+)$/, `/${step}px-$1`);
}
