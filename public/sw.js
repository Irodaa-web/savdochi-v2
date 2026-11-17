// Minimal xizmat ishchisi: faqat o'rnatish imkoniyati uchun. Hech narsa keshlanmaydi,
// shuning uchun sahifa mazmuni doim yangi bo'ladi.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
