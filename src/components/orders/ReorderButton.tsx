"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { refreshBadges } from "@/components/shell/useBadges";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { fmt, useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";

/** Eski buyurtmadagi mahsulotlarni savatga qayta qo'shadi. Qoldig'i yetmagan yoki arxivlanganlari o'tkaziladi. */
export function ReorderButton({ items }: { items: { productId: string; quantity: number }[] }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ added: number; total: number } | null>(null);

  async function reorder() {
    setBusy(true);
    setResult(null);
    let added = 0;
    for (const item of items) {
      const res = await api("/api/v1/cart", { method: "PUT", body: { productId: item.productId, quantity: item.quantity, add: true } });
      if (res.ok) added += 1;
    }
    setBusy(false);
    refreshBadges();
    setResult({ added, total: items.length });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="secondary" onClick={reorder} loading={busy} disabled={!items.length}>
        <RotateCcw size={16} aria-hidden />
        {t.orders.reorder}
      </Button>
      {result && (
        <Alert tone={result.added ? "success" : "danger"}>
          {fmt(t.orders.reorderPartial, result)}{" "}
          {result.added > 0 && (
            <Link href="/cart" className="font-semibold underline">
              {t.orders.toCart}
            </Link>
          )}
        </Alert>
      )}
    </div>
  );
}
