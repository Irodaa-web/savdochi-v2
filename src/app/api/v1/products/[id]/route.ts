import { fail, ok, readJson } from "@/lib/api";
import { fieldErrors, productSchema } from "@/lib/validation";
import { withUser } from "@/server/handler";
import { planHas } from "@/lib/plans";
import { archiveProduct, getProduct, productVisibleTo, updateProduct } from "@/server/products";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withUser<Ctx>(null, async (user, _request, { params }) => {
  const product = await getProduct((await params).id);
  return product && product.active && productVisibleTo(product, user) ? ok(product) : fail("NOT_FOUND");
});

export const PATCH = withUser<Ctx>("seller", async (user, request, { params }) => {
  const parsed = productSchema.safeParse(await readJson(request));
  if (!parsed.success) return fail("INVALID_INPUT", fieldErrors(parsed.error));
  const product = await updateProduct(user.id, (await params).id, parsed.data, planHas(user.plan, "sale"));
  return product ? ok(product) : fail("NOT_FOUND");
});

export const DELETE = withUser<Ctx>("seller", async (user, _request, { params }) => {
  return (await archiveProduct(user.id, (await params).id)) ? ok(null) : fail("NOT_FOUND");
});
