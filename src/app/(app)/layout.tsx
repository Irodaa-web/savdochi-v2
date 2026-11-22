import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { ensureWebhook } from "@/server/telegram";
import { AppHeader } from "@/components/shell/AppHeader";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { MobileTabs } from "@/components/shell/MobileTabs";
import { ShellProvider } from "@/components/shell/Shell";
import { BadgesProvider } from "@/components/shell/useBadges";
import { Aurora } from "@/components/ui/Aurora";
import { getSessionUser } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  // Token imzosi to'g'ri, lekin hisob o'chirilgan/bloklangan yoki paroli o'zgargan.
  if (!user) redirect("/api/v1/auth/reset");
  // Sidebar yig'ilganmi — cookie'dan: sahifa birinchi chizilishidanoq to'g'ri kenglikda chiqadi.
  const collapsed = (await cookies()).get("sidebar")?.value === "collapsed";
  // Telegram bot webhooki: har server nusxasida bir marta tekshiriladi (javobni kutdirmaydi).
  after(() => ensureWebhook());

  return (
    <div className="relative isolate flex min-h-dvh">
      <Aurora />
      {/* Belgilar (savat, chat, buyurtmalar, bildirishnoma) sidebar, header va pastki panel uchun bitta joyda. */}
      <BadgesProvider>
        <ShellProvider initialCollapsed={collapsed}>
          <AppSidebar user={user} />
          <div className="flex min-w-0 flex-1 flex-col">
            <AppHeader user={user} />
            {/* page-in: sahifa bo'limlari navbat bilan yengil ko'tarilib chiqadi. */}
            <main className="page-in mx-auto w-full max-w-[1320px] flex-1 px-4 pt-6 pb-28 sm:px-6 md:pb-12">{children}</main>
          </div>
          <MobileTabs user={user} />
        </ShellProvider>
      </BadgesProvider>
    </div>
  );
}
