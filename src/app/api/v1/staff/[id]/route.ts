import { ok } from "@/lib/api";
import { staffUpdateSchema } from "@/lib/validation";
import { parseBody, withUser, type IdCtx } from "@/server/handler";
import { removeStaff, updateStaff } from "@/server/staff";

/** { name?, role?, blocked?, password? } — rol/parol/bloklash o'zgarsa xodim sessiyalari bekor bo'ladi. */
export const PATCH = withUser<IdCtx>("seller", async (user, request, { params }) => ok(await updateStaff(user, (await params).id, await parseBody(request, staffUpdateSchema))));

export const DELETE = withUser<IdCtx>("seller", async (user, _request, { params }) => {
  await removeStaff(user, (await params).id);
  return ok(null);
});
