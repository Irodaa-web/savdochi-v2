import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

/** Chop etish uchun sahifalar: header va pastki tablarsiz, oq qog'oz ko'rinishida. */
export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/api/v1/auth/reset");
  return <div className="min-h-dvh bg-surface-2 py-6 print:bg-white print:py-0">{children}</div>;
}
