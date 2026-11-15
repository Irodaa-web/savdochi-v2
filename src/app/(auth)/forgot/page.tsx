import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDictionary, getLocale } from "@/i18n/server";
import { smsEnabled } from "@/server/sms";
import { ForgotForm } from "./ForgotForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.auth.forgotTitle };
}

/** Unutilgan parolni SMS kod bilan tiklash. SMS sozlanmagan bo'lsa — kirish sahifasiga. */
export default function ForgotPage() {
  if (!smsEnabled()) redirect("/login");
  return <ForgotForm />;
}
