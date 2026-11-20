"use client";

import clsx from "clsx";
import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";

/**
 * Do'kon: yetkazilgan buyurtma bo'yicha kompaniyaga baho (1–5 yulduz) va izoh.
 * Avval qo'yilgan bo'lsa — o'zgartirish mumkin.
 */
export function ReviewForm({ orderId, initial }: { orderId: string; initial: { rating: number; text: string } | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState(initial?.text ?? "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shown = hover || rating;

  async function save() {
    setBusy(true);
    setError(null);
    const res = await api(`/api/v1/orders/${orderId}/review`, { body: { rating, text } });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      router.refresh();
    } else {
      const errors = t.errors as Record<string, string>;
      setError(errors[res.fields?.rating ?? res.error] ?? errors.SERVER_ERROR!);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="font-semibold">{initial ? t.reviews.yourReview : t.reviews.rateTitle}</h2>
        <p className="mt-0.5 text-[13px] text-muted">{t.reviews.rateHint}</p>
      </div>
      {error && <Alert>{error}</Alert>}
      {done && <Alert tone="success">{t.reviews.thanks}</Alert>}
      <div role="radiogroup" aria-label={t.reviews.rateTitle} className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={t.reviews.starLabels[n - 1]}
            title={t.reviews.starLabels[n - 1]}
            onClick={() => {
              setRating(n);
              setDone(false);
            }}
            onMouseEnter={() => setHover(n)}
            className="cursor-pointer rounded-lg p-1 transition-transform hover:scale-110 active:scale-95"
          >
            <Star size={28} strokeWidth={1.5} aria-hidden className={clsx("transition-colors", n <= shown ? "fill-amber-400 text-amber-400" : "fill-transparent text-line")} />
          </button>
        ))}
        {shown > 0 && <span className="ml-2 text-[13px] font-medium text-muted">{t.reviews.starLabels[shown - 1]}</span>}
      </div>
      <textarea
        rows={3}
        maxLength={1000}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setDone(false);
        }}
        placeholder={t.reviews.textPlaceholder}
        aria-label={t.reviews.textPlaceholder}
        className="rounded-lg border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-accent"
      />
      <Button type="button" onClick={save} loading={busy} disabled={!rating} className="self-start">
        {initial ? t.reviews.update : t.reviews.submit}
      </Button>
    </div>
  );
}

/** Kompaniya: sharhga javob yozish / o'zgartirish. */
export function ReplyForm({ reviewId, initial }: { reviewId: string; initial: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const res = await api(`/api/v1/reviews/${reviewId}`, { body: { text } });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="w-fit cursor-pointer text-[13px] font-semibold text-accent hover:underline">
        {initial ? t.reviews.editReply : t.reviews.reply}
      </button>
    );
  return (
    <div className="flex flex-col gap-2">
      <textarea
        rows={2}
        maxLength={1000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t.reviews.replyPlaceholder}
        aria-label={t.reviews.reply}
        autoFocus
        className="rounded-lg border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-accent"
      />
      <div className="flex gap-2">
        <Button type="button" onClick={save} loading={busy}>
          {t.reviews.sendReply}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          {t.common.cancel}
        </Button>
      </div>
    </div>
  );
}
