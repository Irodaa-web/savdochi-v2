import { ok } from "@/lib/api";
import { withUser } from "@/server/handler";
import { sellerReport } from "@/server/reports";

/** Kompaniya hisoboti: ?days=7|30|90 */
export const GET = withUser("seller", async (user, request) => {
  const days = Number(new URL(request.url).searchParams.get("days"));
  return ok(await sellerReport(user.id, [7, 30, 90].includes(days) ? days : 30));
});
