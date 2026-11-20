import type { Metadata } from "next";
import { getDictionary, getLocale } from "@/i18n/server";
import { NewPasswordForm } from "./NewPasswordForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.auth.newPasswordTitle };
}

/** Telegram bot bergan havola: ?p=<telefon>&k=<bir martalik kalit> — yangi parol qo'yish. */
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ p?: string; k?: string }> }) {
  const { p = "", k = "" } = await searchParams;
  return <NewPasswordForm phone={p} resetKey={k} />;
}
