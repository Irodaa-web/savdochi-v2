import type { Metadata } from "next";
import { Suspense } from "react";
import { getDictionary, getLocale } from "@/i18n/server";
import { smsEnabled } from "@/server/sms";
import { telegramConfig } from "@/server/telegram";
import { LoginForm } from "./LoginForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.auth.loginButton };
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm demo={process.env.DEMO_MODE === "1"} sms={smsEnabled()} recover={smsEnabled() || telegramConfig().enabled} />
    </Suspense>
  );
}
