"use client";

import { LocateFixed, MapPin } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";

export type Point = { lat: number; lng: number } | null;

/** Yetkazish nuqtasi: telefon joylashuvi orqali olinadi va xaritada ko'rsatiladi (OpenStreetMap). */
export function LocationField({ value, onChange }: { value: Point; onChange: (p: Point) => void }) {
  const { t } = useI18n();
  const [state, setState] = useState<"idle" | "busy" | "denied" | "failed">("idle");

  function locate() {
    if (!navigator.geolocation) return setState("failed");
    setState("busy");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)) });
        setState("idle");
      },
      (err) => setState(err.code === err.PERMISSION_DENIED ? "denied" : "failed"),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  const d = 0.004;
  const embed = value
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${value.lng - d}%2C${value.lat - d}%2C${value.lng + d}%2C${value.lat + d}&layer=mapnik&marker=${value.lat}%2C${value.lng}`
    : null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium">{t.checkout.location}</span>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" onClick={locate} loading={state === "busy"}>
          <LocateFixed size={16} aria-hidden />
          {t.checkout.locate}
        </Button>
        {value && (
          <>
            <a href={`https://www.openstreetmap.org/?mlat=${value.lat}&mlon=${value.lng}#map=17/${value.lat}/${value.lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent hover:underline">
              <MapPin size={14} aria-hidden />
              {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
            </a>
            <button type="button" onClick={() => onChange(null)} className="cursor-pointer text-[13px] text-muted hover:text-danger">
              {t.checkout.clearLocation}
            </button>
          </>
        )}
      </div>
      {state === "denied" && <p className="text-[13px] text-danger">{t.checkout.locationDenied}</p>}
      {state === "failed" && <p className="text-[13px] text-danger">{t.checkout.locationFailed}</p>}
      {embed && <iframe title={t.checkout.location} src={embed} className="h-48 w-full rounded-lg border border-line" loading="lazy" />}
      <p className="text-[12px] text-muted">{t.checkout.locationHint}</p>
    </div>
  );
}
