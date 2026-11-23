import { PackageSearch, Search } from "lucide-react";
import Link from "next/link";
import { Chips, Pager } from "@/components/admin/Chips";
import { PageTitle, Pill } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { fmt } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth/guard";
import { formatAmount } from "@/lib/catalog";
import { listProductsAdmin } from "@/server/admin";
import { ModerateButton } from "./ModerateButton";

export const metadata = { title: "Mahsulotlar moderatsiyasi" };

type Params = { q?: string; filter?: string; page?: string };

/** Administrator: barcha kompaniyalar mahsulotlari — qidiruv, qoidaga zidini sabab bilan yashirish. */
export default async function AdminProducts({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdmin();
  const t = getDictionary(await getLocale());
  const m = t.moderation;
  const sp = await searchParams;
  const filter = sp.filter === "hidden" || sp.filter === "archived" ? sp.filter : undefined;
  const q = sp.q?.trim() || undefined;
  const data = await listProductsAdmin({ q, filter, page: Number(sp.page) || 1 });
  const href = (patch: Partial<Params>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, filter, ...patch })) if (v) p.set(k, String(v));
    const s = p.toString();
    return s ? `/admin/products?${s}` : "/admin/products";
  };

  return (
    <section className="flex flex-col gap-4">
      <PageTitle lead={m.lead}>{t.adminNav.products}</PageTitle>
      <form action="/admin/products" className="flex gap-2">
        {filter && <input type="hidden" name="filter" value={filter} />}
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-[var(--c-glass-strong)] px-3 text-muted focus-within:border-accent">
          <Search size={16} aria-hidden />
          <input name="q" type="search" defaultValue={q} placeholder={t.header.searchProducts} aria-label={t.header.searchProducts} className="focus-none min-w-0 flex-1 bg-transparent text-text outline-none" />
        </label>
        <button className="h-10 cursor-pointer rounded-xl bg-accent px-4 text-[14px] font-semibold text-accent-fg">{t.admin.find}</button>
      </form>
      <Chips
        label={m.filter}
        items={[
          { href: href({ filter: undefined, page: undefined }), label: t.catalog.all, active: !filter },
          { href: href({ filter: "hidden", page: undefined }), label: m.hiddenFilter, active: filter === "hidden" },
          { href: href({ filter: "archived", page: undefined }), label: m.archivedFilter, active: filter === "archived" },
        ]}
      />
      <p className="text-[13px] text-muted">{fmt(t.adminPanel.usersCount, { n: data.total })}</p>
      {data.items.length === 0 ? (
        <EmptyState Icon={PackageSearch} title={t.catalog.empty} />
      ) : (
        <ul className="glass-card flex flex-col divide-y divide-line rounded-2xl">
          {data.items.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <Link href={`/catalog/${p.id}`} className="font-semibold hover:text-accent hover:underline">
                    {p.name}
                  </Link>
                  {p.hidden && <Pill tone="danger">{m.hiddenBadge}</Pill>}
                  {!p.active && <Pill>{t.adminPanel.archived}</Pill>}
                </span>
                <span className="mt-0.5 block text-[13px] text-muted">
                  <Link href={`/admin/users/${p.seller.id}`} className="hover:text-accent hover:underline">
                    {p.seller.name}
                  </Link>{" "}
                  · {formatAmount(p.price)} {t.common.sum} · {fmt(t.adminPanel.stockN, { n: p.stock })}
                </span>
                {p.hidden && p.note && <span className="mt-1 block text-[13px] text-danger">{fmt(m.reasonShown, { reason: p.note })}</span>}
              </span>
              <ModerateButton id={p.id} name={p.name} hidden={p.hidden} />
            </li>
          ))}
        </ul>
      )}
      <Pager page={data.page} pages={data.pages} href={(n) => href({ page: String(n) })} prev={t.catalog.prev} next={t.catalog.next} />
    </section>
  );
}
