import { auth, signIn, signOut } from "@/auth";
import MessageForm from "./message-form";

export default async function Home() {
  const session = await auth();
  const user = session?.user;

  if (!user?.email) {
    return (
      <main className="card">
        <h1>Xabar yuborish</h1>
        <p className="muted">Xabar kimdan ketayotgani aniq bo'lishi uchun Google orqali kiring. Ro'yxatdan o'tish shart emas.</p>
        <form action={async () => { "use server"; await signIn("google"); }}>
          <button type="submit">Google orqali kirish</button>
        </form>
      </main>
    );
  }

  return (
    <main className="card">
      <h1>Xabar yuborish</h1>
      <div className="row">
        <span className="muted" style={{ margin: 0 }}>Siz: <b>{user.email}</b></span>
        <form action={async () => { "use server"; await signOut(); }}>
          <button type="submit" className="link">Chiqish</button>
        </form>
      </div>
      <MessageForm defaultName={user.name ?? ""} />
    </main>
  );
}
