import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { ProductForm } from "../ProductForm";

export default async function NewProductPage() {
  await requireUser("seller");
  const t = getDictionary(await getLocale());
  return (
    <section className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold tracking-tight">{t.products.newTitle}</h1>
      <ProductForm />
    </section>
  );
}
