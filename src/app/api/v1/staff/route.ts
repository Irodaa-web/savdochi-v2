import { ok } from "@/lib/api";
import { staffCreateSchema } from "@/lib/validation";
import { parseBody, withUser } from "@/server/handler";
import { addStaff, listStaff } from "@/server/staff";

/** Kompaniya egasi: xodimlar ro'yxati. */
export const GET = withUser("seller", async (user) => ok(await listStaff(user)));

/** Kompaniya egasi: xodim qo'shish. { name, phone, role, password } */
export const POST = withUser("seller", async (user, request) => ok(await addStaff(user, await parseBody(request, staffCreateSchema))));
