import { ShoppingCart } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageTitle } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/LinkButton";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { formatPhone } from "@/lib/phone";
import { getCart } from "@/server/cart";
import { getProfile } from "@/server/profile";
import { CartView } from "./CartView";

export const metadata = { title: "Savat" };

export default async function CartPage() {
  const user = await requireUser("buyer");
  const t = getDictionary(await getLocale());
  const [cart, profile] = await Promise.all([getCart(user.id), getProfile(user.id)]);
  const p = profile?.profile;

  return (
    <section className="flex flex-col gap-5">
      <PageTitle>{t.nav.cart}</PageTitle>
      {cart.groups.length === 0 ? (
        <EmptyState Icon={ShoppingCart} title={t.cart.empty} hint={t.cart.emptyHint} action={<LinkButton href="/catalog">{t.nav.catalog}</LinkButton>} />
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
