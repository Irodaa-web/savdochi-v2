"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Card";
import { PasswordField, TextField } from "@/components/ui/Field";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";
import type { OnlinePaySettings } from "@/server/onlinePay";

/** Kompaniya: Payme va Click merchant hisoblarini ulash. Kalitlar faqat yoziladi, hech qachon ko'rsatilmaydi. */
export function OnlinePayForm({ sellerId, initial }: { sellerId: string; initial: OnlinePaySettings }) {
  const { t } = useI18n();
  const errors = t.errors as Record<string, string>;
  const [settings, setSettings] = useState(initial);
  const [payme, setPayme] = useState({ merchantId: initial.payme?.merchantId ?? "", key: "" });
  const [click, setClick] = useState({ serviceId: initial.click?.serviceId ?? "", merchantId: initial.click?.merchantId ?? "", secret: "" });
  const [origin, setOrigin] = useState("");
  const [busy, setBusy] = useState<"payme" | "click" | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  useEffect(() => setOrigin(window.location.origin), []);

  async function save(which: "payme" | "click", remove = false) {
    setBusy(which);
    setMessage(null);
    const body =
      which === "payme"
        ? { payme: remove ? null : { merchantId: payme.merchantId, key: payme.key || undefined } }
        : { click: remove ? null : { serviceId: click.serviceId, merchantId: click.merchantId, secret: click.secret || undefined } };
    const res = await api<OnlinePaySettings>("/api/v1/profile/payments", { method: "PUT", body });
    setBusy(null);
    if (!res.ok) {
      const field = res.fields && Object.values(res.fields)[0];
      return setMessage({ tone: "danger", text: (field && errors[field]) || errors[res.error] || errors.INVALID_INPUT! });
    }
    setSettings(res.data);
    setPayme((p) => ({ ...p, key: "", ...(remove && which === "payme" ? { merchantId: "" } : {}) }));
    setClick((c) => ({ ...c, secret: "", ...(remove && which === "click" ? { serviceId: "", merchantId: "" } : {}) }));
    setMessage({ tone: "success", text: t.onlinePay.saved });
  }

  const Url = ({ label, value }: { label: string; value: string }) => (
    <label className="flex flex-col gap-1 text-[13px] sm:col-span-2">
      <span className="font-medium">{label}</span>
      <input readOnly value={value} onFocus={(e) => e.target.select()} className="h-9 rounded-lg border border-line bg-surface-2 px-3 font-mono text-[12px]" />
    </label>
  );

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      <h2 className="font-semibold">{t.onlinePay.title}</h2>
      <p className="-mt-2 text-[13px] text-muted">{t.onlinePay.lead}</p>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      <div className="grid gap-3 rounded-lg border border-line p-4 sm:grid-cols-2">
        <div className="flex items-center gap-2 sm:col-span-2">
          <b>{t.onlinePay.payme}</b>
          {settings.payme?.hasKey && <Pill tone="success">{t.onlinePay.enabled}</Pill>}
        </div>
        <TextField label={t.onlinePay.merchantId} value={payme.merchantId} onChange={(e) => setPayme({ ...payme, merchantId: e.target.value })} autoComplete="off" />
        <PasswordField showLabel={t.auth.showPassword} hideLabel={t.auth.hidePassword} label={t.onlinePay.key} value={payme.key} onChange={(e) => setPayme({ ...payme, key: e.target.value })} placeholder={settings.payme?.hasKey ? t.onlinePay.keySaved : ""} autoComplete="new-password" />
        {origin && <Url label={t.onlinePay.endpoint} value={`${origin}/api/v1/pay/payme/${sellerId}`} />}
        <div className="flex gap-2 sm:col-span-2">
          <Button type="button" variant="secondary" onClick={() => save("payme")} loading={busy === "payme"} disabled={!payme.merchantId}>
            {t.onlinePay.save}
          </Button>
          {settings.payme && (
            <Button type="button" variant="ghost" onClick={() => save("payme", true)} disabled={busy !== null}>
              {t.onlinePay.disable}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-line p-4 sm:grid-cols-2">
        <div className="flex items-center gap-2 sm:col-span-2">
          <b>{t.onlinePay.click}</b>
          {settings.click?.hasSecret && <Pill tone="success">{t.onlinePay.enabled}</Pill>}
        </div>
        <TextField label={t.onlinePay.serviceId} value={click.serviceId} onChange={(e) => setClick({ ...click, serviceId: e.target.value })} autoComplete="off" />
        <TextField label={t.onlinePay.clickMerchantId} value={click.merchantId} onChange={(e) => setClick({ ...click, merchantId: e.target.value })} autoComplete="off" />
        <div className="sm:col-span-2">
          <PasswordField showLabel={t.auth.showPassword} hideLabel={t.auth.hidePassword} label={t.onlinePay.secret} value={click.secret} onChange={(e) => setClick({ ...click, secret: e.target.value })} placeholder={settings.click?.hasSecret ? t.onlinePay.keySaved : ""} autoComplete="new-password" />
        </div>
        {origin && (
          <>
            <Url label={t.onlinePay.prepareUrl} value={`${origin}/api/v1/pay/click/${sellerId}/prepare`} />
            <Url label={t.onlinePay.completeUrl} value={`${origin}/api/v1/pay/click/${sellerId}/complete`} />
          </>
        )}
        <div className="flex gap-2 sm:col-span-2">
          <Button type="button" variant="secondary" onClick={() => save("click")} loading={busy === "click"} disabled={!click.serviceId || !click.merchantId}>
            {t.onlinePay.save}
          </Button>
          {settings.click && (
            <Button type="button" variant="ghost" onClick={() => save("click", true)} disabled={busy !== null}>
              {t.onlinePay.disable}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
