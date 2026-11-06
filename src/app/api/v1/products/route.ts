import { fail, ok, readJson } from "@/lib/api";
import { CATEGORY_CODES, type CategoryCode } from "@/lib/catalog";
import { fieldErrors, productSchema } from "@/lib/validation";
import { withUser } from "@/server/handler";
import { createProduct, listCatalog } from "@/server/products";

/** Katalog: ?q=&category=&seller=&page= */
export const GET = withUser(null, async (_user, request) => {
  const params = new URL(request.url).searchParams;
  const category = params.get("category");
  const result = await listCatalog({
    q: params.get("q") ?? undefined,
    category: (CATEGORY_CODES as readonly string[]).includes(category ?? "") ? (category as CategoryCode) : undefined,
    seller: params.get("seller") ?? undefined,
    page: Number(params.get("page")) || 1,
  });
  return ok(result);
});

/** Yangi mahsulot — faqat sotuvchi. */
export const POST = withUser("seller", async (user, request) => {
  const parsed = productSchema.safeParse(await readJson(request));
  if (!parsed.success) return fail("INVALID_INPUT", fieldErrors(parsed.error));
  return ok(await createProduct(user.id, parsed.data), { status: 201 });
});
