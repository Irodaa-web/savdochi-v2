import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["mongoose"],
  // Asosiy xavfsizlik sarlavhalari: boshqa saytda ramka ichida ochilmaydi (clickjacking),
  // brauzer fayl turini taxmin qilmaydi, havola manbasi tashqariga to'liq yuborilmaydi.
  // Geolokatsiya faqat o'z sahifalarimizda (buyurtmada xaritadagi nuqta uchun).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
      // Xizmat ishchisi har safar yangidan tekshirilsin — yangilanishlar telefonlarga tez yetib borsin.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
    ];
  },
  images: {
    // Faqat o'zimizning Vercel Blob rasmlari optimizatsiya qilinadi (kichik WebP nusxalar).
    // Boshqa manzillar ProductImage'da optimizatsiyasiz ko'rsatiladi — ochiq proksi bo'lmaydi.
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
    // Blob manzillari o'zgarmaydi (har rasm — yangi nom): tayyor nusxalar uzoq saqlanadi.
    minimumCacheTTL: 2_678_400,
  },
};

export default nextConfig;
