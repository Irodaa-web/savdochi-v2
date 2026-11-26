"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/apiClient";
import { compressImage } from "@/lib/compressImage";

type Kind = "logo" | "banner";

/**
 * Kompaniya logotipi va banneri: tanlanadi → brauzerda kichraytiriladi → yuklanadi → darhol saqlanadi.
 * Katalogdagi kompaniya kartasida va kompaniya sahifasida ko'rinadi.
 */
/** company — kompaniya: logotip va banner; do'kon — faqat hisob rasmi. */
export function BrandForm({ initial, name, company }: { initial: { logo: string; banner: string }; name: string; company: boolean }) {
  const { t } = useI18n();
  const b = t.brand;
  const errors = t.errors as Record<string, string>;
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputs = { logo: useRef<HTMLInputElement>(null), banner: useRef<HTMLInputElement>(null) };

  async function save(kind: Kind, url: string) {
    const res = await api("/api/v1/profile/brand", { method: "PUT", body: { [kind]: url } });
    if (!res.ok) throw new Error(errors[res.fields?.[kind] ?? res.error] ?? errors.SERVER_ERROR);
    setValue((v) => ({ ...v, [kind]: url }));
    router.refresh();
  }

  async function upload(kind: Kind, file: File | undefined) {
    if (!file) return;
    setBusy(kind);
    setError(null);
    try {
      const body = new FormData();
      // Logotip kichik (512 px yetadi), banner keng (1600 px).
      body.append("file", await compressImage(file, kind === "logo" ? 512 : 1600));
      body.append("kind", kind);
      const res = await fetch("/api/v1/uploads", { method: "POST", body }).then((r) => r.json()).catch(() => null);
      if (!res?.ok) throw new Error(errors[res?.fields?.file ?? res?.error ?? "SERVER_ERROR"] ?? errors.SERVER_ERROR);
      await save(kind, res.data.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
      const el = inputs[kind].current;
      if (el) el.value = "";
    }
  }

  async function remove(kind: Kind) {
    setBusy(kind);
    setError(null);
    try {
      await save(kind, "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const picker = (kind: Kind) => (
    <input ref={inputs[kind]} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => upload(kind, e.target.files?.[0])} aria-label={kind === "logo" ? b.logo : b.banner} />
  );
  const actions = (kind: Kind) => (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="secondary" loading={busy === kind} onClick={() => inputs[kind].current?.click()}>
        <ImagePlus size={16} aria-hidden />
        {value[kind] ? b.change : b.upload}
      </Button>
      {value[kind] && (
        <Button type="button" variant="ghost" disabled={busy !== null} onClick={() => remove(kind)}>
          <Trash2 size={16} aria-hidden />
          {b.remove}
        </Button>
      )}
    </div>
  );

  return (
    <section className="glass-card flex flex-col gap-4 rounded-2xl p-5">
      <div>
        <h2 className="font-semibold">{company ? b.title : b.titleShop}</h2>
        <p className="mt-1 text-[13px] text-muted">{company ? b.lead : b.leadShop}</p>
      </div>

      {company && (
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold">{b.banner}</span>
        <div className="relative aspect-[4/1] w-full overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 via-indigo-500 to-sky-400">
          {/* eslint-disable-next-line @next/next/no-img-element -- oldindan ko'rish: yuklangan manzil darhol ko'rinsin */}
          {value.banner && <img src={value.banner} alt="" className="absolute inset-0 size-full object-cover" />}
          {!value.banner && <span className="absolute inset-0 flex items-center justify-center text-[13px] font-semibold text-white/85">{b.bannerEmpty}</span>}
        </div>
        <p className="text-[12px] text-muted">{b.bannerHint}</p>
        {picker("banner")}
        {actions("banner")}
      </div>
      )}

      <div className={company ? "flex flex-col gap-2 border-t border-line pt-4" : "flex flex-col gap-2"}>
        <span className="text-[13px] font-semibold">{company ? b.logo : b.logoShop}</span>
        <div className="flex items-center gap-4">
          {value.logo ? (
            <span className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-line">
              {/* eslint-disable-next-line @next/next/no-img-element -- oldindan ko'rish: yuklangan manzil darhol ko'rinsin */}
              <img src={value.logo} alt="" className="absolute inset-0 size-full object-cover" />
            </span>
          ) : (
            <Avatar name={name} size="lg" className="size-20 text-[20px]" />
          )}
          <div className="flex flex-col gap-2">
            <p className="text-[12px] text-muted">{b.logoHint}</p>
            {picker("logo")}
            {actions("logo")}
          </div>
        </div>
      </div>
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </section>
  );
}
