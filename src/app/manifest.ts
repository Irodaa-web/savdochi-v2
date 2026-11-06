import type { MetadataRoute } from "next";

/** Telefonga "ilova" sifatida o'rnatish uchun (PWA). Keyinchalik mobil ilova ham shu API'dan foydalanadi. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Savdochi — ulgurji savdo",
    short_name: "Savdochi",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f4ef",
    theme_color: "#22201c",
    lang: "uz",
  };
}
