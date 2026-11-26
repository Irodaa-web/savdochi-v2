import clsx from "clsx";
import { BadgeCheck, MessageSquare, MessagesSquare } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { CheckList } from "@/components/ui/SideCard";
import { formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { listConversations } from "@/server/chat";
import { ChatRoom } from "./ChatRoom";
import { Avatar } from "@/components/ui/Avatar";

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
    // Telefonda suhbat ochilganda — butun ekran (yuqori panel va pastki menyu yashiriladi), "orqaga" tugmasi bilan.
    <section
      className={clsx(
        "grid h-[calc(100dvh-11rem)] min-h-[420px] overflow-hidden glass-card rounded-2xl md:h-[calc(100dvh-8rem)] md:grid-cols-[300px_minmax(0,1fr)]",
        active && "max-md:fixed max-md:inset-0 max-md:z-[70] max-md:h-[100dvh] max-md:min-h-0 max-md:rounded-none max-md:bg-[var(--c-bg)]",
      )}
    >
      <aside className={clsx("min-h-0 flex-col overflow-y-auto border-line md:flex md:border-r", active ? "hidden" : "flex")}>
        <h1 className="border-b border-line px-4 py-3 font-semibold">{t.header.chat}</h1>
        <ul>
          {conversations.map((c) => (
            <li key={c.id}>
              <Link href={`/chat?c=${c.id}`} aria-current={c.id === active ? "page" : undefined} className={clsx("flex items-center gap-3 border-b border-line px-4 py-3 hover:bg-surface-2", c.id === active && "bg-surface-2")}>
                <Avatar name={c.partner.name} src={c.partner.logo} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1 truncate font-semibold">
                    {c.partner.name}
                    {c.partner.verified && <BadgeCheck size={14} className="shrink-0 text-accent" aria-hidden />}
                  </span>
                  {c.unread > 0 && <span className="rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-fg">{c.unread}</span>}
                </span>
                <span className="truncate text-[13px] text-muted">{c.lastText || "…"}</span>
                </span>
                <span className="text-[11px] text-muted">{formatDateTime(c.lastAt, locale)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>
      <div className={clsx("min-h-0", active ? "block" : "hidden md:flex md:items-center md:justify-center")}>
        {active ? (
          <ChatRoom key={active} id={active} role={user.role} />
        ) : (
          // Suhbat tanlanmagan: bo'sh joy o'rniga qisqa yo'l-yo'riq va tegishli bo'limga havola.
          <div className="flex max-w-md flex-col items-center gap-4 px-6 py-10 text-center">
            <span className="btn-primary flex size-16 items-center justify-center rounded-2xl motion-safe:animate-[orb-float_6s_ease-in-out_infinite]">
              <MessagesSquare size={28} aria-hidden />
            </span>
            <h2 className="text-[18px] font-bold">{t.chat.pick}</h2>
            <p className="text-muted">{t.chat.pickLead}</p>
            <div className="w-full rounded-2xl bg-surface-2/60 p-4 text-left text-[14px]">
              <CheckList items={user.role === "buyer" ? t.chat.tipsBuyer : t.chat.tipsSeller} />
            </div>
            <LinkButton href={user.role === "buyer" ? "/catalog" : "/partners"} variant="secondary">
              {user.role === "buyer" ? t.nav.catalog : t.nav.clients}
            </LinkButton>
          </div>
        )}
      </div>
    </section>
  );
}
