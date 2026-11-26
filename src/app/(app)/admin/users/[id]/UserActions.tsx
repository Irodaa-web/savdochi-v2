"use client";

import { BadgeCheck, CalendarPlus, CalendarX, Eye, EyeOff, Gift, Lock, LockOpen, RotateCcw, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { api } from "@/lib/apiClient";
import type { Verification } from "@/models/User";

type Props = {
  id: string;
  role: "buyer" | "seller";
  verification: Verification;
  blocked: boolean;
  inactive: boolean;
  hidden: boolean;
  /** O'zi yoki boshqa administrator — bloklab bo'lmaydi. */
  protectedUser: boolean;
};

/** Administrator amallari: tasdiqlash / sabab bilan rad etish, obuna, katalogdan yashirish, nofaolni tiklash, bloklash. */
export function UserActions({ id, role, verification, blocked, inactive, hidden, protectedUser }: Props) {
  const { t } = useI18n();
  const a = t.adminPanel;
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [plan, setPlan] = useState<"standard" | "premium">("premium");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  async function act(key: string, body: Record<string, unknown>, done: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(key);
    setMessage(null);
    const res = await api(`/api/v1/admin/users/${id}`, { method: "PATCH", body });
    setBusy(null);
    if (res.ok) {
      setMessage({ tone: "success", text: done });
      setRejecting(false);
      router.refresh();
    } else {
      const errors = t.errors as Record<string, string>;
      setMessage({ tone: "danger", text: errors[res.fields?.blocked ?? res.error] ?? errors.SERVER_ERROR! });
    }
  }

  const group = "flex flex-col gap-2 rounded-xl border border-line bg-surface-2/40 p-3";
  const title = "text-[12px] font-semibold tracking-wide text-muted uppercase";

  return (
    <div className="flex flex-col gap-3">
      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      <div className={group}>
        <span className={title}>{a.verifyTitle}</span>
        <div className="flex flex-wrap gap-2">
          {verification !== "verified" && (
            <Button type="button" onClick={() => act("verify", { verification: "verified" }, a.doneVerified)} loading={busy === "verify"}>
              <BadgeCheck size={16} aria-hidden />
              {t.admin.verify}
            </Button>
          )}
          {verification !== "rejected" && (
            <Button type="button" variant="secondary" onClick={() => setRejecting((v) => !v)}>
              <XCircle size={16} aria-hidden />
              {t.admin.rejectVerify}
            </Button>
          )}
          {verification === "verified" && <span className="self-center text-[13px] text-muted">{a.alreadyVerified}</span>}
        </div>
        {rejecting && (
          <div className="flex flex-col gap-2">
            <textarea
              rows={2}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={a.rejectPlaceholder}
              aria-label={a.rejectReason}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-accent"
            />
            <Button type="button" variant="danger" className="self-start" disabled={reason.trim().length < 3} loading={busy === "reject"} onClick={() => act("reject", { verification: "rejected", reason }, a.doneRejected)}>
              {a.rejectSend}
            </Button>
          </div>
        )}
      </div>

      {role === "seller" && (
        <div className={group}>
          <span className={title}>{t.plans.adminSet}</span>
          <div role="radiogroup" aria-label={t.plans.title} className="flex w-fit gap-1 rounded-xl border border-line bg-surface-2/60 p-1">
            {(["standard", "premium"] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={plan === p}
                onClick={() => setPlan(p)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-semibold ${plan === p ? "bg-accent text-accent-fg" : "text-muted hover:text-text"}`}
              >
                {t.plans.names[p]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {[1, 3, 12].map((n) => (
              <Button key={n} type="button" variant="secondary" onClick={() => act(`m${n}`, { plan, extendMonths: n }, a.doneExtended)} loading={busy === `m${n}`}>
                <CalendarPlus size={16} aria-hidden />
                {fmt(t.plans.adminMonths, { n })}
              </Button>
            ))}
            <Button type="button" variant="ghost" onClick={() => act("stop", { plan: "free" }, a.doneStopped, a.stopConfirm)} loading={busy === "stop"}>
              <CalendarX size={16} aria-hidden />
              {a.stopSubscription}
            </Button>
          </div>
          {/* Sovg'a: tanlangan tarif to'lovsiz yoqiladi (daromadga qo'shilmaydi), kompaniyaga sovg'a xabari boradi. */}
          <div className="flex flex-col gap-2 rounded-xl border border-amber-300/60 bg-amber-50/70 p-3 dark:border-amber-300/25 dark:bg-amber-400/10">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-amber-800 dark:text-amber-200">
              <Gift size={15} aria-hidden />
              {t.plans.giftTitle}: {t.plans.names[plan]}
            </span>
            <span className="text-[12px] text-muted">{t.plans.giftHint}</span>
            <div className="flex flex-wrap gap-2">
              {[1, 3, 6, 12].map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant="secondary"
                  onClick={() => act(`g${n}`, { plan, extendMonths: n, gift: true }, t.plans.giftDone, fmt(t.plans.giftConfirm, { plan: t.plans.names[plan], n }))}
                  loading={busy === `g${n}`}
                >
                  <Gift size={16} aria-hidden />
                  {fmt(t.plans.giftBtn, { n })}
                </Button>
              ))}
            </div>
          </div>
          <span className={title}>{a.catalogTitle}</span>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => act("hide", { hidden: !hidden }, hidden ? a.doneShown : a.doneHidden)} loading={busy === "hide"}>
              {hidden ? <Eye size={16} aria-hidden /> : <EyeOff size={16} aria-hidden />}
              {hidden ? a.showInCatalog : a.hideFromCatalog}
            </Button>
            <span className="text-[12px] text-muted">{a.hideHint}</span>
          </div>
        </div>
      )}

      <div className={group}>
        <span className={title}>{a.accessTitle}</span>
        <div className="flex flex-wrap items-center gap-2">
          {inactive && (
            <Button type="button" variant="secondary" onClick={() => act("react", { reactivate: true }, a.doneReactivated)} loading={busy === "react"}>
              <RotateCcw size={16} aria-hidden />
              {a.reactivate}
            </Button>
          )}
          {protectedUser ? (
            <span className="text-[13px] text-muted">{a.cannotBlockAdmin}</span>
          ) : (
            <Button
              type="button"
              variant={blocked ? "secondary" : "danger"}
              onClick={() => act("block", { blocked: !blocked }, blocked ? a.doneUnblocked : a.doneBlocked, blocked ? undefined : t.admin.blockConfirm)}
              loading={busy === "block"}
            >
              {blocked ? <LockOpen size={16} aria-hidden /> : <Lock size={16} aria-hidden />}
              {blocked ? t.admin.unblock : t.admin.block}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
