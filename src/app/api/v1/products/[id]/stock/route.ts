import { ok } from "@/lib/api";
import { stockOnlySchema } from "@/lib/validation";
import { parseBody, withUser, type IdCtx } from "@/server/handler";
import { setProductStock } from "@/server/products";

/** Faqat qoldiqni yangilash (omborchi uchun; narx va boshqa maydonlarga tegmaydi). { stock } */
export const PATCH = withUser<IdCtx>("seller", async (user, request, { params }) => ok(await setProductStock(user.id, (await params).id, (await parseBody(request, stockOnlySchema)).stock)));
