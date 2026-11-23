import { LifeBuoy } from "lucide-react";
import Link from "next/link";
import { Chips, Pager } from "@/components/admin/Chips";
import { Thread } from "@/components/tickets/Thread";
import { Card, PageTitle, Pill } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth/guard";
import { formatPhone } from "@/lib/phone";
import { TICKET_STATUSES, type TicketStatus } from "@/lib/tickets";
import { listAllTickets, type TicketFilter } from "@/server/tickets";
import { TicketReply } from "../TicketReply";

export const metadata = { title: "Murojaatlar" };

/** Administrator: murojaatlar — yozishma, holat bo'yicha filtr, javob berish. Standart — javob kutayotganlar. */
export default async function AdminTickets({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requireAdmin();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const sp = await searchParams;
  const status: TicketFilter = sp.status === "all" ? "all" : (TICKET_STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as TicketStatus) : "open";
  const data = await listAllTickets(status, Number(sp.page) || 1);
  const all = data.counts.open + data.counts.in_progress + data.counts.resolved;
  const href = (s: TicketFilter, page?: number) => `/admin/tickets?status=${s}${page && page > 1 ? `&page=${page}` : ""}`;

  return (
    <section className="flex flex-col gap-4">
      <PageTitle lead={t.tickets.adminLead}>{t.adminNav.tickets}</PageTitle>
      <Chips
        label={t.admin.status}
        items={[
          ...TICKET_STATUSES.map((s) => ({ href: href(s), label: t.ticketStatus[s], active: status === s, count: data.counts[s] })),
          { href: href("all"), label: t.catalog.all, active: status === "all", count: all },
        ]}
      />
      {data.items.length === 0 ? (
        <EmptyState Icon={LifeBuoy} title={status === "open" ? t.tickets.noneOpen : t.admin.noTickets} />
      ) : (
        <ul className="flex flex-col gap-4">
          {data.items.map((tk) => (
            <li key={tk.id}>
              <Card className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-semibold break-words">{tk.subject}</h2>
                    <Link href={`/admin/users/${tk.user.id}`} className="text-[13px] text-muted hover:text-accent hover:underline">
                      {tk.user.name} · {t.roles[tk.user.role]} · {formatPhone(tk.user.phone)}
                    </Link>
                  </div>
                  <Pill tone={tk.status === "resolved" ? "success" : tk.status === "open" ? "danger" : "accent"}>{t.ticketStatus[tk.status]}</Pill>
                </div>
                <Thread items={tk.thread} viewer="admin" locale={locale} t={t} />
                <TicketReply id={tk.id} status={tk.status} />
              </Card>
            </li>
          ))}
        </ul>
      )}
      <Pager page={Number(sp.page) || 1} pages={data.pages} href={(p) => href(status, p)} prev={t.catalog.prev} next={t.catalog.next} />
    </section>
  );
}
