"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";

/** Hujjat ustidagi panel (chop etilmaydi): orqaga, chop etish va qo'shimcha boshqaruv. */
export function PrintBar({ back, children }: { back: string; children?: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-wrap items-end justify-between gap-3 px-4">
      <Link href={back} className="inline-flex items-center gap-1.5 text-muted hover:text-text">
        <ArrowLeft size={16} aria-hidden />
        {t.docs.back}
      </Link>
      <div className="flex flex-wrap items-end gap-2">
        {children}
        <Button type="button" onClick={() => window.print()}>
          <Printer size={16} aria-hidden />
          {t.docs.print}
        </Button>
      </div>
    </div>
  );
}
