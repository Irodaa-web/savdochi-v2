import mongoose, { Schema, type Model, type Types } from "mongoose";

import { TICKET_STATUSES, type TicketStatus } from "@/lib/tickets";

/** Yozishmadagi bitta xabar (birinchi xabar — `message` maydonida). */
export interface TicketMessage {
  from: "user" | "admin";
  text: string;
  at: Date;
}

/** Foydalanuvchining administratorga murojaati — yozishma ko'rinishida. */
export interface TicketDoc {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  subject: string;
  message: string;
  status: TicketStatus;
  /** Eski bitta javob (yozishmadan oldingi murojaatlar uchun saqlanadi). */
  reply: string;
  messages: TicketMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<TicketDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subject: { type: String, required: true, maxlength: 160 },
    message: { type: String, required: true, maxlength: 3000 },
    status: { type: String, enum: TICKET_STATUSES, default: "open", index: true },
    reply: { type: String, default: "", maxlength: 3000 },
    messages: {
      type: [new Schema<TicketMessage>({ from: { type: String, enum: ["user", "admin"], required: true }, text: { type: String, required: true, maxlength: 3000 }, at: { type: Date, required: true } }, { _id: false })],
      default: [],
    },
  },
  { timestamps: true },
);

export const Ticket: Model<TicketDoc> = (mongoose.models.Ticket as Model<TicketDoc>) ?? mongoose.model<TicketDoc>("Ticket", schema);
