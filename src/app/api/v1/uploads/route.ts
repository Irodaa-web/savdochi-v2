import { put } from "@vercel/blob";
import { fail, ok } from "@/lib/api";
import { withUser } from "@/server/handler";

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Mahsulot rasmi yuklash (multipart, maydon: file). Vercel Blob kerak: BLOB_READ_WRITE_TOKEN. */
export const POST = withUser("seller", async (user, request) => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return fail("UPLOAD_DISABLED");
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("INVALID_INPUT", { file: "imageInvalid" });
  const ext = TYPES[file.type];
  if (!ext || file.size > MAX_BYTES) return fail("INVALID_INPUT", { file: "imageInvalid" });
  const blob = await put(`products/${user.id}/${crypto.randomUUID()}.${ext}`, file, { access: "public", contentType: file.type });
  return ok({ url: blob.url }, { status: 201 });
});
