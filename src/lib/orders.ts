/** Buyurtma bilan bog'liq umumiy qiymatlar (server va mijoz). */
export const PAYMENT_METHODS = ["cash", "transfer", "card", "credit"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
/** Kompaniya profilida tanlanadigan usullar. "credit" (nasiya) faqat hamkorga limit berilganda chiqadi. */
export const PROFILE_PAYMENT_METHODS = ["cash", "transfer", "card"] as const satisfies readonly PaymentMethod[];

export const ORDER_STATUSES = ["new", "confirmed", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["unpaid", "partial", "paid"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Kim qaysi holatdan qaysi holatga o'tkaza oladi. */
export const ORDER_TRANSITIONS: Record<"buyer" | "seller", Partial<Record<OrderStatus, OrderStatus[]>>> = {
  seller: { new: ["confirmed", "cancelled"], confirmed: ["shipped", "cancelled"], shipped: ["delivered"] },
  buyer: { new: ["cancelled"], shipped: ["delivered"] },
};

/** Buyurtma "e'tibor talab qiladi": kompaniya uchun yangi, do'kon uchun yo'lda. */
export const OPEN_STATUSES: OrderStatus[] = ["new", "confirmed", "shipped"];
