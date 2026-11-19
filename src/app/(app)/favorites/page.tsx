import { Heart, Sparkles } from "lucide-react";
import { ProductCard } from "@/components/catalog/ProductCard";
import { PageTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { listCatalog, listFavorites } from "@/server/products";

export const metadata = { title: "Saqlanganlar" };

export default async function FavoritesPage() {
  const user = await requireUser("buyer");
  const t = getDictionary(await getLocale());
  const [items, latest] = await Promise.all([listFavorites(user.id), listCatalog({})]);
  // Tavsiyalar: saqlanmaganlar orasidan avval shu kompaniyalar va kategoriyalardagilari.
  const saved = new Set(items.map((p) => p.id));
  const sellers = new Set(items.map((p) => p.seller.id));
  const categories = new Set(items.map((p) => p.category));
  const score = (p: (typeof latest.items)[number]) => (sellers.has(p.seller.id) ? 2 : 0) + (categories.has(p.category) ? 1 : 0);
  const suggestions = latest.items
    .filter((p) => !saved.has(p.id))
    .sort((a, b) => score(b) - score(a))
    .slice(0, 5);

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

      {suggestions.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-[17px] font-bold">
                <Sparkles size={18} className="text-accent" aria-hidden />
                {t.favorites.moreTitle}
              </h2>
              <p className="text-[13px] text-muted">{items.length ? t.favorites.moreLead : t.home.newProducts}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {suggestions.map((p) => (
              <ProductCard key={p.id} product={p} t={t} />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
