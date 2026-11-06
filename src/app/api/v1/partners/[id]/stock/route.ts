import { fail, ok } from "@/lib/api";
import { withUser, type IdCtx } from "@/server/handler";
import { partnerStock } from "@/server/stock";

/** Kompaniya: hamkor do'kon omboridagi o'z mahsulotlari qoldig'i. */
export const GET = withUser<IdCtx>("seller", async (user, _request, { params }) => {
  const rows = await partnerStock(user.id, (await params).id);
  return rows ? ok(rows) : fail("NOT_PARTNER");
});
