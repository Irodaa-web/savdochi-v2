import "server-only";
import { isValidObjectId } from "mongoose";
import { AppError } from "@/lib/api";
import { connectDb } from "@/lib/db";
import type { TicketStatus } from "@/lib/tickets";
import { Ticket, type TicketDoc } from "@/models/Ticket";
import { User } from "@/models/User";
import { notify } from "./notify";

export type TicketView = { id: string; subject: string; message: string; status: TicketStatus; reply: string; user: { id: string; name: string }; createdAt: string; updatedAt: string };

async function toViews(docs: TicketDoc[]): Promise<TicketView[]> {
  const users = await User.find({ _id: { $in: docs.map((d) => d.user) } }, { name: 1 }).lean();
  const name = new Map(users.map((u) => [String(u._id), u.name]));
  return docs.map((d) => ({
    id: String(d._id),
    subject: d.subject,
    message: d.message,
    status: d.status,
    reply: d.reply,
    user: { id: String(d.user), name: name.get(String(d.user)) ?? "—" },
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));
}

export async function listMyTickets(userId: string): Promise<TicketView[]> {
  await connectDb();
  return toViews(await Ticket.find({ user: userId }).sort({ createdAt: -1 }).limit(50).lean<TicketDoc[]>());
}

export async function createTicket(userId: string, subject: string, message: string): Promise<void> {
  await connectDb();
  const open = await Ticket.countDocuments({ user: userId, status: { $ne: "resolved" } });
  if (open >= 10) throw new AppError("TOO_MANY_ATTEMPTS");
  await Ticket.create({ user: userId, subject, message });
}

export async function listAllTickets(status?: TicketStatus): Promise<TicketView[]> {
  await connectDb();
  return toViews(await Ticket.find(status ? { status } : {}).sort({ status: 1, createdAt: -1 }).limit(200).lean<TicketDoc[]>());
}

export async function answerTicket(id: string, status: TicketStatus, reply: string): Promise<void> {
  if (!isValidObjectId(id)) throw new AppError("NOT_FOUND");
  await connectDb();
  const t = await Ticket.findByIdAndUpdate(id, { $set: { status, reply } }, { new: true }).lean<TicketDoc>();
  if (!t) throw new AppError("NOT_FOUND");
  if (reply) await notify(t.user, "ticketReply", { subject: t.subject }, "/help");
}
