import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB, MessageLogModel } from "@/lib/db";
import { sendMessageEmail } from "@/lib/mailer";
import { messageSchema } from "@/lib/schema";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Yuboruvchi emaili formadan EMAS, sessiyadan olinadi — uni soxtalashtirib bo'lmaydi.
  const session = await auth();
  const fromEmail = session?.user?.email;
  if (!fromEmail) return NextResponse.json({ error: "Avval Google orqali kiring" }, { status: 401 });

  const parsed = messageSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot" }, { status: 400 });
  }
  const { senderName, to, message } = parsed.data;

  await connectDB();

  // Oddiy spam himoyasi: bitta foydalanuvchi soatiga 20 tadan ko'p yubora olmaydi.
  const lastHour = await MessageLogModel.countDocuments({
    fromEmail,
    sentAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
  });
  if (lastHour >= 20) return NextResponse.json({ error: "Juda ko'p xabar. Keyinroq urinib ko'ring" }, { status: 429 });

  try {
    await sendMessageEmail({ senderName, fromEmail, to, message });
    await MessageLogModel.create({ senderName, fromEmail, to, message, status: "sent" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await MessageLogModel.create({ senderName, fromEmail, to, message, status: "failed", error });
    console.error("Xat yuborilmadi:", error);
    return NextResponse.json({ error: "Xat yuborilmadi, keyinroq urinib ko'ring" }, { status: 502 });
  }
}
