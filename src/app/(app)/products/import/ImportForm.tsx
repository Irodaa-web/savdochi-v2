"use client";

import clsx from "clsx";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { formatAmount } from "@/lib/catalog";
import type { ApiResult } from "@/lib/apiClient";
import type { ImportResult } from "@/server/productImport";

/** Excel yuklash: 1) fayl tanlanadi va tahlil qilinadi, 2) natija ko'rsatiladi, 3) tasdiqlansa saqlanadi. */
export function ImportForm() {
  const { t } = useI18n();
  const router = useRouter();
  const errors = t.errors as Record<string, string>;
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"analyze" | "save" | null>(null);
  const [drag, setDrag] = useState(false);

  async function send(f: File, commit: boolean): Promise<ImportResult | null> {
    const body = new FormData();
    body.append("file", f);
    if (commit) body.append("commit", "1");
    const res: ApiResult<ImportResult> | null = await fetch("/api/v1/products/import", { method: "POST", body })
      .then((r) => r.json())
      .catch(() => null);
    if (res?.ok) return res.data;
    const code = res && !res.ok ? (res.fields?.file ?? res.error) : "NETWORK";
    setError(errors[code] ?? errors.SERVER_ERROR!);
    return null;
  }

  async function analyze(f: File | undefined) {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);
    setBusy("analyze");
    setResult(await send(f, false));
    setBusy(null);
    if (input.current) input.current.value = "";
  }

  async function save() {
    if (!file) return;
    setBusy("save");
    setError(null);
    const done = await send(file, true);
    setBusy(null);
    if (done) {
      setResult(done);
      router.refresh();
    }
  }

  const valid = result ? result.created + result.updated : 0;
  const fieldLabel = (field: string) => {
    const label = (t.products as Record<string, unknown>)[field];
    return typeof label === "string" ? label : null;
  };

  return (
    <div className="flex max-w-5xl flex-col gap-5">
      <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
        <p className="leading-relaxed">{t.products.importIntro}</p>
        <p className="text-[13px] text-muted">{t.products.importRequired}</p>
        <a href="/api/v1/products/import/template" className="inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-accent hover:underline">
          <Download size={15} aria-hidden />
          {t.products.importTemplate}
        </a>
      </section>

      {!result?.committed && (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            analyze(e.dataTransfer.files[0]);
          }}
          disabled={busy !== null}
          className={clsx(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors disabled:cursor-wait",
            drag ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent",
          )}
        >
          {busy === "analyze" ? (
            <span className="size-7 animate-spin rounded-full border-2 border-accent border-r-transparent" aria-hidden />
          ) : (
            <FileSpreadsheet size={32} className="text-accent" aria-hidden />
          )}
          <span className="font-semibold">{busy === "analyze" ? t.products.importAnalyzing : file && result ? t.products.importOther : t.products.importChoose}</span>
          <span className="text-[13px] text-muted">{file && result ? file.name : t.products.importChooseHint}</span>
        </button>
      )}
      <input ref={input} type="file" hidden accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => analyze(e.target.files?.[0])} />

      {error && <Alert>{error}</Alert>}

      {result && (
        <section className="flex flex-col gap-3">
          {result.committed ? (
            <Alert tone="success">{fmt(t.products.importDone, { create: result.created, update: result.updated })}</Alert>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold">{fmt(t.products.importSummary, { create: result.created, update: result.updated, error: result.failed })}</p>
              <Button onClick={save} loading={busy === "save"} disabled={valid === 0 || busy !== null}>
                <Upload size={16} aria-hidden />
                {fmt(t.products.importSave, { n: valid })}
              </Button>
            </div>
          )}
          {!result.committed && result.failed > 0 && <Alert tone="info">{valid ? t.products.importErrorsNote : t.products.importNothing}</Alert>}

          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="px-3 py-2.5 font-medium">{t.products.importColRow}</th>
                  <th className="px-3 py-2.5 font-medium">{t.products.colName}</th>
                  <th className="px-3 py-2.5 font-medium">{t.products.category}</th>
                  <th className="px-3 py-2.5 font-medium">{t.products.unit}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{t.products.colPrice}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{t.products.colStock}</th>
                  <th className="px-3 py-2.5 font-medium">{t.products.importColStatus}</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r) => (
                  <tr key={r.row} className={clsx("border-b border-line align-top last:border-0", r.action === "error" && "bg-danger-soft/40")}>
                    <td className="px-3 py-2.5 text-muted tabular-nums">{r.row}</td>
                    <td className="px-3 py-2.5 font-medium">{r.name || "—"}</td>
                    <td className="px-3 py-2.5">{r.category ? t.categories[r.category] : "—"}</td>
                    <td className="px-3 py-2.5">{r.unit ? t.units[r.unit] : "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.price != null ? formatAmount(r.price) : "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.stock ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={clsx(
                          "inline-block rounded-md px-2 py-0.5 text-[12px] font-semibold",
                          r.action === "create" && "bg-success-soft text-success",
                          r.action === "update" && "bg-accent-soft text-accent",
                          r.action === "error" && "bg-danger-soft text-danger",
                        )}
                      >
                        {r.action === "create" ? t.products.importCreate : r.action === "update" ? t.products.importUpdate : t.products.importError}
                      </span>
                      {Object.entries(r.errors).map(([field, code]) => (
                        <div key={field} className="mt-1 text-danger">
                          {fieldLabel(field) && field !== "name" ? `${fieldLabel(field)}: ` : ""}
                          {errors[code] ?? errors.INVALID_INPUT}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.committed && (
            <div className="flex gap-3">
              <Button onClick={() => router.push("/products")}>{t.products.title} →</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setResult(null);
                  setFile(null);
                }}
              >
                {t.products.importOther}
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
