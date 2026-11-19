"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";

/** Havola + "Nusxa olish" tugmasi. To'liq manzil brauzerda (joriy domen bilan) tuziladi. */
export function CopyLink({ path }: { path: string }) {
  const { t } = useI18n();
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  const url = origin + path;
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Brauzer ruxsat bermasa — foydalanuvchi matnni qo'lda belgilab olishi mumkin.
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-[var(--c-glass-strong)] p-1 pl-3">
      <span className="min-w-0 flex-1 truncate text-[13px] text-muted select-all" title={url}>
        {url}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-live="polite"
        className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-accent-soft px-3 text-[13px] font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-fg"
      >
        {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
        {copied ? t.common.copied : t.common.copy}
      </button>
    </div>
  );
}
