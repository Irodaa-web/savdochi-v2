import { FileSpreadsheet, ImageOff, Package, Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { fmt } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { formatAmount } from "@/lib/catalog";
import { cartStatsForSeller, listSellerProducts } from "@/server/products";
import { ArchiveButton } from "./ArchiveButton";

export default async function ProductsPage() {
  const user = await requireUser("seller");
  const t = getDictionary(await getLocale());
  const [products, carts] = await Promise.all([listSellerProducts(user.id), cartStatsForSeller(user.id)]);

  const addButton = (
    <div className="flex flex-wrap gap-2">
      <LinkButton href="/products/import" variant="secondary">
        <FileSpreadsheet size={16} aria-hidden />
        {t.products.importButton}
      </LinkButton>
      <LinkButton href="/products/new">
        <Plus size={16} aria-hidden />
        {t.products.add}
      </LinkButton>
    </div>
  );

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t.products.title}</h1>
        {products.length > 0 && addButton}
      </div>

      {carts.shops > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-line bg-accent-soft px-4 py-3">
          <ShoppingCart size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
          <div>
            <p className="font-semibold">{fmt(t.products.cartsSummary, { n: carts.shops })}</p>
            <p className="text-[13px] text-muted">{t.products.cartsHint}</p>
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <EmptyState Icon={Package} title={t.products.empty} hint={t.products.emptyHint} action={addButton} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line text-[13px] text-muted">
                <th className="px-4 py-3 font-medium">{t.products.colName}</th>
                <th className="px-3 py-3 text-right font-medium">{t.products.colPrice}</th>
                <th className="px-3 py-3 text-right font-medium">{t.products.colStock}</th>
                <th className="px-3 py-3 text-right font-medium">{t.products.colMin}</th>
                <th className="px-3 py-3 text-right font-medium">{t.products.colInCarts}</th>
                <th className="px-3 py-3 text-center font-medium">{t.products.colImages}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const unit = t.units[p.unit];
                const low = p.stock < p.minOrder;
                const cart = carts.byProduct.get(p.id);
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
                    <td className="px-3 py-3 text-right tabular-nums">
                      {cart ? (
                        <>
                          <div className="inline-flex items-center gap-1 font-semibold text-accent">
                            <ShoppingCart size={14} aria-hidden />
                            {fmt(t.products.inCarts, { n: cart.shops })}
                          </div>
                          <div className="text-[12px] text-muted">
                            {cart.quantity} {unit}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums">
                      <Link
                        href={`/products/${p.id}/edit`}
                        title={p.images.length < 4 ? fmt(t.products.imagesMissing, { n: 4 - p.images.length }) : t.products.imagesComplete}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-semibold ${p.images.length < 4 ? "bg-danger-soft text-danger" : "bg-success-soft text-success"}`}
                      >
                        {p.images.length < 4 && <ImageOff size={13} aria-hidden />}
                        {fmt(t.products.imagesCount, { n: p.images.length })}
                      </Link>
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
