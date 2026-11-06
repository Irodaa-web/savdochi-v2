import { z } from "zod";
import { ok } from "@/lib/api";
import { parseBody, withUser } from "@/server/handler";
import { listPartners, requestPartnership } from "@/server/partners";

export const GET = withUser(null, async (user) => ok(await listPartners(user)));

/** Hamkorlik so'rovi: { partnerId } */
export const POST = withUser(null, async (user, request) => {
  const { partnerId } = await parseBody(request, z.object({ partnerId: z.string().min(1) }));
  return ok({ status: await requestPartnership(user, partnerId) });
});
