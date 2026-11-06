import { Heart } from "lucide-react";
import { ProductCard } from "@/components/catalog/ProductCard";
import { PageTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { listFavorites } from "@/server/products";

export const metadata = { title: "Saqlanganlar" };

export default async function FavoritesPage() {
  const user = await requireUser("buyer");
  const t = getDictionary(await getLocale());
  const items = await listFavorites(user.id);
  return (
    <section className="flex flex-col gap-5">
      <PageTitle>{t.favorites.title}</PageTitle>
      {items.length === 0 ? (
        <EmptyState Icon={Heart} title={t.favorites.empty} hint={t.favorites.emptyHint} action={<LinkButton href="/catalog">{t.nav.catalog}</LinkButton>} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} t={t} />
          ))}
        </div>
      )}
    </section>
  );
}
