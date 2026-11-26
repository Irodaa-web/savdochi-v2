import { MessageSquareQuote } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import { fmt, formatDateTime } from "@/i18n/format";
import type { ReviewView } from "@/server/reviews";
import { ReplyForm } from "./ReviewForm";
import { Stars } from "./Stars";
import { Avatar } from "@/components/ui/Avatar";

/**
 * Kompaniya sahifasidagi sharhlar: o'rtacha baho, yulduzlar bo'yicha taqsimot va sharhlar ro'yxati.
 * Kompaniyaning o'zi ko'rsa — har sharhga javob yozishi mumkin.
 */
export function ReviewsSection({
  data,
  owner,
  locale,
  t,
}: {
  data: { rating: { average: number; count: number }; stars: number[]; items: ReviewView[] };
  owner: boolean;
  locale: string;
  t: Dictionary;
}) {
  const { rating, stars, items } = data;
  const max = Math.max(1, ...stars);
  return (
    <section id="reviews" className="flex scroll-mt-24 flex-col gap-3">
      <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
        <MessageSquareQuote size={18} className="text-accent" aria-hidden />
        {t.reviews.title}
      </h2>
      {rating.count === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-3 text-[13px] text-muted">{owner ? t.reviews.emptyOwner : t.reviews.empty}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Card className="flex flex-col gap-3 self-start">
            <div className="flex items-end gap-3">
              <span className="text-4xl leading-none font-bold tabular-nums">{rating.average.toFixed(1)}</span>
              <div className="flex flex-col gap-1 pb-0.5">
                <Stars value={rating.average} size={18} />
                <span className="text-[13px] text-muted">{fmt(t.reviews.count, { n: rating.count })}</span>
              </div>
            </div>
            <ul className="flex flex-col gap-1.5" aria-label={t.reviews.distribution}>
              {[5, 4, 3, 2, 1].map((s) => (
                <li key={s} className="grid grid-cols-[2.5rem_1fr_2rem] items-center gap-2 text-[12px]">
                  <span className="text-muted">{s} ★</span>
                  <span className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <span className="block h-full rounded-full bg-amber-400" style={{ width: `${(stars[s - 1]! / max) * 100}%` }} />
                  </span>
                  <span className="text-right tabular-nums text-muted">{stars[s - 1]}</span>
                </li>
              ))}
            </ul>
          </Card>
          <ul className="flex flex-col gap-3">
            {items.map((r) => (
              <li key={r.id}>
                <Card className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-semibold">
                      <Avatar name={r.buyerName} src={r.buyerLogo} size="sm" />
                      {r.buyerName}
                    </span>
                    <span className="text-[12px] text-muted">{formatDateTime(r.createdAt, locale, false)}</span>
                  </div>
                  <Stars value={r.rating} size={15} />
                  {r.text && <p className="text-[14px] whitespace-pre-line">{r.text}</p>}
                  {r.reply && (
                    <div className="rounded-xl border-l-2 border-accent bg-accent-soft/60 px-3 py-2 text-[13px]">
                      <span className="block text-[12px] font-semibold text-accent">{t.reviews.sellerReply}</span>
                      <p className="whitespace-pre-line">{r.reply}</p>
                    </div>
                  )}
                  {owner && <ReplyForm reviewId={r.id} initial={r.reply} />}
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
