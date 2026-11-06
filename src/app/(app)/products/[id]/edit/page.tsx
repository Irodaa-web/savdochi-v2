import { notFound } from "next/navigation";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { getProduct } from "@/server/products";
import { ProductForm } from "../../ProductForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("seller");
  const t = getDictionary(await getLocale());
  const product = await getProduct((await params).id);
  if (!product || !product.active || product.seller.id !== user.id) notFound();
  return (
    <section className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold tracking-tight">{t.products.editTitle}</h1>
      <ProductForm product={product} />
    </section>
  );
}
