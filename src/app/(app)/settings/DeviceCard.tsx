"use client";

import { BellRing, Download, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Card";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type PushState = "loading" | "unsupported" | "needsInstall" | "denied" | "off" | "on";

/** base64url → Uint8Array (VAPID ochiq kaliti uchun). */
function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Telefon: ilovani ekranga o'rnatish va shu qurilmaga bildirishnomalar (Web Push).
 * iPhone'da bildirishnoma faqat ekranga o'rnatilgan ilovada ishlaydi — shuni tushuntiradi.
 */
export function DeviceCard() {
  const { t } = useI18n();
  const d = t.device;
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [push, setPush] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setInstalled(standalone);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setInstalled(true));

    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setPush(isIos && !standalone ? "needsInstall" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setPush("denied");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setPush(sub ? "on" : "off");
    })().catch(() => setPush("unsupported"));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function enable() {
    setBusy(true);
    try {
      if ((await Notification.requestPermission()) !== "granted") return setPush("denied");
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const key = await api<{ publicKey: string }>("/api/v1/push");
      if (!key.ok) return;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key.data.publicKey) });
      const res = await api("/api/v1/push", { body: sub.toJSON() });
      setPush(res.ok ? "on" : "off");
    } catch {
      setPush("unsupported");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await api("/api/v1/push", { method: "DELETE", body: { endpoint: sub.endpoint } });
      await sub.unsubscribe();
    }
    setPush("off");
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* O'rnatish: faqat bir bosishda o'rnatish mumkin bo'lsa (Android/kompyuter Chrome) yoki o'rnatilgan bo'lsa.
          Qo'lda o'rnatish yo'riqnomasi yon kartada turibdi. */}
      {(installed || install) && (
        <div className="flex flex-col gap-2 border-b border-line pb-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Smartphone size={18} aria-hidden />
            {d.installTitle}
          </h2>
          {installed ? (
            <Pill tone="success">{d.installed}</Pill>
          ) : install ? (
            <>
              <p className="text-[14px] text-muted">{d.installText}</p>
              <Button
                type="button"
                variant="secondary"
                className="w-fit"
                onClick={async () => {
                  await install.prompt();
                  setInstall(null);
                }}
              >
                <Download size={16} aria-hidden />
                {d.install}
              </Button>
            </>
          ) : null}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold">
            <BellRing size={18} aria-hidden />
            {d.pushTitle}
          </h2>
          {push === "on" && <Pill tone="success">{d.pushOn}</Pill>}
        </div>
        <p className="text-[14px] text-muted">{d.pushText}</p>
        {push === "off" && (
          <Button type="button" className="w-fit" onClick={enable} loading={busy}>
            {d.pushEnable}
          </Button>
        )}
        {push === "on" && (
          <Button type="button" variant="secondary" className="w-fit" onClick={disable} loading={busy}>
            {d.pushDisable}
          </Button>
        )}
        {push === "denied" && <p className="text-[13px] text-danger">{d.pushDenied}</p>}
        {push === "needsInstall" && <p className="text-[13px] text-muted">{d.pushNeedsInstall}</p>}
        {push === "unsupported" && <p className="text-[13px] text-muted">{d.pushUnsupported}</p>}
      </div>
    </div>
  );
}
