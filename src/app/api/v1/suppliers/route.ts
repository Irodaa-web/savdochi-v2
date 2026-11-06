import { ok } from "@/lib/api";
import { REGION_CODES, type RegionCode } from "@/lib/regions";
import { withUser } from "@/server/handler";
import { listSuppliers } from "@/server/products";

/** Kompaniyalar (yetkazib beruvchilar) qidiruvi: ?q=&region= */
export const GET = withUser(null, async (_user, request) => {
  const params = new URL(request.url).searchParams;
  const region = params.get("region");
  const valid = (REGION_CODES as readonly string[]).includes(region ?? "");
  return ok(await listSuppliers({ region: valid ? (region as RegionCode) : undefined, q: params.get("q") ?? undefined }));
});
