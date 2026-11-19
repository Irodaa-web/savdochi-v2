import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { PwaRegister } from "@/components/PwaRegister";
import { I18nProvider } from "@/i18n/client";
import { getDictionary, getLocale } from "@/i18n/server";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Savdochi", template: "%s · Savdochi" },
  description: "Kompaniya va do‘konlar uchun ulgurji savdo platformasi",
  applicationName: "Savdochi",
  icons: { apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f6fb" },
    { media: "(prefers-color-scheme: dark)", color: "#070d1a" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const saved = (await cookies()).get("theme")?.value;
  // Tanlov bo'lmasa — qurilmaning mavzusi (data-theme yo'q, CSS o'zi hal qiladi).
  const theme = saved === "dark" || saved === "light" ? saved : undefined;

  return (
    <html lang={locale} data-theme={theme} className={inter.variable} suppressHydrationWarning>
      <body className="min-h-dvh">
        <I18nProvider locale={locale} dictionary={getDictionary(locale)}>
          {children}
        </I18nProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
