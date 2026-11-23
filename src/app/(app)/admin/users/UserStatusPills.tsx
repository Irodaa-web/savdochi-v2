import { Pill } from "@/components/ui/Card";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import type { AdminUserRow } from "@/server/admin";

/** Foydalanuvchi holati belgilari: tasdiq, bloklangan, nofaol, yashirilgan, demo, administrator. */
export function UserStatusPills({ u, t }: { u: Pick<AdminUserRow, "verification" | "blocked" | "inactive" | "hidden" | "demo" | "isAdmin">; t: Dictionary }) {
  const a = t.adminPanel;
  return (
    <>
      <Pill tone={u.verification === "verified" ? "success" : u.verification === "pending" ? "accent" : u.verification === "rejected" ? "danger" : "neutral"}>{t.admin.verification[u.verification]}</Pill>
      {u.isAdmin && <Pill tone="accent">{t.admin.title}</Pill>}
      {u.blocked && <Pill tone="danger">{t.admin.blocked}</Pill>}
      {u.inactive && <Pill tone="danger">{a.statuses.inactive}</Pill>}
      {u.hidden && <Pill>{a.statuses.hidden}</Pill>}
      {u.demo && <Pill>{a.statuses.demo}</Pill>}
    </>
  );
}
