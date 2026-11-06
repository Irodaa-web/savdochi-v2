import { ok } from "@/lib/api";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders";
import { checkoutSchema } from "@/lib/validation";
import { parseBody, withUser } from "@/server/handler";
import { checkout, listOrders } from "@/server/orders";

/** ?status=new|confirmed|…|open&partner= */
export const GET = withUser(null, async (user, request) => {
  const params = new URL(request.url).searchParams;
  const raw = params.get("status") ?? "";
  const status = raw === "open" || (ORDER_STATUSES as readonly string[]).includes(raw) ? (raw as OrderStatus | "open") : undefined;
  return ok(await listOrders(user, { status, partnerId: params.get("partner") ?? undefined }));
});

/** Savatdagi bitta kompaniya mahsulotlaridan buyurtma. */
export const POST = withUser("buyer", async (user, request) => ok(await checkout(user, await parseBody(request, checkoutSchema)), { status: 201 }));
