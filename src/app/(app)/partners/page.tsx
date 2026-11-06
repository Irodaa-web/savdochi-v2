import { BadgeCheck, Users } from "lucide-react";
import Link from "next/link";
import { ActionButton } from "@/components/ui/ActionButton";
import { Card, PageTitle, Pill } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { fmt, formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { formatAmount } from "@/lib/catalog";
import { formatPhone } from "@/lib/phone";
import { listPartners, type PartnerView } from "@/server/partners";
import { PartnerTerms } from "./PartnerTerms";

export const metadata = { title: "Hamkorlar" };

export default async function PartnersPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const all = await listPartners(user);
  const isSeller = user.role === "seller";
  const incoming = all.filter((p) => p.incoming);
  const rest = all.filter((p) => !p.incoming);

  const tone = (p: PartnerView) => (p.status === "active" ? "success" : p.status === "rejected" ? "danger" : "accent");

  return (
    <section className="flex flex-col gap-5">
      <PageTitle action={!isSeller && <LinkButton href="/catalog" variant="secondary">{t.partners.find}</LinkButton>}>{t.header.myPartners}</PageTitle>
      <p className="max-w-2xl text-muted">{isSeller ? t.partners.leadSeller : t.partners.leadBuyer}</p>

      {incoming.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <h2 className="font-semibold">{t.partners.incoming}</h2>
          {incoming.map((p) => (
            <Card key={p.id} className="flex flex-wrap items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{p.partner.name}</span>
                <span className="text-[13px] text-muted">{t.regions[p.partner.region]}</span>
              </span>
              <ActionButton path={`/api/v1/partnerships/${p.id}`} method="PATCH" body={{ action: "accept" }}>
                {t.partners.accept}
              </ActionButton>
              <ActionButton path={`/api/v1/partnerships/${p.id}`} method="PATCH" body={{ action: "reject" }} variant="secondary">
                {t.partners.reject}
              </ActionButton>
            </Card>
          ))}
        </div>
      )}

      {rest.length === 0 && incoming.length === 0 ? (
        <EmptyState Icon={Users} title={t.partners.empty} hint={isSeller ? t.partners.emptySeller : t.partners.emptyBuyer} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {rest.map((p) => (
            <li key={p.id}>
              <Card className="flex h-full flex-col gap-2.5">
                <div className="flex items-start justify-between gap-2">
                  <Link href={isSeller ? `/partners/${p.partner.id}` : `/suppliers/${p.partner.id}`} className="flex items-center gap-1.5 font-semibold hover:text-accent">
                    {p.partner.name}
                    {p.partner.verified && <BadgeCheck size={16} className="text-accent" aria-label={t.catalog.verified} />}
                  </Link>
                  <Pill tone={tone(p)}>{p.status === "pending" ? t.partners.requestSent : t.partners.status[p.status]}</Pill>
                </div>
                <span className="text-[13px] text-muted">
                  {t.regions[p.partner.region]}
                  {p.partner.phone && ` · ${formatPhone(p.partner.phone)}`}
                </span>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
                  <span>
                    <span className="text-muted">{t.partners.orders}:</span> <b>{p.orderCount}</b>
                  </span>
                  <span>
                    <span className="text-muted">{t.partners.value}:</span> <b>{formatAmount(p.orderValue)}</b>
                  </span>
                  {p.lastOrderAt && (
                    <span>
                      <span className="text-muted">{t.partners.lastOrder}:</span> {formatDateTime(p.lastOrderAt, locale, false)}
                    </span>
                  )}
                </div>
                {p.status === "active" && (p.discount > 0 || p.terms) && (
                  <p className="rounded-lg bg-surface-2 px-3 py-2 text-[13px]">
                    {p.discount > 0 && <b>{fmt(t.partners.discountNote, { n: p.discount })}. </b>}
                    {p.terms}
                  </p>
                )}
                {p.status === "active" && isSeller && <PartnerTerms id={p.id} discount={p.discount} terms={p.terms} />}
                {p.status === "active" && !isSeller && (
                  <ActionButton path={`/api/v1/partnerships/${p.id}`} method="PATCH" body={{ action: "update", shareStock: !p.shareStock }} variant="ghost" className="w-fit px-2">
                    {p.shareStock ? t.partners.stopSharing : t.partners.startSharing}
                  </ActionButton>
                )}
                {p.status === "rejected" && (
                  <ActionButton path="/api/v1/partnerships" body={{ partnerId: p.partner.id }} variant="secondary" className="w-fit">
                    {t.partners.requestAgain}
                  </ActionButton>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
