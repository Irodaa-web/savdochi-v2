import { ok } from "@/lib/api";
import { REGION_CODES, type RegionCode } from "@/lib/regions";
import { withUser } from "@/server/handler";
import { listSuppliers } from "@/server/products";

/** Yetkazib beruvchilar: ?region= */
export const GET = withUser(null, async (_user, request) => {
  const region = new URL(request.url).searchParams.get("region");
  const valid = (REGION_CODES as readonly string[]).includes(region ?? "");
  return ok(await listSuppliers(valid ? (region as RegionCode) : undefined));
});
