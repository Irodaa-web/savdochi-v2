import type { Locale } from "@/i18n/config";

/**
 * Ommaviy oferta va maxfiylik siyosati matnlari (uz / ru / en).
 * DIQQAT: bu boshlang'ich shablon. Ishga tushirishdan oldin yurist ko'rib chiqishi va
 * operator rekvizitlari (LEGAL_* muhit o'zgaruvchilari) to'ldirilishi kerak.
 * {company}, {inn}, {address}, {contact} — operator ma'lumotlari bilan almashtiriladi.
 */
export type LegalDoc = { title: string; updated: string; intro: string; sections: { title: string; items: string[] }[] };
export type LegalKind = "terms" | "privacy";

export const LEGAL_UPDATED = "2026-11-16";

export function legalOperator() {
  const v = (k: string) => process.env[k]?.trim() || "";
  return { company: v("LEGAL_COMPANY") || "Savdochi", inn: v("LEGAL_INN"), address: v("LEGAL_ADDRESS"), contact: v("LEGAL_CONTACT") };
}

const terms: Record<Locale, LegalDoc> = {
  uz: {
    title: "Ommaviy oferta (foydalanish shartlari)",
    updated: "Oxirgi yangilanish",
    intro: "Ushbu hujjat {company} (keyingi o‘rinlarda — «Platforma») xizmatlaridan foydalanish shartlarini belgilaydi. Platformada ro‘yxatdan o‘tish ushbu shartlarni to‘liq qabul qilishni anglatadi.",
    sections: [
      {
        title: "1. Platforma nima",
        items: [
          "Savdochi — ishlab chiqaruvchi va ulgurji kompaniyalar («Kompaniya») bilan do‘konlar («Do‘kon») o‘rtasida ulgurji savdoni tashkil etish uchun axborot platformasi.",
          "Platforma tovarlarning sotuvchisi emas. Oldi-sotdi shartnomasi bevosita Kompaniya va Do‘kon o‘rtasida tuziladi; narx, sifat, yetkazib berish va to‘lov shartlari uchun tomonlarning o‘zi javob beradi.",
        ],
      },
      {
        title: "2. Ro‘yxatdan o‘tish va hisob",
        items: [
          "Ro‘yxatdan o‘tishda to‘g‘ri ma’lumot kiritish va o‘zingizga tegishli telefon raqamidan foydalanish shart.",
          "Hisobga kirish ma’lumotlarini (parol, SMS kod) saqlash foydalanuvchining javobgarligida. Hisob orqali bajarilgan barcha amallar hisob egasi tomonidan bajarilgan deb hisoblanadi.",
          "Platforma noto‘g‘ri ma’lumot bergan yoki shartlarni buzgan hisobni cheklashi yoki bloklashi mumkin.",
        ],
      },
      {
        title: "3. Buyurtma, yetkazib berish va to‘lov",
        items: [
          "Buyurtma Do‘kon tomonidan yuboriladi va Kompaniya tasdiqlagach kuchga kiradi. Kompaniya buyurtmani asosli sabab bilan rad etishi mumkin.",
          "To‘lov usullari (naqd, bank o‘tkazmasi, karta, nasiya, onlayn to‘lov) Kompaniya tomonidan belgilanadi. Onlayn to‘lovlar Payme va Click to‘lov tizimlari orqali bevosita Kompaniya hisobiga o‘tkaziladi; Platforma pul mablag‘larini qabul qilmaydi va saqlamaydi.",
          "Nasiya (kechiktirilgan to‘lov) limiti va muddati Kompaniya tomonidan belgilanadi. Qarzni o‘z vaqtida to‘lash Do‘konning majburiyati.",
          "Tovarni qaytarish va almashtirish tartibi O‘zbekiston Respublikasi qonunchiligi hamda tomonlar kelishuvi bilan belgilanadi.",
        ],
      },
      {
        title: "4. Tariflar",
        items: [
          "Kompaniyalar uchun Bepul, Standart va Premium tariflar mavjud. Tariflarning narxi, chegaralari va sinov muddati Platformaning «Tariflar» bo‘limida ko‘rsatiladi.",
          "Pullik tarif muddati tugaganda Kompaniya Bepul tarifga o‘tadi: mahsulotlari katalogda qoladi va ma’lumotlari saqlanadi, ammo Bepul tarif chegaralari amal qiladi.",
        ],
      },
      {
        title: "5. Taqiqlangan harakatlar",
        items: [
          "Qonun bilan taqiqlangan yoki muomalasi cheklangan tovarlarni joylashtirish.",
          "Yolg‘on ma’lumot, boshqa shaxsning ma’lumotlari yoki belgilaridan foydalanish.",
          "Platforma ishiga xalaqit berish, himoya vositalarini chetlab o‘tishga urinish, ma’lumotlarni avtomatik yig‘ish.",
        ],
      },
      {
        title: "6. Javobgarlik",
        items: [
          "Platforma «boricha» taqdim etiladi. Platforma tomonlar o‘rtasidagi bitimlar, tovar sifati, yetkazib berish muddati va to‘lovlar uchun javob bermaydi.",
          "Platforma texnik nosozliklar oqibatida yuzaga kelgan bilvosita zararlar uchun javobgar emas, biroq ularni imkon qadar tez bartaraf etishga harakat qiladi.",
        ],
      },
      {
        title: "7. Shartlarni o‘zgartirish va nizolar",
        items: [
          "Platforma ushbu shartlarni o‘zgartirishi mumkin; yangi tahrir shu sahifada e’lon qilinadi. Foydalanishni davom ettirish yangi shartlarga rozilikni anglatadi.",
          "Nizolar muzokara yo‘li bilan, kelishuvga erishilmasa — O‘zbekiston Respublikasi qonunchiligiga muvofiq sud tartibida hal etiladi.",
        ],
      },
    ],
  },
  ru: {
    title: "Публичная оферта (условия использования)",
    updated: "Последнее обновление",
    intro: "Настоящий документ определяет условия использования сервисов {company} (далее — «Платформа»). Регистрация на Платформе означает полное принятие этих условий.",
    sections: [
      {
        title: "1. Что такое Платформа",
        items: [
          "Savdochi — информационная платформа для организации оптовой торговли между производителями и оптовыми компаниями («Компания») и магазинами («Магазин»).",
          "Платформа не является продавцом товаров. Договор купли-продажи заключается напрямую между Компанией и Магазином; за цену, качество, доставку и условия оплаты отвечают сами стороны.",
        ],
      },
      {
        title: "2. Регистрация и аккаунт",
        items: [
          "При регистрации необходимо указывать достоверные данные и использовать принадлежащий вам номер телефона.",
          "Пользователь отвечает за сохранность данных для входа (пароль, SMS-код). Все действия, совершённые через аккаунт, считаются совершёнными его владельцем.",
          "Платформа вправе ограничить или заблокировать аккаунт при недостоверных данных или нарушении условий.",
        ],
      },
      {
        title: "3. Заказ, доставка и оплата",
        items: [
          "Заказ отправляет Магазин; он вступает в силу после подтверждения Компанией. Компания вправе отклонить заказ по обоснованной причине.",
          "Способы оплаты (наличные, перевод, карта, насия, онлайн-оплата) определяет Компания. Онлайн-платежи проходят через Payme и Click напрямую на счёт Компании; Платформа не принимает и не хранит денежные средства.",
          "Лимит и срок насии (отсрочки платежа) устанавливает Компания. Своевременная оплата долга — обязанность Магазина.",
          "Порядок возврата и обмена товара определяется законодательством Республики Узбекистан и соглашением сторон.",
        ],
      },
      {
        title: "4. Тарифы",
        items: [
          "Для Компаний доступны тарифы Бесплатный, Стандарт и Премиум. Стоимость, лимиты и пробный период указаны в разделе «Тарифы» Платформы.",
          "По окончании платного тарифа Компания переходит на бесплатный: товары остаются в каталоге, данные сохраняются, но действуют лимиты бесплатного тарифа.",
        ],
      },
      {
        title: "5. Запрещённые действия",
        items: [
          "Размещение товаров, запрещённых или ограниченных в обороте законом.",
          "Использование ложных сведений, чужих данных или обозначений.",
          "Вмешательство в работу Платформы, попытки обхода защиты, автоматический сбор данных.",
        ],
      },
      {
        title: "6. Ответственность",
        items: [
          "Платформа предоставляется «как есть». Платформа не отвечает за сделки между сторонами, качество товара, сроки доставки и платежи.",
          "Платформа не несёт ответственности за косвенный ущерб вследствие технических сбоев, но стремится устранять их в кратчайшие сроки.",
        ],
      },
      {
        title: "7. Изменение условий и споры",
        items: [
          "Платформа вправе изменять условия; новая редакция публикуется на этой странице. Продолжение использования означает согласие с новыми условиями.",
          "Споры решаются путём переговоров, а при недостижении согласия — в судебном порядке по законодательству Республики Узбекистан.",
        ],
      },
    ],
  },
  en: {
    title: "Public offer (terms of use)",
    updated: "Last updated",
    intro: "This document sets out the terms of use of {company} services (the “Platform”). Registering on the Platform means you fully accept these terms.",
    sections: [
      {
        title: "1. What the Platform is",
        items: [
          "Savdochi is an information platform for wholesale trade between manufacturers and wholesale companies (“Company”) and stores (“Store”).",
          "The Platform is not the seller of goods. The sale contract is concluded directly between the Company and the Store; the parties themselves are responsible for price, quality, delivery and payment terms.",
        ],
      },
      {
        title: "2. Registration and account",
        items: [
          "You must provide accurate details and use a phone number that belongs to you.",
          "You are responsible for keeping your sign-in details (password, SMS code) safe. All actions performed through an account are deemed performed by its owner.",
          "The Platform may restrict or block an account that provided false details or breached these terms.",
        ],
      },
      {
        title: "3. Orders, delivery and payment",
        items: [
          "An order is sent by the Store and takes effect once the Company confirms it. The Company may reject an order for a justified reason.",
          "Payment methods (cash, transfer, card, credit, online payment) are set by the Company. Online payments go through Payme and Click directly to the Company’s account; the Platform does not receive or hold funds.",
          "The credit (deferred payment) limit and term are set by the Company. Paying the debt on time is the Store’s obligation.",
          "Returns and exchanges are governed by the laws of the Republic of Uzbekistan and the parties’ agreement.",
        ],
      },
      {
        title: "4. Plans",
        items: [
          "Companies can use the Free, Standard or Premium plan. Prices, limits and the trial period are shown in the Plans section of the Platform.",
          "When a paid plan ends, the Company moves to the Free plan: its products stay in the catalog and its data is kept, but the Free plan limits apply.",
        ],
      },
      {
        title: "5. Prohibited actions",
        items: [
          "Listing goods that are prohibited or restricted by law.",
          "Using false information or another person’s details or marks.",
          "Interfering with the Platform, attempting to bypass protection, or collecting data automatically.",
        ],
      },
      {
        title: "6. Liability",
        items: [
          "The Platform is provided “as is”. The Platform is not liable for deals between the parties, product quality, delivery times or payments.",
          "The Platform is not liable for indirect damage caused by technical failures, but strives to fix them as quickly as possible.",
        ],
      },
      {
        title: "7. Changes and disputes",
        items: [
          "The Platform may change these terms; the new version is published on this page. Continued use means you accept the new terms.",
          "Disputes are resolved by negotiation and, failing that, in court under the laws of the Republic of Uzbekistan.",
        ],
      },
    ],
  },
};

const privacy: Record<Locale, LegalDoc> = {
  uz: {
    title: "Maxfiylik siyosati",
    updated: "Oxirgi yangilanish",
    intro: "Ushbu siyosat {company} foydalanuvchilarning shaxsiy ma’lumotlarini qanday yig‘ishi, ishlatishi va himoya qilishini tushuntiradi. U O‘zbekiston Respublikasining «Shaxsga doir ma’lumotlar to‘g‘risida»gi qonuniga muvofiq tuzilgan.",
    sections: [
      {
        title: "1. Qanday ma’lumotlar yig‘iladi",
        items: [
          "Ro‘yxatdan o‘tishda: tashkilot nomi, telefon raqami, viloyat, parol (faqat shifrlangan ko‘rinishda saqlanadi).",
          "Profilda: manzil, xaritadagi nuqta, yetkazib berish shartlari, rekvizitlar (STIR, bank, hisob raqami).",
          "Foydalanish jarayonida: mahsulotlar, buyurtmalar, to‘lov va qarz yozuvlari, chat xabarlari, ombor qoldiqlari.",
          "Texnik ma’lumotlar: IP manzil, qurilma va brauzer turi, kirish vaqti — xavfsizlik va nosozliklarni aniqlash uchun.",
        ],
      },
      {
        title: "2. Ma’lumotlar nima uchun ishlatiladi",
        items: [
          "Hisobni yaratish va unga kirishni ta’minlash, telefon raqamini SMS orqali tasdiqlash.",
          "Buyurtma, yetkazib berish, to‘lov va qarzlarni yuritish; hisob-faktura va akt sverka tuzish.",
          "Bildirishnomalar yuborish (saytda, SMS va siz ulagan bo‘lsangiz — Telegram orqali).",
          "Firibgarlikning oldini olish va Platforma xavfsizligini ta’minlash.",
        ],
      },
      {
        title: "3. Ma’lumotlar kimga ko‘rinadi",
        items: [
          "Savdo hamkoringizga: buyurtmani bajarish uchun zarur ma’lumotlar (nom, telefon, yetkazish manzili, rekvizitlar). Ombor qoldig‘i faqat siz ruxsat bergan faol hamkorga ko‘rinadi.",
          "Xizmat ko‘rsatuvchilarga: xosting va ma’lumotlar bazasi (Vercel, MongoDB Atlas), SMS yuborish (Eskiz), to‘lov tizimlari (Payme, Click), Telegram — faqat xizmatni ko‘rsatish uchun zarur hajmda.",
          "Davlat organlariga — faqat qonunda belgilangan hollarda va tartibda.",
          "Ma’lumotlaringiz reklama maqsadida uchinchi shaxslarga sotilmaydi.",
        ],
      },
      {
        title: "4. To‘lov ma’lumotlari",
        items: [
          "Onlayn to‘lov Payme yoki Click sahifasida amalga oshiriladi. Platforma bank kartangiz raqami va boshqa karta ma’lumotlarini ko‘rmaydi va saqlamaydi.",
          "Kompaniyaning to‘lov tizimi kalitlari shifrlangan holda saqlanadi.",
        ],
      },
      {
        title: "5. Saqlash va himoya",
        items: [
          "Parollar bir tomonlama shifrlanadi; aloqa HTTPS orqali himoyalangan; kirish urinishlari cheklangan.",
          "Ma’lumotlar hisob faol bo‘lgan davrda va qonunchilik talab qilgan muddat davomida (masalan, buxgalteriya hujjatlari uchun) saqlanadi.",
        ],
      },
      {
        title: "6. Sizning huquqlaringiz",
        items: [
          "O‘z ma’lumotlaringizni ko‘rish va Profil bo‘limida tuzatish.",
          "Hisobni va ma’lumotlarni o‘chirishni so‘rash (qonun bo‘yicha saqlanishi shart bo‘lgan yozuvlar bundan mustasno).",
          "Telegram bildirishnomalarini istalgan vaqtda uzish.",
          "Murojaat uchun: Yordam bo‘limi yoki quyidagi aloqa ma’lumotlari.",
        ],
      },
      {
        title: "7. Cookie fayllar",
        items: ["Platforma faqat zarur cookie’lardan foydalanadi: tizimga kirish sessiyasi, til va mavzu (kunduzgi/tungi) sozlamalari. Reklama cookie’lari ishlatilmaydi."],
      },
    ],
  },
  ru: {
    title: "Политика конфиденциальности",
    updated: "Последнее обновление",
    intro: "Эта политика объясняет, как {company} собирает, использует и защищает персональные данные пользователей. Она составлена в соответствии с Законом Республики Узбекистан «О персональных данных».",
    sections: [
      {
        title: "1. Какие данные собираются",
        items: [
          "При регистрации: название организации, номер телефона, регион, пароль (хранится только в зашифрованном виде).",
          "В профиле: адрес, точка на карте, условия доставки, реквизиты (ИНН, банк, расчётный счёт).",
          "В процессе работы: товары, заказы, записи об оплатах и долгах, сообщения чата, остатки склада.",
          "Технические данные: IP-адрес, тип устройства и браузера, время входа — для безопасности и диагностики сбоев.",
        ],
      },
      {
        title: "2. Для чего используются данные",
        items: [
          "Создание аккаунта и вход, подтверждение номера телефона по SMS.",
          "Ведение заказов, доставки, оплат и долгов; формирование счёт-фактуры и акта сверки.",
          "Отправка уведомлений (на сайте, по SMS и — если вы подключили — в Telegram).",
          "Предотвращение мошенничества и обеспечение безопасности Платформы.",
        ],
      },
      {
        title: "3. Кому видны данные",
        items: [
          "Вашему торговому партнёру: данные, необходимые для выполнения заказа (название, телефон, адрес доставки, реквизиты). Остатки склада видит только активный партнёр, которому вы это разрешили.",
          "Поставщикам услуг: хостинг и база данных (Vercel, MongoDB Atlas), отправка SMS (Eskiz), платёжные системы (Payme, Click), Telegram — только в объёме, необходимом для оказания услуги.",
          "Государственным органам — только в случаях и порядке, установленных законом.",
          "Ваши данные не продаются третьим лицам в рекламных целях.",
        ],
      },
      {
        title: "4. Платёжные данные",
        items: [
          "Онлайн-оплата выполняется на странице Payme или Click. Платформа не видит и не хранит номер вашей банковской карты и другие данные карты.",
          "Ключи платёжных систем Компании хранятся в зашифрованном виде.",
        ],
      },
      {
        title: "5. Хранение и защита",
        items: [
          "Пароли необратимо шифруются; соединение защищено HTTPS; число попыток входа ограничено.",
          "Данные хранятся, пока аккаунт активен, и в течение срока, требуемого законодательством (например, для бухгалтерских документов).",
        ],
      },
      {
        title: "6. Ваши права",
        items: [
          "Просматривать свои данные и исправлять их в разделе «Профиль».",
          "Запросить удаление аккаунта и данных (кроме записей, которые обязательны к хранению по закону).",
          "В любой момент отключить уведомления в Telegram.",
          "Для обращений: раздел «Помощь» или контакты ниже.",
        ],
      },
      {
        title: "7. Файлы cookie",
        items: ["Платформа использует только необходимые cookie: сессия входа, язык и тема (светлая/тёмная). Рекламные cookie не используются."],
      },
    ],
  },
  en: {
    title: "Privacy policy",
    updated: "Last updated",
    intro: "This policy explains how {company} collects, uses and protects users’ personal data. It is drawn up in line with the Law of the Republic of Uzbekistan “On Personal Data”.",
    sections: [
      {
        title: "1. What data we collect",
        items: [
          "At registration: organisation name, phone number, region, password (stored only in hashed form).",
          "In your profile: address, map location, delivery terms, company details (tax ID, bank, account number).",
          "While you use the Platform: products, orders, payment and debt records, chat messages, stock levels.",
          "Technical data: IP address, device and browser type, sign-in time — for security and troubleshooting.",
        ],
      },
      {
        title: "2. Why we use it",
        items: [
          "To create your account and sign you in, and to verify your phone number by SMS.",
          "To run orders, delivery, payments and debts; to produce invoices and reconciliation statements.",
          "To send notifications (on the site, by SMS and — if you connected it — via Telegram).",
          "To prevent fraud and keep the Platform secure.",
        ],
      },
      {
        title: "3. Who can see your data",
        items: [
          "Your trading partner: the details needed to fulfil an order (name, phone, delivery address, company details). Stock levels are visible only to an active partner you allowed.",
          "Service providers: hosting and database (Vercel, MongoDB Atlas), SMS delivery (Eskiz), payment systems (Payme, Click), Telegram — only to the extent needed to provide the service.",
          "Public authorities — only where and as required by law.",
          "Your data is not sold to third parties for advertising.",
        ],
      },
      {
        title: "4. Payment data",
        items: [
          "Online payment takes place on the Payme or Click page. The Platform does not see or store your bank card number or other card details.",
          "A Company’s payment-system keys are stored encrypted.",
        ],
      },
      {
        title: "5. Storage and protection",
        items: [
          "Passwords are one-way hashed; connections are protected by HTTPS; sign-in attempts are rate-limited.",
          "Data is kept while the account is active and for the period required by law (for example, for accounting documents).",
        ],
      },
      {
        title: "6. Your rights",
        items: [
          "View your data and correct it in Profile.",
          "Request deletion of your account and data (except records that must be kept by law).",
          "Disconnect Telegram notifications at any time.",
          "To contact us: the Help section or the contact details below.",
        ],
      },
      {
        title: "7. Cookies",
        items: ["The Platform uses only essential cookies: the sign-in session, language and theme (light/dark). No advertising cookies are used."],
      },
    ],
  },
};

export function legalDoc(kind: LegalKind, locale: Locale): LegalDoc {
  return (kind === "terms" ? terms : privacy)[locale];
}
