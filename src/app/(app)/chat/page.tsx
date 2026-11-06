import clsx from "clsx";
import { BadgeCheck, MessageSquare } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { listConversations } from "@/server/chat";
import { ChatRoom } from "./ChatRoom";

export const metadata = { title: "Biznes chat" };

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const user = await requireUser();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const active = (await searchParams).c;
  const conversations = await listConversations(user);

  if (!conversations.length && !active) {
    return (
      <section className="flex flex-col gap-5">
        <h1 className="text-2xl font-bold tracking-tight">{t.header.chat}</h1>
        <EmptyState Icon={MessageSquare} title={t.chat.empty} hint={user.role === "buyer" ? t.chat.emptyBuyer : t.chat.emptySeller} />
      </section>
    );
  }

  return (
    <section className="grid h-[calc(100dvh-11rem)] min-h-[420px] overflow-hidden rounded-xl border border-line bg-surface md:h-[calc(100dvh-8rem)] md:grid-cols-[300px_minmax(0,1fr)]">
      <aside className={clsx("min-h-0 flex-col overflow-y-auto border-line md:flex md:border-r", active ? "hidden" : "flex")}>
        <h1 className="border-b border-line px-4 py-3 font-semibold">{t.header.chat}</h1>
        <ul>
          {conversations.map((c) => (
            <li key={c.id}>
              <Link href={`/chat?c=${c.id}`} aria-current={c.id === active ? "page" : undefined} className={clsx("flex flex-col gap-0.5 border-b border-line px-4 py-3 hover:bg-surface-2", c.id === active && "bg-surface-2")}>
                <span className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1 truncate font-semibold">
                    {c.partner.name}
                    {c.partner.verified && <BadgeCheck size={14} className="shrink-0 text-accent" aria-hidden />}
                  </span>
                  {c.unread > 0 && <span className="rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-fg">{c.unread}</span>}
                </span>
                <span className="truncate text-[13px] text-muted">{c.lastText || "…"}</span>
                <span className="text-[11px] text-muted">{formatDateTime(c.lastAt, locale)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>
      <div className={clsx("min-h-0", active ? "block" : "hidden md:flex md:items-center md:justify-center")}>
        {active ? <ChatRoom key={active} id={active} role={user.role} /> : <p className="text-muted">{t.chat.pick}</p>}
      </div>
    </section>
  );
}
