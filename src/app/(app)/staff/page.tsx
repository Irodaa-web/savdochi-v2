import { Boxes, BriefcaseBusiness, Handshake, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { PageTitle } from "@/components/ui/Card";
import { formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { STAFF_ROLES } from "@/lib/staff";
import { listStaff } from "@/server/staff";
import { StaffManager } from "./StaffManager";

export const metadata = { title: "Xodimlar" };

const ROLE_ICONS = { manager: BriefcaseBusiness, agent: Handshake, warehouse: Boxes } as const;

/** Kompaniya egasi: xodimlar va ularning huquqlari. Xodimlar bu sahifani ko'rmaydi. */
export default async function StaffPage() {
  const user = await requireUser("seller");
  if (user.staff) redirect("/");
  const locale = await getLocale();
  const t = getDictionary(locale);
  const staff = await listStaff(user);
  const lastActive = Object.fromEntries(staff.flatMap((s) => (s.lastActiveAt ? [[s.id, formatDateTime(s.lastActiveAt, locale)]] : [])));

  return (
    <section className="flex flex-col gap-5">
      <PageTitle lead={t.staff.lead}>{t.staff.title}</PageTitle>
      <div className="grid gap-3 md:grid-cols-3">
        {STAFF_ROLES.map((r) => {
          const Icon = ROLE_ICONS[r];
          return (
            <div key={r} className="glass-card flex flex-col gap-2 rounded-2xl p-4">
              <span className="flex items-center gap-2 font-semibold">
                <span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Icon size={17} aria-hidden />
                </span>
                {t.staff.roles[r]}
              </span>
              <p className="text-[13px] text-muted">{t.staff.roleHints[r]}</p>
            </div>
          );
        })}
      </div>
      <p className="flex items-start gap-2 rounded-xl border border-line bg-surface-2/50 px-4 py-3 text-[13px] text-muted">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
        {t.staff.ownerOnly}
      </p>
      <StaffManager staff={staff} lastActive={lastActive} />
    </section>
  );
}
