/**
 * Kompaniya xodimlari va ularning huquqlari. Edge (middleware) va Node'da ishlaydi — faqat sof funksiyalar.
 *
 * Qoida: xodimga faqat shu yerda ruxsat berilgan sahifa va API ochiq (qolgani — yopiq).
 * Egaga (kompaniya hisobining o'ziga) hech qanday cheklov yo'q.
 */
export const STAFF_ROLES = ["manager", "agent", "warehouse"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export const MAX_STAFF = 20;

/** Xodim kirganda ochiladigan sahifa. */
export const staffHome: Record<StaffRole, string> = { manager: "/dashboard", agent: "/partners", warehouse: "/orders" };

/** Sahifalar: yo'l prefikslari (prefiks yoki uning ichki sahifasi). */
const PAGES: Record<StaffRole, string[]> = {
  manager: ["/dashboard", "/analytics", "/orders", "/products", "/catalog", "/suppliers", "/partners", "/debts", "/chat", "/print", "/help", "/settings"],
  agent: ["/orders", "/catalog", "/suppliers", "/partners", "/chat", "/print/invoice", "/help", "/settings"],
  // Omborchi narxlarni ko'rmaydi: katalog va hisob-faktura ham yopiq.
  warehouse: ["/orders", "/products", "/help", "/settings"],
};

const under = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

export function staffPageAllowed(role: StaffRole, path: string): boolean {
  if (path === "/") return true; // bosh sahifa — xodimning o'z bosh sahifasiga yo'naltiriladi
  return PAGES[role].some((p) => under(path, p));
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type Rule = [pattern: RegExp, methods: Method[], roles: StaffRole[]];
const ALL: StaffRole[] = ["manager", "agent", "warehouse"];
// Faqat MongoDB ObjectId: "export", "import" kabi so‘zlar ID qoidasiga tushib qolmasin.
const ID = "[a-f0-9]{24}";

/**
 * API qoidalari (/api/v1 dan keyingi yo'l). Ro'yxatda yo'q yo'l — xodim uchun yopiq.
 * Egagina: profil va to'lov sozlamalari, Telegram, xodimlar, obuna.
 */
const API: Rule[] = [
  [/^\/badges$/, ["GET"], ALL],
  [/^\/(search|suppliers)$/, ["GET"], ["manager", "agent"]],
  [/^\/notifications$/, ["GET", "POST"], ALL],
  [new RegExp(`^/sellers/${ID}$`), ["GET"], ALL],
  [/^\/profile$/, ["GET"], ALL],
  [/^\/profile\/password$/, ["POST"], ALL], // xodim o'z parolini almashtiradi
  [/^\/orders$/, ["GET"], ALL],
  [new RegExp(`^/orders/${ID}$`), ["GET"], ALL],
  [new RegExp(`^/orders/${ID}$`), ["PATCH"], ["manager", "warehouse"]], // omborchi — faqat yetkazish holatlari (orders.ts)
  [new RegExp(`^/orders/${ID}/edit$`), ["POST"], ["manager"]],
  [/^\/orders\/export$/, ["GET"], ["manager"]],
  [/^\/(products|seller\/products)$/, ["GET"], ALL],
  [new RegExp(`^/products/${ID}$`), ["GET"], ALL],
  [/^\/products$/, ["POST"], ["manager"]],
  [new RegExp(`^/products/${ID}$`), ["PATCH", "DELETE"], ["manager"]],
  [new RegExp(`^/products/${ID}/stock$`), ["PATCH"], ["manager", "warehouse"]],
  [/^\/products\/import(\/template)?$/, ["GET", "POST"], ["manager"]],
  [/^\/products\/export$/, ["GET"], ["manager"]],
  [/^\/uploads$/, ["POST"], ["manager", "agent"]], // agent — faqat chatga rasm (uploads route tekshiradi)
  [/^\/reports$/, ["GET"], ["manager"]],
  [/^\/chats(\/[^/]+)?$/, ["GET", "POST"], ["manager", "agent"]],
  [/^\/chats\/[^/]+\/(typing|clear)$/, ["POST"], ["manager", "agent"]],
  [/^\/chats\/[^/]+\/messages\/[^/]+$/, ["DELETE"], ["manager", "agent"]],
  [/^\/partnerships$/, ["GET", "POST"], ["manager", "agent"]],
  [new RegExp(`^/partnerships/${ID}$`), ["PATCH"], ["manager", "agent"]], // agent — faqat qabul/rad (route'da tekshiriladi)
  [new RegExp(`^/partners/${ID}/stock$`), ["GET"], ["manager", "agent"]],
  [/^\/debts$/, ["GET"], ["manager"]],
  [new RegExp(`^/debts/${ID}$`), ["GET"], ["manager"]],
  [new RegExp(`^/debts/${ID}/payments$`), ["POST"], ["manager"]],
  [new RegExp(`^/reviews/${ID}$`), ["POST"], ["manager"]],
  [/^\/tickets$/, ["GET", "POST"], ["manager"]],
];

/** path — /api/v1 dan keyingi qism yoki to'liq yo'l. */
export function staffApiAllowed(role: StaffRole, path: string, method: string): boolean {
  const p = path.replace(/^\/api\/v1/, "").replace(/\/$/, "");
  return API.some(([re, methods, roles]) => re.test(p) && (methods as string[]).includes(method) && roles.includes(role));
}

/** Omborchi buyurtma holatini faqat shu holatlarga o'tkaza oladi. */
export const WAREHOUSE_STATUSES = ["shipped", "delivered"] as const;
