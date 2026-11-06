import mongoose, { Schema, type Model, type Types } from "mongoose";

/** Muhim amallar jurnali: kim, nima, qachon. Faqat qo'shiladi, o'zgartirilmaydi. */
export interface AuditLogDoc {
  _id: Types.ObjectId;
  actor: Types.ObjectId | null;
  action: string;
  target: string;
  details: Record<string, unknown>;
  ip: string;
  createdAt: Date;
}

const schema = new Schema<AuditLogDoc>(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    action: { type: String, required: true },
    target: { type: String, default: "" },
    details: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
schema.index({ createdAt: -1 });

export const AuditLog: Model<AuditLogDoc> = (mongoose.models.AuditLog as Model<AuditLogDoc>) ?? mongoose.model<AuditLogDoc>("AuditLog", schema);
