import { ArrowLeft, Download, FileSpreadsheet, ListChecks } from "lucide-react";
import Link from "next/link";
import { SideCard } from "@/components/ui/SideCard";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { planHas } from "@/lib/plans";
import { PlanLocked } from "@/components/plans/PlanLocked";
import { ImportForm } from "./ImportForm";

export default async function ImportProductsPage() {
  const user = await requireUser("seller", { staff: ["manager"] });
  const t = getDictionary(await getLocale());
  const p = t.products;
  // Excel'dan yuklash — Premium tarif imkoniyati.
  if (!planHas(user.plan, "excel"))
    return (
      <section className="flex flex-col gap-5">
        <Link href="/products" className="inline-flex w-fit items-center gap-1.5 text-muted hover:text-text">
          <ArrowLeft size={16} aria-hidden />
          {p.title}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{p.importTitle}</h1>
        <PlanLocked feature="excel" t={t} owner={!user.staff} />
      </section>
    );
  // Ustunlar tartibi importdagi maydonlar bilan bir xil; birinchi uchtasi majburiy.
  const columns = [p.name, p.unit, p.price, p.category, p.stock, p.minOrder, p.packSize, p.description, p.importImagesCol];

  return (
    <section className="flex flex-col gap-5">
      <Link href="/products" className="inline-flex w-fit items-center gap-1.5 text-muted hover:text-text">
        <ArrowLeft size={16} aria-hidden />
        {p.title}
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">{p.importTitle}</h1>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <ImportForm />
        </div>

        <aside className="flex flex-col gap-4">
          <SideCard Icon={ListChecks} title={p.importStepsTitle}>
            <ol className="flex flex-col gap-3">
              {p.importSteps.map((step, i) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="btn-primary flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <a download href="/api/v1/products/import/template" className="inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-accent hover:underline">
              <Download size={15} aria-hidden />
              {p.importTemplate}
            </a>
          </SideCard>

          <SideCard Icon={FileSpreadsheet} title={p.importColumnsTitle}>
            <dl className="flex flex-col divide-y divide-line/70">
              {columns.map((label, i) => (
                <div key={label} className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <dt className="font-medium">
                    {label}
                    {i < 3 && <span className="text-danger"> *</span>}
                  </dt>
                  <dd className="min-w-0 truncate text-right text-[13px] text-muted">{p.importExamples[i]}</dd>
                </div>
              ))}
            </dl>
            <p className="text-[12px] text-muted">{p.requiredMark}</p>
          </SideCard>
        </aside>
      </div>
    </section>
  );
}
