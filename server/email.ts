import fs from "fs";
import path from "path";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "crypto";
import { resolveCname, resolveTxt } from "dns/promises";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { env } from "./env";
import { resolveWritableRuntimePath } from "./runtime-paths";
import { storage } from "./storage";
import type { EmailJob } from "@shared/schema";

export type EmailCategory =
  | "account_verification"
  | "welcome"
  | "account_activated"
  | "password_reset"
  | "password_changed"
  | "security_alert"
  | "login_alert"
  | "profile_updated"
  | "new_role_assigned"
  | "permission_changed"
  | "account_suspended"
  | "account_reactivated"
  | "subscription_confirmation"
  | "payment_confirmation"
  | "payment_failed"
  | "invoice_generated"
  | "application_confirmation"
  | "application_status_update"
  | "application_submitted"
  | "application_under_review"
  | "application_approved"
  | "application_rejected"
  | "additional_documents_requested"
  | "event_registration_confirmation"
  | "event_registration_status_update"
  | "partner_onboarding"
  | "contact_acknowledgement"
  | "admin_notification"
  | "newsletter"
  | "scholarship_alert"
  | "scholarship_recommended"
  | "scholarship_deadline_reminder"
  | "scholarship_application_started"
  | "scholarship_application_reminder"
  | "scholarship_application_submitted"
  | "scholarship_application_outcome"
  | "jobs"
  | "news"
  | "events"
  | "blog_updates"
  | "partner_updates"
  | "marketing";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
  category: EmailCategory;
  metadata?: Record<string, unknown>;
  headers?: Record<string, string>;
  priority?: number;
};

type StoredEmailPayload = EmailPayload & {
  from: string;
};

type ProviderResult = {
  provider: string;
  messageId?: string | null;
};

type Provider = {
  name: string;
  isConfigured: () => boolean;
  send: (message: DeliverableEmail) => Promise<ProviderResult>;
};

type DeliverableEmail = {
  id: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  category: EmailCategory;
  metadata: Record<string, unknown>;
  headers: Record<string, string>;
};

const dataDir = resolveWritableRuntimePath("data");
const emailLogPath = path.join(dataDir, "email-events.jsonl");
fs.mkdirSync(dataDir, { recursive: true });

const fromAddress = env.EMAIL_FROM || "Mtendere Education Consult <no-reply@mtendereeducationconsult.com>";
const publicAppUrl = (env.PUBLIC_APP_URL || env.FRONTEND_URL || env.VITE_SITE_URL || "").replace(/\/+$/, "");
const apiAppUrl = (env.API_APP_URL || env.PUBLIC_APP_URL || env.VITE_API_URL || "").replace(/\/+$/, "");
const emailBaseUrl = apiAppUrl || publicAppUrl;
const emailLinkBaseUrl = (env.EMAIL_LINK_BASE_URL || "").replace(/\/+$/, "");
const isUsableSecret = (value?: string) =>
  Boolean(
    value &&
      !/^(your_|replace-|changeme|change-me|example|test|dummy|placeholder)/i.test(value.trim()),
  );
const isSendGridApiKey = (value?: string) => isUsableSecret(value) && /^SG\./.test(String(value).trim());
const isUsableSmtpHost = (value?: string) => {
  const host = value?.trim().toLowerCase();
  if (!host) return false;
  return !/(^|\.)example\.(com|net|org|test)$/.test(host) && !/(placeholder|changeme|dummy)/.test(host);
};
const sendGridApiKey = isSendGridApiKey(env.SENDGRID_API_KEY)
  ? env.SENDGRID_API_KEY
  : (env.SMTP_USER || "").toLowerCase() === "apikey" && isSendGridApiKey(env.SMTP_PASSWORD)
    ? env.SMTP_PASSWORD
    : undefined;
const smtpPort = Number.parseInt(env.SMTP_PORT || "", 10);
const smtpConfigured = Boolean(
  isUsableSmtpHost(env.SMTP_HOST) && isUsableSecret(env.SMTP_USER) && isUsableSecret(env.SMTP_PASSWORD),
);
const sendGridTrackingEnabled = env.SENDGRID_TRACKING_ENABLED ?? true;
const retryDelaysMs = [0, 60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000];
const defaultMaxAttempts = retryDelaysMs.length;
const inlineProviderAttempts = env.EMAIL_PROVIDER_INLINE_RETRIES;
const providerRateLimitRetryDelayMs = 1_250;
const queuePollMs = env.EMAIL_QUEUE_WORKER_INTERVAL_MS;
const isVercelProductionRuntime = process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production";
const isLiveDeliveryRuntime = env.NODE_ENV === "production" || isVercelProductionRuntime;
const liveProviderDeliveryAllowed = isLiveDeliveryRuntime || env.EMAIL_ALLOW_LIVE_TEST_SENDS === true;
const configuredDryRunEnabled = env.EMAIL_DRY_RUN ?? !isLiveDeliveryRuntime;
const dryRunEnabled = configuredDryRunEnabled || !liveProviderDeliveryAllowed;
const activationRequiresDnsReady = env.EMAIL_ACTIVATION_REQUIRES_DNS_READY ?? isLiveDeliveryRuntime;
const trackingSecret = env.EMAIL_TRACKING_SECRET || env.JWT_SECRET;
let isProcessing = false;
let workerTimer: NodeJS.Timeout | null = null;
let workerStartedAt: Date | null = null;
let queueLastRunStartedAt: Date | null = null;
let queueLastRunFinishedAt: Date | null = null;
let queueLastRunError: string | null = null;
let activationReadinessCache:
  | { checkedAt: number; value: TransactionalEmailActivationReadiness }
  | null = null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isProviderRateLimitError = (message: string) =>
  /\b429\b|rate[_ -]?limit|too many requests/i.test(message);
const getInlineProviderRetryDelayMs = (message: string) =>
  isProviderRateLimitError(message) ? providerRateLimitRetryDelayMs : 0;

type EmailEnqueueOptions = {
  awaitDelivery?: boolean;
};

type DeliverabilityCheck = {
  name: string;
  host: string;
  type: "CNAME" | "TXT";
  expected: string;
  actual: string[];
  status: "pass" | "warn" | "fail";
  message: string;
};

type EmailEnqueueResult = {
  id: string;
  status: string;
  error?: string;
  provider?: string | null;
  providerMessageId?: string | null;
  lastError?: string | null;
};

type TransactionalEmailActivationReadiness = {
  ready: boolean;
  providerReady: boolean;
  dnsReady: boolean | null;
  checkedAt: string;
  diagnostics: ReturnType<typeof getEmailDeliveryDiagnostics>;
  deliverability?: Awaited<ReturnType<typeof getEmailDeliverabilityDiagnostics>>;
  blockingReasons: Array<{ code: string; message: string }>;
};

const emailPreferenceCategories = [
  "scholarships",
  "jobs",
  "news",
  "events",
  "blog_updates",
  "partner_updates",
  "marketing",
] as const;

const commercialCategories = new Set<EmailCategory>([
  "newsletter",
  "scholarship_alert",
  "scholarship_recommended",
  "scholarship_deadline_reminder",
  "scholarship_application_started",
  "scholarship_application_reminder",
  "scholarship_application_submitted",
  "scholarship_application_outcome",
  "jobs",
  "news",
  "events",
  "blog_updates",
  "partner_updates",
  "marketing",
]);

const categoryPreferenceMap: Partial<Record<EmailCategory, (typeof emailPreferenceCategories)[number]>> = {
  newsletter: "news",
  scholarship_alert: "scholarships",
  scholarship_recommended: "scholarships",
  scholarship_deadline_reminder: "scholarships",
  scholarship_application_started: "scholarships",
  scholarship_application_reminder: "scholarships",
  scholarship_application_submitted: "scholarships",
  scholarship_application_outcome: "scholarships",
  jobs: "jobs",
  news: "news",
  events: "events",
  blog_updates: "blog_updates",
  partner_updates: "partner_updates",
  marketing: "marketing",
};

export const emailTemplateCatalog = [
  { key: "auth.welcome", category: "Authentication", name: "Welcome Email" },
  { key: "auth.verify", category: "Authentication", name: "Email Verification" },
  { key: "auth.activated", category: "Authentication", name: "Account Activated" },
  { key: "auth.password-reset", category: "Authentication", name: "Password Reset" },
  { key: "auth.password-changed", category: "Authentication", name: "Password Changed" },
  { key: "auth.security-alert", category: "Authentication", name: "Security Alert" },
  { key: "auth.login-alert", category: "Authentication", name: "Login Alert" },
  { key: "user.profile-updated", category: "User Management", name: "Profile Updated" },
  { key: "user.role-assigned", category: "User Management", name: "New Role Assigned" },
  { key: "user.permission-changed", category: "User Management", name: "Permission Changed" },
  { key: "payments.confirmation", category: "Payments", name: "Payment Confirmation" },
  { key: "payments.failed", category: "Payments", name: "Payment Failed" },
  { key: "payments.invoice-generated", category: "Payments", name: "Invoice Generated" },
  { key: "user.suspended", category: "User Management", name: "Account Suspended" },
  { key: "user.reactivated", category: "User Management", name: "Account Reactivated" },
  { key: "applications.submitted", category: "Applications", name: "Application Submitted" },
  { key: "applications.under-review", category: "Applications", name: "Application Under Review" },
  { key: "applications.approved", category: "Applications", name: "Application Approved" },
  { key: "applications.rejected", category: "Applications", name: "Application Rejected" },
  { key: "applications.documents-requested", category: "Applications", name: "Additional Documents Requested" },
  { key: "scholarships.available", category: "Scholarships", name: "Scholarship Available" },
  { key: "scholarships.recommended", category: "Scholarships", name: "Scholarship Recommended" },
  { key: "scholarships.started", category: "Scholarships", name: "Application Started" },
  { key: "scholarships.reminder", category: "Scholarships", name: "Application Reminder" },
  { key: "scholarships.deadline", category: "Scholarships", name: "Deadline Reminder" },
  { key: "scholarships.submitted", category: "Scholarships", name: "Application Submitted" },
  { key: "scholarships.outcome", category: "Scholarships", name: "Application Outcome" },
  { key: "subscriptions.confirm", category: "Subscriptions", name: "Double Opt-In Confirmation" },
  { key: "campaign.newsletter", category: "Campaigns", name: "Newsletter Campaign" },
  { key: "campaign.jobs", category: "Campaigns", name: "Jobs Alert" },
  { key: "campaign.events", category: "Campaigns", name: "Events Alert" },
  { key: "campaign.partner", category: "Campaigns", name: "Partner Update" },
];

const appendEmailEvent = (event: Record<string, unknown>) => {
  fs.appendFileSync(emailLogPath, `${JSON.stringify({ ...event, at: new Date().toISOString() })}\n`);
};

const escapeHtml = (value: string | number | null | undefined) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const sha256Hex = (value: string) => createHash("sha256").update(value).digest("hex");

const hmacHex = (value: string, secret = trackingSecret) =>
  createHmac("sha256", secret).update(value).digest("hex");

const safeCompare = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

export const createEmailTokenHash = (token: string) => hmacHex(`email-token:${token}`);

export const createEmailPreferenceToken = (email: string) =>
  jwt.sign(
    {
      type: "email_preferences",
      email: normalizeEmail(email),
    },
    trackingSecret,
    { noTimestamp: true },
  );

export const createEmailPreferenceTokenHash = (token: string) =>
  hmacHex(`email-preference:${token}`);

export const verifyEmailPreferenceToken = (token: string) => {
  const decoded = jwt.verify(token, trackingSecret) as { type?: string; email?: string };
  if (decoded.type !== "email_preferences" || !decoded.email) {
    throw new Error("Invalid email preference token");
  }
  return { email: normalizeEmail(decoded.email) };
};

export const signEmailTrackingValue = (value: string) => hmacHex(`email-track:${value}`);

export const verifyEmailTrackingSignature = (value: string, signature?: string | null) =>
  Boolean(signature && safeCompare(signEmailTrackingValue(value), signature));

const getPreferenceUrl = (email: string) =>
  emailBaseUrl ? `${emailBaseUrl}/api/email/preferences/${encodeURIComponent(createEmailPreferenceToken(email))}` : "";

const getUnsubscribeUrl = (email: string) =>
  emailBaseUrl ? `${emailBaseUrl}/api/email/unsubscribe/${encodeURIComponent(createEmailPreferenceToken(email))}` : "";

const defaultEmailPreferences = () =>
  Object.fromEntries(emailPreferenceCategories.map((category) => [category, true])) as Record<string, boolean>;

const ensureEmailPreference = async (
  email: string,
  category: EmailCategory,
  metadata?: Record<string, unknown>,
) => {
  const normalizedEmail = normalizeEmail(email);
  const token = createEmailPreferenceToken(normalizedEmail);
  const tokenHash = createEmailPreferenceTokenHash(token);
  const existing = await storage.getEmailPreferenceByEmail(normalizedEmail);

  if (existing) {
    return existing;
  }

  return storage.upsertEmailPreference({
    userId: typeof metadata?.userId === "number" ? metadata.userId : null,
    email: normalizedEmail,
    categories: defaultEmailPreferences(),
    consentStatus: commercialCategories.has(category) ? "pending" : "transactional",
    consentSource: String(metadata?.source || "system"),
    consentAt: commercialCategories.has(category) ? null : new Date(),
    unsubscribedAt: null,
    unsubscribeTokenHash: tokenHash,
    auditTrail: [
      {
        action: "created",
        source: metadata?.source || "system",
        category,
        at: new Date().toISOString(),
      },
    ],
  });
};

const shouldSuppressForPreferences = async (payload: EmailPayload) => {
  if (!commercialCategories.has(payload.category)) return false;

  const preference = await ensureEmailPreference(payload.to, payload.category, payload.metadata);
  const mappedPreference = categoryPreferenceMap[payload.category];
  if (!mappedPreference) return Boolean(preference.unsubscribedAt);

  return Boolean(preference.unsubscribedAt || preference.categories?.[mappedPreference] === false);
};

const parseAddress = (value: string) => {
  const match = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (!match) return { email: value.trim(), name: undefined as string | undefined };
  return {
    name: match[1].replace(/^"|"$/g, "").trim() || undefined,
    email: match[2].trim(),
  };
};

const responseError = async (response: Response) => {
  const text = await response.text().catch(() => "");
  return `${response.status} ${response.statusText}${text ? `: ${text.slice(0, 500)}` : ""}`;
};

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs = 15_000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Email provider request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const sendWithResend: Provider["send"] = async (message) => {
  const response = await fetchWithTimeout("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: message.from,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
      headers: {
        ...message.headers,
        "X-MEC-Email-Job": message.id,
        "X-MEC-Email-Category": message.category,
      },
      tags: [
        { name: "category", value: message.category },
        { name: "job_id", value: message.id },
      ],
    }),
  });

  if (!response.ok) throw new Error(await responseError(response));
  const data = (await response.json().catch(() => ({}))) as { id?: string };
  return { provider: "resend", messageId: data.id || response.headers.get("x-message-id") };
};

const sendWithSendGrid: Provider["send"] = async (message) => {
  const from = parseAddress(message.from);
  const response = await fetchWithTimeout("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sendGridApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: message.to }],
          custom_args: {
            mec_email_job_id: message.id,
            mec_email_category: message.category,
          },
        },
      ],
      from,
      subject: message.subject,
      content: [
        { type: "text/plain", value: message.text },
        { type: "text/html", value: message.html },
      ],
      tracking_settings: {
        click_tracking: { enable: sendGridTrackingEnabled, enable_text: sendGridTrackingEnabled },
        open_tracking: { enable: sendGridTrackingEnabled },
      },
      headers: {
        ...message.headers,
        "X-MEC-Email-Job": message.id,
        "X-MEC-Email-Category": message.category,
      },
    }),
  });

  if (!response.ok) throw new Error(await responseError(response));
  return { provider: "sendgrid", messageId: response.headers.get("x-message-id") };
};

const sendWithPostmark: Provider["send"] = async (message) => {
  const response = await fetchWithTimeout("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": String(env.POSTMARK_SERVER_TOKEN),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      From: message.from,
      To: message.to,
      Subject: message.subject,
      HtmlBody: message.html,
      TextBody: message.text,
      MessageStream: env.POSTMARK_MESSAGE_STREAM || "outbound",
      Tag: message.category,
      Metadata: {
        mec_email_job_id: message.id,
        mec_email_category: message.category,
      },
      Headers: Object.entries(message.headers).map(([Name, Value]) => ({ Name, Value })),
      TrackOpens: false,
      TrackLinks: "None",
    }),
  });

  if (!response.ok) throw new Error(await responseError(response));
  const data = (await response.json().catch(() => ({}))) as { MessageID?: string };
  return { provider: "postmark", messageId: data.MessageID || null };
};

const sendWithMailgun: Provider["send"] = async (message) => {
  const baseUrl = (env.MAILGUN_BASE_URL || "https://api.mailgun.net").replace(/\/+$/, "");
  const domain = String(env.MAILGUN_DOMAIN);
  const body = new FormData();
  body.set("from", message.from);
  body.set("to", message.to);
  body.set("subject", message.subject);
  body.set("text", message.text);
  body.set("html", message.html);
  body.set("o:tag", message.category);
  body.set("v:mec_email_job_id", message.id);
  body.set("v:mec_email_category", message.category);
  for (const [key, value] of Object.entries(message.headers)) {
    body.set(`h:${key}`, value);
  }

  const response = await fetchWithTimeout(`${baseUrl}/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${env.MAILGUN_API_KEY}`).toString("base64")}`,
    },
    body,
  });

  if (!response.ok) throw new Error(await responseError(response));
  const data = (await response.json().catch(() => ({}))) as { id?: string };
  return { provider: "mailgun", messageId: data.id || response.headers.get("x-message-id") };
};

const getAwsSigningKey = (secret: string, dateStamp: string, region: string, service: string) => {
  const kDate = createHmac("sha256", `AWS4${secret}`).update(dateStamp).digest();
  const kRegion = createHmac("sha256", kDate).update(region).digest();
  const kService = createHmac("sha256", kRegion).update(service).digest();
  return createHmac("sha256", kService).update("aws4_request").digest();
};

const sendWithSes: Provider["send"] = async (message) => {
  const region = env.AWS_SES_REGION || "us-east-1";
  const host = `email.${region}.amazonaws.com`;
  const endpoint = `https://${host}/v2/email/outbound-emails`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const body = JSON.stringify({
    FromEmailAddress: message.from,
    Destination: { ToAddresses: [message.to] },
    Content: {
      Simple: {
        Subject: { Data: message.subject, Charset: "UTF-8" },
        Body: {
          Text: { Data: message.text, Charset: "UTF-8" },
          Html: { Data: message.html, Charset: "UTF-8" },
        },
      },
    },
    ConfigurationSetName: env.AWS_SES_CONFIGURATION_SET || undefined,
    EmailTags: [
      { Name: "mec_email_job_id", Value: message.id },
      { Name: "mec_email_category", Value: message.category },
    ],
  });
  const payloadHash = sha256Hex(body);
  const credentialScope = `${dateStamp}/${region}/ses/aws4_request`;
  const canonicalHeaders = [
    "content-type:application/json",
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join("\n");
  const canonicalRequest = [
    "POST",
    "/v2/email/outbound-emails",
    "",
    `${canonicalHeaders}\n`,
    "content-type;host;x-amz-content-sha256;x-amz-date",
    payloadHash,
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = getAwsSigningKey(String(env.AWS_SES_SECRET_ACCESS_KEY), dateStamp, region, "ses");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${env.AWS_SES_ACCESS_KEY_ID}/${credentialScope}`,
    "SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date",
    `Signature=${signature}`,
  ].join(", ");

  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
      "X-Amz-Content-Sha256": payloadHash,
      "X-Amz-Date": amzDate,
    },
    body,
  });

  if (!response.ok) throw new Error(await responseError(response));
  const data = (await response.json().catch(() => ({}))) as { MessageId?: string };
  return { provider: "ses", messageId: data.MessageId || null };
};

const sendWithSmtp: Provider["send"] = async (message) => {
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number.isFinite(smtpPort) ? smtpPort : 587,
    secure: Number.isFinite(smtpPort) ? smtpPort === 465 : false,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  });

  const info = await transporter.sendMail({
    from: message.from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    headers: {
      ...message.headers,
      "X-MEC-Email-Job": message.id,
      "X-MEC-Email-Category": message.category,
    },
  });

  return { provider: "smtp", messageId: info.messageId || null };
};

const sendWithCustomApi: Provider["send"] = async (message) => {
  const response = await fetchWithTimeout(String(env.EMAIL_API_URL), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(env.EMAIL_API_KEY ? { Authorization: `Bearer ${env.EMAIL_API_KEY}` } : {}),
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) throw new Error(await responseError(response));
  const data = (await response.json().catch(() => ({}))) as { id?: string; messageId?: string };
  return { provider: "custom", messageId: data.messageId || data.id || null };
};

const providers: Record<string, Provider> = {
  resend: {
    name: "resend",
    isConfigured: () => isUsableSecret(env.RESEND_API_KEY),
    send: sendWithResend,
  },
  sendgrid: {
    name: "sendgrid",
    isConfigured: () => Boolean(sendGridApiKey),
    send: sendWithSendGrid,
  },
  postmark: {
    name: "postmark",
    isConfigured: () => isUsableSecret(env.POSTMARK_SERVER_TOKEN),
    send: sendWithPostmark,
  },
  mailgun: {
    name: "mailgun",
    isConfigured: () => Boolean(isUsableSecret(env.MAILGUN_API_KEY) && env.MAILGUN_DOMAIN),
    send: sendWithMailgun,
  },
  ses: {
    name: "ses",
    isConfigured: () =>
      Boolean(
        isUsableSecret(env.AWS_SES_ACCESS_KEY_ID) &&
          isUsableSecret(env.AWS_SES_SECRET_ACCESS_KEY) &&
          env.AWS_SES_REGION,
      ),
    send: sendWithSes,
  },
  smtp: {
    name: "smtp",
    isConfigured: () => smtpConfigured,
    send: sendWithSmtp,
  },
  custom: {
    name: "custom",
    isConfigured: () => Boolean(env.EMAIL_API_URL),
    send: sendWithCustomApi,
  },
  dry_run: {
    name: "dry_run",
    isConfigured: () => dryRunEnabled,
    send: async (message) => {
      console.info(`[email:${message.category}] ${message.subject} -> ${message.to}`);
      return { provider: "dry_run", messageId: `dry-run-${message.id}` };
    },
  },
};

const getProviderOrder = () => {
  if (dryRunEnabled) return [providers.dry_run];

  const configuredOrder = (env.EMAIL_PROVIDER_ORDER || "sendgrid,ses,mailgun,resend,postmark,smtp,custom")
    .split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean);
  const uniqueOrder = Array.from(new Set([...configuredOrder, "smtp", "custom"]));
  const activeProviders = uniqueOrder
    .map((providerName) => providers[providerName])
    .filter((provider): provider is Provider => Boolean(provider?.isConfigured()));

  return activeProviders;
};

export const isTransactionalEmailDeliveryReady = () => {
  const activeProviders = getProviderOrder().map((provider) => provider.name);
  return activeProviders.some((provider) => provider !== "dry_run") || !isLiveDeliveryRuntime;
};

export const getEmailDeliveryDiagnostics = () => {
  const activeProviders = getProviderOrder().map((provider) => provider.name);
  return {
    ready: activeProviders.some((provider) => provider !== "dry_run"),
    activeProviders,
    dryRunEnabled,
    liveProviderDeliveryAllowed,
    configuredDryRunEnabled,
    activationRequiresDnsReady,
    inlineProviderAttempts,
    fromConfigured: Boolean(env.EMAIL_FROM),
    linkBaseUrlConfigured: Boolean(emailLinkBaseUrl),
    sendGridTrackingEnabled,
    providerConfigured: {
      resend: isUsableSecret(env.RESEND_API_KEY),
      sendgrid: Boolean(sendGridApiKey),
      sendgridSmtpFallback: Boolean(sendGridApiKey && !env.SENDGRID_API_KEY),
      postmark: isUsableSecret(env.POSTMARK_SERVER_TOKEN),
      mailgun: Boolean(isUsableSecret(env.MAILGUN_API_KEY) && env.MAILGUN_DOMAIN),
      ses: Boolean(
        isUsableSecret(env.AWS_SES_ACCESS_KEY_ID) &&
          isUsableSecret(env.AWS_SES_SECRET_ACCESS_KEY) &&
          env.AWS_SES_REGION,
      ),
      smtp: smtpConfigured,
      custom: Boolean(env.EMAIL_API_URL),
    },
  };
};

const mtendereEmailDomain = "mtendereeducationconsult.com";
const sendingSubdomains = [
  "notifications",
  "support",
  "admissions",
  "billing",
  "marketing",
].map((subdomain) => `${subdomain}.${mtendereEmailDomain}`);

const normalizeDnsValue = (value: string) =>
  value
    .trim()
    .replace(/\.$/, "")
    .toLowerCase();

const flattenTxtRecords = (records: string[][]) =>
  records.map((record) => record.join(""));

const dnsWithTimeout = async <T>(lookup: Promise<T>, timeoutMs: number): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      lookup,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`DNS lookup timed out after ${timeoutMs}ms`)), timeoutMs);
        timer.unref?.();
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const cnameCheck = async (
  host: string,
  expected: string,
  timeoutMs: number,
): Promise<DeliverabilityCheck> => {
  try {
    const records = await dnsWithTimeout(resolveCname(host), timeoutMs);
    const actual = records.map(normalizeDnsValue);
    const normalizedExpected = normalizeDnsValue(expected);
    const passed = actual.includes(normalizedExpected);
    return {
      name: host,
      host,
      type: "CNAME",
      expected,
      actual,
      status: passed ? "pass" : "fail",
      message: passed
        ? "CNAME is aligned."
        : `Expected ${host} to point to ${expected}.`,
    };
  } catch (error) {
    return {
      name: host,
      host,
      type: "CNAME",
      expected,
      actual: [],
      status: "fail",
      message: error instanceof Error ? error.message : "CNAME lookup failed.",
    };
  }
};

const txtCheck = async (
  host: string,
  expected: string,
  timeoutMs: number,
  validator: (records: string[]) => boolean,
  warnOnly = false,
): Promise<DeliverabilityCheck> => {
  try {
    const actual = flattenTxtRecords(await dnsWithTimeout(resolveTxt(host), timeoutMs));
    const passed = validator(actual);
    return {
      name: host,
      host,
      type: "TXT",
      expected,
      actual,
      status: passed ? "pass" : warnOnly ? "warn" : "fail",
      message: passed
        ? "TXT record is aligned."
        : `Expected ${host} to include ${expected}.`,
    };
  } catch (error) {
    return {
      name: host,
      host,
      type: "TXT",
      expected,
      actual: [],
      status: warnOnly ? "warn" : "fail",
      message: error instanceof Error ? error.message : "TXT lookup failed.",
    };
  }
};

export const getEmailDeliverabilityDiagnostics = async (options: { timeoutMs?: number } = {}) => {
  const timeoutMs = Math.max(500, options.timeoutMs ?? 2_000);
  const sendgridChecks = [
    cnameCheck(`links.${mtendereEmailDomain}`, "sendgrid.net", timeoutMs),
    cnameCheck(`54085667.${mtendereEmailDomain}`, "sendgrid.net", timeoutMs),
    cnameCheck(`mail.${mtendereEmailDomain}`, "u54085667.wl168.sendgrid.net", timeoutMs),
    cnameCheck(`mtd1._domainkey.${mtendereEmailDomain}`, "mtd1.domainkey.u54085667.wl168.sendgrid.net", timeoutMs),
    cnameCheck(`mtd12._domainkey.${mtendereEmailDomain}`, "mtd12.domainkey.u54085667.wl168.sendgrid.net", timeoutMs),
  ];
  const policyChecks = [
    txtCheck(
      `_dmarc.${mtendereEmailDomain}`,
      "v=DMARC1; p=quarantine or p=reject",
      timeoutMs,
      (records) => records.some((record) => /^v=DMARC1;.*\bp=(quarantine|reject)\b/i.test(record)),
      true,
    ),
    txtCheck(
      mtendereEmailDomain,
      "v=spf1 with configured provider includes",
      timeoutMs,
      (records) => records.some((record) => /^v=spf1\b/i.test(record) && /(sendgrid|amazonses|mailgun|spf\.protection)/i.test(record)),
      true,
    ),
    txtCheck(
      `default._bimi.${mtendereEmailDomain}`,
      "v=BIMI1; l=...; a=...",
      timeoutMs,
      (records) => records.some((record) => /^v=BIMI1\b/i.test(record)),
      true,
    ),
  ];
  const subdomainChecks = sendingSubdomains.flatMap((domain) => [
    txtCheck(
      domain,
      "v=spf1 with provider include",
      timeoutMs,
      (records) => records.some((record) => /^v=spf1\b/i.test(record)),
      true,
    ),
    txtCheck(
      `_dmarc.${domain}`,
      "v=DMARC1; p=none/quarantine/reject",
      timeoutMs,
      (records) => records.some((record) => /^v=DMARC1;.*\bp=(none|quarantine|reject)\b/i.test(record)),
      true,
    ),
  ]);
  const checks = await Promise.all([
    ...sendgridChecks,
    ...policyChecks,
    ...subdomainChecks,
  ]);
  const summary = checks.reduce(
    (acc, check) => {
      acc[check.status] += 1;
      return acc;
    },
    { pass: 0, warn: 0, fail: 0 },
  );

  return {
    domain: mtendereEmailDomain,
    sendingSubdomains,
    checkedAt: new Date().toISOString(),
    ready: summary.fail === 0,
    summary,
    checks,
    reputationSegmentation: {
      transactional: ["notifications", "support", "admissions", "billing"],
      commercial: ["marketing"],
      policy: "Keep marketing traffic on a separate subdomain so transactional admissions, billing, and security messages do not inherit campaign reputation risk.",
    },
    reverseDns: {
      status: "manual_review",
      message: "Reverse DNS is controlled by the sending provider or dedicated IP. Verify it in SendGrid, SES, Mailgun, or SMTP provider dashboards when dedicated IPs are enabled.",
    },
    recommendedVercelEnv: {
      EMAIL_FROM: "Mtendere Education Consult <no-reply@mail.mtendereeducationconsult.com>",
      EMAIL_PROVIDER_ORDER: "sendgrid,ses,mailgun,resend,postmark,smtp,custom",
      EMAIL_DRY_RUN: "false",
      SENDGRID_TRACKING_ENABLED: "true",
      EMAIL_LINK_BASE_URL: "https://links.mtendereeducationconsult.com",
      SMTP_HOST: "smtp.sendgrid.net",
      SMTP_PORT: "587",
      SMTP_USER: "apikey",
    },
  };
};

export const getTransactionalEmailActivationReadiness = async (
  options: { timeoutMs?: number; cacheTtlMs?: number } = {},
): Promise<TransactionalEmailActivationReadiness> => {
  const cacheTtlMs = Math.max(0, options.cacheTtlMs ?? 120_000);
  if (
    activationReadinessCache &&
    cacheTtlMs > 0 &&
    Date.now() - activationReadinessCache.checkedAt < cacheTtlMs
  ) {
    return activationReadinessCache.value;
  }

  const diagnostics = getEmailDeliveryDiagnostics();
  const providerReady = isTransactionalEmailDeliveryReady();
  const blockingReasons: TransactionalEmailActivationReadiness["blockingReasons"] = [];
  let deliverability: Awaited<ReturnType<typeof getEmailDeliverabilityDiagnostics>> | undefined;
  let dnsReady: boolean | null = null;

  if (!providerReady) {
    blockingReasons.push({
      code: "email_provider_unavailable",
      message: "No transactional email provider is configured for account activation.",
    });
  }

  if (activationRequiresDnsReady) {
    deliverability = await getEmailDeliverabilityDiagnostics({ timeoutMs: options.timeoutMs ?? 1_500 });
    dnsReady = deliverability.ready;
    if (!deliverability.ready) {
      blockingReasons.push({
        code: "email_dns_not_ready",
        message: "Sending-domain DNS is not aligned for transactional email activation.",
      });
    }
  }

  const value = {
    ready: providerReady && (dnsReady !== false),
    providerReady,
    dnsReady,
    checkedAt: new Date().toISOString(),
    diagnostics,
    deliverability,
    blockingReasons,
  };
  activationReadinessCache = { checkedAt: Date.now(), value };
  return value;
};

const ctaButton = (href: string, label: string) => `
  <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
    <tr>
      <td style="border-radius: 8px; background: #f97316;">
        <a href="${href}" style="display: inline-block; padding: 13px 20px; color: #ffffff; font-weight: 700; text-decoration: none; font-family: Arial, sans-serif;">
          ${escapeHtml(label)}
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
}) => {
  const logoUrl = publicAppUrl ? `${publicAppUrl}/media-assets/Mtendere_Logo.png` : "";

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>${escapeHtml(title)}</title>
    <style>
      @media (prefers-color-scheme: dark) {
        .mec-body { background: #071927 !important; }
        .mec-card { background: #102638 !important; border-color: #24465f !important; }
        .mec-copy { color: #e5f1fb !important; }
        .mec-muted { color: #b7cad8 !important; }
      }
      @media screen and (max-width: 640px) {
        .mec-shell { padding: 16px 10px !important; }
        .mec-header, .mec-content, .mec-footer { padding-left: 22px !important; padding-right: 22px !important; }
        .mec-title { font-size: 24px !important; }
      }
    </style>
  </head>
  <body class="mec-body" style="margin:0; padding:0; background:#eef4f8;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="mec-shell" style="background:#eef4f8; padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="mec-card" style="max-width:672px; background:#ffffff; border-radius:8px; overflow:hidden; border:1px solid #dbe4ea;">
            <tr>
              <td class="mec-header" style="background:#0f4c81; padding:26px 32px 22px; color:#ffffff; font-family:Arial, sans-serif;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      ${
                        logoUrl
                          ? `<img src="${logoUrl}" width="52" height="52" alt="Mtendere Education Consult" style="display:block; object-fit:contain; border:0;">`
                          : `<div style="height:52px; width:52px; border-radius:8px; background:#ffffff; color:#0f4c81; display:grid; place-items:center; font-weight:800;">MEC</div>`
                      }
                    </td>
                    <td style="vertical-align:middle; padding-left:14px;">
                      <div style="font-size:13px; letter-spacing:1.4px; text-transform:uppercase; color:#bfdbfe; font-weight:700;">Mtendere Education Consult</div>
                      <div style="font-size:13px; color:#e0f2fe; margin-top:4px;">Scholarships | Study abroad | Careers</div>
                    </td>
                  </tr>
                </table>
                <h1 class="mec-title" style="margin:22px 0 0; font-size:30px; line-height:1.2; color:#ffffff;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td class="mec-content mec-copy" style="padding:34px 32px; color:#1f2937; font-family:Arial, sans-serif; font-size:16px; line-height:1.72;">
                ${body}
                ${cta ? ctaButton(cta.href, cta.label) : ""}
              </td>
            </tr>
            <tr>
              <td class="mec-footer" style="background:#0b2f4f; padding:24px 32px; color:#dbeafe; font-family:Arial, sans-serif; font-size:13px; line-height:1.6;">
                <strong style="color:#ffffff;">Mtendere Education Consult</strong><br>
                Lilongwe, Malawi<br>
                mtendereeducation@gmail.com | +265 999 360 325<br>
                <a href="${publicAppUrl || "https://mtendereeducationconsult.com"}" style="color:#bfdbfe;">Website</a>
                <span style="color:#93c5fd;"> | </span>
                <a href="${publicAppUrl || "https://mtendereeducationconsult.com"}/privacy" style="color:#bfdbfe;">Privacy Policy</a>
                <span style="color:#93c5fd;"> | </span>
                <a href="${publicAppUrl || "https://mtendereeducationconsult.com"}/terms" style="color:#bfdbfe;">Terms & Conditions</a><br>
                <span style="color:#93c5fd;">LinkedIn | Facebook | Instagram</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const addComplianceFooter = (html: string, recipient: string) => {
  if (!emailBaseUrl || html.includes("data-mec-compliance-footer")) return html;
  const manageUrl = getPreferenceUrl(recipient);
  const unsubscribeUrl = getUnsubscribeUrl(recipient);
  const footer = `
    <div data-mec-compliance-footer="true" style="font-family:Arial,sans-serif; color:#64748b; font-size:12px; line-height:1.6; padding:18px 24px; text-align:center;">
      You are receiving this because you have an account, application, subscription, or relationship with Mtendere Education Consult.<br>
      <a href="${manageUrl}" style="color:#0f4c81;">Manage email preferences</a>
      <span style="color:#cbd5e1;"> | </span>
      <a href="${unsubscribeUrl}" style="color:#0f4c81;">Unsubscribe</a>
    </div>
  `;
  return html.replace(/<\/body>/i, `${footer}</body>`);
};

const rewriteTrackedLinks = (html: string, jobId: string) => {
  if (!emailBaseUrl) return html;
  return html.replace(/href="([^"]+)"/gi, (match, href: string) => {
    if (!/^https?:\/\//i.test(href)) return match;
    if (href.includes("/api/email/track/")) return match;
    const signature = signEmailTrackingValue(`${jobId}:${href}`);
    const trackedHref = `${emailBaseUrl}/api/email/track/click/${encodeURIComponent(jobId)}?u=${encodeURIComponent(href)}&s=${signature}`;
    return `href="${trackedHref}"`;
  });
};

const addOpenPixel = (html: string, jobId: string) => {
  if (!emailBaseUrl || html.includes("data-mec-open-pixel")) return html;
  const signature = signEmailTrackingValue(jobId);
  const pixel = `<img data-mec-open-pixel="true" src="${emailBaseUrl}/api/email/track/open/${encodeURIComponent(jobId)}?s=${signature}" width="1" height="1" alt="" style="display:none!important; opacity:0; width:1px; height:1px;">`;
  return html.replace(/<\/body>/i, `${pixel}</body>`);
};

const buildDeliverableEmail = (job: EmailJob): DeliverableEmail => {
  const payload = job.payload as StoredEmailPayload;
  const withCompliance = addComplianceFooter(payload.html, job.recipient);
  const withTrackedLinks = rewriteTrackedLinks(withCompliance, job.id);
  const html = addOpenPixel(withTrackedLinks, job.id);
  return {
    id: job.id,
    from: payload.from || fromAddress,
    to: payload.to || job.recipient,
    subject: payload.subject || job.subject,
    html,
    text: payload.text,
    category: payload.category,
    metadata: payload.metadata || {},
    headers: payload.headers || {},
  };
};

const recordEmailEvent = async (event: {
  jobId?: string | null;
  provider?: string | null;
  eventType: string;
  recipient?: string | null;
  category?: string | null;
  providerMessageId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}) => {
  appendEmailEvent(event);
  try {
    await storage.createEmailDeliveryEvent({
      jobId: event.jobId || null,
      provider: event.provider || null,
      eventType: event.eventType,
      recipient: event.recipient || null,
      category: event.category || null,
      providerMessageId: event.providerMessageId || null,
      metadata: event.metadata || null,
      ipAddress: event.ipAddress || null,
      userAgent: event.userAgent || null,
    });
  } catch (error) {
    appendEmailEvent({
      status: "event_persistence_failed",
      error: error instanceof Error ? error.message : "Unknown email event persistence error",
      originalEvent: event,
    });
  }
};

const deliverWithFailover = async (job: EmailJob) => {
  const message = buildDeliverableEmail(job);
  const activeProviders = getProviderOrder();

  if (activeProviders.length === 0) {
    throw new Error("No transactional email providers are configured");
  }

  const failures: string[] = [];
  for (const provider of activeProviders) {
    for (let providerAttempt = 1; providerAttempt <= inlineProviderAttempts; providerAttempt += 1) {
      try {
        const result = await provider.send(message);
        if (failures.length > 0) {
          await recordEmailEvent({
            jobId: job.id,
            provider: result.provider,
            eventType: "provider_failover_triggered",
            recipient: job.recipient,
            category: job.category,
            providerMessageId: result.messageId,
            metadata: {
              attempt: job.attempts,
              successfulProvider: result.provider,
              failures,
            },
          });
        }
        await recordEmailEvent({
          jobId: job.id,
          provider: result.provider,
          eventType: "sent",
          recipient: job.recipient,
          category: job.category,
          providerMessageId: result.messageId,
          metadata: { attempt: job.attempts, providerAttempt, failoverFailures: failures },
        });
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown provider error";
        const retryDelayMs = getInlineProviderRetryDelayMs(errorMessage);
        failures.push(`${provider.name}#${providerAttempt}: ${errorMessage}`);
        await recordEmailEvent({
          jobId: job.id,
          provider: provider.name,
          eventType: "provider_failed",
          recipient: job.recipient,
          category: job.category,
          metadata: {
            error: errorMessage,
            attempt: job.attempts,
            providerAttempt,
            maxProviderAttempts: inlineProviderAttempts,
            retryDelayMs,
          },
        });

        if (providerAttempt < inlineProviderAttempts) {
          await recordEmailEvent({
            jobId: job.id,
            provider: provider.name,
            eventType: "provider_retry_scheduled",
            recipient: job.recipient,
            category: job.category,
            metadata: {
              attempt: job.attempts,
              nextProviderAttempt: providerAttempt + 1,
              maxProviderAttempts: inlineProviderAttempts,
              retryDelayMs,
            },
          });
          if (retryDelayMs > 0) {
            await sleep(retryDelayMs);
          }
        }
      }
    }
  }

  throw new Error(failures.join(" | "));
};

const scheduleAdminFailureNotification = (job: EmailJob, error: string) => {
  if (job.category === "admin_notification") return;
  void sendAdminNotification({
    subject: `Email delivery failed: ${job.category}`,
    message: `Email job ${job.id} to ${job.recipient} failed after ${job.attempts} attempts. Error: ${error}`,
    metadata: { emailJobId: job.id, category: job.category, recipient: job.recipient },
  });
};

export type EmailQueueProcessResult = {
  skipped: boolean;
  processed: number;
  startedAt: string;
  finishedAt: string;
  error: string | null;
};

const toIsoString = (value: Date | null) => value?.toISOString() ?? null;

export const getEmailQueueWorkerStatus = () => ({
  enabled: env.EMAIL_QUEUE_WORKER_ENABLED !== false,
  running: Boolean(workerTimer),
  intervalMs: queuePollMs,
  isProcessing,
  startedAt: toIsoString(workerStartedAt),
  lastRunStartedAt: toIsoString(queueLastRunStartedAt),
  lastRunFinishedAt: toIsoString(queueLastRunFinishedAt),
  lastError: queueLastRunError,
});

export const processEmailQueue = async (): Promise<EmailQueueProcessResult> => {
  const requestedAt = new Date();
  if (isProcessing) {
    return {
      skipped: true,
      processed: 0,
      startedAt: requestedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      error: null,
    };
  }

  isProcessing = true;
  queueLastRunStartedAt = requestedAt;
  queueLastRunError = null;
  let processed = 0;

  try {
    const recoveredStaleJobs = await storage.recoverStaleProcessingEmailJobs(
      new Date(Date.now() - 10 * 60 * 1000),
    );
    if (recoveredStaleJobs > 0) {
      await recordEmailEvent({
        eventType: "stale_processing_recovered",
        metadata: { count: recoveredStaleJobs },
      });
    }

    const jobs = await storage.getDueEmailJobs(10);
    for (const dueJob of jobs) {
      const job = await storage.markEmailJobProcessing(dueJob.id);
      if (!job) {
        await recordEmailEvent({
          jobId: dueJob.id,
          eventType: "processing_skipped",
          recipient: dueJob.recipient,
          category: dueJob.category,
          metadata: { reason: "job_not_available" },
        });
        continue;
      }

      processed += 1;
      await recordEmailEvent({
        jobId: job.id,
        eventType: "processing",
        recipient: job.recipient,
        category: job.category,
        metadata: { attempt: job.attempts },
      });

      try {
        const result = await deliverWithFailover(job);
        await storage.markEmailJobSent(job.id, result.provider, result.messageId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown email delivery error";
        const finalFailure = job.attempts >= job.maxAttempts;
        const retryDelay = retryDelaysMs[Math.min(job.attempts, retryDelaysMs.length - 1)];
        const retryAt = new Date(Date.now() + retryDelay);
        await storage.markEmailJobFailed(job.id, errorMessage, retryAt, finalFailure);
        await recordEmailEvent({
          jobId: job.id,
          eventType: finalFailure ? "failed" : "retry_scheduled",
          recipient: job.recipient,
          category: job.category,
          metadata: {
            attempt: job.attempts,
            maxAttempts: job.maxAttempts,
            retryAt: finalFailure ? null : retryAt.toISOString(),
            error: errorMessage,
          },
        });

        if (finalFailure) {
          scheduleAdminFailureNotification(job, errorMessage);
        }
      }
    }
  } catch (error) {
    queueLastRunError = error instanceof Error ? error.message : "Unknown email queue error";
    appendEmailEvent({
      status: "queue_processing_failed",
      error: queueLastRunError,
    });
  } finally {
    queueLastRunFinishedAt = new Date();
    isProcessing = false;
  }

  return {
    skipped: false,
    processed,
    startedAt: requestedAt.toISOString(),
    finishedAt: (queueLastRunFinishedAt ?? new Date()).toISOString(),
    error: queueLastRunError,
  };
};

export const startEmailQueueWorker = () => {
  if (workerTimer || env.EMAIL_QUEUE_WORKER_ENABLED === false) return;
  workerStartedAt = new Date();
  workerTimer = setInterval(() => {
    void processEmailQueue();
  }, queuePollMs);
  workerTimer.unref?.();
  void processEmailQueue();
};

export const enqueueEmail = async (payload: EmailPayload, options: EmailEnqueueOptions = {}): Promise<EmailEnqueueResult> => {
  const id = randomUUID();
  const normalizedRecipient = normalizeEmail(payload.to);

  try {
    if (await shouldSuppressForPreferences({ ...payload, to: normalizedRecipient })) {
      await recordEmailEvent({
        jobId: id,
        eventType: "suppressed",
        recipient: normalizedRecipient,
        category: payload.category,
        metadata: { reason: "recipient_preferences" },
      });
      return { id, status: "suppressed" };
    }

    await ensureEmailPreference(normalizedRecipient, payload.category, payload.metadata);
    const supersededPendingCategories = new Set<EmailCategory>([
      "subscription_confirmation",
      "account_verification",
      "password_reset",
    ]);
    if (supersededPendingCategories.has(payload.category)) {
      const cancelled = await storage.cancelPendingEmailJobs(
        normalizedRecipient,
        payload.category,
        `Superseded by a newer ${payload.category.replace(/_/g, " ")} request`,
      );
      if (cancelled > 0) {
        await recordEmailEvent({
          eventType: "superseded",
          recipient: normalizedRecipient,
          category: payload.category,
          metadata: { count: cancelled },
        });
      }
    }

    const job = await storage.createEmailJob({
      id,
      category: payload.category,
      recipient: normalizedRecipient,
      subject: payload.subject,
      payload: {
        ...payload,
        to: normalizedRecipient,
        from: fromAddress,
      },
      metadata: payload.metadata || null,
      status: "queued",
      priority: payload.priority ?? 100,
      attempts: 0,
      maxAttempts: defaultMaxAttempts,
      provider: null,
      providerMessageId: null,
      scheduledFor: new Date(),
      processingAt: null,
      sentAt: null,
      failedAt: null,
      lastError: null,
    });

    await recordEmailEvent({
      jobId: job.id,
      eventType: "queued",
      recipient: job.recipient,
      category: job.category,
      metadata: payload.metadata,
    });
    if (options.awaitDelivery) {
      await processEmailQueue();
      const processedJob = await storage.getEmailJob(job.id).catch(() => null);
      if (processedJob) {
        return {
          id: processedJob.id,
          status: processedJob.status,
          provider: processedJob.provider,
          providerMessageId: processedJob.providerMessageId,
          lastError: processedJob.lastError,
        };
      }
    } else {
      void processEmailQueue();
    }

    return { id: job.id, status: job.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email enqueue error";
    appendEmailEvent({
      id,
      status: "enqueue_failed",
      category: payload.category,
      to: normalizedRecipient,
      error: message,
    });
    return { id, status: "failed", error: message };
  }
};

export const recordEmailOpen = async (input: { jobId: string; ipAddress?: string | null; userAgent?: string | null }) => {
  const job = await storage.getEmailJob(input.jobId);
  await recordEmailEvent({
    jobId: input.jobId,
    provider: job?.provider || null,
    eventType: "opened",
    recipient: job?.recipient || null,
    category: job?.category || null,
    providerMessageId: job?.providerMessageId || null,
    ipAddress: input.ipAddress || null,
    userAgent: input.userAgent || null,
  });
};

export const recordEmailClick = async (input: {
  jobId: string;
  url: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) => {
  const job = await storage.getEmailJob(input.jobId);
  await recordEmailEvent({
    jobId: input.jobId,
    provider: job?.provider || null,
    eventType: "clicked",
    recipient: job?.recipient || null,
    category: job?.category || null,
    providerMessageId: job?.providerMessageId || null,
    metadata: { url: input.url },
    ipAddress: input.ipAddress || null,
    userAgent: input.userAgent || null,
  });
};

export const recordProviderWebhookEvent = async (provider: string, payload: unknown) => {
  const events = Array.isArray(payload) ? payload : [payload];

  for (const rawEvent of events) {
    const event = rawEvent as Record<string, unknown>;
    const metadata = event as Record<string, unknown>;
    const mail = asRecord(event.mail);
    const eventMetadata = asRecord(event.Metadata || event.metadata);
    const tags = asRecord(event.tags);
    const providerMessageId =
      String(
        event.email_id ||
          event.sg_message_id ||
          event.MessageID ||
          event.MessageId ||
          mail.messageId ||
          "",
      ) || null;
    const jobId =
      String(
        event.mec_email_job_id ||
          event.jobId ||
          eventMetadata.mec_email_job_id ||
          tags.mec_email_job_id ||
          "",
      ) || null;
    const job = jobId
      ? await storage.getEmailJob(jobId)
      : providerMessageId
        ? await storage.getEmailJobByProviderMessageId(providerMessageId)
        : undefined;
    const rawType = String(event.type || event.event || event.RecordType || event.eventType || "").toLowerCase();
    const eventType = mapProviderEventType(rawType);

    await recordEmailEvent({
      jobId: job?.id || jobId,
      provider,
      eventType,
      recipient: String(event.email || event.To || event.recipient || job?.recipient || ""),
      category: job?.category || String(event.category || event.tag || ""),
      providerMessageId,
      metadata,
    });
  }
};

const mapProviderEventType = (rawType: string) => {
  if (rawType.includes("deliver")) return "delivered";
  if (rawType.includes("open")) return "opened";
  if (rawType.includes("click")) return "clicked";
  if (rawType.includes("bounce")) return "bounced";
  if (rawType.includes("complain") || rawType.includes("spam")) return "spam_complaint";
  if (rawType.includes("unsubscribe")) return "unsubscribed";
  if (rawType.includes("reject") || rawType.includes("suppress")) return "suppressed";
  return rawType || "provider_event";
};

export const getEmailPlatformHealth = async (days = 30) => {
  const stats = await storage.getEmailDeliveryStats(days);
  const providerOrder = getProviderOrder().map((provider) => provider.name);
  const sent = stats.totals.sent || 0;
  const delivered = stats.totals.delivered || 0;
  const bounced = stats.totals.bounced || 0;
  const spamComplaints = stats.totals.spam_complaint || 0;
  const failed = stats.totals.failed || 0;
  const queued = stats.queue.queued || 0;
  const retryScheduled = stats.queue.retry_scheduled || 0;
  const processing = stats.queue.processing || 0;
  const deadLetter = stats.queue.failed || 0;
  const deliverability = await getEmailDeliverabilityDiagnostics({ timeoutMs: 1_500 }).catch((error) => ({
    ready: false,
    summary: { pass: 0, warn: 0, fail: 1 },
    checks: [],
    error: error instanceof Error ? error.message : "Deliverability diagnostics failed",
  }));
  const alerts = [
    providerOrder.filter((provider) => provider !== "dry_run").length === 0
      ? {
          severity: "critical",
          code: "email_provider_unavailable",
          message: "No real transactional email provider is configured. Verification and subscription emails cannot be delivered.",
        }
      : null,
    dryRunEnabled
      ? {
          severity: "warning",
          code: "email_dry_run_enabled",
          message: "EMAIL_DRY_RUN is enabled. Production should use real provider delivery.",
        }
      : null,
    deadLetter > 0
      ? {
          severity: "critical",
          code: "email_dead_letter_jobs",
          message: `${deadLetter} email job(s) are in the dead-letter queue and need operator review.`,
        }
      : null,
    queued + retryScheduled + processing > 100
      ? {
          severity: "warning",
          code: "email_queue_congestion",
          message: `${queued + retryScheduled + processing} email job(s) are waiting or processing.`,
        }
      : null,
    sent > 0 && bounced / sent >= 0.02
      ? {
          severity: "warning",
          code: "email_bounce_rate_high",
          message: `Bounce rate is ${((bounced / sent) * 100).toFixed(1)}% for the selected period.`,
        }
      : null,
    sent > 0 && spamComplaints / sent >= 0.001
      ? {
          severity: "critical",
          code: "email_spam_complaints_high",
          message: `Spam complaint rate is ${((spamComplaints / sent) * 100).toFixed(2)}% for the selected period.`,
        }
      : null,
    "ready" in deliverability && !deliverability.ready
      ? {
          severity: "critical",
          code: "email_dns_not_ready",
          message: "One or more sending-domain DNS records are not aligned.",
        }
      : null,
  ].filter(Boolean);

  return {
    ...stats,
    reliability: {
      sent,
      delivered,
      failed,
      bounced,
      spamComplaints,
      deliveryRate: sent > 0 ? delivered / sent : null,
      bounceRate: sent > 0 ? bounced / sent : null,
      spamComplaintRate: sent > 0 ? spamComplaints / sent : null,
      failoverRate: stats.failover.rate,
      failoverTriggered: stats.failover.triggered,
    },
    providerReliability: Object.fromEntries(
      Object.entries(stats.byProvider).map(([provider, events]) => {
        const providerSent = events.sent || 0;
        const providerDelivered = events.delivered || 0;
        const providerBounced = events.bounced || 0;
        const providerFailed = events.failed || events.provider_failed || 0;
        return [
          provider,
          {
            sent: providerSent,
            delivered: providerDelivered,
            failed: providerFailed,
            bounced: providerBounced,
            successRate: providerSent > 0 ? providerDelivered / providerSent : null,
            bounceRate: providerSent > 0 ? providerBounced / providerSent : null,
            latencyMs: stats.providerLatencyMs[provider] || null,
          },
        ];
      }),
    ),
    queueOperations: {
      queued,
      retryScheduled,
      processing,
      deadLetter,
      congestion: queued + retryScheduled + processing,
      priorityBands: {
        critical: "0-19",
        high: "20-49",
        medium: "50-99",
        low: "100+",
      },
      retrySchedule: ["1 minute", "5 minutes", "15 minutes", "1 hour"],
      deadLetterStatus: "failed",
    },
    alerts,
    deliverability,
    providers: {
      active: providerOrder,
      configured: Object.values(providers)
        .filter((provider) => provider.name !== "dry_run" && provider.isConfigured())
        .map((provider) => provider.name),
      dryRunEnabled,
    },
    templates: emailTemplateCatalog,
  };
};

export const buildScholarshipRecommendations = (input: {
  scholarships: Array<{
    title: string;
    country?: string | null;
    degreeLevel?: string | null;
    field?: string | null;
    deadline?: string | Date | null;
    url?: string | null;
  }>;
  preferences?: {
    country?: string | null;
    degreeLevel?: string | null;
    field?: string | null;
    interests?: string[] | null;
  };
}) => {
  const country = input.preferences?.country?.toLowerCase();
  const degreeLevel = input.preferences?.degreeLevel?.toLowerCase();
  const field = input.preferences?.field?.toLowerCase();
  const interests = new Set((input.preferences?.interests || []).map((item) => item.toLowerCase()));

  return input.scholarships
    .map((scholarship) => {
      let score = 0;
      if (country && scholarship.country?.toLowerCase().includes(country)) score += 35;
      if (degreeLevel && scholarship.degreeLevel?.toLowerCase().includes(degreeLevel)) score += 25;
      if (field && scholarship.field?.toLowerCase().includes(field)) score += 25;
      if (scholarship.field && interests.has(scholarship.field.toLowerCase())) score += 15;
      return { ...scholarship, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
};

export const sendSubscriptionConfirmation = (input: {
  email: string;
  name?: string | null;
  verificationUrl: string;
  unsubscribeUrl: string;
}, options?: EmailEnqueueOptions) =>
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
    metadata: { flow: "double_opt_in", source: "newsletter" },
  }, options);

export const sendAccountVerification = (input: {
  email: string;
  name?: string | null;
  verificationUrl: string;
  tokenId?: number | null;
}) =>
  enqueueEmail({
    to: input.email,
    subject: "Verify your Mtendere account",
    category: "account_verification",
    text: `Verify your Mtendere account: ${input.verificationUrl}`,
    html: renderMtendereEmail({
      title: "Verify your account",
      preheader: "Confirm your email address to activate your Mtendere account.",
      body: `
        <p>Hello ${escapeHtml(input.name || "there")},</p>
        <p>Your Mtendere account has been created. You can use your account now, and this verification confirms that this email address belongs to you.</p>
        <p>This secure link expires in 24 hours and can only be used once.</p>
        <p>If you did not create an account, you can ignore this message.</p>
      `,
      cta: { href: input.verificationUrl, label: "Verify account" },
    }),
    metadata: { flow: "account_verification", tokenId: input.tokenId ?? undefined },
  });

export const sendWelcomeEmail = (input: {
  email: string;
  name?: string | null;
  dashboardUrl: string;
}) =>
  enqueueEmail({
    to: input.email,
    subject: "Welcome to Mtendere Education Consult",
    category: "welcome",
    text: `Welcome to Mtendere Education Consult. Open your dashboard: ${input.dashboardUrl}`,
    html: renderMtendereEmail({
      title: "Welcome to Mtendere",
      preheader: "Your account is active and ready for scholarship, study abroad, and career support.",
      body: `
        <p>Hello ${escapeHtml(input.name || "there")},</p>
        <p>Your Mtendere account is active. You can now track applications, save opportunities, receive updates, and manage your education journey from your dashboard.</p>
        <p>We will keep important application and communication updates tied to your account for better follow-up.</p>
      `,
      cta: { href: input.dashboardUrl, label: "Open dashboard" },
    }),
    metadata: { flow: "welcome" },
  });

export const sendPasswordResetEmail = (input: {
  email: string;
  name?: string | null;
  resetUrl: string;
}) =>
  enqueueEmail({
    to: input.email,
    subject: "Reset your Mtendere password",
    category: "password_reset",
    text: `Reset your Mtendere password: ${input.resetUrl}`,
    html: renderMtendereEmail({
      title: "Reset your password",
      preheader: "Use this secure link to reset your Mtendere password.",
      body: `
        <p>Hello ${escapeHtml(input.name || "there")},</p>
        <p>We received a password reset request for your Mtendere account. Use the secure link below to set a new password.</p>
        <p>The link expires shortly and stops working after your password changes.</p>
        <p>If you did not request this, keep your current password and contact Mtendere support.</p>
      `,
      cta: { href: input.resetUrl, label: "Reset password" },
    }),
    metadata: { flow: "password_reset" },
  });

export const sendPasswordChangedEmail = (input: {
  email: string;
  name?: string | null;
  loginUrl: string;
}) =>
  enqueueEmail({
    to: input.email,
    subject: "Your Mtendere password was changed",
    category: "password_changed",
    text: `Your Mtendere password was changed. Sign in: ${input.loginUrl}`,
    html: renderMtendereEmail({
      title: "Password changed",
      preheader: "Your Mtendere account password was changed successfully.",
      body: `
        <p>Hello ${escapeHtml(input.name || "there")},</p>
        <p>Your Mtendere account password was changed successfully.</p>
        <p>If this was not you, contact Mtendere support immediately and ask the super administrator to invalidate active sessions.</p>
      `,
      cta: { href: input.loginUrl, label: "Sign in" },
    }),
    metadata: { flow: "password_changed" },
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

export const sendEventRegistrationConfirmation = (input: {
  email: string;
  name: string;
  eventTitle: string;
  eventDate: string;
  ticketUrl: string;
  status: string;
}) =>
  enqueueEmail({
    to: input.email,
    subject: `Event registration received: ${input.eventTitle}`,
    category: "event_registration_confirmation",
    text: `Your registration for ${input.eventTitle} is ${input.status}. Ticket: ${input.ticketUrl}`,
    html: renderMtendereEmail({
      title: "Event registration received",
      preheader: `Your event registration is ${input.status.replace(/_/g, " ")}.`,
      body: `
        <p>Hello ${escapeHtml(input.name)},</p>
        <p>Your registration for <strong>${escapeHtml(input.eventTitle)}</strong> has been received.</p>
        <p><strong>Date:</strong> ${escapeHtml(input.eventDate)}</p>
        <p><strong>Status:</strong> ${escapeHtml(input.status.replace(/_/g, " "))}</p>
        <p>Keep your ticket code ready for check-in. If your registration requires approval, the Mtendere team will update you after review.</p>
      `,
      cta: { href: input.ticketUrl, label: "Open event ticket" },
    }),
    metadata: { eventTitle: input.eventTitle, status: input.status },
  });

export const sendEventRegistrationStatusUpdate = (input: {
  email: string;
  name: string;
  eventTitle: string;
  status: string;
  ticketUrl?: string;
  notes?: string | null;
}) =>
  enqueueEmail({
    to: input.email,
    subject: `Event registration update: ${input.eventTitle}`,
    category: "event_registration_status_update",
    text: `Your registration for ${input.eventTitle} is now ${input.status}.`,
    html: renderMtendereEmail({
      title: "Event registration updated",
      preheader: `Your event registration is now ${input.status.replace(/_/g, " ")}.`,
      body: `
        <p>Hello ${escapeHtml(input.name)},</p>
        <p>Your registration for <strong>${escapeHtml(input.eventTitle)}</strong> is now <strong>${escapeHtml(input.status.replace(/_/g, " "))}</strong>.</p>
        ${input.notes ? `<p><strong>Admin note:</strong> ${escapeHtml(input.notes)}</p>` : ""}
      `,
      cta: input.ticketUrl ? { href: input.ticketUrl, label: "Open ticket" } : undefined,
    }),
    metadata: { eventTitle: input.eventTitle, status: input.status },
  });

export const sendPartnerOnboardingEmail = (input: {
  email: string;
  organizationName: string;
  contactName?: string | null;
  adminUrl: string;
}) =>
  enqueueEmail({
    to: input.email,
    subject: `Welcome to Mtendere partnerships: ${input.organizationName}`,
    category: "partner_onboarding",
    text: `Welcome ${input.organizationName}. Your partnership profile has been created: ${input.adminUrl}`,
    html: renderMtendereEmail({
      title: "Partnership profile created",
      preheader: "Your organization has been added to the Mtendere partner ecosystem.",
      body: `
        <p>Hello ${escapeHtml(input.contactName || "there")},</p>
        <p><strong>${escapeHtml(input.organizationName)}</strong> has been added to the Mtendere partnerships workspace.</p>
        <p>Our team can now coordinate linked events, sponsorships, agreements, documents, and follow-up activity from one operational record.</p>
      `,
      cta: { href: input.adminUrl, label: "Review partnership workspace" },
    }),
    metadata: { organizationName: input.organizationName },
  });

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
      cta: { href: `${publicAppUrl || ""}/contact`, label: "Visit contact page" },
    }),
    metadata: { subject: input.subject },
  });

export const sendScholarshipRecommendationEmail = (input: {
  email: string;
  name?: string | null;
  recommendations: Array<{
    title: string;
    country?: string | null;
    degreeLevel?: string | null;
    field?: string | null;
    deadline?: string | Date | null;
    url?: string | null;
    score?: number;
  }>;
  preferences?: Record<string, unknown>;
}) => {
  const topRecommendation = input.recommendations[0];
  const list = input.recommendations
    .map((item) => {
      const deadline = item.deadline ? new Date(item.deadline).toLocaleDateString("en-US") : "Rolling deadline";
      const url = item.url || `${publicAppUrl}/scholarships`;
      return `<li style="margin-bottom:14px;"><strong>${escapeHtml(item.title)}</strong><br><span style="color:#64748b;">${escapeHtml(item.country || "Global")} | ${escapeHtml(item.degreeLevel || "All levels")} | ${escapeHtml(item.field || "Multiple fields")} | Deadline: ${escapeHtml(deadline)}</span><br><a href="${url}" style="color:#0f4c81;">View opportunity</a></li>`;
    })
    .join("");

  return enqueueEmail({
    to: input.email,
    subject: topRecommendation
      ? `Scholarship match: ${topRecommendation.title}`
      : "New scholarship opportunities matching your profile",
    category: "scholarship_recommended",
    text: `Hello ${input.name || "there"}, new scholarship opportunities matching your profile are available. View them here: ${publicAppUrl}/scholarships`,
    html: renderMtendereEmail({
      title: "Scholarship matches for you",
      preheader: "Personalized scholarship opportunities based on your profile.",
      body: `
        <p>Hello ${escapeHtml(input.name || "there")},</p>
        <p>We found scholarship opportunities that align with your study preferences and interests.</p>
        <ul style="padding-left:18px; margin-top:18px;">${list}</ul>
      `,
      cta: { href: `${publicAppUrl}/scholarships`, label: "Explore scholarships" },
    }),
    metadata: { preferences: input.preferences, recommendationCount: input.recommendations.length },
  });
};

export const sendAdminNotification = (input: {
  subject: string;
  message: string;
  metadata?: Record<string, unknown>;
}) => {
  const to = env.ADMIN_NOTIFICATION_EMAIL || env.EMAIL_FROM;
  if (!to) return Promise.resolve(null);

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
    priority: 10,
  });
};
