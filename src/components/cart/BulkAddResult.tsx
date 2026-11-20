"use client";

import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { fmt, useI18n } from "@/i18n/client";

export type BulkResult = { added: { name: string; quantity: number }[]; skipped: { name: string; reason: "unavailable" | "outOfStock" }[] };

/** Savatga birdaniga qo'shish natijasi: nechta qo'shildi, qaysilari o'tkazib yuborildi. */
export function BulkAddResult({ result }: { result: BulkResult }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-2">
      {result.added.length > 0 && (
        <Alert tone="success">
          {fmt(t.restock.added, { n: result.added.length })}{" "}
          <Link href="/cart" className="font-semibold underline">
            {t.restock.openCart}
          </Link>
        </Alert>
      )}
      {result.skipped.length > 0 && (
        <Alert tone="info">
          {t.restock.skipped}: {result.skipped.map((s) => `${s.name} (${s.reason === "outOfStock" ? t.catalog.outOfStock : t.restock.unavailable})`).join(", ")}
        </Alert>
      )}
    </div>
  );
}
