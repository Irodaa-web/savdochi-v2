import { ShieldCheck, Smartphone, UserRound } from "lucide-react";
import { LanguageSwitch, ThemeToggle } from "@/components/Preferences";
import { LogoutButton } from "@/components/shell/LogoutButton";
import { Card, PageTitle } from "@/components/ui/Card";
import { CheckList, SideCard } from "@/components/ui/SideCard";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { formatPhone } from "@/lib/phone";
import { telegramStatus } from "@/server/telegram";
import { PasswordForm } from "./PasswordForm";
import { TelegramCard } from "./TelegramCard";
import { DeviceCard } from "./DeviceCard";

export const metadata = { title: "Sozlamalar" };

export default async function SettingsPage() {
  const user = await requireUser();
  const t = getDictionary(await getLocale());
  const telegram = await telegramStatus(user.id);
  return (
    <section className="flex flex-col gap-5">
      <PageTitle>{t.header.settings}</PageTitle>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-semibold">{t.header.language}</span>
            <LanguageSwitch />
          </Card>
          <Card className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-semibold">{t.settings.theme}</span>
            <ThemeToggle className="flex size-10 cursor-pointer items-center justify-center rounded-xl border border-line text-muted transition-colors hover:border-accent/40 hover:text-accent" />
          </Card>
          {!user.staff && (
            <Card>
              <DeviceCard />
            </Card>
          )}
          {telegram.enabled && !user.staff && (
            <Card>
              <TelegramCard linked={telegram.linked} />
            </Card>
          )}
          <Card className="flex flex-col gap-4">
            <h2 className="font-semibold">{t.settings.password}</h2>
            <PasswordForm />
          </Card>
        </div>

        <aside className="flex flex-col gap-4">
          <SideCard Icon={UserRound} title={t.settings.accountTitle}>
            <div>
              <p className="font-semibold">{user.staff ? user.staff.name : user.name}</p>
              <p className="text-[13px] text-muted">
                {user.staff ? `${t.staff.roles[user.staff.role]} · ${user.name}` : `${t.roles[user.role]} · ${formatPhone(user.phone)} · ${t.regions[user.region]}`}
              </p>
            </div>
            <LogoutButton />
          </SideCard>
          <SideCard Icon={Smartphone} title={t.settings.installTitle}>
            <p className="text-muted">{t.settings.installLead}</p>
            <CheckList items={[t.settings.installAndroid, t.settings.installIphone]} />
          </SideCard>
          <SideCard Icon={ShieldCheck} title={t.settings.securityTitle}>
            <CheckList items={t.settings.securityTips} />
          </SideCard>
        </aside>
      </div>
    </section>
  );
}
