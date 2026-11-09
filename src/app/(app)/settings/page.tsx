import { LanguageSwitch, ThemeToggle } from "@/components/Preferences";
import { Card, PageTitle } from "@/components/ui/Card";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { telegramStatus } from "@/server/telegram";
import { PasswordForm } from "./PasswordForm";
import { TelegramCard } from "./TelegramCard";

export const metadata = { title: "Sozlamalar" };

export default async function SettingsPage() {
  const user = await requireUser();
  const t = getDictionary(await getLocale());
  const telegram = await telegramStatus(user.id);
  return (
    <section className="flex max-w-3xl flex-col gap-5">
      <PageTitle>{t.header.settings}</PageTitle>
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-semibold">{t.header.language}</span>
        <LanguageSwitch />
      </Card>
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-semibold">{t.settings.theme}</span>
        <ThemeToggle className="flex size-10 cursor-pointer items-center justify-center rounded-lg border border-line hover:bg-surface-2" />
      </Card>
      {telegram.enabled && (
        <Card>
          <TelegramCard linked={telegram.linked} />
        </Card>
      )}
      <Card className="flex flex-col gap-4">
        <h2 className="font-semibold">{t.settings.password}</h2>
        <PasswordForm />
      </Card>
    </section>
  );
}
