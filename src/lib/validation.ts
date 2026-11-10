import { z } from "zod";
import { normalizePhone } from "./phone";
import { REGION_CODES } from "./regions";
import { CATEGORY_CODES, UNIT_CODES } from "./catalog";
import { DELIVERY_METHODS, ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, PROFILE_PAYMENT_METHODS } from "./orders";
import { TICKET_STATUSES } from "./tickets";

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
    images: z.array(z.string().url().max(500)).max(4).default([]),
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

const money = z.coerce.number().int("numberInvalid").min(0, "numberInvalid").max(1_000_000_000, "numberInvalid");
const coord = (max: number) =>
  z
    .union([z.coerce.number().min(-max).max(max), z.literal(""), z.null()])
    .optional()
    .transform((v) => (typeof v === "number" ? v : null));

export const profileSchema = z.object({
  name: z.string().trim().min(2, "nameShort").max(120, "nameShort"),
  region: z.enum(REGION_CODES, { message: "regionRequired" }),
  about: z.string().trim().max(1000).default(""),
  address: z.string().trim().max(300).default(""),
  lat: coord(90),
  lng: coord(180),
  deliveryRegions: z.array(z.enum(REGION_CODES)).max(REGION_CODES.length).default([]),
  deliveryDays: z.array(z.coerce.number().int().min(1).max(7)).max(7).default([]),
  leadDays: z.coerce.number().int("numberInvalid").min(0, "numberInvalid").max(60, "numberInvalid").default(1),
  deliveryFee: money.default(0),
  minOrderTotal: money.default(0),
  paymentMethods: z.array(z.enum(PROFILE_PAYMENT_METHODS)).max(3).default(["cash"]),
  pickup: z.boolean().default(false),
  inn: z.string().trim().regex(/^(\d{9})?$/, "innFormat").default(""),
  bankName: z.string().trim().max(120).default(""),
  bankAccount: z.string().trim().regex(/^(\d{20})?$/, "accountFormat").default(""),
  mfo: z.string().trim().regex(/^(\d{5})?$/, "mfoFormat").default(""),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const passwordChangeSchema = z.object({ current: z.string().min(1, "passwordShort").max(128), next: password });

export const partnershipUpdateSchema = z.object({
  action: z.enum(["accept", "reject", "update"]),
  discount: z.coerce.number().int("numberInvalid").min(0, "numberInvalid").max(50, "numberInvalid").optional(),
  terms: z.string().trim().max(1000).optional(),
  shareStock: z.boolean().optional(),
  /** Nasiya limiti, so'm (0 — nasiya yo'q). */
  creditLimit: z.coerce.number().int("numberInvalid").min(0, "numberInvalid").max(10_000_000_000, "numberInvalid").optional(),
  /** Nasiya to'lov muddati, kun. */
  paymentDays: z.coerce.number().int("numberInvalid").min(1, "numberInvalid").max(180, "numberInvalid").optional(),
});

export const debtPaymentSchema = z.object({
  amount: z.coerce.number().int("numberInvalid").min(1, "numberInvalid").max(10_000_000_000, "numberInvalid"),
  note: z.string().trim().max(300).default(""),
});

export const cartSetSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int("numberInvalid").min(0, "numberInvalid").max(1_000_000, "numberInvalid"),
  /** true — mavjud miqdorga qo'shadi, aks holda almashtiradi. */
  add: z.boolean().optional(),
});

export const checkoutSchema = z.object({
  sellerId: z.string().min(1),
  phone,
  region: z.enum(REGION_CODES, { message: "regionRequired" }),
  /** "pickup" — do'kon o'zi olib ketadi: manzil shart emas, yetkazish narxi olinmaydi. */
  method: z.enum(DELIVERY_METHODS).default("delivery"),
  address: z.string().trim().max(300, "addressRequired").default(""),
  lat: coord(90),
  lng: coord(180),
  paymentMethod: z.enum(PAYMENT_METHODS, { message: "paymentRequired" }),
  comment: z.string().trim().max(1000).default(""),
  /** Ikki marta bosish yoki tarmoq uzilib qayta yuborishdan himoya (ixtiyoriy). */
  requestId: z.string().trim().regex(/^[A-Za-z0-9_-]{8,64}$/).optional(),
}).superRefine((v, ctx) => {
  if (v.method === "delivery" && v.address.length < 3) ctx.addIssue({ code: "custom", path: ["address"], message: "addressRequired" });
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const orderUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  paidAmount: money.optional(),
  deliveryDate: z.union([z.string().date(), z.literal(""), z.null()]).optional(),
});

export const messageSchema = z.object({
  text: z.string().trim().min(1, "messageEmpty").max(2000),
  orderId: z.string().optional(),
  productId: z.string().optional(),
});

export const stockSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int("numberInvalid").min(0, "numberInvalid").max(10_000_000, "numberInvalid"),
  minLevel: z.coerce.number().int("numberInvalid").min(0, "numberInvalid").max(10_000_000, "numberInvalid"),
});

export const ticketSchema = z.object({
  subject: z.string().trim().min(3, "subjectShort").max(160, "subjectShort"),
  message: z.string().trim().min(5, "messageEmpty").max(3000),
});

export const ticketReplySchema = z.object({
  status: z.enum(TICKET_STATUSES),
  reply: z.string().trim().max(3000).default(""),
});

export const adminUserSchema = z.object({
  verification: z.enum(["unverified", "pending", "verified", "rejected"]).optional(),
  blocked: z.boolean().optional(),
  /** Obunani shuncha oyga uzaytirish (0 — o'zgarmaydi, -1 — to'xtatish). */
  extendMonths: z.coerce.number().int().min(-1).max(24).optional(),
});

const merchantId = z.string().trim().min(3, "numberInvalid").max(64, "numberInvalid");
const secretKey = z.string().trim().max(200).optional();
/** Kompaniyaning onlayn to'lov hisoblari. Kalit bo'sh — eskisi qoladi; null — o'chirish. */
export const onlinePaySchema = z.object({
  payme: z.union([z.object({ merchantId, key: secretKey }), z.null()]).optional(),
  click: z.union([z.object({ serviceId: merchantId, merchantId, secret: secretKey }), z.null()]).optional(),
});

export const startPaySchema = z.object({ provider: z.enum(["payme", "click"]) });
