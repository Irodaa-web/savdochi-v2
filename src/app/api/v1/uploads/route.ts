import { put } from "@vercel/blob";
import { fail, ok } from "@/lib/api";
import { withUser } from "@/server/handler";

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Fayl ichidagi "imzo" (magic bytes) — brauzer aytgan turga ishonmaymiz. */
function sniff(head: Uint8Array): string | null {
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) return "image/png";
  if (String.fromCharCode(...head.slice(0, 4)) === "RIFF" && String.fromCharCode(...head.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

/**
 * Rasm yuklash (multipart, maydon: file; kind: "logo" | "banner" — kompaniya brendi, aks holda mahsulot rasmi).
 * Vercel Blob kerak: BLOB_READ_WRITE_TOKEN.
 */
export const POST = withUser("seller", async (user, request) => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return fail("UPLOAD_DISABLED");
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("INVALID_INPUT", { file: "imageInvalid" });
  const ext = TYPES[file.type];
  if (!ext || file.size > MAX_BYTES) return fail("INVALID_INPUT", { file: "imageInvalid" });
  if (sniff(new Uint8Array(await file.slice(0, 12).arrayBuffer())) !== file.type) return fail("INVALID_INPUT", { file: "imageInvalid" });
  const kind = form?.get("kind");
  const folder = kind === "logo" || kind === "banner" ? `brand/${user.id}/${kind}` : `products/${user.id}`;
  const blob = await put(`${folder}/${crypto.randomUUID()}.${ext}`, file, { access: "public", contentType: file.type });
  return ok({ url: blob.url }, { status: 201 });
});
