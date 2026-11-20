import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["mongoose"],
  images: {
    // Faqat o'zimizning Vercel Blob rasmlari optimizatsiya qilinadi (kichik WebP nusxalar).
    // Boshqa manzillar ProductImage'da optimizatsiyasiz ko'rsatiladi — ochiq proksi bo'lmaydi.
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
    // Blob manzillari o'zgarmaydi (har rasm — yangi nom): tayyor nusxalar uzoq saqlanadi.
    minimumCacheTTL: 2_678_400,
  },
};

export default nextConfig;
