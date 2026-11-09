import { ok } from "@/lib/api";
import { debtPaymentSchema } from "@/lib/validation";
import { parseBody, withUser, type IdCtx } from "@/server/handler";
import { recordPayment } from "@/server/debts";

/** Kompaniya: do'kondan to'lov olindi `{ amount, note? }` — eng eski buyurtmalardan boshlab taqsimlanadi. */
export const POST = withUser<IdCtx>("seller", async (user, request, ctx) => {
  const input = await parseBody(request, debtPaymentSchema);
  return ok(await recordPayment(user, (await ctx.params).id, input.amount, input.note), { status: 201 });
});
