import { CircleCheck, Download, FileSpreadsheet, FileText, ImageOff, Layers, Package, PackageX, Plus, ShoppingCart, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { TopProductsList } from "@/components/dashboard/TopProductsList";
import { PageTitle, Stat } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SideCard } from "@/components/ui/SideCard";
import { LinkButton } from "@/components/ui/LinkButton";
import { fmt } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { atLimit, planHas, PLANS } from "@/lib/plans";
import { PlanLocked } from "@/components/plans/PlanLocked";
import { Alert } from "@/components/ui/Alert";
import { VerifyBanner } from "@/components/seller/VerifyBanner";
import { WarehouseStock } from "./WarehouseStock";
import { formatAmount, saleDay } from "@/lib/catalog";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import { cartStatsForSeller, listSellerProducts, type ProductView } from "@/server/products";
import { topSellingProducts } from "@/server/reports";
import { ArchiveButton } from "./ArchiveButton";

export default async function ProductsPage() {
  const user = await requireUser("seller");
  const t = getDictionary(await getLocale());
  // Omborchi: faqat qoldiqlarni yangilash (narx, tahrirlash va statistika ko'rinmaydi).
  if (user.staff?.role === "warehouse") {
    const items = await listSellerProducts(user.id);
    return (
      <section className="flex flex-col gap-5">
        <PageTitle lead={t.staff.warehouseLead}>{t.nav.products}</PageTitle>
        <WarehouseStock products={items.map((p) => ({ id: p.id, name: p.name, category: p.category, unit: p.unit, stock: p.stock, minOrder: p.minOrder }))} />
      </section>
    );
  }
  const [products, carts, top] = await Promise.all([listSellerProducts(user.id), cartStatsForSeller(user.id), topSellingProducts(user.id, 30, 5)]);
  const lowCount = products.filter((p) => p.stock < p.minOrder).length;
  const stockValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);
  // Katalogni yaxshilash: har bir kamchilik — soni va tuzatish uchun mahsulot havolalari.
  const fixes: { Icon: LucideIcon; text: string; items: ProductView[] }[] = [
    { Icon: ImageOff, text: t.products.fixImages, items: products.filter((p) => p.images.length < 4) },
    { Icon: PackageX, text: t.products.fixStock, items: products.filter((p) => p.stock < p.minOrder) },
    { Icon: Layers, text: t.products.fixTiers, items: products.filter((p) => p.priceTiers.length === 0) },
    { Icon: FileText, text: t.products.fixDescription, items: products.filter((p) => p.description.trim().length < 20) },
  ].filter((f) => f.items.length > 0);

  // Tarif: Excel — Premium; mahsulotlar soni chegarasi (Bepul — 10, Standart — 100).
  const excel = planHas(user.plan, "excel");
  const limit = PLANS[user.plan].products;
  const full = atLimit(limit, products.length);
  const addButton = (
    <div className="flex flex-wrap items-center gap-2">
      {excel ? (
        <>
          <LinkButton href="/products/import" variant="secondary">
            <FileSpreadsheet size={16} aria-hidden />
            {t.products.importButton}
          </LinkButton>
          <a
            href="/api/v1/products/export"
            download
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-[var(--c-glass-strong)] px-4 text-[14px] font-semibold hover:border-accent"
          >
            <Download size={16} aria-hidden />
            {t.products.exportButton}
          </a>
        </>
      ) : (
        <PlanLocked feature="excel" t={t} owner={!user.staff} compact />
      )}
      {!full && (
        <LinkButton href="/products/new">
          <Plus size={16} aria-hidden />
          {t.products.add}
        </LinkButton>
      )}
    </div>
  );

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t.products.title}</h1>
        {products.length > 0 && addButton}
      </div>
      {full && limit !== null && (
        <Alert tone="info">
          {products.length > limit ? fmt(t.plans.overLimit, { n: products.length, limit }) : fmt(t.plans.productLimit, { limit })}{" "}
          {!user.staff && (
            <Link href="/billing" className="font-semibold underline">
              {t.plans.lockedCta}
            </Link>
          )}
        </Alert>
      )}
      <VerifyBanner user={user} t={t} />

      {carts.shops > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-line bg-accent-soft px-4 py-3">
          <ShoppingCart size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
          <div>
            <p className="font-semibold">{fmt(t.products.cartsSummary, { n: carts.shops })}</p>
            <p className="text-[13px] text-muted">{t.products.cartsHint}</p>
          </div>
        </div>
      )}

      {products.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label={t.products.statCatalog} value={products.length} />
          <Stat label={t.products.statLow} value={lowCount} tone={lowCount ? "danger" : undefined} />
          <Stat label={t.products.statInCarts} value={carts.shops} tone={carts.shops ? "accent" : undefined} />
          <Stat label={t.products.statStockValue} value={formatAmount(stockValue)} />
        </div>
      )}

      {products.length === 0 ? (
        <EmptyState Icon={Package} title={t.products.empty} hint={t.products.emptyHint} action={addButton} />
      ) : (
        <div className="overflow-x-auto glass-card rounded-2xl">
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
                      {p.moderation.hidden && (
                        <div className="mt-1 max-w-xs rounded-md bg-danger-soft px-2 py-1 text-[12px] text-danger">{fmt(t.moderation.sellerNote, { reason: p.moderation.note || "—" })}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {p.sale ? (
                        <>
                          <span className="font-semibold text-danger">{formatAmount(p.sale.price)}</span>
                          <span className="block text-[11px] whitespace-nowrap text-muted">
                            <s>{formatAmount(p.price)}</s> · {fmt(t.products.saleActive, { n: p.sale.percent, date: saleDay(p.sale.until) })}
                          </span>
                        </>
                      ) : (
                        formatAmount(p.price)
                      )}
                    </td>
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

      {products.length > 0 && (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <SideCard Icon={Sparkles} title={t.products.improveTitle}>
            {fixes.length === 0 ? (
              <p className="flex items-start gap-2 text-success">
                <CircleCheck size={18} className="mt-0.5 shrink-0" aria-hidden />
                {t.products.improveDone}
              </p>
            ) : (
              <>
                <p className="text-muted">{t.products.improveLead}</p>
                <ul className="flex flex-col gap-3">
                  {fixes.map(({ Icon, text, items }) => (
                    <FixRow key={text} Icon={Icon} text={fmt(text, { n: items.length })} items={items} t={t} />
                  ))}
                </ul>
              </>
            )}
          </SideCard>
          <SideCard Icon={TrendingUp} title={t.products.topTitle}>
            <TopProductsList items={top} t={t} empty={t.products.topEmpty} />
          </SideCard>
        </div>
      )}
    </section>
  );
}

/** Bitta kamchilik: belgi, matn va 3 tagacha mahsulot (tahrirlash sahifasiga havola). */
function FixRow({ Icon, text, items, t }: { Icon: LucideIcon; text: string; items: ProductView[]; t: Dictionary }) {
  return (
    <li className="flex items-start gap-3 rounded-xl bg-surface-2/60 p-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger">
        <Icon size={16} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium">{text}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {items.slice(0, 3).map((p) => (
            <Link key={p.id} href={`/products/${p.id}/edit`} className="rounded-full bg-surface px-2.5 py-1 text-[12px] font-medium text-accent ring-1 ring-line ring-inset transition-colors hover:bg-accent hover:text-accent-fg hover:ring-accent">
              {p.name}
            </Link>
          ))}
          {items.length > 3 && <span className="px-1 py-1 text-[12px] text-muted">{fmt(t.products.more, { n: items.length - 3 })}</span>}
        </div>
      </div>
    </li>
  );
}
