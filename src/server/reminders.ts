import "server-only";
import { connectDb } from "@/lib/db";
import { Order, type OrderDoc } from "@/models/Order";
import { User } from "@/models/User";
import { notify } from "./notify";

const DAY = 86_400_000;
const TZ_OFFSET = 5 * 3_600_000; // Toshkent UTC+5

/** Toshkent bo'yicha kun: "YYYY-MM-DD" va shu kun boshining UTC vaqti. */
function tashkentDay(at: Date): { key: string; start: number } {
  const local = new Date(at.getTime() + TZ_OFFSET);
  const key = local.toISOString().slice(0, 10);
  return { key, start: Date.parse(`${key}T00:00:00Z`) - TZ_OFFSET };
}

/** Muddati o'tgandan keyin qaysi kunlari eslatiladi: 1, 3, 7 va keyin har hafta. */
export function overdueReminderDay(days: number): boolean {
  return days === 1 || days === 3 || (days >= 7 && days % 7 === 0);
}

export type ReminderReport = { day: string; dueSoon: number; overdue: number; sellers: number };

/**
 * Kunlik qarz eslatmalari (cron, Toshkent 09:00):
 * - to'lov muddatiga 1 kun qolganda — do'konga;
 * - muddati o'tganda (1, 3, 7, 14, ... kun) — do'konga, kompaniyaga esa shu kun uchun umumiy xabar.
 * Har buyurtma kuniga bir marta (lastReminder): cron qayta ishlasa ham takror xabar ketmaydi.
 */
export async function runDebtReminders(now = new Date()): Promise<ReminderReport> {
  await connectDb();
  const today = tashkentDay(now);
  const tomorrowStart = today.start + DAY;
  const orders = await Order.find(
    { status: { $ne: "cancelled" }, paymentStatus: { $ne: "paid" }, dueDate: { $ne: null, $lt: new Date(tomorrowStart + DAY) }, lastReminder: { $ne: today.key } },
    { number: 1, buyer: 1, seller: 1, total: 1, paidAmount: 1, dueDate: 1 },
  ).lean<OrderDoc[]>();

  const due: { o: OrderDoc; kind: "soon" | "overdue"; days: number }[] = [];
  for (const o of orders) {
    const left = o.total - o.paidAmount;
    if (left <= 0 || !o.dueDate) continue;
    const dueAt = o.dueDate.getTime();
    if (dueAt >= tomorrowStart) due.push({ o, kind: "soon", days: 0 });
    else if (dueAt < today.start) {
      const days = Math.floor((today.start - tashkentDay(o.dueDate).start) / DAY);
      if (overdueReminderDay(days)) due.push({ o, kind: "overdue", days });
    }
  }
  if (!due.length) return { day: today.key, dueSoon: 0, overdue: 0, sellers: 0 };

  const names = new Map((await User.find({ _id: { $in: [...new Set(due.map((d) => String(d.o.seller)))] } }, { name: 1 }).lean()).map((u) => [String(u._id), u.name]));
  let dueSoon = 0;
  let overdue = 0;
  const bySeller = new Map<string, { n: number; sum: number }>();
  for (const { o, kind, days } of due) {
    // Atomar "band qilish": parallel ishga tushsa ham bitta xabar.
    const claimed = await Order.updateOne({ _id: o._id, lastReminder: { $ne: today.key } }, { $set: { lastReminder: today.key } });
    if (claimed.modifiedCount !== 1) continue;
    const amount = (o.total - o.paidAmount).toLocaleString("ru-RU");
    const seller = names.get(String(o.seller)) ?? "";
    if (kind === "soon") {
      dueSoon++;
      await notify(o.buyer, "debtDueSoon", { number: o.number, name: seller, amount }, `/orders/${o._id}`);
    } else {
      overdue++;
      await notify(o.buyer, "debtOverdue", { number: o.number, name: seller, amount, days }, `/orders/${o._id}`);
      const s = bySeller.get(String(o.seller)) ?? { n: 0, sum: 0 };
      s.n++;
      s.sum += o.total - o.paidAmount;
      bySeller.set(String(o.seller), s);
    }
  }
  for (const [sellerId, s] of bySeller) await notify(sellerId, "debtOverdueSeller", { n: s.n, amount: s.sum.toLocaleString("ru-RU") }, "/debts");
  return { day: today.key, dueSoon, overdue, sellers: bySeller.size };
}
