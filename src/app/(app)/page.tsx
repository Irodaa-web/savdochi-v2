import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { homePath } from "@/lib/navigation";

/** Bosh manzil: rolga qarab kerakli sahifaga yo'naltiradi. */
export default async function Home() {
  const user = await getSessionUser();
  redirect(user ? homePath[user.role] : "/api/v1/auth/reset");
}
