import { Clock, ShieldAlert, XCircle } from "lucide-react";
import Link from "next/link";
import { fmt } from "@/i18n/format";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import type { SessionUser } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { User } from "@/models/User";

/**
 * Kompaniya hali tasdiqlanmagan: mahsulotlari katalogda ko'rinmaydi va buyurtma qabul qilmaydi.
 * Holatga qarab nima qilish kerakligini aytadi (rad etilgan bo'lsa — administrator yozgan sabab bilan).
 */
export async function VerifyBanner({ user, t, profileLink = true }: { user: SessionUser; t: Dictionary; profileLink?: boolean }) {
  if (user.role !== "seller" || user.verification === "verified") return null;
  const v = t.sellerVerify;
  let reason = "";
  if (user.verification === "rejected") {
    await connectDb();
    reason = (await User.findById(user.id, { verificationNote: 1 }).lean())?.verificationNote || "—";
  }
  const state =
    user.verification === "pending"
      ? { Icon: Clock, title: v.pendingTitle, text: v.pendingText, cta: "" }
      : user.verification === "rejected"
        ? {
            Icon: XCircle,
            title: v.rejectedTitle,
            text: fmt(v.rejectedText, { reason }),
            cta: v.rejectedCta,
          }
        : {
            Icon: ShieldAlert,
            title: v.unverifiedTitle,
            text: v.unverifiedText,
            cta: v.unverifiedCta,
          };
  const danger = user.verification === "rejected";
  return (
    <div role="status" className={`flex items-start gap-3 rounded-2xl px-4 py-3 ring-1 ring-inset ${danger ? "bg-danger-soft ring-danger/20" : "bg-accent-soft/90 ring-accent/20"}`}>
      <state.Icon size={18} className={`mt-0.5 shrink-0 ${danger ? "text-danger" : "text-accent"}`} aria-hidden />
      <div className="min-w-0 text-[13px] leading-relaxed">
        <p className="text-[14px] font-semibold">{state.title}</p>
        <p className="text-muted">{state.text}</p>
        {state.cta && profileLink && !user.staff && (
          <Link href="/profile" className="mt-1 inline-block font-semibold text-accent hover:underline">
            {state.cta}
          </Link>
        )}
      </div>
    </div>
  );
}
