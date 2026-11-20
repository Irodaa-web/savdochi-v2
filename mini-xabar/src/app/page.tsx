import MessageForm from "./message-form";

export default function Home() {
  return (
    <main className="card">
      <h1>Xabar yuborish</h1>
      <p className="muted">Ismingizni, qabul qiluvchining emailini va xabarni yozing.</p>
      <MessageForm />
    </main>
  );
}
