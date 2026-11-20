import { AppError, ok } from "@/lib/api";
import { partnershipUpdateSchema } from "@/lib/validation";
import { parseBody, withUser, type IdCtx } from "@/server/handler";
import { updatePartnership } from "@/server/partners";

/** { action: "accept" | "reject" | "update", discount?, terms?, shareStock? } */
export const PATCH = withUser<IdCtx>(null, async (user, request, { params }) => {
  const input = await parseBody(request, partnershipUpdateSchema);
  // Agent: so'rovni qabul/rad qila oladi, lekin chegirma, nasiya limiti va shartlarni — yo'q.
  if (user.staff?.role === "agent" && input.action === "update") throw new AppError("FORBIDDEN");
  await updatePartnership(user, (await params).id, input);
  return ok(null);
});
