import { redirect } from "next/navigation";
import { Welcome } from "@/components/Welcome";
import { getSessionUser } from "@/lib/auth/session";

export default async function Page() {
  const user = await getSessionUser();
  if (!user) redirect("/api/v1/auth/reset");
  return <Welcome user={user} />;
}
