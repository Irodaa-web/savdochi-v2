import "server-only";
import type { FilterQuery, Types } from "mongoose";
import { connectDb } from "@/lib/db";
import { inactivityThresholds } from "@/lib/inactivity";
import type { NotificationType } from "@/models/Notification";
import { User, type UserDoc } from "@/models/User";
import { audit, notify } from "./notify";
import { sendNotice, smsEnabled } from "./sms";

export type InactivityReport = {
  at: string;
  /** Qayta tasdiqlash (SMS) sozlanmagan — hech kim qulflanib qolmasligi uchun nofaol qilinmadi. */
  skipped?: "SMS_DISABLED";
  /** Funksiyadan oldingi hisoblarga lastActiveAt qo'yildi (bir martalik). */
  backfilled: number;
  warned: number;
  finalWarned: number;
  deactivated: number;
};

/** Faqat oddiy faol hisoblar: admin bloklagan, demo va allaqachon nofaol hisoblarga tegilmaydi. */
const eligible = (): FilterQuery<UserDoc> => ({ blocked: { $ne: true }, demo: { $ne: true }, inactive: { $ne: true } });

const BATCH = 500;

const SMS_TEXTS: Record<string, Record<"inactivityWarning" | "inactivityFinal", string>> = {
  uz: {
    inactivityWarning: "Savdochi: siz 12 kundan beri tizimga kirmadingiz. 3 kun ichida kirmasangiz, hisobingiz nofaol qilinadi. Ma'lumotlaringiz saqlanadi.",
    inactivityFinal: "Savdochi: ertaga hisobingiz nofaol qilinadi. Saqlab qolish uchun bugun tizimga kiring.",
  },
  ru: {
    inactivityWarning: "Savdochi: вы не входили 12 дней. Если не войдёте в течение 3 дней, аккаунт станет неактивным. Данные сохранятся.",
    inactivityFinal: "Savdochi: завтра аккаунт станет неактивным. Чтобы сохранить его, войдите сегодня.",
  },
  en: {
    inactivityWarning: "Savdochi: you haven't signed in for 12 days. Sign in within 3 days or your account becomes inactive. Your data is kept.",
    inactivityFinal: "Savdochi: your account becomes inactive tomorrow. Sign in today to keep it active.",
  },
};

/**
 * Kunlik nofaollik vazifasi (cron).
 *
 * Hech narsa o'chirilmaydi: profil, kompaniya/do'kon, buyurtmalar, to'lovlar, qarzlar, mahsulotlar
 * va ombor joyida qoladi — faqat hisob holati belgilari o'zgaradi.
 * Bazaga yuk: har bosqich bitta indeksli so'rov (lastActiveAt); ogohlantirish faqat chegarani
 * kesib o'tganlarga yuboriladi. Qayta ishga tushsa xavfsiz: har ogohlantirish atomar band qilinadi,
 * nofaol qilish filtri allaqachon nofaol hisoblarni o'tkazib yuboradi.
 *
 * `now` — test uchun vaqtni sun'iy o'tkazish (cron route'da faqat INACTIVITY_TEST=1 bo'lsa).
 */
export async function runInactivity(now = new Date()): Promise<InactivityReport> {
  await connectDb();
  const report: InactivityReport = { at: now.toISOString(), backfilled: 0, warned: 0, finalWarned: 0, deactivated: 0 };

  // Funksiya qo'shilishidan oldingi hisoblar: 15 kunlik muddat shu kundan boshlanadi.
  if (await User.exists({ lastActiveAt: { $exists: false } })) {
    report.backfilled = (await User.updateMany({ lastActiveAt: { $exists: false } }, { $set: { lastActiveAt: now } })).modifiedCount;
  }

  // Shaxsni qayta tasdiqlash SMS orqali. SMS ishlamasa, nofaol qilingan hisob qayta kira olmaydi —
  // shuning uchun bunday holatda hech kim nofaol qilinmaydi va ogohlantirilmaydi.
  if (!smsEnabled()) return { ...report, skipped: "SMS_DISABLED" };

  const th = inactivityThresholds(now);

  // 15-kun: nofaol. authVersion oshadi — barcha eski sessiya tokenlari rad etiladi.
  report.deactivated = (
    await User.updateMany({ ...eligible(), lastActiveAt: { $lte: th.inactive } }, { $set: { inactive: true, inactiveAt: now }, $inc: { authVersion: 1 } })
  ).modifiedCount;

  // 14-kun: oxirgi ogohlantirish.
  report.finalWarned = await warnOnce({ ...eligible(), lastActiveAt: { $lte: th.finalWarn, $gt: th.inactive } }, "inactivity.warned14At", "inactivityFinal", now);

  // 12-kun: ogohlantirish.
  report.warned = await warnOnce({ ...eligible(), lastActiveAt: { $lte: th.warn, $gt: th.finalWarn } }, "inactivity.warned12At", "inactivityWarning", now);

  if (report.deactivated) await audit(null, "inactivity.deactivated", "users", { count: report.deactivated, at: report.at });
  return report;
}

async function warnOnce(filter: FilterQuery<UserDoc>, field: "inactivity.warned12At" | "inactivity.warned14At", type: NotificationType, now: Date): Promise<number> {
  const query = { ...filter, [field]: null };
  const sms = process.env.INACTIVITY_SMS === "1";
  let sent = 0;
  for (;;) {
    const batch = await User.find(query, { _id: 1, phone: 1, locale: 1 }).limit(BATCH).lean<{ _id: Types.ObjectId; phone: string; locale?: string }[]>();
    for (const u of batch) {
      // Atomar band qilish: vazifa parallel ishga tushsa ham har kimga bitta ogohlantirish.
      const claimed = await User.updateOne({ _id: u._id, [field]: null }, { $set: { [field]: now } });
      if (claimed.modifiedCount !== 1) continue;
      await notify(u._id, type, {}, "/");
      if (sms) {
        const text = (SMS_TEXTS[u.locale ?? "uz"] ?? SMS_TEXTS.uz!)[type as "inactivityWarning" | "inactivityFinal"];
        await sendNotice(u.phone, text).catch((error) => console.error("inactivity sms failed", error));
      }
      sent += 1;
    }
    if (batch.length < BATCH) break;
  }
  return sent;
}

/** Muvaffaqiyatli kirish: faollik vaqti yangilanadi, ogohlantirishlar qaytadan hisoblanadi. */
export async function touchActivity(userId: unknown, now = new Date()): Promise<void> {
  await User.updateOne({ _id: userId }, { $set: { lastActiveAt: now, "inactivity.warned12At": null, "inactivity.warned14At": null } });
}

/**
 * Nofaol hisobni qayta faollashtirish (SMS kod tasdiqlangandan keyin).
 * Admin bloklagan hisob bu yo'l bilan ochilmaydi. true — faollashtirildi.
 */
export async function reactivateAccount(userId: unknown, now = new Date()): Promise<boolean> {
  const res = await User.updateOne(
    { _id: userId, inactive: true, blocked: { $ne: true } },
    { $set: { inactive: false, inactiveAt: null, lastActiveAt: now, "inactivity.warned12At": null, "inactivity.warned14At": null } },
  );
  if (res.modifiedCount === 1) await audit(String(userId), "inactivity.reactivated", String(userId));
  return res.modifiedCount === 1;
}
