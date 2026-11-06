import { redirect } from "next/navigation";
import { AppHeader } from "@/components/shell/AppHeader";
import { MobileTabs } from "@/components/shell/MobileTabs";
import { getSessionUser } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  // Token imzosi to'g'ri, lekin hisob o'chirilgan/bloklangan yoki paroli o'zgargan.
  if (!user) redirect("/api/v1/auth/reset");

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 pt-6 pb-24 sm:px-6 md:pb-12">{children}</main>
      <MobileTabs role={user.role} />
    </div>
  );
}
