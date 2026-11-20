import { BadgeCheck, Building2, ChevronRight, Handshake, Megaphone, Percent, Users } from "lucide-react";
import Link from "next/link";
import { ActionButton } from "@/components/ui/ActionButton";
import { Card, PageTitle, Pill, Stat } from "@/components/ui/Card";
import { CopyLink } from "@/components/ui/CopyLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { CheckList, SideCard } from "@/components/ui/SideCard";
import { fmt, formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { formatAmount } from "@/lib/catalog";
import { formatPhone } from "@/lib/phone";
import { listDebts } from "@/server/debts";
import { listPartners, type PartnerView } from "@/server/partners";
import { listSuppliers, type SupplierView } from "@/server/products";
import { PartnerTerms } from "./PartnerTerms";

export const metadata = { title: "Hamkorlar" };

export default async function PartnersPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const isSeller = user.role === "seller";
  // Agent shartlarni (chegirma, nasiya) o'zgartira olmaydi.
  const canTerms = isSeller && user.staff?.role !== "agent";
  const [all, debts] = await Promise.all([listPartners(user), listDebts(user)]);
  const incoming = all.filter((p) => p.incoming);
  const rest = all.filter((p) => !p.incoming);
  const active = all.filter((p) => p.status === "active");
  const totalValue = all.reduce((sum, p) => sum + p.orderValue, 0);
  // Do'kon uchun: hududiga yetkazadigan, hali hamkor bo'lmagan kompaniyalar (bo'lmasa — umuman).
  const suggestions = isSeller ? [] : await suggestSuppliers(user.region, new Set(all.filter((p) => p.status !== "rejected").map((p) => p.partner.id)));

  const tone = (p: PartnerView) => (p.status === "active" ? "success" : p.status === "rejected" ? "danger" : "accent");

  return (
    <section className="flex flex-col gap-5">
      <PageTitle action={!isSeller && <LinkButton href="/catalog" variant="secondary">{t.partners.find}</LinkButton>}>{isSeller ? t.header.myClients : t.header.myPartners}</PageTitle>
      <p className="max-w-2xl text-muted">{isSeller ? t.partners.leadSeller : t.partners.leadBuyer}</p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {isSeller ? (
          <>
            <Stat label={t.partners.statActive} value={active.length} />
            <Stat label={t.partners.statRequests} value={incoming.length} tone={incoming.length ? "accent" : undefined} />
            <Stat label={t.partners.statSales} value={formatAmount(totalValue)} />
            <Stat label={t.partners.statClientDebt} value={formatAmount(debts.totalOutstanding)} tone={debts.totalOutstanding ? "danger" : undefined} />
          </>
        ) : (
          <>
            <Stat label={t.partners.statActiveBuyer} value={active.length} />
            <Stat label={t.partners.statPurchases} value={formatAmount(totalValue)} />
            <Stat label={t.partners.statMyDebt} value={formatAmount(debts.totalOutstanding)} />
            <Stat label={t.partners.statOverdue} value={formatAmount(debts.totalOverdue)} tone={debts.totalOverdue ? "danger" : undefined} />
          </>
        )}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-5">

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
        // Kam hamkor bo'lsa — kartalar butun kenglikda (yonida bo'sh joy qolmasin), ko'p bo'lsa — ikki ustun.
        <ul className={`grid gap-3 ${rest.length > 2 ? "xl:grid-cols-2" : ""}`}>
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
                {p.status === "active" && (p.discount > 0 || p.terms || p.creditLimit > 0) && (
                  <p className="rounded-lg bg-surface-2 px-3 py-2 text-[13px]">
                    {p.discount > 0 && <b>{fmt(t.partners.discountNote, { n: p.discount })}. </b>}
                    {p.creditLimit > 0 && <b>{fmt(t.partners.creditNote, { limit: formatAmount(p.creditLimit), days: p.paymentDays })}. </b>}
                    {p.terms}
                  </p>
                )}
                {p.status === "active" && canTerms && <PartnerTerms id={p.id} discount={p.discount} terms={p.terms} creditLimit={p.creditLimit} paymentDays={p.paymentDays} />}
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
      </div>

      <aside className="flex flex-col gap-4">
        {isSeller ? (
          <>
            <SideCard Icon={Megaphone} title={t.partners.growTitle}>
              <p className="text-muted">{t.partners.growText}</p>
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold tracking-wide text-muted uppercase">{t.partners.pageLink}</span>
                <CopyLink path={`/suppliers/${user.id}`} />
              </div>
              <LinkButton href={`/suppliers/${user.id}`} variant="secondary" className="w-fit">
                {t.partners.previewPage}
              </LinkButton>
            </SideCard>
            <SideCard Icon={Percent} title={t.partners.termsTitle}>
              <p className="text-muted">{t.partners.termsText}</p>
            </SideCard>
          </>
        ) : (
          <>
            <SideCard Icon={Building2} title={t.partners.suggestTitle}>
              <p className="text-muted">{t.partners.suggestText}</p>
              {suggestions.length === 0 ? (
                <p className="text-[13px] text-muted">{t.partners.suggestEmpty}</p>
              ) : (
                <ul className="-mx-2 flex flex-col">
                  {suggestions.map((s) => (
                    <li key={s.id}>
                      <Link href={`/suppliers/${s.id}`} className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-accent-soft/70">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[12px] font-bold text-accent">{s.name.slice(0, 2).toUpperCase()}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1 truncate font-semibold">
                            <span className="truncate">{s.name}</span>
                            {s.verified && <BadgeCheck size={14} className="shrink-0 text-accent" aria-label={t.catalog.verified} />}
                          </span>
                          <span className="block text-[12px] text-muted">
                            {t.regions[s.region]} · {fmt(t.suppliers.products, { n: s.productCount })}
                          </span>
                        </span>
                        <ChevronRight size={16} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/catalog" className="w-fit text-[13px] font-semibold text-accent hover:underline">
                {t.partners.allCompanies} →
              </Link>
            </SideCard>
            <SideCard Icon={Handshake} title={t.partners.benefitsTitle}>
              <CheckList items={t.partners.benefits} />
            </SideCard>
          </>
        )}
      </aside>
      </div>
    </section>
  );
}

/** Tavsiya: avval do'kon hududiga yetkazadiganlar, bo'lmasa barcha kompaniyalar; hamkorlar chiqarib tashlanadi. */
async function suggestSuppliers(region: SupplierView["region"], exclude: Set<string>): Promise<SupplierView[]> {
  const pick = (list: SupplierView[]) => list.filter((s) => !exclude.has(s.id)).slice(0, 4);
  const local = pick(await listSuppliers({ region }));
  return local.length ? local : pick(await listSuppliers({}));
}
