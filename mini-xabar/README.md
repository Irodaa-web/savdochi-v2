# mini-xabar

Kichik Next.js loyiha: foydalanuvchi **Google orqali bir bosishda kiradi** (register/parol yo'q),
formani to'ldiradi (ism, kimga email, xabar) — xat qabul qiluvchiga boradi va log MongoDB'ga yoziladi.

## Yuboruvchi qanday aniqlanadi
- Yuboruvchi o'z emailini **yozmaydi** — u Google login'dan (sessiyadan) olinadi, soxtalashtirib bo'lmaydi.
- Qabul qiluvchi xatda ko'radi: `From: "Ali (ali@gmail.com)"`, matnda `Kimdan: Ali <ali@gmail.com>`,
  va "Javob berish" bossa — to'g'ridan-to'g'ri Ali'ga ketadi (`Reply-To`).
- Xat texnik jihatdan loyihaning SMTP hisobidan ketadi (boshqa birovning gmail'idan nomidan yuborib bo'lmaydi — spamga tushadi yoki bloklanadi).

## MongoDB log (`messagelogs` kolleksiyasi)
```json
{ "senderName": "Ali", "fromEmail": "ali@gmail.com", "to": "dost@example.com",
  "message": "Salom!", "status": "sent", "sentAt": "2026-11-20T10:15:00Z" }
```
Xat ketmasa ham `status: "failed"` va `error` bilan yoziladi. Bitta foydalanuvchi soatiga 20 tadan ko'p yubora olmaydi.

## Ishga tushirish
1. `cp .env.example .env.local` va qiymatlarni to'ldiring:
   - **MONGODB_URI** — MongoDB Atlas ulanish satri
   - **AUTH_SECRET** — `npx auth secret`
   - **AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET** — Google Cloud Console → Credentials → OAuth client (Web).
     Redirect URI: `http://localhost:3000/api/auth/callback/google` (prod'da o'z domeningiz)
   - **SMTP_*** — Gmail bo'lsa 2FA yoqib, "App password" yarating
2. `npm install && npm run dev` → http://localhost:3000

## Fayllar
- `src/auth.ts` — Auth.js (Google)
- `src/app/message-form.tsx` — react-hook-form + zod
- `src/app/api/send/route.ts` — tekshirish, xat yuborish, log
- `src/lib/db.ts`, `src/lib/mailer.ts`, `src/lib/schema.ts`
