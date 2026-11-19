import { redirect } from "next/navigation";
import { AppHeader } from "@/components/shell/AppHeader";
import { MobileTabs } from "@/components/shell/MobileTabs";
import { BadgesProvider } from "@/components/shell/useBadges";
import { Aurora } from "@/components/ui/Aurora";
import { getSessionUser } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  // Token imzosi to'g'ri, lekin hisob o'chirilgan/bloklangan yoki paroli o'zgargan.
  if (!user) redirect("/api/v1/auth/reset");

  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <Aurora />
      {/* Belgilar (savat, chat, bildirishnoma) header va pastki panel uchun bitta joyda. */}
      <BadgesProvider>
        <AppHeader user={user} />
        {/* page-in: sahifa bo'limlari navbat bilan yengil ko'tarilib chiqadi. */}
        <main className="page-in mx-auto w-full max-w-[1320px] flex-1 px-4 pt-6 pb-28 sm:px-6 md:pb-12">{children}</main>
        <MobileTabs user={user} />
      </BadgesProvider>
    </div>
  );
}
