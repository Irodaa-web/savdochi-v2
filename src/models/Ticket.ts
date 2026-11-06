import mongoose, { Schema, type Model, type Types } from "mongoose";

import { TICKET_STATUSES, type TicketStatus } from "@/lib/tickets";

/** Foydalanuvchining administratorga murojaati. */
export interface TicketDoc {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  subject: string;
  message: string;
  status: TicketStatus;
  reply: string;
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
  },
  { timestamps: true },
);

export const Ticket: Model<TicketDoc> = (mongoose.models.Ticket as Model<TicketDoc>) ?? mongoose.model<TicketDoc>("Ticket", schema);
