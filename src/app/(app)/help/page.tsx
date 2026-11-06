import { Card, PageTitle, Pill } from "@/components/ui/Card";
import { formatDateTime } from "@/i18n/format";
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

  return (
    <section className="flex max-w-3xl flex-col gap-5">
      <PageTitle>{t.header.help}</PageTitle>
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
    </section>
  );
}
