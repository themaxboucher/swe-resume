import "server-only";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const from = process.env.EMAIL_FROM || "Résumé <onboarding@resend.dev>";

type Email = { to: string; subject: string; heading: string; body: string; cta: string; url: string };

function render({ heading, body, cta, url }: Email) {
  return `<!doctype html><html><body style="margin:0;background:#f7f7f7;font-family:Inter,Helvetica,Arial,sans-serif;color:#333">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:14px;padding:32px;box-shadow:0 0 0 1px rgba(0,0,0,.08)">
    <h1 style="font-family:Georgia,serif;font-weight:400;font-size:26px;margin:0 0 12px">${heading}</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 24px">${body}</p>
    <a href="${url}" style="display:inline-block;background:#0084d1;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 18px;border-radius:8px">${cta}</a>
    <p style="font-size:12px;color:#777;margin:24px 0 0">If the button doesn't work, paste this link into your browser:<br>${url}</p>
  </div></body></html>`;
}

export async function sendEmail(email: Email) {
  if (!resend) {
    console.info(`\n[email] To: ${email.to}\n[email] ${email.subject}\n[email] ${email.url}\n`);
    return;
  }
  const { error } = await resend.emails.send({
    from,
    to: email.to,
    subject: email.subject,
    html: render(email),
  });
  if (error) console.error("[email] Failed to send", error);
}
