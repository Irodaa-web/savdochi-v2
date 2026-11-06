import { ComingSoon } from "@/components/ComingSoon";
import { getDictionary, getLocale } from "@/i18n/server";

export default async function Page() {
  const t = getDictionary(await getLocale());
  return <ComingSoon title={t.nav.chat} />;
}
