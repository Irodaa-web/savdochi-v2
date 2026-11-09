import { ok } from "@/lib/api";
import { withUser } from "@/server/handler";
import { listDebts } from "@/server/debts";

/** Hamkorlar bo'yicha qarzlar: kompaniya — olinadigan, do'kon — to'lanadigan. */
export const GET = withUser(null, async (user) => ok(await listDebts(user)));
