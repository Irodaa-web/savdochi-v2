import { NextResponse } from "next/server";
import { connectDB, MessageLogModel } from "@/lib/db";
import { sendMessageEmail } from "@/lib/mailer";
import { messageSchema } from "@/lib/schema";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const parsed = messageSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot" }, { status: 400 });
  }
  const { senderName, to, message } = parsed.data;

  // Yuboruvchini login'siz aniqlash: IP manzil va brauzer ma'lumoti
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  const userAgent = req.headers.get("user-agent") ?? "";
  const from = process.env.SMTP_USER ?? "";

  await connectDB();

  // Spam himoyasi: bitta IP'dan soatiga 20 tadan ko'p emas
  const lastHour = await MessageLogModel.countDocuments({
    ip,
    sentAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
  });
  if (lastHour >= 20) return NextResponse.json({ error: "Juda ko'p xabar. Keyinroq urinib ko'ring" }, { status: 429 });

  const log = { senderName, from, to, message, ip, userAgent };
  try {
    await sendMessageEmail({ senderName, to, message });
    await MessageLogModel.create({ ...log, status: "sent" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await MessageLogModel.create({ ...log, status: "failed", error });
    console.error("Xat yuborilmadi:", error);
    return NextResponse.json({ error: "Xat yuborilmadi, keyinroq urinib ko'ring" }, { status: 502 });
  }
}
