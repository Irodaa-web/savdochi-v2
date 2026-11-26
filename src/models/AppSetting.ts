import mongoose, { Schema, type Model } from "mongoose";

/** Platforma darajasidagi saqlanadigan sozlamalar (kalit → qiymat), masalan Web Push VAPID kalitlari. */
export interface AppSettingDoc {
  _id: string;
  value: unknown;
}

const schema = new Schema<AppSettingDoc>({ _id: { type: String }, value: { type: Schema.Types.Mixed } }, { timestamps: true });

export const AppSetting: Model<AppSettingDoc> = (mongoose.models.AppSetting as Model<AppSettingDoc>) ?? mongoose.model<AppSettingDoc>("AppSetting", schema);
