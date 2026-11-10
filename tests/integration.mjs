// Integratsiya testi: ishlab turgan serverga haqiqiy so'rovlar yuboradi.
// FAQAT sinov bazasida ishga tushiring (DEMO_MODE=1): demo hisoblarda buyurtma va to'lovlar yaratadi.
//
//   SAVDOCHI_TEST_URL=http://localhost:3000 npm run test:integration
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";

const BASE = (process.env.SAVDOCHI_TEST_URL ?? "").replace(/\/$/, "");
if (!BASE) {
  console.error("SAVDOCHI_TEST_URL ko'rsatilmagan (masalan, http://localhost:3000).");
  process.exit(1);
}

async function call(token, path, method = "GET", body) {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return res.json();
}

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// --- tayyorgarlik ---------------------------------------------------------
const demo = async (role) => {
  const r = await call(null, "/auth/demo", "POST", { role });
  assert.ok(r.ok, `demo ${role}: ${r.error} (DEMO_MODE=1 kerak)`);
  return r.data.token;
};
const buyer = await demo("buyer");
const seller = await demo("seller");
const sellerId = (await call(seller, "/auth/me")).data.id;
const buyerId = (await call(buyer, "/auth/me")).data.id;
const products = (await call(seller, "/seller/products")).data;
const product = products.find((p) => p.stock >= 50 && p.price * p.minOrder < 2_000_000);
assert.ok(product, "demo kompaniyada yetarli qoldiqli mahsulot yo'q");
const qty = Math.max(product.minOrder, 2);

const stockOf = async () => {
  const d = (await call(buyer, `/products/${product.id}`)).data;
  return (d.product ?? d).stock;
};
const fillCart = (quantity = qty) => call(buyer, "/cart", "PUT", { productId: product.id, quantity });
const checkout = (extra = {}) =>
  call(buyer, "/orders", "POST", { sellerId, phone: "+998901234567", region: "tashkent_city", address: "Chilonzor 1", lat: null, lng: null, paymentMethod: "cash", ...extra });

async function partnership() {
  let p = (await call(seller, "/partnerships")).data.find((x) => x.partner.id === buyerId);
  if (!p) {
    await call(buyer, "/partnerships", "POST", { partnerId: sellerId });
    p = (await call(seller, "/partnerships")).data.find((x) => x.partner.id === buyerId);
  }
  if (p.status !== "active") await call(seller, `/partnerships/${p.id}`, "PATCH", { action: "accept" });
  return p.id;
}
async function payOffDebt() {
  const d = (await call(seller, `/debts/${buyerId}`)).data;
  if (d.outstanding > 0) assert.ok((await call(seller, `/debts/${buyerId}/payments`, "POST", { amount: d.outstanding })).ok);
}

// --- testlar ----------------------------------------------------------------
test("ruxsatlar: do'kon kompaniya API'siga kira olmaydi", async () => {
  assert.equal((await call(buyer, `/debts/${sellerId}/payments`, "POST", { amount: 1 })).error, "FORBIDDEN");
  assert.equal((await call(null, "/orders")).error, "UNAUTHORIZED");
});

test("bir xil requestId bilan parallel so'rovlar — bitta buyurtma, ombor bir marta kamayadi", async () => {
  await fillCart();
  const before = await stockOf();
  const requestId = randomUUID();
  const results = await Promise.all([1, 2, 3].map(() => checkout({ requestId })));
  const ids = new Set(results.map((r) => (assert.ok(r.ok, r.error), r.data.id)));
  assert.equal(ids.size, 1);
  assert.equal((await checkout({ requestId })).data.id, [...ids][0]);
  assert.equal(await stockOf(), before - qty);

  const cancels = await Promise.all([1, 2].map(() => call(buyer, `/orders/${[...ids][0]}`, "PATCH", { status: "cancelled" })));
  assert.equal(cancels.filter((r) => r.ok).length, 1, "faqat bitta bekor qilish o'tishi kerak");
  assert.equal(await stockOf(), before, "ombor bir marta qaytishi kerak");
});

test("holat zanjiri va yetkazilganda do'kon omboriga bir marta qo'shiladi", async () => {
  const storeQty = async () => ((await call(buyer, "/stock")).data.find?.((r) => (r.productId ?? r.product) === product.id)?.quantity ?? 0);
  await fillCart();
  const o = await checkout({ requestId: randomUUID() });
  assert.ok(o.ok, o.error);
  const s0 = await storeQty();
  assert.equal((await call(buyer, `/orders/${o.data.id}`, "PATCH", { status: "confirmed" })).error, "INVALID_STATE");
  for (const status of ["confirmed", "shipped"]) assert.ok((await call(seller, `/orders/${o.data.id}`, "PATCH", { status })).ok);
  await Promise.all([1, 2].map(() => call(buyer, `/orders/${o.data.id}`, "PATCH", { status: "delivered" })));
  assert.equal(await storeQty(), s0 + qty);
});

test("nasiya: limit, to'lov muddati, limitdan oshganda kompaniya tasdig'i", async () => {
  const pid = await partnership();
  await payOffDebt();
  await fillCart();
  const cart = (await call(buyer, "/cart")).data.groups.find((g) => g.seller.id === sellerId);
  assert.ok((await call(seller, `/partnerships/${pid}`, "PATCH", { action: "update", creditLimit: cart.total * 2 - 1, paymentDays: 10 })).ok);

  const g = (await call(buyer, "/cart")).data.groups.find((x) => x.seller.id === sellerId);
  assert.ok(g.terms.paymentMethods.includes("credit"));
  const o1 = await checkout({ paymentMethod: "credit", requestId: randomUUID() });
  assert.ok(o1.ok, o1.error);
  const days = (new Date(o1.data.dueDate) - new Date(o1.data.createdAt)) / 86_400_000;
  assert.ok(Math.abs(days - 10) < 0.01, `to'lov muddati 10 kun bo'lishi kerak, ${days}`);

  // Limitdan oshsa — rad etilmaydi, kompaniya tasdig'iga boradi.
  await fillCart();
  const o2 = await checkout({ paymentMethod: "credit", requestId: randomUUID() });
  assert.ok(o2.ok, o2.error);
  assert.equal(o2.data.creditApproval, "pending");
  assert.equal(o2.data.creditOver, o1.data.total + o2.data.total - (cart.total * 2 - 1));
  const confirmed = await call(seller, `/orders/${o2.data.id}`, "PATCH", { status: "confirmed" });
  assert.equal(confirmed.data.creditApproval, "approved");

  // Bekor qilinsa — rad etildi.
  await fillCart();
  const o3 = await checkout({ paymentMethod: "credit", requestId: randomUUID() });
  assert.equal(o3.data.creditApproval, "pending");
  assert.equal((await call(seller, `/orders/${o3.data.id}`, "PATCH", { status: "cancelled" })).data.creditApproval, "rejected");

  // Limit olib tashlansa — "Nasiya" to'lov usuli umuman chiqmaydi.
  assert.ok((await call(seller, `/partnerships/${pid}`, "PATCH", { action: "update", creditLimit: 0 })).ok);
  await fillCart();
  assert.deepEqual((await checkout({ paymentMethod: "credit", requestId: randomUUID() })).fields, { paymentMethod: "paymentRequired" });
  await fillCart(0);
});

test("qarz daftari: to'lov eng eski buyurtmadan taqsimlanadi, ortiqcha summa rad etiladi", async () => {
  await payOffDebt();
  const totals = [];
  for (let i = 0; i < 2; i++) {
    await fillCart();
    const o = await checkout({ requestId: randomUUID() });
    assert.ok(o.ok, o.error);
    totals.push(o.data);
  }
  const ledger = (await call(seller, `/debts/${buyerId}`)).data;
  assert.equal(ledger.outstanding, totals[0].total + totals[1].total);
  assert.deepEqual((await call(seller, `/debts/${buyerId}/payments`, "POST", { amount: ledger.outstanding + 1 })).fields, { amount: "amountTooLarge" });

  const pay = await call(seller, `/debts/${buyerId}/payments`, "POST", { amount: totals[0].total + 100, note: "test" });
  assert.ok(pay.ok, pay.error);
  assert.deepEqual(pay.data.payments[0].orders, [totals[0].number, totals[1].number]);
  assert.equal(pay.data.outstanding, totals[1].total - 100);
  assert.equal((await call(buyer, "/debts")).data.rows.find((r) => r.partner.id === sellerId).outstanding, totals[1].total - 100);
});

test("olib ketish: manzilsiz, yetkazish narxisiz; sozlama o'chiq bo'lsa rad etiladi", async () => {
  const prof = (await call(seller, "/profile")).data;
  const save = (pickup) => call(seller, "/profile", "PUT", { name: prof.name, region: prof.region, ...prof.profile, pickup });
  await fillCart();
  assert.ok((await save(false)).ok);
  assert.deepEqual((await checkout({ method: "pickup", address: "" })).fields, { method: "pickupUnavailable" });
  assert.ok((await save(true)).ok);
  const o = await checkout({ method: "pickup", address: "", requestId: randomUUID() });
  assert.ok(o.ok, o.error);
  assert.equal(o.data.delivery.method, "pickup");
  assert.equal(o.data.deliveryFee, 0);
  assert.equal(o.data.total, o.data.subtotal - o.data.discount);
  assert.ok((await save(prof.profile.pickup)).ok);
});

test("buyurtmalar qidiruvi: raqam va hamkor nomi", async () => {
  const list = (await call(seller, "/orders")).data;
  const first = list[0];
  assert.deepEqual((await call(seller, `/orders?q=${first.number}`)).data.map((o) => o.id), [first.id]);
  assert.ok((await call(seller, `/orders?q=${encodeURIComponent(first.buyer.name.slice(0, 5))}`)).data.length > 0);
  assert.equal((await call(seller, `/orders?q=${encodeURIComponent("(.*")}`)).data.length, 0);
});

test("onlayn to'lov: Payme Merchant API (auth, summa, tranzaksiya holatlari, qaytarish)", async () => {
  assert.ok((await call(seller, "/profile/payments", "PUT", { payme: { merchantId: "test-merchant-1", key: "payme-test-key" } })).ok);
  await fillCart();
  const o = await checkout({ requestId: randomUUID() });
  assert.ok(o.ok, o.error);
  const start = await call(buyer, `/orders/${o.data.id}/pay`, "POST", { provider: "payme" });
  assert.ok(start.ok, start.error);
  const params = Object.fromEntries(Buffer.from(start.data.url.split("/").pop(), "base64").toString().split(";").map((kv) => kv.split(/=(.*)/s).slice(0, 2)));
  assert.equal(params.m, "test-merchant-1");
  assert.equal(Number(params.a), o.data.total * 100);
  const invoice = params["ac.order_id"];

  const rpc = async (method, p, key = "payme-test-key") => {
    const res = await fetch(`${BASE}/api/v1/pay/payme/${sellerId}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Basic " + Buffer.from(`Paycom:${key}`).toString("base64") },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: p }),
    });
    return res.json();
  };
  const account = { order_id: invoice };
  const amount = o.data.total * 100;
  assert.equal((await rpc("CheckPerformTransaction", { amount, account }, "wrong")).error.code, -32504);
  assert.equal((await rpc("CheckPerformTransaction", { amount: amount + 100, account })).error.code, -31001);
  assert.equal((await rpc("CheckPerformTransaction", { amount, account: { order_id: "000000000000000000000000" } })).error.code, -31050);
  assert.deepEqual((await rpc("CheckPerformTransaction", { amount, account })).result, { allow: true });

  const tx = "pm-" + randomUUID().slice(0, 12);
  const c1 = await rpc("CreateTransaction", { id: tx, time: Date.now(), amount, account });
  assert.equal(c1.result.state, 1);
  assert.equal(c1.result.transaction, invoice);
  assert.equal((await rpc("CreateTransaction", { id: tx, time: Date.now(), amount, account })).result.state, 1, "takror — o'sha tranzaksiya");
  assert.equal((await rpc("CreateTransaction", { id: tx + "x", time: Date.now(), amount, account })).error.code, -31051, "hisob band");

  const [p1, p2] = await Promise.all([rpc("PerformTransaction", { id: tx }), rpc("PerformTransaction", { id: tx })]);
  assert.equal(p1.result.state, 2);
  assert.equal(p2.result.state, 2);
  const paid = (await call(buyer, `/orders/${o.data.id}`)).data;
  assert.equal(paid.paymentStatus, "paid");
  assert.equal(paid.paidAmount, o.data.total, "parallel Perform — summa bir marta qo'shilishi kerak");
  assert.equal((await rpc("CheckTransaction", { id: tx })).result.state, 2);
  assert.equal((await rpc("PerformTransaction", { id: "yoq" })).error.code, -31003);

  const stmt = await rpc("GetStatement", { from: Date.now() - 60_000, to: Date.now() + 60_000 });
  assert.ok(stmt.result.transactions.some((t) => t.id === tx && t.state === 2));

  // Qaytarish: holat -2, buyurtma yana to'lanmagan, daftarda manfiy yozuv.
  const cancel = await rpc("CancelTransaction", { id: tx, reason: 5 });
  assert.equal(cancel.result.state, -2);
  const back = (await call(buyer, `/orders/${o.data.id}`)).data;
  assert.equal(back.paidAmount, 0);
  const ledger = (await call(seller, `/debts/${buyerId}`)).data;
  assert.ok(ledger.payments.some((x) => x.source === "online" && x.amount === -o.data.total));
});

test("onlayn to'lov: Click SHOP API (imzo, prepare/complete, takror to'lov)", async () => {
  assert.ok((await call(seller, "/profile/payments", "PUT", { click: { serviceId: "11111", merchantId: "22222", secret: "click-test-secret" } })).ok);
  const settings = (await call(seller, "/profile/payments")).data;
  assert.equal(settings.click.hasSecret, true);
  assert.equal(JSON.stringify(settings).includes("click-test-secret"), false, "kalit API'da qaytmasligi kerak");
  await fillCart();
  const o = await checkout({ requestId: randomUUID() });
  const start = await call(buyer, `/orders/${o.data.id}/pay`, "POST", { provider: "click" });
  const url = new URL(start.data.url);
  assert.equal(url.host, "my.click.uz");
  const invoice = url.searchParams.get("transaction_param");

  const send = async (step, f) => {
    const res = await fetch(`${BASE}/api/v1/pay/click/${sellerId}/${step}`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(f) });
    return res.json();
  };
  const sign = (f, secret = "click-test-secret") =>
    createHash("md5").update(`${f.click_trans_id}${f.service_id}${secret}${f.merchant_trans_id}${f.action === "1" ? f.merchant_prepare_id : ""}${f.amount}${f.action}${f.sign_time}`).digest("hex");
  const base = { click_trans_id: String(Date.now()), service_id: "11111", click_paydoc_id: "1", merchant_trans_id: invoice, amount: String(o.data.total), action: "0", error: "0", error_note: "Success", sign_time: "2026-11-11 10:00:00" };

  assert.equal((await send("prepare", { ...base, sign_string: sign(base, "boshqa") })).error, -1);
  assert.equal((await send("prepare", { ...base, amount: "1", sign_string: sign({ ...base, amount: "1" }) })).error, -2);
  const prep = await send("prepare", { ...base, sign_string: sign(base) });
  assert.equal(prep.error, 0, prep.error_note);
  assert.ok(prep.merchant_prepare_id);

  const done = { ...base, action: "1", merchant_prepare_id: String(prep.merchant_prepare_id) };
  const comp = await send("complete", { ...done, sign_string: sign(done) });
  assert.equal(comp.error, 0, comp.error_note);
  assert.equal((await call(buyer, `/orders/${o.data.id}`)).data.paymentStatus, "paid");
  assert.equal((await send("complete", { ...done, sign_string: sign(done) })).error, -4, "takror — allaqachon to'langan");
  assert.ok((await call(seller, "/profile/payments", "PUT", { payme: null, click: null })).ok);
});

// --- ishga tushirish --------------------------------------------------------
let failed = 0;
for (const t of tests) {
  try {
    await t.fn();
    console.log(`✓ ${t.name}`);
  } catch (error) {
    failed++;
    console.error(`✗ ${t.name}\n  ${error.message}`);
  }
}
console.log(`\n${tests.length - failed}/${tests.length} o'tdi`);
process.exit(failed ? 1 : 0);
