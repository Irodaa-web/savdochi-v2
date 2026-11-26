import { BadgeCheck, Circle, CircleCheck, CreditCard, Gauge, ShieldAlert, Store } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { PageTitle } from "@/components/ui/Card";
import { CopyLink } from "@/components/ui/CopyLink";
import { LinkButton } from "@/components/ui/LinkButton";
import { SideCard } from "@/components/ui/SideCard";
import { fmt, formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { formatPhone } from "@/lib/phone";
import { getProfile } from "@/server/profile";
import { getOnlinePaySettings } from "@/server/onlinePay";
import { OnlinePayForm } from "./OnlinePayForm";
import { ProfileForm } from "./ProfileForm";
import { BrandForm } from "./BrandForm";
import { VerifyBanner } from "@/components/seller/VerifyBanner";

export const metadata = { title: "Profil" };

export default async function ProfilePage() {
  const user = await requireUser();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const [profile, onlinePay] = await Promise.all([getProfile(user.id), user.role === "seller" ? getOnlinePaySettings(user.id) : null]);
  if (!profile) notFound();
  const isSeller = user.role === "seller";
  const p = profile.profile;
  // Profil to'liqligi: har bir band — sahifadagi haqiqiy ma'lumot asosida.
  const checklist = [
    { label: t.profile.itemAddress, done: Boolean(p.address.trim()) },
    { label: t.profile.itemAbout, done: Boolean(p.about.trim()) },
    ...(isSeller
      ? [
          { label: t.profile.itemDelivery, done: p.deliveryRegions.length > 0 },
          { label: t.profile.itemOnlinePay, done: Boolean(onlinePay?.payme || onlinePay?.click) },
        ]
      : [{ label: t.profile.itemLocation, done: p.lat != null && p.lng != null }]),
    { label: t.profile.itemRequisites, done: Boolean(p.inn && p.bankName && p.bankAccount && p.mfo) },
    { label: t.profile.itemVerified, done: profile.verified },
  ];
  const percent = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);

  return (
    <section className="flex flex-col gap-5">
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
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-5">
      {user.role === "seller" ? <VerifyBanner user={user} t={t} profileLink={false} /> : !profile.verified && <Alert tone="info">{t.home.verifyNote}</Alert>}
      {user.role === "seller" && (
        <div className="flex items-start gap-3 glass-card rounded-2xl p-4">
          <CreditCard size={18} className="mt-0.5 shrink-0 text-muted" aria-hidden />
          <div className="text-[14px]">
            <b>{t.plans.title}: </b>
            <span className="font-semibold">{t.plans.names[user.plan]}</span>
            {user.plan !== "free" && (
              <span className="text-muted"> · {profile.subscriptionUntil ? fmt(t.plans.until, { date: formatDateTime(profile.subscriptionUntil, locale, false) }) : t.plans.unlimited}</span>
            )}
            {!user.staff && (
              <p className="mt-1">
                <Link href="/billing" className="font-semibold text-accent hover:underline">
                  {t.plans.lockedCta}
                </Link>
              </p>
            )}
          </div>
        </div>
      )}
      {user.role === "seller" && !user.staff && <BrandForm initial={{ logo: profile.logo, banner: profile.banner }} name={profile.name} />}
      <ProfileForm profile={profile} />
      {onlinePay && <OnlinePayForm sellerId={user.id} initial={onlinePay} />}
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
        <SideCard Icon={Gauge} title={t.profile.completeTitle} action={<b className="text-[15px] text-accent tabular-nums">{percent}%</b>}>
          {/* Hisoblagich: to'ldirilgan qism — ko'k, qolgani — shu rangning och tusi. */}
          <div className="h-2 overflow-hidden rounded-full bg-accent-soft" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={t.profile.completeTitle}>
            <div className="btn-primary h-full rounded-full transition-[width] duration-700" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-[13px] text-muted">{percent === 100 ? t.profile.completeDone : isSeller ? t.profile.completeLeadSeller : t.profile.completeLeadBuyer}</p>
          <ul className="flex flex-col gap-2">
            {checklist.map((c) => (
              <li key={c.label} className={`flex items-center gap-2.5 ${c.done ? "" : "text-muted"}`}>
                {c.done ? <CircleCheck size={17} className="shrink-0 text-success" aria-hidden /> : <Circle size={17} className="shrink-0" aria-hidden />}
                <span className={c.done ? "" : "font-medium"}>{c.label}</span>
              </li>
            ))}
          </ul>
          <p className="border-t border-line pt-3 text-[12px] text-muted">{fmt(t.profile.memberSince, { date: formatDateTime(profile.createdAt, locale, false) })}</p>
        </SideCard>

        {isSeller && (
          <SideCard Icon={Store} title={t.profile.publicPage}>
            <p className="text-muted">{t.partners.growText}</p>
            <CopyLink path={`/suppliers/${user.id}`} />
            <LinkButton href={`/suppliers/${user.id}`} variant="secondary" className="w-fit">
              {t.partners.previewPage}
            </LinkButton>
          </SideCard>
        )}
      </aside>
      </div>
    </section>
  );
}
