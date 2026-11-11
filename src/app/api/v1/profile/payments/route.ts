import { ok } from "@/lib/api";
import { onlinePaySchema } from "@/lib/validation";
import { parseBody, withUser } from "@/server/handler";
import { getOnlinePaySettings, updateOnlinePaySettings } from "@/server/onlinePay";

/** Kompaniya: Payme/Click hisoblari (kalitlar qaytarilmaydi, faqat bor-yo'qligi). */
export const GET = withUser("seller", async (user) => ok(await getOnlinePaySettings(user.id)));

/** `{ payme?: { merchantId, key? } | null, click?: { serviceId, merchantId, secret? } | null }` */
export const PUT = withUser("seller", async (user, request) => ok(await updateOnlinePaySettings(user.id, await parseBody(request, onlinePaySchema))));
