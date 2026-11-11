# Savdochi v2

Kompaniyalar (yetkazib beruvchilar) va do'konlar uchun B2B ulgurji savdo platformasi.
Next.js 15 (App Router) + TypeScript + Tailwind CSS 4 + MongoDB (Mongoose).

## Ishga tushirish

```bash
npm install
cp .env.example .env.local   # MONGODB_URI va AUTH_SECRET ni to'ldiring
npm run dev
```

## Tuzilma

```
src/
  app/
    (auth)/            kirish va ro'yxatdan o'tish (ilova kabi — kirmaganlar faqat shu yerni ko'radi)
    (app)/             kirgandan keyingi sahifalar: umumiy header + telefonda pastki tablar
    api/v1/            REST API — veb va kelajakdagi mobil ilova uchun bir xil
  components/
    ui/                dizayn tizimi: Button, TextField, PasswordField, SelectField, Alert, Logo
    shell/             header, hisob menyusi, bildirishnomalar, mobil tablar
  i18n/                uz / ru / en lug'atlari (cookie orqali tanlanadi)
  lib/                 db, auth (JWT), validatsiya (zod), rate limit, navigatsiya
  models/              Mongoose modellari
  middleware.ts        sessiyasiz foydalanuvchini /login ga yo'naltiradi
```

## Dizayn tokenlari

Barcha ranglar `src/app/globals.css` da ("Ko'mir va terrakota", light + dark).
Komponentlar faqat tokenlardan foydalanadi: `bg-surface`, `text-muted`, `border-line`, `bg-accent` va h.k.
Yangi rang kerak bo'lsa — avval token qo'shiladi.

## API

Barcha javoblar: `{ ok: true, data }` yoki `{ ok: false, error: "KOD", fields? }`.
Xato kodlari tarjima qilinadi (`errors.*`), shuning uchun mobil ilova ham o'z tilida ko'rsata oladi.

| Metod | Yo'l | Tavsif |
|---|---|---|
| POST | `/api/v1/auth/register` | `{ role, name, phone, region, password }` |
| POST | `/api/v1/auth/login` | `{ phone, password }` → cookie + `token` (mobil uchun) |
| POST | `/api/v1/auth/logout` | sessiyani yopadi |
| GET  | `/api/v1/auth/me` | joriy foydalanuvchi (cookie yoki `Authorization: Bearer`) |
| GET  | `/api/v1/products?q=&category=&seller=&page=` | katalog |
| POST | `/api/v1/products` | yangi mahsulot (sotuvchi) |
| GET/PATCH/DELETE | `/api/v1/products/:id` | ko'rish / tahrirlash / arxivlash (egasi) |
| GET  | `/api/v1/seller/products` | sotuvchining o'z mahsulotlari |
| GET  | `/api/v1/suppliers?region=` | yetkazib beruvchilar (viloyat yoki yetkazish hududi bo'yicha) |
| GET  | `/api/v1/sellers/:id` | kompaniya sahifasi va yetkazish shartlari |
| GET/PUT | `/api/v1/profile` | o'z profili (kompaniya uchun yetkazish shartlari) |
| POST | `/api/v1/profile/password` | parolni almashtirish (barcha sessiyalar yopiladi) |
| GET/POST | `/api/v1/partnerships` | hamkorlar ro'yxati / so'rov `{ partnerId }` |
| PATCH | `/api/v1/partnerships/:id` | `{ action: accept \| reject \| update, discount?, terms?, shareStock? }` |
| GET  | `/api/v1/partners/:id/stock` | kompaniya: hamkor do'kon omboridagi o'z mahsulotlari |
| GET/PUT | `/api/v1/cart` | savat (kompaniyalar bo'yicha guruhlangan) / `{ productId, quantity, add? }` |
| GET/POST | `/api/v1/orders` | buyurtmalar `?status=&partner=` / savatdan buyurtma berish (`requestId` — qayta yuborilsa o'sha buyurtma qaytadi) |
| GET/PATCH | `/api/v1/orders/:id` | buyurtma / holat, to'lov holati, yetkazish sanasi |
| POST | `/api/v1/orders/:id/reorder` | buyurtmani takrorlash (savatga) |
| GET/POST | `/api/v1/chats` | suhbatlar / suhbat ochish `{ partnerId }` |
| GET/POST | `/api/v1/chats/:id` | xabarlar `?after=` / xabar yuborish |
| GET/POST | `/api/v1/notifications` | bildirishnomalar / barchasini o'qilgan qilish |
| GET  | `/api/v1/badges` | header belgilari: savat, chat, bildirishnomalar |
| GET/PUT | `/api/v1/stock`, DELETE `/api/v1/stock/:id` | do'kon ombori |
| GET/POST | `/api/v1/favorites` | saqlangan mahsulotlar |
| GET/POST | `/api/v1/tickets` | murojaatlar |
| GET  | `/api/v1/reports?days=` | kompaniya hisoboti |
| GET | `/api/v1/debts` | qarzlar: hamkorlar bo'yicha qarz, muddati o'tgan, limit |
| GET | `/api/v1/debts/:partnerId` | qarz daftari: to'lanmagan buyurtmalar va to'lovlar |
| POST | `/api/v1/debts/:partnerId/payments` | kompaniya: to'lov `{ amount, note? }` (eng eski buyurtmadan taqsimlanadi) |
| GET/POST/DELETE | `/api/v1/telegram/link` | Telegram holati / ulash havolasi / uzish |
| POST | `/api/v1/telegram/webhook` | Telegram bot webhook (secret sarlavha bilan) |
| GET/PUT | `/api/v1/profile/payments` | kompaniya: Payme/Click merchant hisoblari (kalitlar shifrlangan, qaytarilmaydi) |
| POST | `/api/v1/orders/:id/pay` | do'kon: `{ provider: "payme" \| "click" }` → to'lov sahifasi `{ url }` |
| POST | `/api/v1/pay/payme/:sellerId` | Payme Merchant API (JSON-RPC, Basic auth) |
| POST | `/api/v1/pay/click/:sellerId/prepare`, `/complete` | Click SHOP API (md5 imzo) |
| GET | `/api/v1/cron/reminders` | kunlik qarz eslatmalari (Vercel Cron, `Authorization: Bearer CRON_SECRET`) |
| GET | `/api/v1/health` | server regioni va bazagacha ping (ms) |
| POST | `/api/v1/admin/telegram` | admin: webhook'ni o'rnatish |
| POST | `/api/v1/uploads` | mahsulot rasmi (Vercel Blob) |
| POST | `/api/v1/auth/demo` | demo hisobga kirish (`DEMO_MODE=1`) |
| GET/PATCH | `/api/v1/admin/users[/:id]` | admin: tasdiqlash, bloklash, obunani uzaytirish |
| GET/PATCH | `/api/v1/admin/tickets[/:id]` | admin: murojaatlarga javob |
| GET  | `/api/v1/admin/audit` | admin: audit jurnali |

## Bosqichlar

- [x] 0. Asos: tuzilma, dizayn tokenlari, uz/ru/en, light/dark, ilova qobig'i
- [x] 1. Kirish: ro'yxatdan o'tish, kirish, chiqish, sessiya, urinishlar cheklovi, profil, parolni almashtirish
- [x] 2. Mahsulotlar va katalog: narx pog'onalari, rasmlar, qidiruv, kategoriya, yetkazib beruvchilar
- [x] 3. Hamkorlik va kompaniya profili: yetkazish shartlari, so'rov/qabul/rad, chegirma va shartlar
- [x] 4. Savat va buyurtmalar: kompaniya bo'yicha savat, xaritada nuqta, to'lov usuli, holatlar, to'lov holati, takrorlash, saqlanganlar
- [x] 5. Biznes chat (buyurtma havolasi bilan) va bildirishnomalar
- [x] 6. Do'kon ombori (hamkorga ko'rinadi), obuna, admin, murojaatlar, demo
- [x] 7. Hisobot, audit jurnali
- [ ] Deploy: Vercel + MongoDB Atlas (sozlash pastda)

## Sinov

```bash
npm test                     # unit testlar (narx pog'onalari, holatlar, validatsiya, tarjimalar, qarz taqsimoti)
SAVDOCHI_TEST_URL=http://localhost:3000 npm run test:integration   # ishlab turgan serverga haqiqiy so'rovlar
```

Integratsiya testi demo hisoblarda buyurtma va to'lov yaratadi — **faqat sinov bazasida** (`DEMO_MODE=1`) ishga tushiring.
GitHub Actions (`.github/workflows/ci.yml`) har push'da typecheck, unit va integratsiya testlarini ishlatadi.

Buyurtma berish va holat o'zgarishi MongoDB tranzaksiyasida bajariladi — **replica set shart** (Atlas'da avtomatik bor).

Mahalliy MongoDB (replica set) bilan:

```bash
docker run -d --name mongo -p 27017:27017 mongo:7 --replSet rs0
docker exec mongo mongosh --eval 'rs.initiate()'
```

`.env.local` da `MONGODB_URI=mongodb://127.0.0.1:27017/savdochi?replicaSet=rs0`, `DEMO_MODE=1`.

## Deploy (Vercel)

**Tezlik uchun eng muhimi:** Vercel funksiyalari va MongoDB Atlas bir regionda bo'lsin.
Tekshirish: `/api/v1/health` — `dbPingMs` 10 ms dan kichik bo'lsa hammasi joyida; 50+ bo'lsa
Vercel → Settings → Functions → Region ni Atlas klasteri joylashgan regionga moslang
(Atlas us-east-1 → `iad1`, eu-central-1 → `fra1`).

1. MongoDB Atlas'da bepul klaster oching, `MONGODB_URI` ni oling (Network Access: `0.0.0.0/0`).
2. Vercel'da reponi import qiling.
3. Environment Variables: `MONGODB_URI`, `AUTH_SECRET`, `ADMIN_PHONES`, `APP_URL`, `DEMO_MODE` (ixtiyoriy).
   Qarz eslatmalari uchun: `CRON_SECRET` (tasodifiy uzun satr).
   Telegram uchun (ixtiyoriy): `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`.
4. Storage → Blob → loyihaga ulang (rasmlar uchun `BLOB_READ_WRITE_TOKEN` avtomatik qo'shiladi).
5. Deploy.
6. Telegram ulangan bo'lsa: Admin sahifasida "Telegram webhook'ni o'rnatish" tugmasini bir marta bosing.

## Onlayn to'lov (Payme, Click)

Pul to'g'ridan-to'g'ri kompaniyaning o'z merchant hisobiga tushadi — platforma pul ushlamaydi.

1. Kompaniya Payme Business / Click merchant kabinetida kassa ochadi.
2. Savdochi → Profil → "Onlayn to'lov": Merchant ID va kalitni kiritadi (kalit shifrlab saqlanadi).
3. Shu blokda ko'rsatilgan manzil(lar)ni kabinetga kiritadi:
   Payme — `/api/v1/pay/payme/<kompaniya ID>`, Click — `.../prepare` va `.../complete`.
4. Do'kon buyurtma sahifasida "Payme/Click orqali to'lash"ni bosadi; to'lov tasdiqlangach
   buyurtma va qarz daftari avtomatik yangilanadi, ikkala tomonga bildirishnoma boradi.

Sinov: `PAYME_TEST=1` — Payme test kassasi (test.paycom.uz).

## Hujjatlar (chop etish)

- `/print/invoice/:orderId` — hisob-faktura (yuk xati)
- `/print/statement/:partnerId?from=YYYY-MM-DD&to=YYYY-MM-DD` — akt sverka

Rekvizitlar (STIR, bank, hisob raqami, MFO) Profil sahifasida to'ldiriladi.
