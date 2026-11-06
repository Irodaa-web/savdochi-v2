import mongoose, { Schema, type Model } from "mongoose";

type CounterDoc = { _id: string; seq: number };

const schema = new Schema<CounterDoc>({ _id: String, seq: { type: Number, default: 0 } });

export const Counter: Model<CounterDoc> = (mongoose.models.Counter as Model<CounterDoc>) ?? mongoose.model<CounterDoc>("Counter", schema);

/** Ketma-ket raqam (buyurtma raqami uchun): 1001, 1002, … */
export async function nextSeq(name: string, start = 1000): Promise<number> {
  const doc = await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { new: true, upsert: true }).lean();
  return start + (doc?.seq ?? 1);
}
