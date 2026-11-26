import { CheckCircle2, ChevronRight, Circle, Clock, Rocket } from "lucide-react";
import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import { fmt } from "@/i18n/format";
import type { SessionUser } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { Product } from "@/models/Product";
import { User } from "@/models/User";

type Step = { key: string; title: string; hint: string; href: string | null; done: boolean; waiting?: boolean };

/**
 * Yangi kompaniya uchun "Birinchi qadamlar": nima qilish kerakligi va qaysi biri bajarilgani.
 * Hammasi bajarilgach o'zi yo'qoladi. Faqat hisob egasiga (xodimlar sozlamalarni o'zgartirmaydi).
 */
export async function FirstSteps({ user, t }: { user: SessionUser; t: Dictionary }) {
  if (user.role !== "seller" || user.staff) return null;
  await connectDb();
  const [u, products] = await Promise.all([User.findById(user.id, { profile: 1, telegram: 1, verification: 1 }).lean(), Product.countDocuments({ seller: user.id, active: true })]);
  if (!u) return null;
  const f = t.firstSteps;
  const p = u.profile ?? {};
  const steps: Step[] = [
    { key: "address", title: f.address, hint: f.addressHint, href: "/profile", done: Boolean(p.address?.trim()) },
    { key: "inn", title: f.inn, hint: f.innHint, href: "/profile", done: Boolean(p.inn?.trim()) },
    { key: "delivery", title: f.delivery, hint: f.deliveryHint, href: "/profile", done: (p.deliveryRegions?.length ?? 0) > 0 },
    { key: "product", title: f.product, hint: f.productHint, href: "/products/new", done: products > 0 },
    { key: "verified", title: f.verified, hint: u.verification === "pending" ? f.verifiedWaiting : f.verifiedHint, href: null, done: u.verification === "verified", waiting: u.verification === "pending" },
    { key: "telegram", title: f.telegram, hint: f.telegramHint, href: "/settings", done: Boolean(u.telegram?.chatId) },
  ];
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;

  return (
    <section className="glass-card flex flex-col gap-4 rounded-2xl p-5" aria-labelledby="first-steps">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="first-steps" className="flex items-center gap-2 text-[17px] font-semibold">
          <Rocket size={19} className="text-accent" aria-hidden />
          {f.title}
        </h2>
        <span className="text-[13px] text-muted">{fmt(f.progress, { done, total: steps.length })}</span>
      </div>
      <span className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <span className="block h-full rounded-full bg-accent transition-all" style={{ width: `${Math.round((done / steps.length) * 100)}%` }} />
      </span>
      <ol className="grid gap-2 sm:grid-cols-2">
        {steps.map((s) => {
          const Icon = s.done ? CheckCircle2 : s.waiting ? Clock : Circle;
          const body = (
            <>
              <Icon size={18} className={`mt-0.5 shrink-0 ${s.done ? "text-success" : s.waiting ? "text-amber-500" : "text-muted"}`} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className={`block text-[14px] font-medium ${s.done ? "text-muted line-through decoration-muted/50" : ""}`}>{s.title}</span>
                {!s.done && <span className="block text-[12px] text-muted">{s.hint}</span>}
              </span>
              {!s.done && s.href && <ChevronRight size={16} className="mt-0.5 shrink-0 text-muted" aria-hidden />}
            </>
          );
          return (
            <li key={s.key}>
              {!s.done && s.href ? (
                <Link href={s.href} className="flex items-start gap-2.5 rounded-xl border border-line px-3 py-2.5 hover:border-accent hover:bg-accent-soft/40">
                  {body}
                </Link>
              ) : (
                <span className="flex items-start gap-2.5 rounded-xl border border-line px-3 py-2.5">{body}</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
