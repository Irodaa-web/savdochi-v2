import { fail, ok } from "@/lib/api";
import { withUser, type IdCtx } from "@/server/handler";
import { getSellerPublic } from "@/server/profile";

/** Kompaniya sahifasi: profil va yetkazish shartlari. */
export const GET = withUser<IdCtx>(null, async (_user, _request, { params }) => {
  const seller = await getSellerPublic((await params).id);
  return seller ? ok({ ...seller, phone: undefined }) : fail("NOT_FOUND");
});
