import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { LanguageSwitch, ThemeToggle } from "@/components/Preferences";
import { Logo } from "@/components/ui/Logo";
import { LEGAL_UPDATED, legalDoc, legalOperator, type LegalKind } from "@/content/legal";
import { formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";

/** Ommaviy oferta / maxfiylik siyosati sahifasi — hamma uchun ochiq (kirgan va kirmagan). */
export async function LegalPage({ kind }: { kind: LegalKind }) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const op = legalOperator();
  const doc = legalDoc(kind, locale);
  const fill = (s: string) => s.replaceAll("{company}", op.company);
  const other = kind === "terms" ? { href: "/privacy", label: t.landing.privacy } : { href: "/terms", label: t.landing.terms };
  const details: [string, string][] = [
    [t.landing.operator, op.company],
    [t.landing.operatorInn, op.inn],
    [t.landing.operatorAddress, op.address],
    [t.landing.operatorContact, op.contact],
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-[860px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" aria-label={t.landing.legalBack}>
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <LanguageSwitch />
            <ThemeToggle className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-text" />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[860px] flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <Link href="/" className="inline-flex w-fit items-center gap-1.5 text-muted hover:text-text">
          <ArrowLeft size={16} aria-hidden />
          {t.landing.legalBack}
        </Link>
        <div>
          <h1 className="text-[28px] leading-tight font-bold tracking-tight">{doc.title}</h1>
          <p className="mt-2 text-[13px] text-muted">
            {doc.updated}: {formatDateTime(`${LEGAL_UPDATED}T12:00:00+05:00`, locale, false)}
          </p>
        </div>
        <p className="text-[15px] leading-relaxed">{fill(doc.intro)}</p>

        {doc.sections.map((s) => (
          <section key={s.title} className="flex flex-col gap-2.5">
            <h2 className="text-[18px] font-bold">{s.title}</h2>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-[15px] leading-relaxed marker:text-muted">
              {s.items.map((item) => (
                <li key={item}>{fill(item)}</li>
              ))}
            </ul>
          </section>
        ))}

        <section className="rounded-xl border border-line bg-surface p-5 text-[14px]">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
            {details
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-muted">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
          </dl>
        </section>

        <Link href={other.href} className="w-fit font-semibold text-accent hover:underline">
          {other.label} →
        </Link>
      </main>
    </div>
  );
}
