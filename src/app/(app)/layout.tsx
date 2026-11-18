import { redirect } from "next/navigation";
import { AppHeader } from "@/components/shell/AppHeader";
import { MobileTabs } from "@/components/shell/MobileTabs";
import { getSessionUser } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  // Token imzosi to'g'ri, lekin hisob o'chirilgan/bloklangan yoki paroli o'zgargan.
  if (!user) redirect("/api/v1/auth/reset");

  return (
    <div className="relative flex min-h-dvh flex-col">
      {/* Yumshoq brend yorug'ligi: sahifa tepasida, ikki mavzuda ham. */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(60%_80%_at_12%_0%,var(--c-accent-soft),transparent_70%)] opacity-80" />
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 pt-6 pb-24 sm:px-6 md:pb-12">{children}</main>
      <MobileTabs role={user.role} />
    </div>
  );
}
