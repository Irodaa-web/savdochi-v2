# mini-xabar

Kichik Next.js loyiha: forma (ism, kimga email, xabar) → xat sizning Gmail'ingizdan qabul qiluvchiga boradi,
log MongoDB'ga (`mini_xabar.messagelogs`) yoziladi. Login yo'q.

## Log namunasi (Compass'da ko'rinadi)
```json
{ "senderName": "Ali", "from": "sizning@gmail.com", "to": "dost@example.com", "message": "Salom!",
  "ip": "85.12.34.56", "userAgent": "Mozilla/5.0 ...", "status": "sent", "sentAt": "2026-11-20T10:15:00Z" }
```
Login yo'qligi sababli yuboruvchining emaili ma'lum emas — u ismi va IP manzili bilan yoziladi.
Bitta IP'dan soatiga 20 tadan ko'p xabar yuborib bo'lmaydi.

## Ishga tushirish
1. `.env` fayl yarating (`.env.example` dagidek), `SMTP_USER` ga Gmail, `SMTP_PASS` ga App Password.
2. MongoDB lokal ishlab turgan bo'lsin (Compass'da `mongodb://127.0.0.1:27017` ga ulaning).
3. `npm install && npm run dev` → http://localhost:3000
