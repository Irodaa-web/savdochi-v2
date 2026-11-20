import nodemailer from "nodemailer";

const port = Number(process.env.SMTP_PORT ?? 465);
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: port === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Xat sizning Gmail'ingizdan ketadi, qabul qiluvchi "From" nomida yuboruvchining ismini ko'radi.
export async function sendMessageEmail(p: { senderName: string; to: string; message: string }) {
  await transporter.sendMail({
    from: { name: p.senderName.replace(/["\r\n]/g, ""), address: process.env.SMTP_USER! },
    to: p.to,
    subject: `${p.senderName} sizga xabar yubordi`,
    text: `Kimdan: ${p.senderName}\n\n${p.message}`,
    html: `<p><b>Kimdan:</b> ${escapeHtml(p.senderName)}</p>
<hr/><p style="white-space:pre-wrap">${escapeHtml(p.message)}</p>`,
  });
}
