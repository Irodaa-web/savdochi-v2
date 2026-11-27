import { ClipboardList, LayoutGrid, MessageSquare, ShoppingCart, Users, Wallet, Warehouse, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProductCard } from "@/components/catalog/ProductCard";
import { StatusPill } from "@/components/orders/StatusPill";
import { Welcome } from "@/components/Welcome";
import { Card, Stat } from "@/components/ui/Card";
import { formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { formatAmount } from "@/lib/catalog";
import { getCart } from "@/server/cart";
import { listDebts } from "@/server/debts";
import { listOrders } from "@/server/orders";
import { listCatalog } from "@/server/products";
import { listMyStock } from "@/server/stock";

/**
 * Bosh sahifa. Sotuvchi — o'z paneliga (/dashboard) yo'naltiriladi.
 * Xaridor uchun shu sahifa: holat, tezkor amallar, ochiq buyurtmalar, kam qolgan mahsulotlar va yangi mahsulotlar.
 */
export default async function Home() {
  const user = await requireUser();
  if (user.role === "seller") redirect("/dashboard");
  const locale = await getLocale();
  const t = getDictionary(locale);
  const [cart, debts, open, stock, catalog] = await Promise.all([
    getCart(user.id),
    listDebts(user),
    listOrders(user, { status: "open", limit: 4 }),
    listMyStock(user.id),
    listCatalog({ demo: user.demo }),
  ]);
  const low = stock.filter((r) => r.low).slice(0, 5);
  const units = t.units as Record<string, string>;
  const tiles: { href: string; label: string; Icon: LucideIcon; badge?: number }[] = [
    { href: "/catalog", label: t.nav.catalog, Icon: LayoutGrid },
    { href: "/orders", label: t.nav.orders, Icon: ClipboardList },
    { href: "/cart", label: t.nav.cart, Icon: ShoppingCart, badge: cart.count },
    { href: "/stock", label: t.nav.stock, Icon: Warehouse },
    { href: "/debts", label: t.debts.title, Icon: Wallet },
    { href: "/partners", label: t.nav.partners, Icon: Users },
    { href: "/chat", label: t.nav.chat, Icon: MessageSquare },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Welcome user={user} />

      <div className="grid grid-cols-3 gap-3">
        <Stat label={t.nav.cart} value={String(cart.count)} />
        <Stat label={t.debts.outstanding} value={formatAmount(debts.totalOutstanding)} />
        <Stat label={t.debts.overdue} value={formatAmount(debts.totalOverdue)} tone={debts.totalOverdue ? "danger" : undefined} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-[15px] font-bold">{t.home.quick}</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {tiles.map(({ href, label, Icon, badge }) => (
            <li key={href}>
              <Link
                href={href}
                className="group glass-card sheen flex h-full flex-col gap-3 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[var(--c-shadow-lg)]"
              >
                <span className="relative flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent transition-all duration-300 group-hover:bg-accent group-hover:text-accent-fg group-hover:shadow-[var(--c-glow)]">
                  <Icon size={20} aria-hidden />
                  {badge ? (
                    <span className="absolute -top-1.5 -right-1.5 min-w-5 rounded-full bg-accent px-1 text-center text-[11px] leading-5 font-bold text-accent-fg">
                      {badge}
                    </span>
                  ) : null}
                </span>
                <span className="text-[14px] font-semibold">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t.home.openOrders}</h2>
            <Link href="/orders" className="text-[13px] font-semibold text-accent hover:underline">
              {t.home.viewAll}
            </Link>
          </div>
          {open.length === 0 ? (
            <p className="text-[14px] text-muted">{t.home.noOpenOrders}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {open.map((o) => (
                <li key={o.id}>
                  <Link href={`/orders/${o.id}`} className="flex items-center justify-between gap-3 py-2.5 text-[14px] hover:text-accent">
                    <span className="flex flex-col">
                      <b>№{o.number}</b>
                      <span className="text-[12px] text-muted">
                        {o.seller.name} · {formatDateTime(o.createdAt, locale, false)}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusPill status={o.status} t={t} />
                      <span className="font-semibold tabular-nums">{formatAmount(o.total)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t.home.lowStock}</h2>
            <Link href="/stock" className="text-[13px] font-semibold text-accent hover:underline">
              {t.home.viewAll}
            </Link>
          </div>
          {low.length === 0 ? (
            <p className="text-[14px] text-muted">{t.home.noLowStock}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {low.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-[14px]">
                  <Link href={`/catalog/${r.productId}`} className="font-medium hover:text-accent">
                    {r.name}
                  </Link>
                  <span className="flex items-center gap-1.5">
                    <b className="tabular-nums text-danger">{r.quantity}</b>
                    <span className="text-[12px] text-muted">{units[r.unit] ?? r.unit}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold">{t.home.newProducts}</h2>
          <Link href="/catalog" className="text-[13px] font-semibold text-accent hover:underline">
            {t.home.viewAll}
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {catalog.items.slice(0, 6).map((p) => (
            <li key={p.id}>
              <ProductCard product={p} t={t} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
