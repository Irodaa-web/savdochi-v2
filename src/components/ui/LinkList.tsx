import type { LucideIcon } from "lucide-react";
import Link from "next/link";

export type LinkListItem = { href: string; Icon: LucideIcon; label: string; hint?: string };

/** Belgi + nom + izohli havolalar ro'yxati (yon ustundagi tezkor yo'llar uchun). */
export function LinkList({ items }: { items: LinkListItem[] }) {
  return (
    <ul className="-mx-2 flex flex-col">
      {items.map(({ href, Icon, label, hint }) => (
        <li key={href}>
          <Link href={href} className="group flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-accent-soft/60">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent transition-all duration-200 group-hover:bg-accent group-hover:text-accent-fg">
              <Icon size={16} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block leading-tight font-semibold">{label}</span>
              {hint && <span className="block text-[12px] leading-snug text-muted">{hint}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
