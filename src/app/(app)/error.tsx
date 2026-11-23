"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";

/**
 * Ilova ichidagi kutilmagan xato: sidebar va menyu joyida qoladi, faqat shu sahifa o'rniga
 * tushunarli xabar va "Qayta urinish" chiqadi (oq ekran yoki inglizcha texnik xabar emas).
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-danger-soft text-danger">
        <TriangleAlert size={26} aria-hidden />
      </span>
      <h1 className="text-[22px] font-bold tracking-tight">{t.systemPages.errorTitle}</h1>
      <p className="text-muted">{t.systemPages.errorText}</p>
      {error.digest && <p className="text-[12px] text-muted tabular-nums">{error.digest}</p>}
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={reset}>
          <RotateCcw size={16} aria-hidden />
          {t.systemPages.retry}
        </Button>
        <Link href="/" className="inline-flex h-10 items-center rounded-xl px-4 font-semibold hover:bg-surface-2">
          {t.systemPages.home}
        </Link>
      </div>
    </section>
  );
}
