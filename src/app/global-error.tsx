"use client";

/**
 * Eng oxirgi himoya: ildiz layout'ning o'zi yiqilsa. Lug'at mavjud bo'lmasligi mumkin —
 * shuning uchun qisqa matn uch tilda.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="uz">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0, background: "#f4f7fc", color: "#0f172a" }}>
        <main style={{ textAlign: "center", padding: 24, maxWidth: 420 }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Xatolik yuz berdi · Произошла ошибка · Something went wrong</h1>
          <p style={{ color: "#475569" }}>Sahifani qayta yuklab ko‘ring. · Обновите страницу. · Please reload the page.</p>
          <button type="button" onClick={reset} style={{ marginTop: 16, padding: "10px 18px", borderRadius: 12, border: 0, background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
            Qayta urinish · Повторить · Retry
          </button>
        </main>
      </body>
    </html>
  );
}
