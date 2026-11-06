import { ok } from "@/lib/api";
import { profileSchema } from "@/lib/validation";
import { parseBody, withUser } from "@/server/handler";
import { getProfile, updateProfile } from "@/server/profile";

export const GET = withUser(null, async (user) => ok(await getProfile(user.id)));

export const PUT = withUser(null, async (user, request) => ok(await updateProfile(user.id, await parseBody(request, profileSchema))));
