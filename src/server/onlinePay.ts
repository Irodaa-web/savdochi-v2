import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { isValidObjectId, type ClientSession } from "mongoose";
import { AppError } from "@/lib/api";
import type { SessionUser } from "@/lib/auth/session";
import { connectDb, withTransaction } from "@/lib/db";
import { open, seal } from "@/lib/secretBox";
import { nextSeq } from "@/models/Counter";
import { OnlinePayment, type OnlinePaymentDoc, type OnlineProvider } from "@/models/OnlinePayment";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";
import { notify } from "./notify";

/* ------------------------------------------------------------------ */
/* Kompaniya sozlamalari                                               */
/* ------------------------------------------------------------------ */

export type OnlinePaySettings = {
  payme: { merchantId: string; hasKey: boolean } | null;
  click: { serviceId: string; merchantId: string; hasSecret: boolean } | null;
};

export async function getOnlinePaySettings(sellerId: string): Promise<OnlinePaySettings> {
  await connectDb();
  const u = await User.findById(sellerId, { onlinePay: 1 }).lean();
  const p = u?.onlinePay?.payme;
  const c = u?.onlinePay?.click;
  return {
    payme: p?.merchantId ? { merchantId: p.merchantId, hasKey: Boolean(p.keySealed) } : null,
    click: c?.serviceId ? { serviceId: c.serviceId, merchantId: c.merchantId, hasSecret: Boolean(c.secretSealed) } : null,
  };
}

export type OnlinePayInput = {
  payme?: { merchantId: string; key?: string } | null;
  click?: { serviceId: string; merchantId: string; secret?: string } | null;
};

/** Kalit bo'sh yuborilsa — eskisi saqlanadi (kalitlar hech qachon qaytarilmaydi). null — o'chirish. */
export async function updateOnlinePaySettings(sellerId: string, input: OnlinePayInput): Promise<OnlinePaySettings> {
  await connectDb();
  const u = await User.findOne({ _id: sellerId, role: "seller" }, { onlinePay: 1 });
  if (!u) throw new AppError("NOT_FOUND");
  const current = u.onlinePay ?? {};
  const next: NonNullable<typeof u.onlinePay> = { payme: current.payme ?? null, click: current.click ?? null };
  if (input.payme === null) next.payme = null;
  else if (input.payme) {
    const keySealed = input.payme.key ? seal(input.payme.key) : current.payme?.keySealed;
    if (!keySealed) throw new AppError("INVALID_INPUT", { paymeKey: "keyRequired" });
    next.payme = { merchantId: input.payme.merchantId, keySealed };
  }
  if (input.click === null) next.click = null;
  else if (input.click) {
    const secretSealed = input.click.secret ? seal(input.click.secret) : current.click?.secretSealed;
    if (!secretSealed) throw new AppError("INVALID_INPUT", { clickSecret: "keyRequired" });
    next.click = { serviceId: input.click.serviceId, merchantId: input.click.merchantId, secretSealed };
  }
  await User.updateOne({ _id: sellerId }, { $set: { onlinePay: next } });
  return getOnlinePaySettings(sellerId);
}

/** Do'kon uchun: bu kompaniyaga qaysi usullar bilan onlayn to'lash mumkin. */
export async function sellerOnlineMethods(sellerId: string): Promise<OnlineProvider[]> {
  const s = await getOnlinePaySettings(sellerId);
  return [...(s.payme?.hasKey ? (["payme"] as const) : []), ...(s.click?.hasSecret ? (["click"] as const) : [])];
}

/* ------------------------------------------------------------------ */
/* Hisob yaratish (do'kon "to'lash"ni bosganda)                         */
/* ------------------------------------------------------------------ */

const paymeHost = () => (process.env.PAYME_TEST === "1" ? "https://test.paycom.uz" : "https://checkout.paycom.uz");

/** Buyurtmaning qolgan summasiga hisob ochadi va to'lov sahifasi manzilini qaytaradi. */
export async function startOnlinePayment(user: SessionUser, orderId: string, provider: OnlineProvider, origin: string): Promise<{ url: string }> {
  if (!isValidObjectId(orderId)) throw new AppError("NOT_FOUND");
  await connectDb();
  const order = await Order.findOne({ _id: orderId, buyer: user.id }).lean();
  if (!order) throw new AppError("NOT_FOUND");
  const left = order.total - order.paidAmount;
  if (order.status === "cancelled" || left <= 0) throw new AppError("INVALID_STATE");
  const seller = await User.findById(order.seller, { onlinePay: 1 }).lean();
  const creds = seller?.onlinePay;
  if (provider === "payme" ? !creds?.payme?.keySealed : !creds?.click?.secretSealed) throw new AppError("NOT_FOUND");

  // Ochiq (hali to'lanmagan) hisob bo'lsa va summa o'zgarmagan bo'lsa — o'shani qayta ishlatamiz.
  let invoice = await OnlinePayment.findOne({ order: order._id, provider, state: "created", amount: left }).lean<OnlinePaymentDoc>();
  if (!invoice) {
    await OnlinePayment.updateMany({ order: order._id, state: "created" }, { $set: { state: "cancelled", cancelledAt: new Date() } });
    invoice = (await OnlinePayment.create({ provider, seller: order.seller, buyer: order.buyer, order: order._id, orderNumber: order.number, amount: left })).toObject() as OnlinePaymentDoc;
  }
  const back = `${origin}/orders/${order._id}?paid=1`;
  if (provider === "payme") {
    const params = `m=${creds!.payme!.merchantId};ac.order_id=${invoice._id};a=${invoice.amount * 100};c=${back}`;
    return { url: `${paymeHost()}/${Buffer.from(params, "utf8").toString("base64")}` };
  }
  const q = new URLSearchParams({ service_id: creds!.click!.serviceId, merchant_id: creds!.click!.merchantId, amount: String(invoice.amount), transaction_param: String(invoice._id), return_url: back });
  return { url: `https://my.click.uz/services/pay?${q}` };
}

/* ------------------------------------------------------------------ */
/* To'lovni qayd etish / qaytarish                                      */
/* ------------------------------------------------------------------ */

/** Hisob to'landi: buyurtma to'lovi va qarz daftari bitta tranzaksiyada. Takror chaqirilsa — hech narsa qilmaydi. */
async function markPaid(invoice: OnlinePaymentDoc, session: ClientSession): Promise<boolean> {
  const res = await OnlinePayment.updateOne({ _id: invoice._id, state: "pending" }, { $set: { state: "paid", paidAt: new Date() } }, { session });
  if (res.modifiedCount !== 1) return false;
  const order = await Order.findById(invoice.order).session(session);
  if (!order) return true;
  order.paidAmount += invoice.amount;
  order.paymentStatus = order.paidAmount >= order.total ? "paid" : "partial";
  await order.save({ session });
  await Payment.create(
    [{ seller: invoice.seller, buyer: invoice.buyer, amount: invoice.amount, note: invoice.provider === "payme" ? "Payme" : "Click", source: "online", allocations: [{ order: invoice.order, number: invoice.orderNumber, amount: invoice.amount }] }],
    { session },
  );
  return true;
}

/** To'langan hisob bekor qilindi (pul qaytarildi): buyurtmadan ayiriladi, daftarga manfiy yozuv. */
async function reversePaid(invoice: OnlinePaymentDoc, reason: number | null, session: ClientSession): Promise<boolean> {
  const res = await OnlinePayment.updateOne({ _id: invoice._id, state: "paid" }, { $set: { state: "cancelled", cancelledAfterPaid: true, cancelledAt: new Date(), reason } }, { session });
  if (res.modifiedCount !== 1) return false;
  const order = await Order.findById(invoice.order).session(session);
  if (order) {
    order.paidAmount = Math.max(0, order.paidAmount - invoice.amount);
    order.paymentStatus = order.paidAmount <= 0 ? "unpaid" : order.paidAmount >= order.total ? "paid" : "partial";
    await order.save({ session });
  }
  await Payment.create(
    [{ seller: invoice.seller, buyer: invoice.buyer, amount: -invoice.amount, note: `${invoice.provider === "payme" ? "Payme" : "Click"}: qaytarildi`, source: "online", allocations: [{ order: invoice.order, number: invoice.orderNumber, amount: -invoice.amount }] }],
    { session },
  );
  return true;
}

async function notifyPaid(invoice: OnlinePaymentDoc): Promise<void> {
  const buyer = await User.findById(invoice.buyer, { name: 1 }).lean();
  const provider = invoice.provider === "payme" ? "Payme" : "Click";
  const params = { number: invoice.orderNumber, name: buyer?.name ?? "", amount: invoice.amount.toLocaleString("ru-RU"), provider };
  await notify(invoice.seller, "onlinePaid", params, `/orders/${invoice.order}`);
  await notify(invoice.buyer, "onlinePaid", params, `/orders/${invoice.order}`);
}

/** Hisob hali to'lanishi mumkinmi: buyurtma bekor qilinmagan va qolgan qarz hisob summasidan kam emas. */
async function invoiceStillValid(invoice: OnlinePaymentDoc): Promise<boolean> {
  const order = await Order.findById(invoice.order, { status: 1, total: 1, paidAmount: 1 }).lean();
  return Boolean(order && order.status !== "cancelled" && order.total - order.paidAmount >= invoice.amount);
}

/* ------------------------------------------------------------------ */
/* Payme Merchant API (JSON-RPC 2.0)                                    */
/* ------------------------------------------------------------------ */

const PAYME_TIMEOUT_MS = 12 * 60 * 60 * 1000;

class PaymeError extends Error {
  constructor(
    public code: number,
    public uz: string,
    public ru: string,
    public en: string,
    public data?: string,
  ) {
    super(en);
  }
}
const E = {
  auth: () => new PaymeError(-32504, "Ruxsat yo'q", "Недостаточно привилегий", "Insufficient privileges"),
  method: () => new PaymeError(-32601, "Metod topilmadi", "Метод не найден", "Method not found"),
  parse: () => new PaymeError(-32700, "JSON xato", "Ошибка разбора JSON", "Parse error"),
  amount: () => new PaymeError(-31001, "Noto'g'ri summa", "Неверная сумма", "Invalid amount"),
  account: (why = "Hisob topilmadi") => new PaymeError(-31050, why, "Счёт не найден или недоступен", "Invoice not found or unavailable", "order_id"),
  busy: () => new PaymeError(-31051, "Hisob boshqa tranzaksiya bilan band", "Счёт ожидает оплаты другой транзакцией", "Invoice is busy with another transaction", "order_id"),
  notFound: () => new PaymeError(-31003, "Tranzaksiya topilmadi", "Транзакция не найдена", "Transaction not found"),
  cannot: () => new PaymeError(-31008, "Amalni bajarib bo'lmaydi", "Невозможно выполнить операцию", "Unable to perform operation"),
};

const ms = (d: Date | null | undefined) => (d ? d.getTime() : 0);
function paymeState(i: OnlinePaymentDoc): number {
  if (i.state === "paid") return 2;
  if (i.state === "cancelled") return i.cancelledAfterPaid ? -2 : -1;
  return 1;
}

function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

type RpcRequest = { id?: number | string; method?: string; params?: Record<string, unknown> };

/** Payme callback. sellerId — manzildan (har kompaniyaning o'z endpointi). */
export async function handlePayme(sellerId: string, authorization: string | null, body: unknown): Promise<Record<string, unknown>> {
  const rpc = (body ?? {}) as RpcRequest;
  const id = rpc.id ?? null;
  try {
    if (!isValidObjectId(sellerId)) throw E.auth();
    await connectDb();
    const seller = await User.findOne({ _id: sellerId, role: "seller" }, { onlinePay: 1 }).lean();
    const key = open(seller?.onlinePay?.payme?.keySealed);
    const sent = authorization?.startsWith("Basic ") ? Buffer.from(authorization.slice(6), "base64").toString("utf8") : "";
    if (!key || !sameSecret(sent, `Paycom:${key}`)) throw E.auth();
    if (!body || typeof body !== "object") throw E.parse();
    const p = rpc.params ?? {};
    const result = await paymeMethod(sellerId, rpc.method ?? "", p);
    return { jsonrpc: "2.0", id, result };
  } catch (error) {
    if (error instanceof PaymeError) return { jsonrpc: "2.0", id, error: { code: error.code, message: { uz: error.uz, ru: error.ru, en: error.en }, ...(error.data ? { data: error.data } : {}) } };
    console.error("payme", error);
    return { jsonrpc: "2.0", id, error: { code: -32400, message: { uz: "Tizim xatosi", ru: "Системная ошибка", en: "System error" } } };
  }
}

async function findInvoiceForAccount(sellerId: string, p: Record<string, unknown>): Promise<OnlinePaymentDoc> {
  const account = (p.account ?? {}) as Record<string, unknown>;
  const invoiceId = String(account.order_id ?? "");
  if (!isValidObjectId(invoiceId)) throw E.account();
  const invoice = await OnlinePayment.findOne({ _id: invoiceId, seller: sellerId, provider: "payme" }).lean<OnlinePaymentDoc>();
  if (!invoice) throw E.account();
  return invoice;
}

async function cancelExpired(invoice: OnlinePaymentDoc): Promise<void> {
  await OnlinePayment.updateOne({ _id: invoice._id, state: "pending" }, { $set: { state: "cancelled", cancelledAt: new Date(), reason: 4 } });
}

async function paymeMethod(sellerId: string, method: string, p: Record<string, unknown>): Promise<Record<string, unknown>> {
  switch (method) {
    case "CheckPerformTransaction": {
      const invoice = await findInvoiceForAccount(sellerId, p);
      if (Number(p.amount) !== invoice.amount * 100) throw E.amount();
      if (invoice.state === "pending") throw E.busy();
      if (invoice.state !== "created" || !(await invoiceStillValid(invoice))) throw E.account("Hisob yopilgan");
      return { allow: true };
    }

    case "CreateTransaction": {
      const txId = String(p.id ?? "");
      if (!txId) throw E.notFound();
      const existing = await OnlinePayment.findOne({ seller: sellerId, provider: "payme", providerId: txId }).lean<OnlinePaymentDoc>();
      if (existing) {
        if (existing.state !== "pending") throw E.cannot();
        if (Date.now() - ms(existing.pendingAt) > PAYME_TIMEOUT_MS) {
          await cancelExpired(existing);
          throw E.cannot();
        }
        return { create_time: ms(existing.pendingAt), transaction: String(existing._id), state: 1 };
      }
      const invoice = await findInvoiceForAccount(sellerId, p);
      if (Number(p.amount) !== invoice.amount * 100) throw E.amount();
      if (invoice.state === "pending") throw E.busy();
      if (invoice.state !== "created" || !(await invoiceStillValid(invoice))) throw E.account("Hisob yopilgan");
      const now = new Date();
      const res = await OnlinePayment.updateOne(
        { _id: invoice._id, state: "created" },
        { $set: { state: "pending", providerId: txId, providerTime: Number(p.time) || now.getTime(), pendingAt: now } },
      );
      if (res.modifiedCount !== 1) throw E.busy();
      return { create_time: now.getTime(), transaction: String(invoice._id), state: 1 };
    }

    case "PerformTransaction": {
      const invoice = await OnlinePayment.findOne({ seller: sellerId, provider: "payme", providerId: String(p.id ?? "") }).lean<OnlinePaymentDoc>();
      if (!invoice) throw E.notFound();
      if (invoice.state === "pending") {
        if (Date.now() - ms(invoice.pendingAt) > PAYME_TIMEOUT_MS) {
          await cancelExpired(invoice);
          throw E.cannot();
        }
        const done = await withTransaction((session) => markPaid(invoice, session));
        if (done) await notifyPaid(invoice);
      }
      const fresh = (await OnlinePayment.findById(invoice._id).lean<OnlinePaymentDoc>())!;
      if (fresh.state !== "paid") throw E.cannot();
      return { transaction: String(fresh._id), perform_time: ms(fresh.paidAt), state: 2 };
    }

    case "CancelTransaction": {
      const invoice = await OnlinePayment.findOne({ seller: sellerId, provider: "payme", providerId: String(p.id ?? "") }).lean<OnlinePaymentDoc>();
      if (!invoice) throw E.notFound();
      const reason = Number(p.reason) || null;
      if (invoice.state === "pending") await OnlinePayment.updateOne({ _id: invoice._id, state: "pending" }, { $set: { state: "cancelled", cancelledAt: new Date(), reason } });
      else if (invoice.state === "paid") await withTransaction((session) => reversePaid(invoice, reason, session));
      const fresh = (await OnlinePayment.findById(invoice._id).lean<OnlinePaymentDoc>())!;
      return { transaction: String(fresh._id), cancel_time: ms(fresh.cancelledAt), state: paymeState(fresh) };
    }

    case "CheckTransaction": {
      const invoice = await OnlinePayment.findOne({ seller: sellerId, provider: "payme", providerId: String(p.id ?? "") }).lean<OnlinePaymentDoc>();
      if (!invoice) throw E.notFound();
      return {
        create_time: ms(invoice.pendingAt),
        perform_time: ms(invoice.paidAt),
        cancel_time: ms(invoice.cancelledAt),
        transaction: String(invoice._id),
        state: paymeState(invoice),
        reason: invoice.reason ?? null,
      };
    }

    case "GetStatement": {
      const rows = await OnlinePayment.find({ seller: sellerId, provider: "payme", providerTime: { $gte: Number(p.from) || 0, $lte: Number(p.to) || Date.now() } })
        .sort({ providerTime: 1 })
        .lean<OnlinePaymentDoc[]>();
      return {
        transactions: rows.map((i) => ({
          id: i.providerId,
          time: i.providerTime,
          amount: i.amount * 100,
          account: { order_id: String(i._id) },
          create_time: ms(i.pendingAt),
          perform_time: ms(i.paidAt),
          cancel_time: ms(i.cancelledAt),
          transaction: String(i._id),
          state: paymeState(i),
          reason: i.reason ?? null,
        })),
      };
    }

    default:
      throw E.method();
  }
}

/* ------------------------------------------------------------------ */
/* Click SHOP API (prepare / complete)                                  */
/* ------------------------------------------------------------------ */

export type ClickFields = Record<string, string>;

const clickError = (code: number, note: string) => ({ error: code, error_note: note });

/** Click imzosi: md5(click_trans_id + service_id + SECRET + merchant_trans_id + [merchant_prepare_id] + amount + action + sign_time). */
export function clickSign(f: ClickFields, secret: string): string {
  const prepare = f.action === "1" ? (f.merchant_prepare_id ?? "") : "";
  return createHash("md5").update(`${f.click_trans_id}${f.service_id}${secret}${f.merchant_trans_id}${prepare}${f.amount}${f.action}${f.sign_time}`).digest("hex");
}

export async function handleClick(sellerId: string, action: "0" | "1", f: ClickFields): Promise<Record<string, unknown>> {
  const echo = { click_trans_id: f.click_trans_id ?? null, merchant_trans_id: f.merchant_trans_id ?? null };
  try {
    const required = ["click_trans_id", "service_id", "click_paydoc_id", "merchant_trans_id", "amount", "action", "error", "sign_time", "sign_string", ...(action === "1" ? ["merchant_prepare_id"] : [])];
    if (required.some((k) => f[k] === undefined || f[k] === "") || !isValidObjectId(sellerId)) return { ...echo, ...clickError(-8, "Error in request from click") };
    await connectDb();
    const seller = await User.findOne({ _id: sellerId, role: "seller" }, { onlinePay: 1 }).lean();
    const secret = open(seller?.onlinePay?.click?.secretSealed);
    if (!secret || f.service_id !== seller?.onlinePay?.click?.serviceId || !sameSecret(clickSign(f, secret), (f.sign_string ?? "").toLowerCase())) return { ...echo, ...clickError(-1, "SIGN CHECK FAILED!") };
    if (f.action !== action) return { ...echo, ...clickError(-3, "Action not found") };
    if (!isValidObjectId(f.merchant_trans_id)) return { ...echo, ...clickError(-5, "Order does not exist") };
    const invoice = await OnlinePayment.findOne({ _id: f.merchant_trans_id, seller: sellerId, provider: "click" }).lean<OnlinePaymentDoc>();
    if (!invoice) return { ...echo, ...clickError(-5, "Order does not exist") };
    if (Math.abs(Number(f.amount) - invoice.amount) > 0.01) return { ...echo, ...clickError(-2, "Incorrect parameter amount") };
    if (invoice.state === "paid") return { ...echo, ...clickError(-4, "Already paid") };
    if (invoice.state === "cancelled") return { ...echo, ...clickError(-9, "Transaction cancelled") };

    if (action === "0") {
      if (!(await invoiceStillValid(invoice))) {
        await OnlinePayment.updateOne({ _id: invoice._id }, { $set: { state: "cancelled", cancelledAt: new Date() } });
        return { ...echo, ...clickError(-9, "Transaction cancelled") };
      }
      if (invoice.state === "pending" && invoice.providerId !== f.click_trans_id) return { ...echo, ...clickError(-9, "Transaction cancelled") };
      const prepareId = invoice.prepareId ?? (await nextSeq("clickPrepare", 0));
      await OnlinePayment.updateOne({ _id: invoice._id }, { $set: { state: "pending", providerId: f.click_trans_id, prepareId, pendingAt: invoice.pendingAt ?? new Date() } });
      return { ...echo, merchant_prepare_id: prepareId, ...clickError(0, "Success") };
    }

    // complete
    if (invoice.state !== "pending" || String(invoice.prepareId) !== f.merchant_prepare_id || invoice.providerId !== f.click_trans_id)
      return { ...echo, ...clickError(-6, "Transaction does not exist") };
    if (Number(f.error) < 0) {
      await OnlinePayment.updateOne({ _id: invoice._id, state: "pending" }, { $set: { state: "cancelled", cancelledAt: new Date(), reason: Number(f.error) } });
      return { ...echo, ...clickError(-9, "Transaction cancelled") };
    }
    const done = await withTransaction((session) => markPaid(invoice, session));
    if (done) await notifyPaid(invoice);
    return { ...echo, merchant_confirm_id: invoice.prepareId, ...clickError(0, "Success") };
  } catch (error) {
    console.error("click", error);
    return { ...echo, ...clickError(-7, "Failed to update user") };
  }
}
