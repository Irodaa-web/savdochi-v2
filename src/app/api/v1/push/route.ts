import { ok } from "@/lib/api";
import { pushSubSchema, pushUnsubSchema } from "@/lib/validation";
import { parseBody, withUser } from "@/server/handler";
import { pushPublicKey, removePushSub, savePushSub } from "@/server/push";

/** Telefon/kompyuter bildirishnomalari: ochiq kalit (obuna uchun). Xodimlarga yopiq (lib/staff). */
export const GET = withUser(null, async () => ok({ publicKey: await pushPublicKey() }));

/** Shu qurilmani bildirishnomalarga ulash. */
export const POST = withUser(null, async (user, request) => {
  await savePushSub(user.id, await parseBody(request, pushSubSchema));
  return ok(null, { status: 201 });
});

/** Shu qurilmani uzish. */
export const DELETE = withUser(null, async (user, request) => {
  await removePushSub(user.id, (await parseBody(request, pushUnsubSchema)).endpoint);
  return ok(null);
});
