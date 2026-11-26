"use client";

import clsx from "clsx";
import { KeyRound, Lock, LockOpen, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { fmt, useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";
import { formatPhone } from "@/lib/phone";
import { MAX_STAFF, STAFF_ROLES, type StaffRole } from "@/lib/staff";
import type { StaffView } from "@/server/staff";

/** Kompaniya egasi: xodim qo'shish, rolini o'zgartirish, bloklash, parolini yangilash, o'chirish. */
/** max — tarif va umumiy chegaradan kichigi; faol (bloklanmagan) xodimlar shu songacha qo'shiladi. */
export function StaffManager({ staff, lastActive, max = MAX_STAFF }: { staff: StaffView[]; lastActive: Record<string, string>; max?: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const errors = t.errors as Record<string, string>;
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", role: "manager" as StaffRole, password: "" });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [resetFor, setResetFor] = useState<StaffView | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const fe = (k: string) => (fields[k] ? (errors[fields[k]] ?? errors.INVALID_INPUT) : undefined);
  const roleOptions = STAFF_ROLES.map((r) => ({ value: r, label: t.staff.roles[r] }));

  async function add() {
    setBusy("add");
    setFields({});
    const res = await api("/api/v1/staff", { body: form });
    setBusy(null);
    if (res.ok) {
      setAdding(false);
      setForm({ name: "", phone: "", role: "manager", password: "" });
      setMessage({ tone: "success", text: fmt(t.staff.added, { name: form.name }) });
      router.refresh();
    } else setFields(res.fields ?? { name: res.error });
  }

  async function patch(s: StaffView, body: Record<string, unknown>, done?: string) {
    setBusy(s.id);
    const res = await api(`/api/v1/staff/${s.id}`, { method: "PATCH", body });
    setBusy(null);
    if (res.ok) {
      if (done) setMessage({ tone: "success", text: done });
      router.refresh();
      return true;
    }
    setMessage({ tone: "danger", text: errors[res.fields?.password ?? res.error] ?? errors.SERVER_ERROR! });
    return false;
  }

  async function remove(s: StaffView) {
    if (!window.confirm(fmt(t.staff.confirmRemove, { name: s.name }))) return;
    setBusy(s.id);
    const res = await api(`/api/v1/staff/${s.id}`, { method: "DELETE" });
    setBusy(null);
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] text-muted">{fmt(t.staff.count, { n: staff.filter((s) => !s.blocked).length, max })}</span>
        <Button type="button" onClick={() => setAdding(true)} disabled={staff.length >= MAX_STAFF || staff.filter((s) => !s.blocked).length >= max}>
          <UserPlus size={17} aria-hidden />
          {t.staff.add}
        </Button>
      </div>

      {staff.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[14px] text-muted">{t.staff.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {staff.map((s) => (
            <li key={s.id} className={clsx("glass-card flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl p-4", s.blocked && "opacity-70")}>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-[14px] font-bold text-accent">
                {s.name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase())
                  .join("")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {s.name}
                  {s.blocked && <span className="rounded-full bg-danger-soft px-2 text-[11px] leading-5 font-semibold text-danger">{t.staff.blocked}</span>}
                </p>
                <p className="text-[13px] text-muted">
                  {formatPhone(s.phone)} · {lastActive[s.id] ? fmt(t.staff.lastActive, { date: lastActive[s.id]! }) : t.staff.neverActive}
                </p>
              </div>
              <div className="w-44">
                <SelectField label={t.staff.role} value={s.role} disabled={busy === s.id} onChange={(e) => patch(s, { role: e.target.value }, t.staff.roleChanged)} options={roleOptions} />
              </div>
              <div className="flex gap-1">
                <IconButton label={t.staff.resetPassword} onClick={() => (setResetFor(s), setNewPassword(""))}>
                  <KeyRound size={16} aria-hidden />
                </IconButton>
                <IconButton label={s.blocked ? t.staff.unblock : t.staff.block} onClick={() => patch(s, { blocked: !s.blocked })} danger={!s.blocked}>
                  {s.blocked ? <LockOpen size={16} aria-hidden /> : <Lock size={16} aria-hidden />}
                </IconButton>
                <IconButton label={t.staff.remove} onClick={() => remove(s)} danger>
                  <Trash2 size={16} aria-hidden />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title={t.staff.add}>
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-muted">{t.staff.addHint}</p>
          <TextField label={t.auth.name} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} error={fe("name")} maxLength={120} />
          <TextField label={t.auth.phone} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} error={fe("phone")} inputMode="tel" placeholder="+998 90 123 45 67" />
          <SelectField label={t.staff.role} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as StaffRole }))} options={roleOptions} />
          <p className="-mt-2 rounded-lg bg-surface-2/70 px-3 py-2 text-[12px] text-muted">{t.staff.roleHints[form.role]}</p>
          <TextField label={t.staff.tempPassword} type="text" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} error={fe("password")} hint={t.staff.tempPasswordHint} autoComplete="off" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
              {t.common.cancel}
            </Button>
            <Button type="button" onClick={add} loading={busy === "add"}>
              {t.staff.addSubmit}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(resetFor)} onClose={() => setResetFor(null)} title={t.staff.resetPassword}>
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-muted">{fmt(t.staff.resetHint, { name: resetFor?.name ?? "" })}</p>
          <TextField label={t.staff.tempPassword} type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="off" hint={t.staff.tempPasswordHint} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setResetFor(null)}>
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              loading={busy === resetFor?.id}
              disabled={newPassword.length < 8}
              onClick={async () => {
                if (resetFor && (await patch(resetFor, { password: newPassword }, fmt(t.staff.passwordSet, { name: resetFor.name })))) setResetFor(null);
              }}
            >
              {t.staff.save}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function IconButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={clsx("flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors", danger ? "hover:bg-danger-soft hover:text-danger" : "hover:bg-surface-2 hover:text-accent")}
    >
      {children}
    </button>
  );
}
