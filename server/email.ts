import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { env } from "./env";

type EmailCategory =
  | "subscription_confirmation"
  | "application_confirmation"
  | "application_status_update"
  | "contact_acknowledgement"
  | "admin_notification"
  | "newsletter";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
  category: EmailCategory;
  metadata?: Record<string, unknown>;
};

type EmailJob = EmailPayload & {
  id: string;
  status: "queued" | "processing" | "sent" | "failed";
  attempts: number;
  queuedAt: string;
  lastError?: string;
};

const dataDir = path.resolve(import.meta.dirname, "..", "data");
const emailLogPath = path.join(dataDir, "email-events.jsonl");
const queue: EmailJob[] = [];
const sentTimestamps: number[] = [];
let isProcessing = false;

fs.mkdirSync(dataDir, { recursive: true });

const fromAddress = env.EMAIL_FROM || "Mtendere Education Consult <no-reply@mtendere.local>";
const maxAttempts = 3;
const maxEmailsPerMinute = 60;

const escapeHtml = (value: string | null | undefined) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const appendEmailEvent = (event: Record<string, unknown>) => {
  fs.appendFileSync(emailLogPath, `${JSON.stringify({ ...event, at: new Date().toISOString() })}\n`);
};

const canSendNow = () => {
  const now = Date.now();
  while (sentTimestamps.length > 0 && now - sentTimestamps[0] > 60_000) {
    sentTimestamps.shift();
  }
  return sentTimestamps.length < maxEmailsPerMinute;
};

const deliverEmail = async (job: EmailJob) => {
  if (env.EMAIL_API_URL) {
    const response = await fetch(env.EMAIL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.EMAIL_API_KEY ? { Authorization: `Bearer ${env.EMAIL_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        from: fromAddress,
        to: job.to,
        subject: job.subject,
        html: job.html,
        text: job.text,
        category: job.category,
        metadata: job.metadata,
      }),
    });

    if (!response.ok) {
      throw new Error(`Email API returned ${response.status}`);
    }
  } else {
    console.info(`[email:${job.category}] ${job.subject} -> ${job.to}`);
  }

  sentTimestamps.push(Date.now());
};

const processEmailQueue = async () => {
  if (isProcessing) return;
  isProcessing = true;

  try {
    while (queue.length > 0) {
      if (!canSendNow()) {
        setTimeout(() => void processEmailQueue(), 5_000);
        return;
      }

      const job = queue.shift();
      if (!job) continue;

      job.status = "processing";
      job.attempts += 1;
      appendEmailEvent({ id: job.id, status: "processing", category: job.category, to: job.to });

      try {
        await deliverEmail(job);
        job.status = "sent";
        appendEmailEvent({ id: job.id, status: "sent", category: job.category, to: job.to });
      } catch (error) {
        job.status = "failed";
        job.lastError = error instanceof Error ? error.message : "Unknown email delivery error";
        appendEmailEvent({
          id: job.id,
          status: "failed",
          category: job.category,
          to: job.to,
          attempts: job.attempts,
          error: job.lastError,
        });

        if (job.attempts < maxAttempts) {
          queue.push(job);
        }
      }
    }
  } finally {
    isProcessing = false;
  }
};

export const enqueueEmail = (payload: EmailPayload) => {
  const job: EmailJob = {
    ...payload,
    id: randomUUID(),
    status: "queued",
    attempts: 0,
    queuedAt: new Date().toISOString(),
  };

  queue.push(job);
  appendEmailEvent({ id: job.id, status: "queued", category: job.category, to: job.to });
  void processEmailQueue();
  return { id: job.id, status: job.status };
};

const ctaButton = (href: string, label: string) => `
  <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
    <tr>
      <td style="border-radius: 8px; background: #f97316;">
        <a href="${href}" style="display: inline-block; padding: 13px 20px; color: #ffffff; font-weight: 700; text-decoration: none; font-family: Arial, sans-serif;">
          ${label}
        </a>
      </td>
    </tr>
  </table>
`;

export const renderMtendereEmail = ({
  title,
  preheader,
  body,
  cta,
}: {
  title: string;
  preheader: string;
  body: string;
  cta?: { href: string; label: string };
}) => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0; padding:0; background:#f5f7fb;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fb; padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb;">
            <tr>
              <td style="background:#0f4c81; padding:28px 32px; color:#ffffff; font-family:Arial, sans-serif;">
                <div style="font-size:13px; letter-spacing:1.8px; text-transform:uppercase; color:#bfdbfe; font-weight:700;">Mtendere Education Consult</div>
                <h1 style="margin:10px 0 0; font-size:28px; line-height:1.2; color:#ffffff;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px; color:#1f2937; font-family:Arial, sans-serif; font-size:16px; line-height:1.7;">
                ${body}
                ${cta ? ctaButton(cta.href, cta.label) : ""}
              </td>
            </tr>
            <tr>
              <td style="background:#0b2f4f; padding:24px 32px; color:#dbeafe; font-family:Arial, sans-serif; font-size:13px; line-height:1.6;">
                <strong style="color:#ffffff;">Mtendere Education Consult</strong><br>
                Lilongwe, Malawi<br>
                mtendereeducation@gmail.com | +265 999 360 325<br>
                Monday - Friday: 8:00 AM - 5:00 PM | Saturday: 9:00 AM - 1:00 PM<br>
                <span style="color:#93c5fd;">Scholarships | Study abroad | Career support | Jobs</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

export const sendSubscriptionConfirmation = (input: {
  email: string;
  name?: string | null;
  verificationUrl: string;
  unsubscribeUrl: string;
}) =>
  enqueueEmail({
    to: input.email,
    subject: "Confirm your Mtendere updates subscription",
    category: "subscription_confirmation",
    text: `Confirm your subscription: ${input.verificationUrl}\nUnsubscribe: ${input.unsubscribeUrl}`,
    html: renderMtendereEmail({
      title: "Confirm your subscription",
      preheader: "Please confirm that you want to receive Mtendere opportunities and updates.",
      body: `
        <p>Hello ${escapeHtml(input.name || "there")},</p>
        <p>Thanks for subscribing to Mtendere updates. Please confirm your email so we can send scholarship, career, study abroad, and education opportunity alerts to the right inbox.</p>
        <p>If you did not request this, you can ignore this email or use the unsubscribe link below.</p>
        <p style="font-size:13px; color:#6b7280;">Unsubscribe link: <a href="${input.unsubscribeUrl}" style="color:#0f4c81;">${input.unsubscribeUrl}</a></p>
      `,
      cta: { href: input.verificationUrl, label: "Confirm subscription" },
    }),
    metadata: { flow: "double_opt_in" },
  });

export const sendApplicationConfirmation = (input: {
  email: string;
  name?: string | null;
  opportunityTitle: string;
  opportunityType: string;
  dashboardUrl: string;
}) =>
  enqueueEmail({
    to: input.email,
    subject: `Application received: ${input.opportunityTitle}`,
    category: "application_confirmation",
    text: `We received your ${input.opportunityType} application for ${input.opportunityTitle}. Track it here: ${input.dashboardUrl}`,
    html: renderMtendereEmail({
      title: "Application received",
      preheader: `Your ${input.opportunityType} application has been received.`,
      body: `
        <p>Hello ${escapeHtml(input.name || "there")},</p>
        <p>We received your application for <strong>${escapeHtml(input.opportunityTitle)}</strong>.</p>
        <p>Your submission is now in the Mtendere dashboard, where our team can review the opportunity, documents, notes, and next-step readiness.</p>
        <p>You will receive updates as your application moves through review.</p>
      `,
      cta: { href: input.dashboardUrl, label: "View application status" },
    }),
    metadata: { opportunityType: input.opportunityType, opportunityTitle: input.opportunityTitle },
  });

export const sendApplicationStatusUpdate = (input: {
  email: string;
  name?: string | null;
  opportunityTitle: string;
  opportunityType: string;
  status: string;
  reviewNotes?: string | null;
  dashboardUrl: string;
}) => {
  const readableStatus = input.status.replace(/_/g, " ");

  return enqueueEmail({
    to: input.email,
    subject: `Application update: ${input.opportunityTitle}`,
    category: "application_status_update",
    text: `Your ${input.opportunityType} application for ${input.opportunityTitle} is now ${readableStatus}. Track it here: ${input.dashboardUrl}`,
    html: renderMtendereEmail({
      title: "Application status updated",
      preheader: `Your application is now ${readableStatus}.`,
      body: `
        <p>Hello ${escapeHtml(input.name || "there")},</p>
        <p>Your ${escapeHtml(input.opportunityType)} application for <strong>${escapeHtml(input.opportunityTitle)}</strong> is now <strong style="text-transform: capitalize;">${escapeHtml(readableStatus)}</strong>.</p>
        ${
          input.reviewNotes
            ? `<p><strong>Review note:</strong> ${escapeHtml(input.reviewNotes)}</p>`
            : "<p>The Mtendere team will keep your dashboard updated as the next step becomes available.</p>"
        }
      `,
      cta: { href: input.dashboardUrl, label: "View application status" },
    }),
    metadata: {
      opportunityType: input.opportunityType,
      opportunityTitle: input.opportunityTitle,
      status: input.status,
    },
  });
};

export const sendContactAcknowledgement = (input: {
  email: string;
  name: string;
  subject?: string | null;
}) =>
  enqueueEmail({
    to: input.email,
    subject: "We received your Mtendere message",
    category: "contact_acknowledgement",
    text: `Hello ${input.name}, we received your message${input.subject ? ` about ${input.subject}` : ""}.`,
    html: renderMtendereEmail({
      title: "We received your message",
      preheader: "The Mtendere team will respond as soon as possible.",
      body: `
        <p>Hello ${escapeHtml(input.name)},</p>
        <p>Thank you for contacting Mtendere Education Consult${input.subject ? ` about <strong>${escapeHtml(input.subject)}</strong>` : ""}.</p>
        <p>Our team will review your message and respond with the right next step.</p>
      `,
      cta: { href: `${env.PUBLIC_APP_URL || ""}/contact`, label: "Visit contact page" },
    }),
    metadata: { subject: input.subject },
  });

export const sendAdminNotification = (input: {
  subject: string;
  message: string;
  metadata?: Record<string, unknown>;
}) => {
  const to = env.ADMIN_NOTIFICATION_EMAIL || env.EMAIL_FROM;
  if (!to) return null;

  return enqueueEmail({
    to,
    subject: input.subject,
    category: "admin_notification",
    text: input.message,
    html: renderMtendereEmail({
      title: input.subject,
      preheader: "Administrative platform notification.",
      body: `<p>${escapeHtml(input.message)}</p>`,
    }),
    metadata: input.metadata,
  });
};
