import "server-only";
import bcrypt from "bcryptjs";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Hisob topilmaganda ham vaqt bir xil ketsin (raqam mavjudligini bildirmaslik uchun). */
let dummyHash: Promise<string> | null = null;
export async function burnTime(password: string): Promise<void> {
  dummyHash ??= bcrypt.hash("savdochi-dummy-password", 12);
  await bcrypt.compare(password, await dummyHash);
}
