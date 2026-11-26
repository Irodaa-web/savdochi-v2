import { ok } from "@/lib/api";
import { planRequestSchema } from "@/lib/validation";
import { myPlanOrders, requestPlan } from "@/server/billing";
import { parseBody, withUser } from "@/server/handler";

/** Kompaniya egasi: ochiq so'rov va tarif tarixi. */
export const GET = withUser("seller", async (user) => ok(await myPlanOrders(user.id)));

/** Kompaniya egasi tarif so'raydi (Standart/Premium, 1/3/12 oy) — administratorga xabar boradi. */
export const POST = withUser("seller", async (user, request) => {
  const { plan, months } = await parseBody(request, planRequestSchema);
  return ok(await requestPlan(user, plan, months), { status: 201 });
});
