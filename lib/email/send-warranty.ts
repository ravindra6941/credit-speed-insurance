/**
 * Warranty-PDF email fan-out via Resend.
 *
 * Sends the warranty PDF to up to three recipients:
 *   1. The customer (if email present)
 *   2. Oroboro's ops inbox (so they can attach it to the loan file)
 *   3. Our own admin inbox (audit / paper trail)
 *
 * Email failures are non-fatal — the webhook still returns 200 and the
 * PDF in the response. We log + report per-recipient status so the
 * webhook response includes a `delivery: {customer, oroboro, ours}`
 * breakdown.
 */

import { Resend } from "resend";
import type { CustomerWithRelations } from "@/lib/types";

const OUR_OPS_INBOX = "admin@creditspeed.in";

// Configurable so we can change without redeploy.
function fromAddress(): string {
  return (
    process.env.WARRANTY_EMAIL_FROM ||
    "Credit Speed <notifications@creditspeed.in>"
  );
}

function oroboroInbox(): string | null {
  // Set OROBORO_OPS_INBOX in env once Oroboro tells us their ops email.
  return process.env.OROBORO_OPS_INBOX || null;
}

function fmtINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);
}

export type SendResult = {
  /** Address we attempted to send to, or null if skipped. */
  to: string | null;
  /** Whether the send succeeded. */
  ok: boolean;
  /** Resend's message id (or null). */
  id?: string | null;
  /** Failure reason if !ok. */
  error?: string;
};

export type DeliveryReport = {
  customer: SendResult;
  oroboro: SendResult;
  ours: SendResult;
};

/**
 * Send the warranty PDF to all three recipients.
 * Returns per-recipient send status. Never throws — logs failures.
 */
export async function sendWarrantyEmails(opts: {
  customer: CustomerWithRelations;
  pdfBuffer: Buffer;
  pdfFilename: string;
}): Promise<DeliveryReport> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    const reason = "RESEND_API_KEY not configured";
    console.warn("[send-warranty]", reason);
    return {
      customer: { to: null, ok: false, error: reason },
      oroboro: { to: null, ok: false, error: reason },
      ours: { to: null, ok: false, error: reason },
    };
  }
  const resend = new Resend(apiKey);
  const from = fromAddress();
  const { customer, pdfBuffer, pdfFilename } = opts;

  // Shared attachment shape — Resend wants a base64 string or Buffer.
  const attachment = {
    filename: pdfFilename,
    content: pdfBuffer,
  };

  // 1. CUSTOMER
  const customerResult: SendResult = customer.email
    ? await send({
        resend,
        from,
        to: customer.email,
        subject: `Your Credit Speed Warranty — ${customer.brand ?? ""} ${customer.model ?? ""}`,
        html: customerEmailHtml(customer),
        attachment,
      })
    : { to: null, ok: false, error: "Customer has no email on file" };

  // 2. OROBORO OPS
  const oroAddress = oroboroInbox();
  const oroResult: SendResult = oroAddress
    ? await send({
        resend,
        from,
        to: oroAddress,
        subject: `Warranty PDF — Loan ${customer.external_loan_id ?? customer.customer_code}`,
        html: oroboroEmailHtml(customer),
        attachment,
      })
    : { to: null, ok: false, error: "OROBORO_OPS_INBOX not configured" };

  // 3. OUR OPS
  const oursResult: SendResult = await send({
    resend,
    from,
    to: OUR_OPS_INBOX,
    subject: `New warranty issued — ${customer.customer_code} (${customer.name})`,
    html: ourselvesEmailHtml(customer),
    attachment,
  });

  return {
    customer: customerResult,
    oroboro: oroResult,
    ours: oursResult,
  };
}

async function send({
  resend,
  from,
  to,
  subject,
  html,
  attachment,
}: {
  resend: Resend;
  from: string;
  to: string;
  subject: string;
  html: string;
  attachment: { filename: string; content: Buffer };
}): Promise<SendResult> {
  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      attachments: [
        {
          filename: attachment.filename,
          content: attachment.content,
        },
      ],
    });
    if (error) {
      console.warn("[send-warranty] failed:", to, error.message);
      return { to, ok: false, error: error.message };
    }
    return { to, ok: true, id: data?.id ?? null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[send-warranty] exception:", to, msg);
    return { to, ok: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────
//  Email body templates — plain, professional, mobile-friendly HTML
// ─────────────────────────────────────────────────────────────────────

function shared(customer: CustomerWithRelations): {
  amounts: string;
  device: string;
  dates: string;
} {
  return {
    device:
      `${customer.brand ?? ""} ${customer.model ?? ""}`.trim() || "Your device",
    amounts: `Rs. ${fmtINR(customer.total_amount)}`,
    dates: `${customer.warranty_start} → ${customer.warranty_end ?? "—"}`,
  };
}

function wrap(inner: string): string {
  return `<!doctype html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111827; line-height: 1.5;">
${inner}
<hr style="margin:32px 0 12px; border:0; border-top:1px solid #e5e7eb;" />
<p style="font-size:12px; color:#6b7280; margin:0;">
Credit Speed Microfinance Private Limited<br/>
admin@creditspeed.in &nbsp;·&nbsp; +91 88249 20949 &nbsp;·&nbsp; <a href="https://creditspeed.in" style="color:#C39236;">creditspeed.in</a>
</p>
</body></html>`;
}

function customerEmailHtml(customer: CustomerWithRelations): string {
  const { device, dates } = shared(customer);
  return wrap(`
    <h2 style="margin:0 0 8px; font-size:22px;">Your warranty is active ✅</h2>
    <p>Hi ${customer.name || "Customer"},</p>
    <p>Welcome to Credit Speed. Your <strong>${customer.plan?.name ?? "extended"}</strong> protection plan for your new <strong>${device}</strong> is now active.</p>
    <table style="border-collapse: collapse; margin: 18px 0; width:100%; font-size:14px;">
      <tr><td style="padding:6px 10px; background:#f3f4f6; font-weight:600;">Plan</td><td style="padding:6px 10px;">${customer.plan?.name ?? "—"}</td></tr>
      <tr><td style="padding:6px 10px; background:#f3f4f6; font-weight:600;">Coverage period</td><td style="padding:6px 10px;">${dates}</td></tr>
      <tr><td style="padding:6px 10px; background:#f3f4f6; font-weight:600;">Customer ID</td><td style="padding:6px 10px;"><code>${customer.customer_code}</code></td></tr>
      <tr><td style="padding:6px 10px; background:#f3f4f6; font-weight:600;">IMEI</td><td style="padding:6px 10px;"><code>${customer.imei_serial ?? "—"}</code></td></tr>
    </table>
    <p>Your full warranty document is attached as a PDF. Keep it safe — you'll need it for any service claim.</p>
    <p>To claim service, reply to this email or call <strong>+91 88249 20949</strong>.</p>
  `);
}

function oroboroEmailHtml(customer: CustomerWithRelations): string {
  const { device, amounts } = shared(customer);
  return wrap(`
    <h3 style="margin:0 0 8px; font-size:18px;">Warranty PDF for attachment</h3>
    <p>Auto-generated for loan <strong>${customer.external_loan_id ?? "—"}</strong>.</p>
    <table style="border-collapse: collapse; margin: 14px 0; font-size:13px; width:100%;">
      <tr><td style="padding:5px 8px; background:#f3f4f6; font-weight:600;">Customer code</td><td style="padding:5px 8px;"><code>${customer.customer_code}</code></td></tr>
      <tr><td style="padding:5px 8px; background:#f3f4f6; font-weight:600;">Customer</td><td style="padding:5px 8px;">${customer.name} · ${customer.mobile}</td></tr>
      <tr><td style="padding:5px 8px; background:#f3f4f6; font-weight:600;">Device</td><td style="padding:5px 8px;">${device}</td></tr>
      <tr><td style="padding:5px 8px; background:#f3f4f6; font-weight:600;">IMEI 1</td><td style="padding:5px 8px;"><code>${customer.imei_serial ?? "—"}</code></td></tr>
      <tr><td style="padding:5px 8px; background:#f3f4f6; font-weight:600;">Plan</td><td style="padding:5px 8px;">${customer.plan?.name ?? "—"} · ${amounts}</td></tr>
      <tr><td style="padding:5px 8px; background:#f3f4f6; font-weight:600;">Retailer</td><td style="padding:5px 8px;">${customer.retailer?.shop_name ?? "—"}</td></tr>
    </table>
    <p>Please attach the PDF to the loan agreement on your side. If you need this regenerated, retry the webhook with the same <code>external_loan_id</code>.</p>
  `);
}

function ourselvesEmailHtml(customer: CustomerWithRelations): string {
  const { device, amounts } = shared(customer);
  return wrap(`
    <h3 style="margin:0 0 8px; font-size:18px;">New warranty issued</h3>
    <p><strong>${customer.customer_code}</strong> · ${customer.name} · ${customer.mobile}</p>
    <p>Device: <strong>${device}</strong> · IMEI <code>${customer.imei_serial ?? "—"}</code></p>
    <p>Plan: <strong>${customer.plan?.name ?? "—"}</strong> · Total <strong>${amounts}</strong></p>
    <p>Retailer: <strong>${customer.retailer?.shop_name ?? "—"}</strong> (${customer.retailer?.retailer_code ?? "no code"})</p>
    <p>Oroboro loan id: <code>${customer.external_loan_id ?? "n/a"}</code></p>
    <p>Full record: <a href="https://admin.creditspeed.in/customers" style="color:#C39236;">view in portal →</a></p>
  `);
}
