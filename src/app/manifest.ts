import type { MetadataRoute } from "next";

/** Telefonga "ilova" sifatida o'rnatish uchun (PWA). Keyinchalik mobil ilova ham shu API'dan foydalanadi. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Savdochi — ulgurji savdo",
    short_name: "Savdochi",
    description: "Kompaniya va do‘konlar uchun ulgurji savdo platformasi",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f3f6fb",
    theme_color: "#f3f6fb",
    lang: "uz",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
