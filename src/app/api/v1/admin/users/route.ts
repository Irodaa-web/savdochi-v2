import { ok } from "@/lib/api";
import { listUsers } from "@/server/admin";
import { withUser } from "@/server/handler";

/** ?q=&role=&verification= */
export const GET = withUser("admin", async (_user, request) => {
  const p = new URL(request.url).searchParams;
  const role = p.get("role");
  const verification = p.get("verification");
  return ok(
    await listUsers({
      q: p.get("q") ?? undefined,
      role: role === "buyer" || role === "seller" ? role : undefined,
      verification: ["unverified", "pending", "verified", "rejected"].includes(verification ?? "") ? (verification as "pending") : undefined,
    }),
  );
});
