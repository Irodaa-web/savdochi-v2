import { z } from "zod";
import { normalizePhone } from "./phone";
import { REGION_CODES } from "./regions";

/**
 * Server va mijoz ikkalasi ishlatadigan sxemalar.
 * Xato xabarlari — tarjima kalitlari (errors.*), matn emas.
 */
const phone = z
  .string()
  .transform((v, ctx) => {
    const normalized = normalizePhone(v);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "phoneFormat" });
      return z.NEVER;
    }
    return normalized;
  });

const password = z.string().min(8, "passwordShort").max(128, "passwordShort");

export const loginSchema = z.object({
  phone,
  password: z.string().min(1, "passwordShort").max(128),
});

export const registerSchema = z.object({
  role: z.enum(["buyer", "seller"]),
  name: z.string().trim().min(2, "nameShort").max(120, "nameShort"),
  phone,
  region: z.enum(REGION_CODES, { message: "regionRequired" }),
  password,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

/** Zod xatolarini { maydon: "kalit" } ko'rinishiga keltiradi. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
