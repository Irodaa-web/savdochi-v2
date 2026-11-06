import { Package, Plus } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { formatAmount } from "@/lib/catalog";
import { listSellerProducts } from "@/server/products";
import { ArchiveButton } from "./ArchiveButton";

export default async function ProductsPage() {
  const user = await requireUser("seller");
  const t = getDictionary(await getLocale());
  const products = await listSellerProducts(user.id);

  const addButton = (
    <LinkButton href="/products/new">
      <Plus size={16} aria-hidden />
      {t.products.add}
    </LinkButton>
  );

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t.products.title}</h1>
        {products.length > 0 && addButton}
      </div>

      {products.length === 0 ? (
        <EmptyState Icon={Package} title={t.products.empty} hint={t.products.emptyHint} action={addButton} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line text-[13px] text-muted">
                <th className="px-4 py-3 font-medium">{t.products.colName}</th>
                <th className="px-3 py-3 text-right font-medium">{t.products.colPrice}</th>
                <th className="px-3 py-3 text-right font-medium">{t.products.colStock}</th>
                <th className="px-3 py-3 text-right font-medium">{t.products.colMin}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const unit = t.units[p.unit];
                const low = p.stock < p.minOrder;
                return (
                  <tr key={p.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/products/${p.id}/edit`} className="font-semibold hover:text-accent">
                        {p.name}
                      </Link>
                      <div className="text-[12px] text-muted">{t.categories[p.category]}</div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatAmount(p.price)}</td>
                    <td className={`px-3 py-3 text-right tabular-nums ${low ? "font-semibold text-danger" : ""}`}>
                      {p.stock} {unit}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {p.minOrder} {unit}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Link href={`/products/${p.id}/edit`} className="rounded-md px-2.5 py-1.5 text-[13px] font-medium hover:bg-surface-2">
                          {t.products.edit}
                        </Link>
                        <ArchiveButton id={p.id} name={p.name} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
