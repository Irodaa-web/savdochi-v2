import { STAFF_ROLES } from "@/lib/staff";
import { z } from "zod";
import { normalizePhone } from "./phone";
import { REGION_CODES } from "./regions";
import { CATEGORY_CODES, UNIT_CODES } from "./catalog";
import { DELIVERY_METHODS, ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, PROFILE_PAYMENT_METHODS } from "./orders";
import { TICKET_STATUSES } from "./tickets";
import { PLAN_CODES } from "@/lib/plans";

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
  /** Nofaol hisobni qayta faollashtirish uchun SMS kod (faqat shu holatda kerak). */
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "codeFormat")
    .optional(),
});

const smsCode = z.string().trim().regex(/^\d{6}$/, "codeFormat");

export const registerSchema = z.object({
  role: z.enum(["buyer", "seller"]),
  name: z.string().trim().min(2, "nameShort").max(120, "nameShort"),
  phone,
  region: z.enum(REGION_CODES, { message: "regionRequired" }),
  password,
  /** SMS kod — SMS yoqilgan bo'lsa majburiy (server tekshiradi). */
  code: smsCode.optional(),
  /** Taklif havolasidagi kod (kompaniya taklif qilgan bo'lsa). Noto'g'risi e'tiborsiz qoldiriladi. */
  ref: z.string().trim().max(16).optional(),
});

export const smsRequestSchema = z.object({ phone, purpose: z.enum(["register", "reset"]) });
export const passwordResetSchema = z.object({ phone, code: smsCode, password });
/** Telegram orqali tasdiqlangan raqam: bir martalik kalit (havoladan) + yangi parol. */
export const telegramResetSchema = z.object({ phone, key: z.string().regex(/^[A-Za-z0-9_-]{20,80}$/, "CODE_INVALID"), password });

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
    // Aksiya: ikkalasi birga beriladi yoki ikkalasi ham bo'sh.
    salePrice: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().int("numberInvalid").min(1, "numberInvalid").nullable()).default(null),
    saleUntil: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.date({ message: "saleInvalid" }).nullable()).default(null),
  })
  .superRefine((p, ctx) => {
    if (p.salePrice != null || p.saleUntil != null) {
      const now = Date.now();
      if (p.salePrice == null || p.salePrice >= p.price) ctx.addIssue({ code: "custom", path: ["salePrice"], message: "salePriceInvalid" });
      if (p.saleUntil == null || p.saleUntil.getTime() <= now || p.saleUntil.getTime() > now + 92 * 86_400_000)
        ctx.addIssue({ code: "custom", path: ["saleUntil"], message: "saleUntilInvalid" });
    }
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
  regionRules: z
    .array(
      z.object({
        region: z.enum(REGION_CODES),
        days: z.array(z.coerce.number().int().min(1).max(7)).max(7).default([]),
        fee: z.preprocess((v) => (v === "" || v == null ? null : v), money.nullable()).default(null),
        minOrderTotal: z.preprocess((v) => (v === "" || v == null ? null : v), money.nullable()).default(null),
      }),
    )
    .max(REGION_CODES.length)
    .default([])
    .refine((rules) => new Set(rules.map((r) => r.region)).size === rules.length, "regionRuleDuplicate")
    // Hech narsa o'zgartirilmagan qoida saqlanmaydi.
    .transform((rules) => rules.filter((r) => r.days.length || r.fee != null || r.minOrderTotal != null)),
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

/** Kompaniya buyurtmani tahrirlaydi: har qator uchun yangi miqdor (0 — olib tashlash) va sabab. */
export const orderEditSchema = z.object({
  items: z
    .array(z.object({ productId: z.string().min(1).max(40), quantity: z.coerce.number().int("numberInvalid").min(0, "numberInvalid") }))
    .min(1)
    .max(200),
  reason: z.string().trim().max(300).default(""),
});

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "ratingRequired").max(5, "ratingRequired"),
  text: z.string().trim().max(1000).default(""),
});

export const reviewReplySchema = z.object({ text: z.string().trim().max(1000).default("") });

/** Bir nechta mahsulotni savatga birdaniga qo'shish. */
export const bulkCartSchema = z.object({
  items: z
    .array(z.object({ productId: z.string().min(1).max(40), quantity: z.coerce.number().int("numberInvalid").min(1, "numberInvalid").max(1_000_000) }))
    .min(1)
    .max(100),
});

export const orderListCreateSchema = z.object({
  orderId: z.string().min(1).max(40),
  name: z.string().trim().max(80).default(""),
  listId: z.string().max(40).optional(),
}).refine((v) => v.listId || v.name.length >= 2, { path: ["name"], message: "listNameShort" });

export const orderListUpdateSchema = z.object({
  name: z.string().trim().min(2, "listNameShort").max(80).optional(),
  items: z.array(z.object({ productId: z.string().min(1).max(40), quantity: z.coerce.number().int("numberInvalid").min(0, "numberInvalid").max(1_000_000) })).max(100).optional(),
});

export const staffCreateSchema = z.object({
  name: z.string().trim().min(2, "nameShort").max(120, "nameShort"),
  phone,
  role: z.enum(STAFF_ROLES),
  password,
});

export const staffUpdateSchema = z.object({
  name: z.string().trim().min(2, "nameShort").max(120, "nameShort").optional(),
  role: z.enum(STAFF_ROLES).optional(),
  blocked: z.boolean().optional(),
  password: password.optional(),
});

/** Omborchi/menejer: mahsulot qoldig'ini yangilash. */
export const stockOnlySchema = z.object({ stock: z.coerce.number().int("numberInvalid").min(0, "numberInvalid").max(10_000_000, "numberInvalid") });

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

/** Administrator: mahsulotni sabab bilan yashirish yoki qaytarish. */
export const adminProductSchema = z.object({ hidden: z.boolean(), note: z.string().trim().max(500).default("") }).refine((v) => !v.hidden || v.note.length >= 3, { path: ["note"], message: "reasonRequired" });

export const ticketMessageSchema = z.object({ text: z.string().trim().min(1, "messageEmpty").max(3000) });

export const ticketReplySchema = z.object({
  status: z.enum(TICKET_STATUSES),
  reply: z.string().trim().max(3000).default(""),
});

export const adminUserSchema = z.object({
  verification: z.enum(["unverified", "pending", "verified", "rejected"]).optional(),
  /** Rad etish sababi — foydalanuvchiga yuboriladi. */
  reason: z.string().trim().max(500).optional(),
  blocked: z.boolean().optional(),
  /** Kompaniyani katalogdan yashirish / qaytarish. */
  hidden: z.boolean().optional(),
  /** 15 kunlik nofaollikdan keyin hisobni qo'lda tiklash. */
  reactivate: z.boolean().optional(),
  /** Tarifni shuncha oyga yoqish/uzaytirish (-1 — Bepul tarifga o'tkazish). */
  extendMonths: z.coerce.number().int().min(-1).max(24).optional(),
  /** Qaysi tarif (extendMonths bilan). "free" — Bepulga o'tkazish. */
  plan: z.enum(PLAN_CODES).optional(),
});

/** Kompaniya tarif so'rovi: pullik tarif va 1/3/12 oy. */
export const planRequestSchema = z.object({
  plan: z.enum(["standard", "premium"]),
  months: z.coerce.number().refine((n) => n === 1 || n === 3 || n === 12, "numberInvalid"),
});

/** Administrator: so'rovni tasdiqlash (to'langan summa) yoki rad etish (sabab). */
export const planDecisionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), paidAmount: z.coerce.number().int("numberInvalid").min(0, "numberInvalid").max(1_000_000_000, "numberInvalid") }),
  z.object({ action: z.literal("reject"), reason: z.string().trim().min(3, "reasonRequired").max(500) }),
]);

const merchantId = z.string().trim().min(3, "numberInvalid").max(64, "numberInvalid");
const secretKey = z.string().trim().max(200).optional();
/** Kompaniyaning onlayn to'lov hisoblari. Kalit bo'sh — eskisi qoladi; null — o'chirish. */
export const onlinePaySchema = z.object({
  payme: z.union([z.object({ merchantId, key: secretKey }), z.null()]).optional(),
  click: z.union([z.object({ serviceId: merchantId, merchantId, secret: secretKey }), z.null()]).optional(),
});

export const startPaySchema = z.object({ provider: z.enum(["payme", "click"]) });

/** Brauzerning Web Push obunasi (PushSubscription.toJSON()). */
export const pushSubSchema = z.object({
  endpoint: z.string().url().max(1000).refine((u) => u.startsWith("https://"), "invalid"),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(4).max(100) }),
});
export const pushUnsubSchema = z.object({ endpoint: z.string().url().max(1000) });
