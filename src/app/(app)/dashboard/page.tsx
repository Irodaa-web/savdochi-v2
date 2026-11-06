import { Package, Plus } from "lucide-react";
import Link from "next/link";
import { Welcome } from "@/components/Welcome";
import { LinkButton } from "@/components/ui/LinkButton";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { listSellerProducts } from "@/server/products";

export default async function DashboardPage() {
  const user = await requireUser("seller");
  const t = getDictionary(await getLocale());
  const products = await listSellerProducts(user.id);
  const low = products.filter((p) => p.stock < p.minOrder);

  return (
    <div className="flex flex-col gap-5">
      <Welcome user={user} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/products" className="flex items-center gap-4 rounded-xl border border-line bg-surface p-5 hover:border-muted/40">
          <span className="flex size-11 items-center justify-center rounded-lg bg-surface-2 text-muted">
            <Package size={20} aria-hidden />
          </span>
          <span>
            <span className="block text-[13px] text-muted">{t.products.title}</span>
            <span className="text-2xl font-bold">{products.length}</span>
          </span>
        </Link>
        <div className="flex items-center gap-4 rounded-xl border border-line bg-surface p-5">
          <span className="flex size-11 items-center justify-center rounded-lg bg-danger-soft text-danger">
            <Package size={20} aria-hidden />
          </span>
          <span>
            <span className="block text-[13px] text-muted">{t.catalog.outOfStock}</span>
            <span className="text-2xl font-bold">{low.length}</span>
          </span>
        </div>
      </div>
      <LinkButton href="/products/new" className="w-fit">
        <Plus size={16} aria-hidden />
        {t.products.add}
      </LinkButton>
    </div>
  );
}
