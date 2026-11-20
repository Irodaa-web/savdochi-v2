import "server-only";
import { isValidObjectId } from "mongoose";
import { AppError } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { forgetSessionUser, type SessionUser } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { MAX_STAFF, type StaffRole } from "@/lib/staff";
import { Staff, type StaffDoc } from "@/models/Staff";
import { User } from "@/models/User";
import { audit } from "./notify";

export type StaffView = { id: string; name: string; phone: string; role: StaffRole; blocked: boolean; lastActiveAt: string | null; createdAt: string };

const toView = (s: StaffDoc): StaffView => ({
  id: String(s._id),
  name: s.name,
  phone: s.phone,
  role: s.role,
  blocked: s.blocked,
  lastActiveAt: s.lastActiveAt ? new Date(s.lastActiveAt).toISOString() : null,
  createdAt: new Date(s.createdAt).toISOString(),
});

/** Faqat hisob egasi (xodim emas) xodimlarni boshqaradi. */
function owner(user: SessionUser): string {
  if (user.role !== "seller" || user.staff) throw new AppError("FORBIDDEN");
  return user.id;
}

export async function listStaff(user: SessionUser): Promise<StaffView[]> {
  const company = owner(user);
  await connectDb();
  const docs = await Staff.find({ company }).sort({ blocked: 1, createdAt: 1 }).lean<StaffDoc[]>();
  return docs.map(toView);
}

export async function addStaff(user: SessionUser, input: { name: string; phone: string; role: StaffRole; password: string }): Promise<StaffView> {
  const company = owner(user);
  await connectDb();
  if ((await Staff.countDocuments({ company })) >= MAX_STAFF) throw new AppError("INVALID_INPUT", { phone: "staffLimit" });
  // Telefon butun tizimda bitta: na kompaniya/do'kon, na boshqa xodim bo'lmasligi kerak.
  if ((await User.exists({ phone: input.phone })) || (await Staff.exists({ phone: input.phone }))) throw new AppError("INVALID_INPUT", { phone: "staffPhoneTaken" });
  try {
    const doc = await Staff.create({ company, name: input.name, phone: input.phone, role: input.role, passwordHash: await hashPassword(input.password) });
    await audit(company, "staff.add", `staff:${doc._id}`, { role: input.role });
    return toView(doc.toObject() as StaffDoc);
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new AppError("INVALID_INPUT", { phone: "staffPhoneTaken" });
    throw error;
  }
}

/**
 * Rol, ism, bloklash yoki yangi parol. Rol, parol yoki bloklash o'zgarsa — xodimning
 * barcha sessiyalari bekor bo'ladi (authVersion oshadi).
 */
export async function updateStaff(user: SessionUser, id: string, input: { name?: string; role?: StaffRole; blocked?: boolean; password?: string }): Promise<StaffView> {
  const company = owner(user);
  if (!isValidObjectId(id)) throw new AppError("NOT_FOUND");
  await connectDb();
  const staff = await Staff.findOne({ _id: id, company });
  if (!staff) throw new AppError("NOT_FOUND");
  let revoke = false;
  if (input.name) staff.name = input.name;
  if (input.role && input.role !== staff.role) {
    staff.role = input.role;
    revoke = true;
  }
  if (input.blocked !== undefined && input.blocked !== staff.blocked) {
    staff.blocked = input.blocked;
    revoke = true;
  }
  if (input.password) {
    staff.passwordHash = await hashPassword(input.password);
    revoke = true;
  }
  if (revoke) staff.authVersion += 1;
  await staff.save();
  forgetSessionUser(company);
  await audit(company, "staff.update", `staff:${staff._id}`, { role: input.role, blocked: input.blocked, password: Boolean(input.password) });
  return toView(staff.toObject() as StaffDoc);
}

export async function removeStaff(user: SessionUser, id: string): Promise<void> {
  const company = owner(user);
  if (!isValidObjectId(id)) throw new AppError("NOT_FOUND");
  await connectDb();
  const res = await Staff.deleteOne({ _id: id, company });
  if (!res.deletedCount) throw new AppError("NOT_FOUND");
  forgetSessionUser(company);
  await audit(company, "staff.remove", `staff:${id}`);
}

/** Xodim o'z parolini almashtiradi (kompaniya parolini emas). Boshqa qurilmalardagi sessiyalari bekor bo'ladi. */
export async function changeStaffPassword(user: SessionUser, current: string, next: string): Promise<void> {
  if (!user.staff) throw new AppError("FORBIDDEN");
  await connectDb();
  const staff = await Staff.findOne({ _id: user.staff.id, company: user.id }).select("+passwordHash");
  if (!staff || !(await verifyPassword(current, staff.passwordHash))) throw new AppError("INVALID_CREDENTIALS", { current: "INVALID_CREDENTIALS" });
  staff.passwordHash = await hashPassword(next);
  staff.authVersion += 1;
  await staff.save();
  forgetSessionUser(user.id);
}
