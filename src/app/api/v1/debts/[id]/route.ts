import { fail, ok } from "@/lib/api";
import { withUser, type IdCtx } from "@/server/handler";
import { partnerLedger } from "@/server/debts";

/** Hamkor bilan qarz daftari: to'lanmagan buyurtmalar va to'lovlar. :id — hamkor foydalanuvchi ID si. */
export const GET = withUser<IdCtx>(null, async (user, _request, ctx) => {
  const ledger = await partnerLedger(user, (await ctx.params).id);
  return ledger ? ok(ledger) : fail("NOT_FOUND");
});
