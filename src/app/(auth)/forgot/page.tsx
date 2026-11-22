import { Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDictionary, getLocale } from "@/i18n/server";
import { smsEnabled } from "@/server/sms";
import { after } from "next/server";
import { botUsername, ensureWebhook } from "@/server/telegram";
import { ForgotForm } from "./ForgotForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.auth.forgotTitle };
}

/**
 * Unutilgan parolni tiklash: Telegram bot orqali (bepul — bot telefon egaligini tasdiqlaydi)
 * va/yoki SMS kod bilan. Ikkalasi ham sozlanmagan bo'lsa — kirish sahifasiga.
 */
export default async function ForgotPage() {
  const sms = smsEnabled();
  const bot = await botUsername();
  after(() => ensureWebhook());
  if (!sms && !bot) redirect("/login");
  const t = getDictionary(await getLocale());
  return (
    <div className="flex flex-col gap-6">
      {bot && (
        <section className="flex flex-col gap-3">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight">{sms ? t.auth.forgotTitle : t.auth.tgResetTitle}</h1>
            <p className="mt-1.5 text-muted">{t.auth.tgResetLead}</p>
          </div>
          <a
            href={`https://t.me/${bot}?start=reset`}
            target="_blank"
            rel="noreferrer"
            className="btn-primary sheen inline-flex h-12 items-center justify-center gap-2 rounded-xl text-[15px] font-semibold transition-all hover:brightness-110"
          >
            <Send size={18} aria-hidden />
            {t.auth.tgResetOpen}
          </a>
          {!sms && (
            <Link href="/login" className="w-fit text-[14px] font-semibold text-accent hover:underline">
              {t.auth.backToLogin}
            </Link>
          )}
        </section>
      )}
      {sms && (
        <>
          {bot && <hr className="border-line" />}
          <ForgotForm />
        </>
      )}
    </div>
  );
}
