import { fail, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await getSessionUser();
    return user ? ok(user) : fail("UNAUTHORIZED");
  } catch (error) {
    console.error("me failed", error);
    return fail("SERVER_ERROR");
  }
}
