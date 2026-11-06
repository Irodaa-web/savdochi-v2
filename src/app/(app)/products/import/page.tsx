import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { ImportForm } from "./ImportForm";

export default async function ImportProductsPage() {
  await requireUser("seller");
  const t = getDictionary(await getLocale());
  return (
    <section className="flex flex-col gap-5">
      <Link href="/products" className="inline-flex w-fit items-center gap-1.5 text-muted hover:text-text">
        <ArrowLeft size={16} aria-hidden />
        {t.products.title}
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">{t.products.importTitle}</h1>
      <ImportForm />
    </section>
  );
}
