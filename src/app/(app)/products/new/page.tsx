import { getDictionary, getLocale } from "@/i18n/server";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { fmt } from "@/i18n/format";
import { requireUser } from "@/lib/auth/guard";
import { atLimit, planHas, PLANS } from "@/lib/plans";
import { planUsage } from "@/server/plans";
import { ProductForm } from "../ProductForm";

export default async function NewProductPage() {
  const user = await requireUser("seller", { staff: ["manager"] });
  const t = getDictionary(await getLocale());
  // Tarif chegarasiga yetgan bo'lsa — forma o'rniga izoh (server baribir PLAN_LIMIT qaytaradi).
  const limit = PLANS[user.plan].products;
  if (atLimit(limit, (await planUsage(user.id)).products))
    return (
      <section className="flex flex-col gap-5">
        <h1 className="text-2xl font-bold tracking-tight">{t.products.newTitle}</h1>
        <Alert tone="info">
          {fmt(t.plans.productLimit, { limit: limit ?? 0 })}{" "}
          {!user.staff && (
            <Link href="/billing" className="font-semibold underline">
              {t.plans.lockedCta}
            </Link>
          )}
        </Alert>
      </section>
    );
  return (
    <section className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold tracking-tight">{t.products.newTitle}</h1>
      <ProductForm canSale={planHas(user.plan, "sale")} owner={!user.staff} />
    </section>
  );
}
