# Savdochi v2: MVP rejasi

Manbalar: taqdimot (ULTRA B2B), eski sayt (savdochi-b2b.vercel.app) va Cowork'dagi reja.
Har bir yangi sessiya shu fayldan boshlaydi.

## G'oya

Do'kon agent kelishini kutmaydi: o'ziga kerakli mahsulotni kim ishlab chiqarishini topadi,
shartlarni chatda kelishadi va buyurtma beradi. Ishlab chiqaruvchi (sotuvchi) esa hamkor
do'konlarga nima kerakligini ko'rib, o'zi taklif qiladi. Sotuvchi platformadan oylik obuna
bilan foydalanadi.

Jarayon: **Topish → Kelishish → Buyurtma → Boshqarish**.

## Rollar

- **Do'kon (xaridor):** qidiradi, narxlarni solishtiradi, buyurtma beradi, yetkazishni kuzatadi.
- **Kompaniya (sotuvchi):** mahsulot va narxlarni boshqaradi, hamkor do'konlar omborini ko'radi,
  buyurtmani tasdiqlaydi va to'lov holatini belgilaydi. Oylik obuna to'laydi.
- **Admin:** kompaniyalarni tekshiradi, murojaatlarga javob beradi, obunani yoqadi.

## Eski saytda bor funksiyalar

| Funksiya | Eski saytda | v2 da |
|---|---|---|
| Ro'yxatdan o'tish, kirish (eski: email; v2: telefon) | ✅ | ✅ |
| Demo hisoblar (sotuvchi/xaridor paneliga tez o'tish) | ✅ | 6-bosqich |
| Katalog: qidiruv, kategoriyalar | ✅ | ✅ |
| Mahsulot: narx, min. buyurtma, qoldiq, qadoq, narx pog'onalari | ✅ | ✅ |
| Yetkazib beruvchilar ro'yxati | ✅ | ✅ |
| Yetkazish shartlari: hududlar, kunlar, muddat, narx, min. summa, to'lov usullari | ✅ | 3-bosqich |
| Hamkorlik so'rovi: qabul/rad, chegirma %, shartlar | ✅ | 3-bosqich |
| Hamkorlarim: buyurtmalar soni va summasi | ✅ | 3-bosqich |
| Saqlanganlar (sevimli mahsulotlar) | ✅ | 4-bosqich |
| Savat (sotuvchi bo'yicha guruhlangan, chegirma, yetkazish narxi, min. summa) | ✅ | 4-bosqich |
| Buyurtma: telefon, manzil, xaritada nuqta, to'lov usuli (naqd, bank, karta), izoh | ✅ | 4-bosqich |
| Buyurtma holatlari, "e'tibor talab qiladi" ro'yxati | ✅ | 4-bosqich |
| Buyurtmani takrorlash | ✅ | 4-bosqich |
| Rezerv (mahsulotni vaqtincha band qilish) | ✅ | MVP'dan keyin |
| Biznes chat (buyurtmaga bog'langan) | ✅ | 5-bosqich |
| Bildirishnomalar, "barchasini o'qilgan qilish" | ✅ | 5-bosqich |
| Hisobot: buyurtmalar, summa, to'langan, qayta xarid qilganlar, faolsiz hamkorlar | ✅ | 7-bosqich |
| Murojaatlar (yordam): mavzu, holat, admin javobi | ✅ | 6-bosqich |
| Moderatsiya: kompaniyani tekshirilgan deb belgilash | ✅ | 6-bosqich |
| Katalogdan mahsulot olish (ID orqali nusxa) | ✅ | MVP'dan keyin |

## Taqdimotda bor, lekin eski saytda yo'q

- **Ombor boshqaruvi:** kompaniya faqat hamkor do'konlarning qoldig'ini ko'radi va nima kerakligini
  biladi. Bu platformaning asosiy farqi. → 6-bosqich
- **To'lov holatini qayd etish** (to'landi / qisman / kutilmoqda). → 4-bosqich
- **Yetkazishni kuzatish** (buyurtma holatlari zanjiri). → 4-bosqich
- **Oylik obuna** sotuvchilar uchun. MVP'da admin qo'lda yoqadi, onlayn to'lov keyin. → 6-bosqich
- **Xavfsizlik:** admin MFA, audit log, zaxira nusxa. Rate limit tayyor. → 7-bosqich
- **Mahsulot rasmlari.** Eski saytda ham, v2 da ham yo'q, lekin katalog uchun kerak. → 4-bosqich

## Bosqichlar

- [x] **0. Asos:** tuzilma, dizayn, uz/ru/en, light/dark
- [x] **1. Kirish:** ro'yxatdan o'tish, kirish, sessiya, profil, parolni almashtirish *(unutilgan parolni SMS orqali tiklash — keyingi qadam)*
- [x] **2. Mahsulotlar va katalog**
- [x] **3. Hamkorlik va kompaniya profili:** yetkazish shartlari, hamkorlik so'rovi, chegirma, Hamkorlarim; profil tahriri
- [x] **4. Savat va buyurtma:** rasmlar, saqlanganlar, savat, xarita, to'lov usuli, holatlar, to'lov holati, takrorlash
- [x] **5. Chat va bildirishnomalar**
- [x] **6. Ombor, obuna, admin:** do'kon qoldig'i va hamkorga ko'rinishi, obuna, moderatsiya, murojaatlar, demo hisoblar
- [x] **7. Hisobot va audit log** *(admin MFA va avtomatik testlar — keyingi qadam)*
- [x] **Ishonchlilik:** buyurtma va ombor bitta tranzaksiyada; `requestId` bilan ikki marta buyurtma yaratilmaydi
- [ ] **Deploy:** Vercel + MongoDB Atlas

## MVP'dan keyin

Rezervlar, katalogdan nusxa olish, Click/Payme orqali to'lov va obuna, SMS kod, mobil ilova
(API tayyor), xalqaro savdo (valyuta, chegara).

## Ishga tushirish uchun kerak

1. GitHub: Claude ilovasiga `savdochi-v2` repoga ruxsat.
2. MongoDB Atlas: bepul klaster, `MONGODB_URI`.
3. Vercel: loyiha repoga ulanadi, `MONGODB_URI`, `AUTH_SECRET`, `ADMIN_PHONES` kiritiladi.
4. Rasmlar uchun: Vercel Blob (4-bosqichda).
