import { Bell, ClipboardList, CreditCard, FileSpreadsheet, FileText, LayoutGrid, LifeBuoy, Lightbulb, PackagePlus, Scale, ShieldCheck, ShoppingCart, Users, Wallet, Warehouse } from "lucide-react";
import Link from "next/link";
import { Card, PageTitle, Pill } from "@/components/ui/Card";
import { LinkList, type LinkListItem } from "@/components/ui/LinkList";
import { SideCard } from "@/components/ui/SideCard";
import { fmt, formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { listMyTickets } from "@/server/tickets";
import { TicketForm } from "./TicketForm";

export const metadata = { title: "Yordam" };

export default async function HelpPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const tickets = await listMyTickets(user.id);
  const faq = user.role === "seller" ? t.help.faqSeller : t.help.faqBuyer;
  const m = t.navMenu;
  // Rolga mos tezkor yo'llar: eng ko'p kerak bo'ladigan sahifalar.
  const guides: LinkListItem[] =
    user.role === "seller"
      ? [
          { href: "/products/new", Icon: PackagePlus, label: t.products.add, hint: m.newProductHint },
          { href: "/products/import", Icon: FileSpreadsheet, label: t.products.importButton, hint: m.importHint },
          { href: "/profile#online-pay", Icon: CreditCard, label: t.header.payments, hint: m.paymentsHint },
          { href: "/partners", Icon: Users, label: t.nav.clients, hint: m.clientsHint },
          { href: "/debts", Icon: Wallet, label: t.header.debts, hint: m.debtsHint },
          { href: "/settings", Icon: Bell, label: t.telegram.title, hint: t.telegram.lead },
        ]
      : [
          { href: "/catalog?view=products", Icon: LayoutGrid, label: m.products, hint: m.productsHint },
          { href: "/cart", Icon: ShoppingCart, label: t.nav.cart, hint: m.cartHint },
          { href: "/orders", Icon: ClipboardList, label: t.nav.orders, hint: m.byStatus },
          { href: "/stock", Icon: Warehouse, label: t.nav.stock, hint: t.help.guideStockHint },
          { href: "/partners", Icon: Users, label: t.nav.partners, hint: m.partnersHint },
          { href: "/debts", Icon: Wallet, label: t.header.debts, hint: m.debtsHint },
        ];
  const openTickets = tickets.filter((tk) => tk.status !== "resolved").length;

  return (
    <section className="flex flex-col gap-5">
      <PageTitle>{t.header.help}</PageTitle>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-5">
      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">{t.help.faq}</h2>
        {faq.map(([q, a]) => (
          <details key={q} className="rounded-lg bg-surface-2 px-4 py-3">
            <summary className="cursor-pointer font-medium">{q}</summary>
            <p className="mt-2 text-muted">{a}</p>
          </details>
        ))}
      </Card>
      <Card className="flex flex-col gap-4">
        <h2 className="font-semibold">{t.help.write}</h2>
        <TicketForm />
      </Card>
      {tickets.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <h2 className="font-semibold">{t.help.mine}</h2>
          {tickets.map((tk) => (
            <Card key={tk.id} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <b>{tk.subject}</b>
                <Pill tone={tk.status === "resolved" ? "success" : "accent"}>{t.ticketStatus[tk.status]}</Pill>
              </div>
              <p className="text-[14px] whitespace-pre-line text-muted">{tk.message}</p>
              {tk.reply && (
                <p className="rounded-lg bg-accent-soft p-3 text-[14px] whitespace-pre-line">
                  <b>{t.help.reply}: </b>
                  {tk.reply}
                </p>
              )}
              <span className="text-[12px] text-muted">{formatDateTime(tk.createdAt, locale)}</span>
            </Card>
          ))}
        </div>
      )}
      </div>

      <aside className="flex flex-col gap-4">
        <SideCard Icon={Lightbulb} title={t.help.guidesTitle}>
          <LinkList items={guides} />
        </SideCard>
        <SideCard Icon={LifeBuoy} title={t.help.ticketsTitle}>
          {tickets.length === 0 ? (
            <p className="text-muted">{t.help.ticketsNone}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Pill tone={openTickets ? "accent" : "neutral"}>{fmt(t.help.ticketsOpen, { n: openTickets })}</Pill>
              <Pill tone="success">{fmt(t.help.ticketsDone, { n: tickets.length - openTickets })}</Pill>
            </div>
          )}
        </SideCard>
        <SideCard Icon={Scale} title={t.help.legalTitle}>
          <div className="flex flex-col gap-2">
            <Link href="/terms" className="inline-flex w-fit items-center gap-2 font-medium text-accent hover:underline">
              <FileText size={15} aria-hidden />
              {t.landing.terms}
            </Link>
            <Link href="/privacy" className="inline-flex w-fit items-center gap-2 font-medium text-accent hover:underline">
              <ShieldCheck size={15} aria-hidden />
              {t.landing.privacy}
            </Link>
          </div>
        </SideCard>
      </aside>
      </div>
    </section>
  );
}
