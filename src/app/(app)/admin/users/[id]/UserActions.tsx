"use client";

import { BadgeCheck, CalendarPlus, CalendarX, Eye, EyeOff, Lock, LockOpen, RotateCcw, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";
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
          <span className={title}>{t.subscription.title}</span>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => act("m1", { extendMonths: 1 }, a.doneExtended)} loading={busy === "m1"}>
              <CalendarPlus size={16} aria-hidden />
              {t.admin.extend1}
            </Button>
            <Button type="button" variant="secondary" onClick={() => act("m12", { extendMonths: 12 }, a.doneExtended)} loading={busy === "m12"}>
              <CalendarPlus size={16} aria-hidden />
              {t.admin.extend12}
            </Button>
            <Button type="button" variant="ghost" onClick={() => act("stop", { extendMonths: -1 }, a.doneStopped, a.stopConfirm)} loading={busy === "stop"}>
              <CalendarX size={16} aria-hidden />
              {a.stopSubscription}
            </Button>
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
