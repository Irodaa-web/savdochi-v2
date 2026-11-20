"use client";

import { ListPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";

/** Do'kon: buyurtmani doimiy ro'yxat sifatida saqlash (yangi ro'yxat yoki mavjudiga qo'shish). */
export function SaveAsList({ orderId, defaultName, lists }: { orderId: string; defaultName: string; lists: { id: string; name: string }[] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [name, setName] = useState(defaultName);
  const [listId, setListId] = useState(lists[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await api("/api/v1/lists", { body: mode === "new" ? { orderId, name } : { orderId, listId } });
    setBusy(false);
    if (res.ok) setDone(true);
    else {
      const errors = t.errors as Record<string, string>;
      setError(errors[res.fields?.name ?? res.fields?.items ?? res.error] ?? errors.SERVER_ERROR!);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => {
          setDone(false);
          setError(null);
          setOpen(true);
        }}
      >
        <ListPlus size={16} aria-hidden />
        {t.lists.saveOrder}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t.lists.saveOrder}>
        {done ? (
          <div className="flex flex-col gap-3">
            <Alert tone="success">{t.lists.saved}</Alert>
            <Link href="/lists" className="font-semibold text-accent hover:underline">
              {t.lists.open} →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-[13px] text-muted">{t.lists.saveHint}</p>
            {error && <Alert>{error}</Alert>}
            {lists.length > 0 && (
              <div role="radiogroup" className="flex flex-col gap-2 text-[14px]">
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="radio" name="mode" checked={mode === "new"} onChange={() => setMode("new")} className="accent-[var(--c-accent)]" />
                  {t.lists.newList}
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="radio" name="mode" checked={mode === "existing"} onChange={() => setMode("existing")} className="accent-[var(--c-accent)]" />
                  {t.lists.addToExisting}
                </label>
              </div>
            )}
            {mode === "new" ? (
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium">{t.lists.name}</span>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="h-10 rounded-lg border border-line bg-surface px-3 outline-none focus:border-accent" />
              </label>
            ) : (
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium">{t.lists.pick}</span>
                <select value={listId} onChange={(e) => setListId(e.target.value)} className="h-10 rounded-lg border border-line bg-surface px-3 outline-none focus:border-accent">
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button type="button" onClick={save} loading={busy}>
                {t.lists.save}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
