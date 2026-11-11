import { ok } from "@/lib/api";
import { startPaySchema } from "@/lib/validation";
import { parseBody, withUser, type IdCtx } from "@/server/handler";
import { startOnlinePayment } from "@/server/onlinePay";

/** Do'kon: `{ provider: "payme" | "click" }` → to'lov sahifasi manzili `{ url }`. */
export const POST = withUser<IdCtx>("buyer", async (user, request, { params }) => {
  const { provider } = await parseBody(request, startPaySchema);
  const origin = process.env.APP_URL?.replace(/\/$/, "") || new URL(request.url).origin;
  return ok(await startOnlinePayment(user, (await params).id, provider, origin));
});
