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
| GET  | `/api/v1/suppliers?region=` | yetkazib beruvchilar |

## Bosqichlar

- [x] 0. Asos: tuzilma, dizayn tokenlari, uz/ru/en, light/dark, ilova qobig'i
- [x] 1. Kirish: ro'yxatdan o'tish, kirish, chiqish, sessiya, urinishlar cheklovi *(qisman — profil va parolni tiklash qoldi)*
- [x] 2. Mahsulotlar va katalog: sotuvchi mahsulot qo'shadi/tahrirlaydi/arxivlaydi, narx pog'onalari; katalog (qidiruv, kategoriya, sahifalash), mahsulot sahifasi, yetkazib beruvchilar (viloyat filtri)
- [ ] 3. Hamkorlik
- [ ] 4. Savat va buyurtmalar
- [ ] 5. Chat va bildirishnomalar
- [ ] 6. Admin, demo, testlar, deploy
