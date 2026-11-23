import clsx from "clsx";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import { formatDateTime } from "@/i18n/format";
import type { TicketThreadItem } from "@/server/tickets";

/** Murojaat yozishmasi: foydalanuvchi xabarlari chapda, administrator javoblari o'ngda (ko'k). */
export function Thread({ items, viewer, locale, t }: { items: TicketThreadItem[]; viewer: "user" | "admin"; locale: string; t: Dictionary }) {
  return (
    <ol className="flex flex-col gap-2.5">
      {items.map((m, i) => {
        const mine = m.from === viewer;
        return (
          <li key={i} className={clsx("flex", mine ? "justify-end" : "justify-start")}>
            <div
              className={clsx(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px]",
                m.from === "admin" ? "rounded-br-md bg-accent-soft" : "rounded-bl-md border border-line bg-surface-2/70",
              )}
            >
              <span className={clsx("mb-0.5 block text-[11px] font-semibold", m.from === "admin" ? "text-accent" : "text-muted")}>
                {m.from === "admin" ? t.tickets.admin : viewer === "admin" ? t.tickets.user : t.tickets.you} · {formatDateTime(m.at, locale)}
              </span>
              <p className="whitespace-pre-line break-words">{m.text}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
