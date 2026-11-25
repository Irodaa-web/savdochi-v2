import "server-only";
import { isValidObjectId } from "mongoose";
import { AppError } from "@/lib/api";
import { connectDb } from "@/lib/db";
import type { TicketStatus } from "@/lib/tickets";
import { Ticket, type TicketDoc } from "@/models/Ticket";
import { User } from "@/models/User";
import { notify, notifyAdmins } from "./notify";

export type TicketThreadItem = { from: "user" | "admin"; text: string; at: string };
export type TicketView = {
  id: string;
  subject: string;
  status: TicketStatus;
  user: { id: string; name: string; phone: string; role: "buyer" | "seller" };
  thread: TicketThreadItem[];
  createdAt: string;
  updatedAt: string;
};

/** Yozishma: birinchi xabar + (eski bitta javob) + keyingi xabarlar — vaqt tartibida. */
function threadOf(d: TicketDoc): TicketThreadItem[] {
  const first: TicketThreadItem = { from: "user", text: d.message, at: d.createdAt.toISOString() };
  const legacy: TicketThreadItem[] = d.reply && !(d.messages ?? []).length ? [{ from: "admin", text: d.reply, at: d.updatedAt.toISOString() }] : [];
  return [first, ...legacy, ...(d.messages ?? []).map((m) => ({ from: m.from, text: m.text, at: new Date(m.at).toISOString() }))];
}

async function toViews(docs: TicketDoc[]): Promise<TicketView[]> {
  const users = await User.find({ _id: { $in: docs.map((d) => d.user) } }, { name: 1, phone: 1, role: 1 }).lean();
  const by = new Map(users.map((u) => [String(u._id), u]));
  return docs.map((d) => {
    const u = by.get(String(d.user));
    return {
      id: String(d._id),
      subject: d.subject,
      status: d.status,
      user: { id: String(d.user), name: u?.name ?? "—", phone: u?.phone ?? "", role: u?.role ?? "buyer" },
      thread: threadOf(d),
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    };
  });
}

export async function listMyTickets(userId: string): Promise<TicketView[]> {
  await connectDb();
  return toViews(await Ticket.find({ user: userId }).sort({ updatedAt: -1 }).limit(50).lean<TicketDoc[]>());
}

export async function createTicket(userId: string, subject: string, message: string): Promise<void> {
  await connectDb();
  const open = await Ticket.countDocuments({ user: userId, status: { $ne: "resolved" } });
  if (open >= 10) throw new AppError("TOO_MANY_ATTEMPTS");
  await Ticket.create({ user: userId, subject, message });
  const author = await User.findById(userId, { name: 1 }).lean();
  await notifyAdmins("ticketNew", { name: author?.name ?? "—", subject }, "/admin/tickets");
}

/** Foydalanuvchi o'z murojaatiga qo'shimcha yozadi — murojaat yana "ochiq" bo'ladi, adminlarga xabar boradi. */
export async function addUserMessage(userId: string, id: string, text: string): Promise<void> {
  if (!isValidObjectId(id)) throw new AppError("NOT_FOUND");
  await connectDb();
  const t = await Ticket.findOneAndUpdate(
    { _id: id, user: userId },
    { $push: { messages: { from: "user", text, at: new Date() } }, $set: { status: "open" } },
    { new: true },
  ).lean<TicketDoc>();
  if (!t) throw new AppError("NOT_FOUND");
  const author = await User.findById(userId, { name: 1 }).lean();
  await notifyAdmins("ticketMessage", { name: author?.name ?? "—", subject: t.subject }, "/admin/tickets");
}

export type TicketFilter = TicketStatus | "all";

export async function listAllTickets(status: TicketFilter = "all", page = 1): Promise<{ items: TicketView[]; total: number; pages: number; counts: Record<TicketStatus, number> }> {
  await connectDb();
  const PAGE = 20;
  const filter = status === "all" ? {} : { status };
  const [docs, total, grouped] = await Promise.all([
    Ticket.find(filter).sort({ status: 1, updatedAt: -1 }).skip((page - 1) * PAGE).limit(PAGE).lean<TicketDoc[]>(),
    Ticket.countDocuments(filter),
    Ticket.aggregate<{ _id: TicketStatus; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);
  const counts = { open: 0, in_progress: 0, resolved: 0 } as Record<TicketStatus, number>;
  for (const g of grouped) counts[g._id] = g.n;
  return { items: await toViews(docs), total, pages: Math.max(1, Math.ceil(total / PAGE)), counts };
}

/** Administrator javobi (bo'sh bo'lsa — faqat holat o'zgaradi). Javob bo'lsa foydalanuvchiga xabar boradi. */
export async function answerTicket(id: string, status: TicketStatus, reply: string): Promise<void> {
  if (!isValidObjectId(id)) throw new AppError("NOT_FOUND");
  await connectDb();
  const text = reply.trim();
  const t = await Ticket.findByIdAndUpdate(id, { $set: { status }, ...(text ? { $push: { messages: { from: "admin", text, at: new Date() } } } : {}) }, { new: true }).lean<TicketDoc>();
  if (!t) throw new AppError("NOT_FOUND");
  if (text) await notify(t.user, "ticketReply", { subject: t.subject }, "/help");
}
