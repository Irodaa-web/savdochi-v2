import { RotateCcw, ShoppingCart, Warehouse } from "lucide-react";
import Link from "next/link";
import { ReorderButton } from "@/components/orders/ReorderButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageTitle } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/LinkButton";
import { SideCard } from "@/components/ui/SideCard";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { formatAmount } from "@/lib/catalog";
import { formatPhone } from "@/lib/phone";
import { listOrders } from "@/server/orders";
import { listMyStock } from "@/server/stock";
import { getCart } from "@/server/cart";
import { getProfile } from "@/server/profile";
import { CartView } from "./CartView";

export const metadata = { title: "Savat" };

export default async function CartPage() {
  const user = await requireUser("buyer");
  const t = getDictionary(await getLocale());
  const [cart, profile] = await Promise.all([getCart(user.id), getProfile(user.id)]);
  const p = profile?.profile;
  const empty = cart.groups.length === 0;
  // Savat bo'sh: omborda kam qolganlar va oxirgi buyurtmalarni qayta buyurtma qilish taklifi.
  const [stock, recent] = empty ? await Promise.all([listMyStock(user.id), listOrders(user, { limit: 3 })]) : [[], []];
  const low = stock.filter((r) => r.low).slice(0, 5);

  return (
    <section className="flex flex-col gap-5">
      <PageTitle>{t.nav.cart}</PageTitle>
      {empty ? (
        <>
          <EmptyState Icon={ShoppingCart} title={t.cart.empty} hint={t.cart.emptyHint} action={<LinkButton href="/catalog">{t.nav.catalog}</LinkButton>} />
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <SideCard Icon={Warehouse} title={t.cart.lowTitle}>
              {low.length === 0 ? (
                <p className="text-muted">{t.cart.lowNone}</p>
              ) : (
                <ul className="-mx-2 flex flex-col">
                  {low.map((r) => (
                    <li key={r.id}>
                      <Link href={`/catalog/${r.productId}`} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-accent-soft/60">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{r.name}</span>
                          <span className="text-[12px] text-muted">{r.seller.name}</span>
                        </span>
                        <span className="shrink-0 text-right text-[13px]">
                          <b className="text-danger tabular-nums">{r.quantity}</b>
                          <span className="text-muted">
                            {" "}
                            / {r.minLevel} {t.units[r.unit as keyof typeof t.units] ?? r.unit}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </SideCard>
            <SideCard Icon={RotateCcw} title={t.cart.recentTitle}>
              {recent.length === 0 ? (
                <p className="text-muted">{t.cart.recentNone}</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {recent.map((o) => (
                    <li key={o.id} className="rounded-xl bg-surface-2/60 p-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <Link href={`/orders/${o.id}`} className="min-w-0 truncate font-semibold hover:text-accent">
                          №{o.number} · {o.seller.name}
                        </Link>
                        <b className="shrink-0 tabular-nums">{formatAmount(o.total)}</b>
                      </div>
                      <p className="mt-0.5 truncate text-[12px] text-muted">{o.items.map((i) => i.name).join(", ")}</p>
                      <div className="mt-2">
                        <ReorderButton items={o.items.map((i) => ({ productId: i.productId, quantity: i.quantity }))} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SideCard>
          </div>
        </>
      ) : (
        <>
          <p className="text-muted">{t.cart.perSeller}</p>
          <CartView
            groups={cart.groups}
            defaults={{ phone: formatPhone(user.phone), region: user.region, address: p?.address ?? "", point: p?.lat != null && p?.lng != null ? { lat: p.lat, lng: p.lng } : null }}
          />
        </>
      )}
    </section>
  );
}
