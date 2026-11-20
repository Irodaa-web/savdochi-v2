import { ListChecks } from "lucide-react";
import { PageTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { fmt, formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth/guard";
import { listOrderLists, MAX_LISTS } from "@/server/lists";
import { ListCard } from "./ListCard";

export const metadata = { title: "Doimiy ro'yxatlar" };

/** Do'kon: doimiy buyurtma ro'yxatlari — har hafta beriladigan buyurtmani bir bosishda savatga solish. */
export default async function ListsPage() {
  const user = await requireUser("buyer");
  const locale = await getLocale();
  const t = getDictionary(locale);
  const lists = await listOrderLists(user.id);

  return (
    <section className="flex flex-col gap-5">
      <PageTitle lead={lists.length ? fmt(t.lists.count, { n: lists.length, max: MAX_LISTS }) : undefined}>{t.lists.title}</PageTitle>
      <p className="max-w-3xl text-[14px] text-muted">{t.lists.lead}</p>
      {lists.length === 0 ? (
        <EmptyState Icon={ListChecks} title={t.lists.empty} hint={t.lists.emptyHint} action={<LinkButton href="/orders?status=delivered">{t.lists.toOrders}</LinkButton>} />
      ) : (
        <ul className="grid items-start gap-4 lg:grid-cols-2">
          {lists.map((l) => (
            <ListCard key={l.id} list={l} lastUsed={l.lastUsedAt ? formatDateTime(l.lastUsedAt, locale, false) : null} />
          ))}
        </ul>
      )}
    </section>
  );
}
