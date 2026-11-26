import { AppError, ok } from "@/lib/api";
import { forgetSessionUser } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { brandSchema } from "@/lib/validation";
import { User } from "@/models/User";
import { parseBody, withUser } from "@/server/handler";
import { forgetHiddenSellers } from "@/server/products";

/** Kompaniya logotipi va banneri — faqat hisob egasi (xodimlarga yopiq, lib/staff). "" — olib tashlash. */
export const PUT = withUser("seller", async (user, request) => {
  if (user.staff) throw new AppError("FORBIDDEN");
  const input = await parseBody(request, brandSchema);
  const set: Record<string, string> = {};
  if (input.logo !== undefined) set.logo = input.logo;
  if (input.banner !== undefined) set.banner = input.banner;
  await connectDb();
  await User.updateOne({ _id: user.id }, { $set: set });
  forgetSessionUser(user.id);
  forgetHiddenSellers();
  return ok(set);
});
