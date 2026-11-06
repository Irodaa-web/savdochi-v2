import { ok } from "@/lib/api";
import { endSession } from "@/lib/auth/session";

export async function POST() {
  await endSession();
  return ok(null);
}
