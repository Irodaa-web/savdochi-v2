import { z } from "zod";
import { normalizePhone } from "./phone";
import { REGION_CODES } from "./regions";
import { CATEGORY_CODES, UNIT_CODES } from "./catalog";

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

const positiveInt = (max: number) => z.coerce.number().int("numberInvalid").min(1, "numberInvalid").max(max, "numberInvalid");

export const productSchema = z
  .object({
    name: z.string().trim().min(2, "nameShort").max(160, "nameShort"),
    category: z.enum(CATEGORY_CODES, { message: "categoryRequired" }),
    unit: z.enum(UNIT_CODES, { message: "unitRequired" }),
    price: positiveInt(1_000_000_000),
    minOrder: positiveInt(1_000_000),
    stock: z.coerce.number().int("numberInvalid").min(0, "numberInvalid").max(10_000_000, "numberInvalid"),
    packSize: positiveInt(10_000),
    description: z.string().trim().max(2000).default(""),
    priceTiers: z
      .array(z.object({ min: z.coerce.number().int().min(2), price: z.coerce.number().int().min(1) }))
      .max(5)
      .default([]),
  })
  .superRefine((p, ctx) => {
    // Pog'onalar o'sib boruvchi miqdor va kamayib boruvchi narx bo'lishi kerak.
    const tiers = [...p.priceTiers].sort((a, b) => a.min - b.min);
    let last = p.price;
    let lastMin = 1;
    for (const tier of tiers) {
      if (tier.min <= lastMin || tier.price >= last) {
        ctx.addIssue({ code: "custom", path: ["priceTiers"], message: "tiersInvalid" });
        return;
      }
      last = tier.price;
      lastMin = tier.min;
    }
  });

export type ProductInput = z.infer<typeof productSchema>;
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
