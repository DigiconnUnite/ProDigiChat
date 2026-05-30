/**
 * Transactional email via SMTP (Nodemailer).
 *
 * Configuration is purely environment-driven so the app is provider
 * agnostic — point it at Gmail, AWS SES SMTP, Mailgun, Postmark, or any
 * SMTP host:
 *
 *   SMTP_HOST      e.g. "email-smtp.us-east-1.amazonaws.com"
 *   SMTP_PORT      e.g. 587 (STARTTLS) or 465 (implicit TLS)
 *   SMTP_SECURE    "true" to use implicit TLS (port 465); otherwise STARTTLS
 *   SMTP_USER      SMTP username
 *   SMTP_PASS      SMTP password
 *   SMTP_FROM      default From address, e.g. "ProDigiChat <no-reply@yourdomain.com>"
 *
 * Graceful degradation: if SMTP is not configured, emails are logged to
 * the server console (including any action links) instead of sent, so
 * local development never breaks. In production an unconfigured mailer
 * logs a loud warning.
 */
import nodemailer, { type Transporter } from "nodemailer";

export interface SendEmailParams {
  to: string;
  subject: string;
  /** HTML body. If omitted, `text` is used. */
  html?: string;
  /** Plain-text body. If omitted, derived from `html`. */
  text?: string;
  /** Override the default From address. */
  from?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  /** True if handed off to the SMTP server. */
  sent: boolean;
  /** True if logged to console because SMTP is unconfigured. */
  logged?: boolean;
  error?: string;
}

let cachedTransporter: Transporter | null = null;

/** Whether SMTP credentials are present in the environment. */
export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );
}

function getFromAddress(override?: string): string {
  return (
    override ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    "ProDigiChat <no-reply@prodigichat.local>"
  );
}

function getTransporter(): Transporter | null {
  if (!isEmailConfigured()) return null;
  if (cachedTransporter) return cachedTransporter;

  const port = Number(process.env.SMTP_PORT) || 587;
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // Implicit TLS on 465, STARTTLS otherwise. Honour an explicit
    // SMTP_SECURE override for hosts that differ from the port default.
    secure: process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === "true"
      : port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return cachedTransporter;
}

/** Strip tags so we can derive a plain-text fallback from HTML. */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Send a transactional email. Never throws — returns a result object so
 * callers can decide whether a failed email should fail the wider
 * operation (it usually should not).
 */
export async function sendEmail(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  const { to, subject, html, text, from, replyTo } = params;
  const body = text || (html ? htmlToText(html) : "");

  const transporter = getTransporter();

  if (!transporter) {
    // No SMTP configured — log instead of sending so dev keeps working.
    const level = process.env.NODE_ENV === "production" ? "warn" : "log";
    console[level](
      `[Email] SMTP not configured — email NOT sent. ` +
        `to=${to} subject="${subject}"\n${body}`,
    );
    return { sent: false, logged: true };
  }

  try {
    await transporter.sendMail({
      from: getFromAddress(from),
      to,
      subject,
      text: body,
      html: html || undefined,
      replyTo,
    });
    console.log(`[Email] Sent "${subject}" to ${to}`);
    return { sent: true };
  } catch (error: any) {
    console.error(`[Email] Failed to send "${subject}" to ${to}:`, error?.message);
    return { sent: false, error: error?.message || "Unknown email error" };
  }
}

/**
 * Minimal branded HTML wrapper for transactional emails. Keeps every
 * message visually consistent without pulling in a templating engine.
 */
export function renderEmailLayout(opts: {
  heading: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footnote?: string;
}): string {
  const { heading, bodyHtml, ctaLabel, ctaUrl, footnote } = opts;
  const appName = "ProDigiChat";
  const cta =
    ctaLabel && ctaUrl
      ? `<tr><td style="padding:24px 0;">
           <a href="${ctaUrl}" style="background:#16a34a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;display:inline-block;font-weight:600;">${ctaLabel}</a>
         </td></tr>`
      : "";
  return `<!doctype html>
<html>
<body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px;">
        <tr><td style="font-size:20px;font-weight:700;color:#16a34a;padding-bottom:8px;">${appName}</td></tr>
        <tr><td style="font-size:18px;font-weight:600;padding:12px 0;">${heading}</td></tr>
        <tr><td style="font-size:14px;line-height:1.6;color:#3f3f46;">${bodyHtml}</td></tr>
        ${cta}
        ${renderFootnote(footnote)}
      </table>
      <p style="font-size:12px;color:#a1a1aa;margin-top:16px;">© ${new Date().getFullYear()} ${appName}</p>
    </td></tr>
  </table>
</body>
</html>`;
}

function renderFootnote(note?: string): string {
  if (!note) return "";
  return `<tr><td style="font-size:12px;color:#a1a1aa;padding-top:16px;border-top:1px solid #e4e4e7;">${note}</td></tr>`;
}
