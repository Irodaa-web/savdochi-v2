import { BadgeCheck, CreditCard, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { PageTitle } from "@/components/ui/Card";
import { fmt, formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { formatPhone } from "@/lib/phone";
import { getProfile, subscriptionActive } from "@/server/profile";
import { getOnlinePaySettings } from "@/server/onlinePay";
import { OnlinePayForm } from "./OnlinePayForm";
import { ProfileForm } from "./ProfileForm";

export const metadata = { title: "Profil" };

export default async function ProfilePage() {
  const user = await requireUser();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const [profile, onlinePay] = await Promise.all([getProfile(user.id), user.role === "seller" ? getOnlinePaySettings(user.id) : null]);
  if (!profile) notFound();
  const active = subscriptionActive(profile.subscriptionUntil);

  return (
    <section className="flex max-w-3xl flex-col gap-5">
      <PageTitle>{t.header.profile}</PageTitle>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-muted">
        <span>{t.roles[user.role]}</span>
        <span>{formatPhone(user.phone)}</span>
        {profile.verified ? (
          <span className="flex items-center gap-1 font-semibold text-accent">
            <BadgeCheck size={16} aria-hidden />
            {t.catalog.verified}
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <ShieldAlert size={16} aria-hidden />
            {t.profile.notVerified}
          </span>
        )}
        {user.role === "seller" && (
          <Link href={`/suppliers/${user.id}`} className="font-semibold text-accent hover:underline">
            {t.profile.publicPage}
          </Link>
        )}
      </div>
      {!profile.verified && <Alert tone="info">{t.home.verifyNote}</Alert>}
      {user.role === "seller" && (
        <div className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4">
          <CreditCard size={18} className="mt-0.5 shrink-0 text-muted" aria-hidden />
          <div className="text-[14px]">
            <b>{t.subscription.title}: </b>
            {profile.subscriptionUntil ? (
              <span className={active ? "text-success" : "text-danger"}>{fmt(active ? t.subscription.until : t.subscription.expired, { date: formatDateTime(profile.subscriptionUntil, locale, false) })}</span>
            ) : (
              <span className="text-success">{t.subscription.unlimited}</span>
            )}
            <p className="mt-1 text-muted">{t.subscription.how}</p>
          </div>
        </div>
      )}
      <ProfileForm profile={profile} />
      {onlinePay && <OnlinePayForm sellerId={user.id} initial={onlinePay} />}
    </section>
  );
}
