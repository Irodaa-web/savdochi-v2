import { ok } from "@/lib/api";
import { listUsers, USER_STATUSES, type UserStatusFilter } from "@/server/admin";
import { withUser } from "@/server/handler";

/** ?q=&role=&status=&page= */
export const GET = withUser("admin", async (_user, request) => {
  const p = new URL(request.url).searchParams;
  const role = p.get("role");
  const status = p.get("status");
  return ok(
    await listUsers({
      q: p.get("q") ?? undefined,
      role: role === "buyer" || role === "seller" ? role : undefined,
      status: (USER_STATUSES as readonly string[]).includes(status ?? "") ? (status as UserStatusFilter) : undefined,
      page: Number(p.get("page")) || 1,
    }),
  );
});
