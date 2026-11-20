import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: Number(process.env.SMTP_PORT ?? 465) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Xat loyihaning SMTP hisobidan ketadi (boshqa birovning nomidan "From" qo'yib bo'lmaydi —
// spam filtrlari bloklaydi). Shuning uchun haqiqiy yuboruvchi:
//  - "From" nomida ko'rinadi:  "Ali (ali@gmail.com)" <loyiha@gmail.com>
//  - Reply-To ga qo'yiladi: qabul qiluvchi "Javob berish"ni bossa, to'g'ridan-to'g'ri Ali'ga ketadi.
export async function sendMessageEmail(p: { senderName: string; fromEmail: string; to: string; message: string }) {
  const displayName = `${p.senderName} (${p.fromEmail})`.replace(/["\r\n]/g, "");
  await transporter.sendMail({
    from: { name: displayName, address: process.env.SMTP_USER! },
    replyTo: p.fromEmail,
    to: p.to,
    subject: `${p.senderName} sizga xabar yubordi`,
    text: `Kimdan: ${p.senderName} <${p.fromEmail}>\n\n${p.message}`,
    html: `<p><b>Kimdan:</b> ${escapeHtml(p.senderName)} &lt;${escapeHtml(p.fromEmail)}&gt;</p>
<hr/><p style="white-space:pre-wrap">${escapeHtml(p.message)}</p>`,
  });
}
