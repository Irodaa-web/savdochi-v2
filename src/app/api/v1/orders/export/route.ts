import writeXlsxFile from "write-excel-file/node";
import { formatDateTime } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/server";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders";
import { listOrders } from "@/server/orders";
import { withUser } from "@/server/handler";
import { requireFeature } from "@/server/plans";

const FILTERS = ["open", ...ORDER_STATUSES] as const;

/**
 * Buyurtmalar ro'yxati Excel faylda (buxgalteriya uchun) — sahifadagi filtr va qidiruv bilan bir xil.
 * Kompaniya uchun hamkor — do'kon, do'kon uchun — kompaniya. 5000 tagacha buyurtma.
 */
export const GET = withUser(null, async (user, request) => {
  requireFeature(user, "excel"); // Excel — Premium tarif imkoniyati (do'konlarga tegmaydi)
  const locale = await getLocale();
  const t = getDictionary(locale);
  const url = new URL(request.url);
  const raw = url.searchParams.get("status") ?? "";
  const status = (FILTERS as readonly string[]).includes(raw) ? (raw as OrderStatus | "open") : undefined;
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 60) || undefined;
  const orders = await listOrders(user, { status, q, limit: 5000 });
  const o = t.orders;

  const header = [o.colNumber, o.colDate, o.colPartner, o.colStatus, t.orders.payment, t.checkout.payment, o.colItems, o.colTotal, o.colPaid, o.colLeft, o.colDue].map((value) => ({
    value,
    fontWeight: "bold" as const,
  }));
  const rows = orders.map((x) => [
    { type: Number, value: x.number },
    { type: String, value: formatDateTime(x.createdAt, locale) },
    { type: String, value: user.role === "seller" ? x.buyer.name : x.seller.name },
    { type: String, value: t.orderStatus[x.status] },
    { type: String, value: t.paymentStatus[x.paymentStatus] },
    { type: String, value: t.payment[x.paymentMethod] },
    { type: String, value: x.items.map((i) => `${i.name} × ${i.quantity}`).join("; ") },
    { type: Number, value: x.total },
    { type: Number, value: x.paidAmount },
    { type: Number, value: Math.max(0, x.status === "cancelled" ? 0 : x.total - x.paidAmount) },
    { type: String, value: x.dueDate ? formatDateTime(x.dueDate, locale, false) : "" },
  ]);
  const buffer = await writeXlsxFile([header, ...rows], {
    columns: [{ width: 8 }, { width: 18 }, { width: 28 }, { width: 16 }, { width: 18 }, { width: 18 }, { width: 50 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }],
  }).toBuffer();
  const day = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="savdochi-buyurtmalar-${day}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
});
