import { fail, ok } from "@/lib/api";
import { withUser } from "@/server/handler";
import { IMPORT_MAX_BYTES, importProducts } from "@/server/productImport";
import { subscriptionActive } from "@/server/profile";

/**
 * Excel'dan mahsulot yuklash (multipart): file — .xlsx, commit — "1" bo'lsa saqlaydi.
 * commit bo'lmasa faqat tahlil natijasi (oldindan ko'rish) qaytadi.
 * Nomi mavjud mahsulot bilan bir xil bo'lsa — yangilanadi, aks holda yangi yaratiladi.
 */
export const POST = withUser("seller", async (user, request) => {
  if (!subscriptionActive(user.subscriptionUntil)) return fail("SUBSCRIPTION_EXPIRED");
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("INVALID_INPUT", { file: "excelInvalid" });
  if (file.size > IMPORT_MAX_BYTES) return fail("INVALID_INPUT", { file: "excelTooBig" });
  const commit = form?.get("commit") === "1";
  const result = await importProducts(user.id, Buffer.from(await file.arrayBuffer()), commit);
  return ok(result, { status: commit ? 201 : 200 });
});
