import { SearchX } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { getDictionary, getLocale } from "@/i18n/server";

/** 404: sahifa yoki yozuv (buyurtma, mahsulot, kompaniya) topilmadi. */
export default async function NotFound() {
  const t = getDictionary(await getLocale());
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-bg px-6 text-center">
      <Logo />
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <SearchX size={26} aria-hidden />
      </span>
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="text-[24px] font-bold tracking-tight">{t.systemPages.notFoundTitle}</h1>
        <p className="text-muted">{t.systemPages.notFoundText}</p>
      </div>
      <Link href="/" className="btn-primary inline-flex h-11 items-center rounded-xl px-5 font-semibold">
        {t.systemPages.home}
      </Link>
    </main>
  );
}
