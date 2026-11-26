import "server-only";
import { AppError } from "@/lib/api";
import type { SessionUser } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { atLimit, planHas, PLANS, type PlanCode, type PlanFeature } from "@/lib/plans";
import { Product } from "@/models/Product";
import { Staff } from "@/models/Staff";

/** Kompaniya tarifida shu imkoniyat yo'q bo'lsa — PLAN_FEATURE (402). Do'konlarga tegmaydi. */
export function requireFeature(user: Pick<SessionUser, "role" | "plan">, feature: PlanFeature): void {
  if (user.role === "seller" && !planHas(user.plan, feature)) throw new AppError("PLAN_FEATURE");
}

export type PlanUsage = { products: number; staff: number };

/** Kompaniyaning hozirgi foydalanishi: faol mahsulotlar va bloklanmagan xodimlar. */
export async function planUsage(sellerId: string): Promise<PlanUsage> {
  await connectDb();
  const [products, staff] = await Promise.all([Product.countDocuments({ seller: sellerId, active: true }), Staff.countDocuments({ company: sellerId, blocked: { $ne: true } })]);
  return { products, staff };
}

/** Yana `adding` ta mahsulot sig'adimi — sig'masa PLAN_LIMIT. */
export async function assertProductRoom(sellerId: string, plan: PlanCode, adding = 1): Promise<void> {
  const limit = PLANS[plan].products;
  if (limit === null) return;
  await connectDb();
  const count = await Product.countDocuments({ seller: sellerId, active: true });
  if (count + adding > limit) throw new AppError("PLAN_LIMIT");
}

/** Yana bitta faol xodim sig'adimi — sig'masa PLAN_LIMIT. */
export async function assertStaffRoom(sellerId: string, plan: PlanCode): Promise<void> {
  const limit = PLANS[plan].staff;
  if (limit === null) return;
  await connectDb();
  if (atLimit(limit, await Staff.countDocuments({ company: sellerId, blocked: { $ne: true } }))) throw new AppError("PLAN_LIMIT");
}
