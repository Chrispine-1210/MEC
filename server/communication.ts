import fs from "fs";
import path from "path";
import { createHmac, randomUUID } from "crypto";
import { env } from "./env";
import { enqueueEmail, renderMtendereEmail, type EmailCategory } from "./email";
import { getNotificationProviderDiagnostics, sendNotification } from "./notifications";
import { resolveWritableRuntimePath } from "./runtime-paths";
import { storage } from "./storage";

export type CommunicationChannel = "email" | "sms" | "whatsapp" | "inapp" | "document";
export type CommunicationPriority = "high" | "medium" | "low";
export type CommunicationSource = "admin" | "client" | "system";
export type TemplateType = "email" | "sms" | "document" | "inapp";

export type CommunicationEvent = {
  event_type: string;
  timestamp: string;
  user_id?: number | null;
  payload: Record<string, unknown>;
  source: CommunicationSource;
  priority?: CommunicationPriority;
};

type TemplateDefinition = {
  template_id: string;
  type: TemplateType;
  event_trigger: string;
  category?: "admissions" | "payments" | "system" | "crm" | "marketing" | "student";
  language?: string;
  version?: number;
  subject?: string;
  title?: string;
  preheader?: string;
  body: string;
  variables: string[];
  defaults?: Record<string, string>;
};

type RouteDefinition = {
  eventType: string;
  channel: CommunicationChannel;
  templateId: string;
  priority: CommunicationPriority;
  emailCategory?: EmailCategory;
  recipientField?: string;
};

type RenderedTemplate = {
  subject: string;
  title: string;
  html: string;
  text: string;
};

type GeneratedDocument = {
  documentId: string;
  fileName: string;
  filePath: string;
  downloadUrl: string;
  mimeType: "application/pdf";
};

const communicationDataDir = resolveWritableRuntimePath("data");
const generatedDocumentDir = path.join(communicationDataDir, "generated-documents");
const eventLogPath = path.join(communicationDataDir, "communication-events.jsonl");
const messageAuditPath = path.join(communicationDataDir, "communication-messages.jsonl");

fs.mkdirSync(communicationDataDir, { recursive: true });
fs.mkdirSync(generatedDocumentDir, { recursive: true });

const publicBaseUrl = (env.API_APP_URL || env.PUBLIC_APP_URL || env.FRONTEND_URL || env.VITE_SITE_URL || "").replace(/\/+$/, "");

const extractEmailAddress = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  const bracketMatch = trimmed.match(/<([^<>@\s]+@[^<>\s]+)>/);
  if (bracketMatch) return bracketMatch[1].toLowerCase();
  return /^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$/.test(trimmed) ? trimmed.toLowerCase() : null;
};

const supportEmail =
  extractEmailAddress(env.ADMIN_NOTIFICATION_EMAIL) ||
  extractEmailAddress(env.EMAIL_FROM) ||
  "mtendereeducation@gmail.com";
const institution = {
  name: "Mtendere Education Consult",
  address: "Lilongwe, Malawi",
  email: supportEmail,
  phone: "+265 999 360 325",
  website: env.PUBLIC_APP_URL || "https://mtendereeducationconsult.com",
};

const appendJsonl = (filePath: string, record: Record<string, unknown>) => {
  fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`, "utf-8");
};

const readJsonlRecords = (filePath: string) => {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf-8")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const safeDate = (value: string | Date | null | undefined) => {
  if (value instanceof Date) return value;
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const isCommunicationSource = (value: unknown): value is CommunicationSource =>
  value === "admin" || value === "client" || value === "system";

const isCommunicationPriority = (value: unknown): value is CommunicationPriority =>
  value === "high" || value === "medium" || value === "low";

const htmlEscape = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const textValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const getPath = (payload: Record<string, unknown>, key: string) =>
  key.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[part];
  }, payload);

const normalizeVariables = (payload: Record<string, unknown>, defaults: Record<string, string> = {}) => ({
  institution_name: institution.name,
  institution_address: institution.address,
  institution_email: institution.email,
  institution_phone: institution.phone,
  institution_website: institution.website,
  date: new Date().toISOString().slice(0, 10),
  ...defaults,
  ...payload,
});

const evaluateCondition = (expression: string, variables: Record<string, unknown>) => {
  const trimmed = expression.trim();
  const comparison = trimmed.match(/^([a-zA-Z0-9_.-]+)\s*(=|!=)\s*(.+)$/);
  if (comparison) {
    const [, key, operator, rawExpected] = comparison;
    const expected = rawExpected.trim().replace(/^["']|["']$/g, "");
    const actual = textValue(getPath(variables, key)).trim();
    return operator === "=" ? actual === expected : actual !== expected;
  }

  const value = getPath(variables, trimmed);
  return value !== undefined && value !== null && value !== "" && value !== false;
};

const renderConditionalBlocks = (template: string, variables: Record<string, unknown>) => {
  let rendered = template;
  for (let index = 0; index < 10; index += 1) {
    const next = rendered.replace(
      /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (_match, expression: string, content: string) =>
        evaluateCondition(expression, variables) ? content : "",
    );
    if (next === rendered) break;
    rendered = next;
  }
  return rendered;
};

const renderString = (
  template: string,
  variables: Record<string, unknown>,
  mode: "html" | "text",
) =>
  renderConditionalBlocks(template, variables).replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key: string) => {
    const value = getPath(variables, key);
    const fallback = variables[key] ?? "Not provided";
    return mode === "html" ? htmlEscape(value ?? fallback) : textValue(value ?? fallback);
  });

const stripHtml = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const buildReference = (payload: Record<string, unknown>) =>
  textValue(payload.reference_id || payload.referenceId || payload.invoice_number || `MEC-${Date.now()}`);

const defaultTemplates: TemplateDefinition[] = [
  {
    template_id: "student_registration_email",
    type: "email",
    event_trigger: "student.registered",
    category: "student",
    language: "en",
    version: 1,
    subject: "Welcome to {{institution_name}}, {{student_name}}",
    title: "Student registration received",
    preheader: "Your Mtendere student profile is active.",
    body: "<p>Hello {{student_name}},</p><p>Your student profile has been created. We will use this account to coordinate applications, payments, documents, and follow-up notifications.</p><p><strong>Reference:</strong> {{reference_id}}</p>",
    variables: ["student_name", "reference_id", "institution_name"],
  },
  {
    template_id: "student_enrollment_email",
    type: "email",
    event_trigger: "student.enrolled",
    category: "admissions",
    language: "en",
    version: 1,
    subject: "Enrollment Confirmation - {{student_name}}",
    title: "Enrollment confirmed",
    preheader: "Your enrollment record has been confirmed.",
    body: "<p>Hello {{student_name}},</p><p>Your enrollment for <strong>{{course_name}}</strong> has been confirmed with {{institution_name}}.</p><p><strong>Status:</strong> {{enrollment_status}}</p><p><strong>Reference:</strong> {{reference_id}}</p>",
    variables: ["student_name", "course_name", "enrollment_status", "reference_id", "institution_name"],
  },
  {
    template_id: "application_approved_email",
    type: "email",
    event_trigger: "student.application_approved",
    category: "admissions",
    language: "en",
    version: 1,
    subject: "Application Approved - {{student_name}}",
    title: "Application approved",
    preheader: "Your application has been approved.",
    body: "<p>Hello {{student_name}},</p><p>Your application for <strong>{{program_name}}</strong> has been approved.</p><p>The Mtendere team will guide you through the next steps and document requirements.</p><p><strong>Reference:</strong> {{reference_id}}</p>",
    variables: ["student_name", "program_name", "reference_id"],
  },
  {
    template_id: "payment_received_email",
    type: "email",
    event_trigger: "payment.received",
    category: "payments",
    language: "en",
    version: 1,
    subject: "Payment Confirmation - {{reference_id}}",
    title: "Payment received",
    preheader: "Your payment has been recorded.",
    body: "<p>Hello {{recipient_name}},</p><p>We have recorded your payment of <strong>{{amount}} {{currency}}</strong>.</p><p><strong>Status:</strong> {{payment_status}}</p><p><strong>Reference:</strong> {{reference_id}}</p><p>{{document_notice}}</p>",
    variables: ["recipient_name", "amount", "currency", "payment_status", "reference_id", "document_notice"],
    defaults: { currency: "USD", payment_status: "confirmed", document_notice: "" },
  },
  {
    template_id: "payment_failed_email",
    type: "email",
    event_trigger: "payment.failed",
    category: "payments",
    language: "en",
    version: 1,
    subject: "Payment Issue - {{reference_id}}",
    title: "Payment could not be confirmed",
    preheader: "A payment attempt needs attention.",
    body: "<p>Hello {{recipient_name}},</p><p>We could not confirm the payment attempt for <strong>{{amount}} {{currency}}</strong>.</p><p><strong>Status:</strong> {{payment_status}}</p><p><strong>Reference:</strong> {{reference_id}}</p><p>{{message}}</p>{{#if payment_status=overdue}}<p><strong>Action required:</strong> Please complete this payment to avoid delays in admissions processing.</p>{{/if}}",
    variables: ["recipient_name", "amount", "currency", "payment_status", "reference_id", "message"],
    defaults: { currency: "USD", payment_status: "failed", message: "Please contact support if you need help completing this payment." },
  },
  {
    template_id: "security_alert_email",
    type: "email",
    event_trigger: "system.security_event",
    category: "system",
    language: "en",
    version: 1,
    subject: "Security Alert - {{event_title}}",
    title: "Security alert",
    preheader: "A high-priority security event was recorded.",
    body: "<p><strong>Event:</strong> {{event_title}}</p><p>{{message}}</p><p><strong>Source:</strong> {{source}}</p><p><strong>Reference:</strong> {{reference_id}}</p>",
    variables: ["event_title", "message", "source", "reference_id"],
  },
  {
    template_id: "system_alert_email",
    type: "email",
    event_trigger: "system.alert",
    category: "system",
    language: "en",
    version: 1,
    subject: "System Alert - {{event_title}}",
    title: "System alert",
    preheader: "A platform alert needs attention.",
    body: "<p><strong>Alert:</strong> {{event_title}}</p><p>{{message}}</p><p><strong>Reference:</strong> {{reference_id}}</p>",
    variables: ["event_title", "message", "reference_id"],
  },
  {
    template_id: "admin_user_created_email",
    type: "email",
    event_trigger: "admin.user_created",
    category: "system",
    language: "en",
    version: 1,
    subject: "Admin User Created - {{admin_email}}",
    title: "Admin user created",
    preheader: "A new administrative account was created.",
    body: "<p>A new admin account has been created.</p><p><strong>Email:</strong> {{admin_email}}</p><p><strong>Role:</strong> {{role}}</p><p><strong>Created by:</strong> {{created_by}}</p>",
    variables: ["admin_email", "role", "created_by"],
  },
  {
    template_id: "payment_received_sms",
    type: "sms",
    event_trigger: "payment.received",
    category: "payments",
    language: "en",
    version: 1,
    body: "Mtendere: payment {{amount}} {{currency}} received. Ref {{reference_id}}.",
    variables: ["amount", "currency", "reference_id"],
  },
  {
    template_id: "payment_failed_sms",
    type: "sms",
    event_trigger: "payment.failed",
    category: "payments",
    language: "en",
    version: 1,
    body: "Mtendere: payment not confirmed. Ref {{reference_id}}. Contact support if this looks wrong.",
    variables: ["reference_id"],
  },
  {
    template_id: "security_alert_sms",
    type: "sms",
    event_trigger: "system.security_event",
    category: "system",
    language: "en",
    version: 1,
    body: "Mtendere security alert: {{event_title}}. Ref {{reference_id}}.",
    variables: ["event_title", "reference_id"],
  },
  {
    template_id: "generic_inapp_alert",
    type: "inapp",
    event_trigger: "*",
    category: "system",
    language: "en",
    version: 1,
    title: "{{event_title}}",
    body: "{{message}}",
    variables: ["event_title", "message"],
    defaults: { event_title: "Platform notification", message: "A platform event was recorded." },
  },
  {
    template_id: "enrollment_confirmation_document",
    type: "document",
    event_trigger: "student.enrolled",
    category: "admissions",
    language: "en",
    version: 1,
    subject: "Enrollment Confirmation",
    title: "Enrollment Confirmation",
    body: "This confirms that {{student_name}} has been enrolled for {{course_name}}. Enrollment status: {{enrollment_status}}.",
    variables: ["student_name", "course_name", "enrollment_status", "reference_id", "date"],
  },
  {
    template_id: "payment_receipt_document",
    type: "document",
    event_trigger: "payment.received",
    category: "payments",
    language: "en",
    version: 1,
    subject: "Payment Receipt",
    title: "Payment Receipt",
    body: "This confirms receipt of {{amount}} {{currency}} from {{recipient_name}}. Payment status: {{payment_status}}.",
    variables: ["recipient_name", "amount", "currency", "payment_status", "reference_id", "date"],
    defaults: { currency: "USD", payment_status: "confirmed" },
  },
  {
    template_id: "admission_letter_document",
    type: "document",
    event_trigger: "student.application_approved",
    category: "admissions",
    language: "en",
    version: 1,
    subject: "Admission Letter",
    title: "Admission Letter",
    body: "We are pleased to confirm that {{student_name}} has been approved for {{program_name}}. Please follow the next-step guidance shared by the administration team.",
    variables: ["student_name", "program_name", "reference_id", "date"],
  },
];

const routes: RouteDefinition[] = [
  { eventType: "student.registered", channel: "email", templateId: "student_registration_email", priority: "medium", emailCategory: "welcome", recipientField: "email" },
  { eventType: "student.registered", channel: "inapp", templateId: "generic_inapp_alert", priority: "medium" },
  { eventType: "student.enrolled", channel: "document", templateId: "enrollment_confirmation_document", priority: "medium" },
  { eventType: "student.enrolled", channel: "email", templateId: "student_enrollment_email", priority: "medium", emailCategory: "application_status_update", recipientField: "email" },
  { eventType: "student.enrolled", channel: "inapp", templateId: "generic_inapp_alert", priority: "medium" },
  { eventType: "student.application_approved", channel: "document", templateId: "admission_letter_document", priority: "medium" },
  { eventType: "student.application_approved", channel: "email", templateId: "application_approved_email", priority: "medium", emailCategory: "application_approved", recipientField: "email" },
  { eventType: "student.application_approved", channel: "inapp", templateId: "generic_inapp_alert", priority: "medium" },
  { eventType: "payment.received", channel: "document", templateId: "payment_receipt_document", priority: "high" },
  { eventType: "student.payment_confirmed", channel: "document", templateId: "payment_receipt_document", priority: "high" },
  { eventType: "student.payment_confirmed", channel: "email", templateId: "payment_received_email", priority: "high", emailCategory: "payment_confirmation", recipientField: "email" },
  { eventType: "student.payment_confirmed", channel: "sms", templateId: "payment_received_sms", priority: "high", recipientField: "phone" },
  { eventType: "student.payment_confirmed", channel: "inapp", templateId: "generic_inapp_alert", priority: "high" },
  { eventType: "payment.received", channel: "email", templateId: "payment_received_email", priority: "high", emailCategory: "payment_confirmation", recipientField: "email" },
  { eventType: "payment.received", channel: "sms", templateId: "payment_received_sms", priority: "high", recipientField: "phone" },
  { eventType: "payment.received", channel: "inapp", templateId: "generic_inapp_alert", priority: "high" },
  { eventType: "payment.failed", channel: "email", templateId: "payment_failed_email", priority: "high", emailCategory: "payment_failed", recipientField: "email" },
  { eventType: "payment.failed", channel: "email", templateId: "system_alert_email", priority: "high", emailCategory: "admin_notification", recipientField: "admin_notification_email" },
  { eventType: "payment.failed", channel: "sms", templateId: "payment_failed_sms", priority: "high", recipientField: "phone" },
  { eventType: "payment.failed", channel: "inapp", templateId: "generic_inapp_alert", priority: "high" },
  { eventType: "invoice.generated", channel: "email", templateId: "payment_received_email", priority: "medium", emailCategory: "invoice_generated", recipientField: "email" },
  { eventType: "admin.user_created", channel: "email", templateId: "admin_user_created_email", priority: "high", emailCategory: "admin_notification", recipientField: "admin_notification_email" },
  { eventType: "admin.user_created", channel: "inapp", templateId: "generic_inapp_alert", priority: "high" },
  { eventType: "admin.role_updated", channel: "inapp", templateId: "generic_inapp_alert", priority: "high" },
  { eventType: "admin.data_exported", channel: "inapp", templateId: "generic_inapp_alert", priority: "high" },
  { eventType: "system.security_event", channel: "email", templateId: "security_alert_email", priority: "high", emailCategory: "security_alert", recipientField: "admin_notification_email" },
  { eventType: "system.security_event", channel: "sms", templateId: "security_alert_sms", priority: "high", recipientField: "admin_phone" },
  { eventType: "system.security_event", channel: "inapp", templateId: "generic_inapp_alert", priority: "high" },
  { eventType: "system.alert", channel: "email", templateId: "system_alert_email", priority: "high", emailCategory: "admin_notification", recipientField: "admin_notification_email" },
  { eventType: "system.alert", channel: "inapp", templateId: "generic_inapp_alert", priority: "high" },
];

const getTemplate = (templateId: string) =>
  defaultTemplates.find((template) => template.template_id === templateId);

const builtInVariables = new Set([
  "institution_name",
  "institution_address",
  "institution_email",
  "institution_phone",
  "institution_website",
  "event_type",
  "event_title",
  "source",
  "date",
  "reference_id",
]);

const extractTemplateTokens = (template: TemplateDefinition) => {
  const source = [
    template.subject,
    template.title,
    template.preheader,
    template.body,
  ].filter(Boolean).join("\n");
  const tokens = new Set<string>();
  source.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, token: string) => {
    tokens.add(token);
    return "";
  });
  source.replace(/\{\{#if\s+([^}]+)\}\}/g, (_match, expression: string) => {
    const key = expression.trim().match(/^([a-zA-Z0-9_.-]+)/)?.[1];
    if (key) tokens.add(key);
    return "";
  });
  return [...tokens].sort();
};

const buildVariableReport = (template: TemplateDefinition) => {
  const tokens = extractTemplateTokens(template);
  const declared = new Set(template.variables);
  const defaults = new Set(Object.keys(template.defaults || {}));
  return {
    used: tokens,
    declared: template.variables,
    undeclared: tokens.filter((token) => !declared.has(token) && !defaults.has(token) && !builtInVariables.has(token)),
    unusedDeclared: template.variables.filter((variable) => !tokens.includes(variable) && !builtInVariables.has(variable)),
  };
};

const analyzeTemplateQuality = (template: TemplateDefinition) => {
  const source = [template.subject, template.preheader, template.body].filter(Boolean).join(" ");
  const lower = source.toLowerCase();
  const spamSignals = [
    "free money",
    "guaranteed",
    "act now",
    "urgent!!!",
    "risk-free",
    "limited time",
  ].filter((signal) => lower.includes(signal));
  const subjectLength = (template.subject || template.title || "").length;
  const hasCta = /<a\s|button|href=|contact|download|apply|pay|verify/i.test(template.body);
  const hasFooterNotice = template.type !== "email" || /automated|support|contact|privacy|unsubscribe/i.test(template.body);
  const issues = [
    subjectLength > 78
      ? { severity: "warning", code: "subject_long", message: "Subject may truncate in inbox previews." }
      : null,
    template.type === "email" && !hasCta
      ? { severity: "info", code: "cta_missing", message: "Consider adding a clear next action for this email." }
      : null,
    spamSignals.length > 0
      ? { severity: "warning", code: "spam_signal", message: `Potential spam-risk phrases: ${spamSignals.join(", ")}.` }
      : null,
    !hasFooterNotice
      ? { severity: "info", code: "support_notice_missing", message: "Template body does not mention support/contact context." }
      : null,
  ].filter(Boolean);

  return {
    score: Math.max(0, 100 - issues.length * 12 - spamSignals.length * 10),
    subjectLength,
    spamSignals,
    issues,
  };
};

const communicationRateLimits = new Map<string, { count: number; resetAt: number }>();

const checkCommunicationRateLimit = (event: CommunicationEvent) => {
  const recipient = textValue(event.payload.email || event.payload.recipient_email || event.user_id || "system");
  const key = `${event.event_type}:${recipient}`;
  const now = Date.now();
  const current = communicationRateLimits.get(key);

  if (!current || current.resetAt <= now) {
    communicationRateLimits.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  current.count += 1;
  return current.count <= 20;
};

const resolveRecipient = (event: CommunicationEvent, route: RouteDefinition) => {
  const field = route.recipientField;
  if (field === "admin_notification_email") return supportEmail;
  if (!field) return null;

  const value = getPath(event.payload, field);
  if (typeof value !== "string" || !value.trim()) return null;
  return extractEmailAddress(value) || value.trim();
};

const renderTemplate = (
  template: TemplateDefinition,
  event: CommunicationEvent,
  additions: Record<string, unknown> = {},
): RenderedTemplate => {
  const variables = normalizeVariables(
    {
      event_type: event.event_type,
      event_title: textValue(event.payload.event_title || event.event_type.replace(/[._-]+/g, " ")),
      source: event.source,
      reference_id: buildReference(event.payload),
      ...event.payload,
      ...additions,
    },
    template.defaults,
  );
  const subject = renderString(template.subject || template.title || template.template_id, variables, "text");
  const title = renderString(template.title || subject, variables, "text");
  const htmlBody = renderString(template.body, variables, "html");
  const text = stripHtml(renderString(template.body, variables, "text"));
  const html = template.type === "email"
    ? renderMtendereEmail({
        title,
        preheader: renderString(template.preheader || subject, variables, "text"),
        body: htmlBody,
      })
    : htmlBody;

  return { subject, title, html, text };
};

const pdfEscape = (value: string) => value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const wrapText = (text: string, width = 92) => {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
};

type LetterheadLogo = {
  data: Buffer;
  width: number;
  height: number;
};

let cachedLetterheadLogo: LetterheadLogo | null | undefined;

const readJpegDimensions = (data: Buffer) => {
  for (let offset = 2; offset < data.length;) {
    if (data[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = data[offset + 1];
    if (marker === 0xd9 || marker === 0xda) break;
    const length = data.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3].includes(marker)) {
      return {
        height: data.readUInt16BE(offset + 5),
        width: data.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  return null;
};

const getLetterheadLogo = () => {
  if (cachedLetterheadLogo !== undefined) return cachedLetterheadLogo;

  const candidates = [
    path.resolve(process.cwd(), "client/src/assets/imgs/mtendere-logo.jpeg"),
    path.resolve(process.cwd(), "client/src/assets/imgs/Mtendere_Logo.jpg"),
  ];

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const data = fs.readFileSync(candidate);
    const dimensions = readJpegDimensions(data);
    if (dimensions) {
      cachedLetterheadLogo = { data, ...dimensions };
      return cachedLetterheadLogo;
    }
  }

  cachedLetterheadLogo = null;
  return cachedLetterheadLogo;
};

const createPdfObject = (index: number, body: string | Buffer) =>
  Buffer.concat([
    Buffer.from(`${index} 0 obj\n`, "utf8"),
    typeof body === "string" ? Buffer.from(body, "utf8") : body,
    Buffer.from("\nendobj\n", "utf8"),
  ]);

const createSimplePdf = (lines: string[]) => {
  const logo = getLetterheadLogo();
  const logoDrawWidth = 58;
  const logoDrawHeight = logo ? Math.min(58, logoDrawWidth * (logo.height / logo.width)) : 0;
  const textX = logo ? 122 : 50;
  const textY = logo ? 775 : 790;
  const contentLines = [
    ...(logo
      ? [
          "q",
          `${logoDrawWidth.toFixed(2)} 0 0 ${logoDrawHeight.toFixed(2)} 50 ${(780 - logoDrawHeight).toFixed(2)} cm`,
          "/Logo Do",
          "Q",
        ]
      : []),
    "BT",
    "/F1 11 Tf",
    `${textX} ${textY} Td`,
    "14 TL",
    ...lines.flatMap((line, index) => [
      index === 0 ? "" : "T*",
      `(${pdfEscape(line)}) Tj`,
    ]).filter(Boolean),
    "ET",
  ];
  const stream = contentLines.join("\n");
  const objects = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "utf8"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "utf8"),
    Buffer.from(
      logo
        ? "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> /XObject << /Logo 6 0 R >> >> /Contents 5 0 R >>"
        : "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
      "utf8",
    ),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", "utf8"),
    Buffer.from(`<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`, "utf8"),
    ...(logo
      ? [
          Buffer.concat([
            Buffer.from(
              `<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.data.length} >>\nstream\n`,
              "utf8",
            ),
            logo.data,
            Buffer.from("\nendstream", "utf8"),
          ]),
        ]
      : []),
  ];
  const parts = [Buffer.from("%PDF-1.4\n", "utf8")];
  const offsets = [0];
  let currentOffset = parts[0].length;

  objects.forEach((object, index) => {
    offsets.push(currentOffset);
    const pdfObject = createPdfObject(index + 1, object);
    parts.push(pdfObject);
    currentOffset += pdfObject.length;
  });

  const xrefOffset = currentOffset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  parts.push(Buffer.from(xref, "utf8"));
  return Buffer.concat(parts);
};

const getDocumentExpiryTimestamp = () =>
  Date.now() + env.COMMUNICATION_DOCUMENT_LINK_TTL_DAYS * 24 * 60 * 60 * 1000;

const documentDownloadToken = (fileName: string, expiresAt?: string | number | null) =>
  createHmac("sha256", env.JWT_SECRET)
    .update(expiresAt ? `generated-document:${fileName}:${expiresAt}` : `generated-document:${fileName}`)
    .digest("hex");

export const verifyGeneratedDocumentToken = (
  fileName: string,
  token: string | null | undefined,
  expiresAt?: string | number | null,
) => {
  if (!token) return false;
  if (!expiresAt) return documentDownloadToken(fileName) === token;

  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || expiry <= Date.now()) return false;
  return documentDownloadToken(fileName, expiry) === token;
};

export const getGeneratedDocumentPath = (fileName: string) => {
  if (!/^[a-z0-9-]+\.pdf$/i.test(fileName)) return null;
  const filePath = path.join(generatedDocumentDir, fileName);
  return fs.existsSync(filePath) ? filePath : null;
};

const generateDocument = async (
  template: TemplateDefinition,
  event: CommunicationEvent,
  eventId: string,
  additions: Record<string, unknown> = {},
): Promise<GeneratedDocument> => {
  const rendered = renderTemplate(template, event, additions);
  const reference = buildReference(event.payload);
  const recipientName = textValue(event.payload.recipient_name || event.payload.student_name || event.payload.name);
  const lines = [
    institution.name.toUpperCase(),
    institution.address,
    `${institution.email} | ${institution.phone}`,
    "",
    `Ref: ${reference}`,
    `Date: ${new Date().toISOString().slice(0, 10)}`,
    "",
    `To: ${recipientName}`,
    "",
    `Subject: ${rendered.title}`,
    "",
    `Dear ${recipientName},`,
    "",
    ...wrapText(rendered.text || stripHtml(rendered.html)),
    "",
    "Sincerely,",
    "Administration",
    institution.name,
    "",
    "This is a system-generated official document.",
  ];
  const documentId = randomUUID();
  const fileName = `${documentId}.pdf`;
  const filePath = path.join(generatedDocumentDir, fileName);
  fs.writeFileSync(filePath, createSimplePdf(lines));
  const expiresAt = getDocumentExpiryTimestamp();
  const token = documentDownloadToken(fileName, expiresAt);
  const downloadUrl = publicBaseUrl
    ? `${publicBaseUrl}/api/documents/generated/${fileName}?exp=${expiresAt}&t=${token}`
    : `/api/documents/generated/${fileName}?exp=${expiresAt}&t=${token}`;

  await auditCommunicationMessage({
    message_id: documentId,
    event_id: eventId,
    event_type: event.event_type,
    channel: "document",
    status: "generated",
    recipient: recipientName,
    template_id: template.template_id,
    subject: rendered.title,
    priority: event.priority,
    metadata: { fileName, reference, downloadUrl, expiresAt },
  });

  return { documentId, fileName, filePath, downloadUrl, mimeType: "application/pdf" };
};

const priorityRank: Record<CommunicationPriority, number> = {
  high: 10,
  medium: 70,
  low: 120,
};

export const auditCommunicationMessage = async (record: {
  message_id: string;
  event_id?: string;
  event_type: string;
  channel: CommunicationChannel;
  status: string;
  recipient?: string | null;
  template_id?: string;
  subject?: string | null;
  priority?: CommunicationPriority;
  provider?: string | null;
  provider_message_id?: string | null;
  metadata?: Record<string, unknown>;
  diagnostics?: Record<string, unknown>;
}) => {
  const entry = {
    ...record,
    timestamp: new Date().toISOString(),
  };
  appendJsonl(messageAuditPath, entry);
  await storage.createCommunicationMessage({
    id: record.message_id,
    eventId: record.event_id ?? null,
    eventType: record.event_type,
    channel: record.channel,
    templateId: record.template_id ?? null,
    recipient: record.recipient ?? null,
    subject: record.subject ?? null,
    status: record.status,
    priority: record.priority ?? "medium",
    provider: record.provider ?? null,
    providerMessageId: record.provider_message_id ?? null,
    metadata: record.metadata ?? null,
    diagnostics: record.diagnostics ?? null,
  }).catch(() => undefined);
  await storage.logAnalytics({
    event: "communication_message",
    userId: undefined,
    metadata: entry,
  }).catch(() => undefined);
  return entry;
};

const mapCommunicationMessageRecord = (message: Awaited<ReturnType<typeof storage.getCommunicationMessages>>[number]) => ({
  message_id: message.id,
  event_id: message.eventId,
  event_type: message.eventType,
  channel: message.channel,
  status: message.status,
  recipient: message.recipient,
  template_id: message.templateId,
  subject: message.subject,
  priority: message.priority,
  provider: message.provider,
  provider_message_id: message.providerMessageId,
  metadata: message.metadata,
  diagnostics: message.diagnostics,
  timestamp: message.createdAt instanceof Date ? message.createdAt.toISOString() : message.createdAt,
});

export const getCommunicationAudit = async (limit = 100) => {
  const cappedLimit = Math.max(1, Math.min(limit, 500));
  const dbMessages = await storage.getCommunicationMessages(cappedLimit).catch(() => []);
  if (dbMessages.length > 0) {
    return dbMessages.map(mapCommunicationMessageRecord);
  }

  return readJsonlRecords(messageAuditPath)
    .slice(-cappedLimit)
    .reverse();
};

export const getCommunicationTemplates = () =>
  defaultTemplates.map((template) => ({
    template_id: template.template_id,
    type: template.type,
    event_trigger: template.event_trigger,
    category: template.category || "system",
    language: template.language || "en",
    version: template.version || 1,
    subject: template.subject,
    title: template.title,
    variables: template.variables,
    variableDiagnostics: buildVariableReport(template),
    quality: analyzeTemplateQuality(template),
  }));

export const getCommunicationTemplate = (templateId: string) => {
  const template = getTemplate(templateId);
  if (!template) return null;
  return {
    ...template,
    variableDiagnostics: buildVariableReport(template),
    quality: analyzeTemplateQuality(template),
  };
};

export const getCommunicationRoutes = () =>
  routes.map((route) => ({ ...route }));

export const getCommunicationDiagnostics = () => {
  const templateIds = new Set(defaultTemplates.map((template) => template.template_id));
  const routedTemplateIds = new Set(routes.map((route) => route.templateId));
  const missingTemplates = routes
    .filter((route) => !templateIds.has(route.templateId))
    .map((route) => ({
      eventType: route.eventType,
      channel: route.channel,
      templateId: route.templateId,
    }));
  const orphanTemplates = defaultTemplates
    .filter((template) => template.event_trigger !== "*" && !routedTemplateIds.has(template.template_id))
    .map((template) => template.template_id);
  const templateDiagnostics = defaultTemplates.map((template) => ({
    templateId: template.template_id,
    type: template.type,
    category: template.category || "system",
    language: template.language || "en",
    version: template.version || 1,
    eventTrigger: template.event_trigger,
    ...buildVariableReport(template),
    quality: analyzeTemplateQuality(template),
  }));

  return {
    templates: {
      total: defaultTemplates.length,
      byType: defaultTemplates.reduce<Record<string, number>>((counts, template) => {
        counts[template.type] = (counts[template.type] || 0) + 1;
        return counts;
      }, {}),
      diagnostics: templateDiagnostics,
      orphanTemplates,
    },
    routes: {
      total: routes.length,
      byChannel: routes.reduce<Record<string, number>>((counts, route) => {
        counts[route.channel] = (counts[route.channel] || 0) + 1;
        return counts;
      }, {}),
      missingTemplates,
    },
    providers: getNotificationProviderDiagnostics(),
    generatedDocuments: {
      directory: generatedDocumentDir,
      linkTtlDays: env.COMMUNICATION_DOCUMENT_LINK_TTL_DAYS,
    },
  };
};

export const renderCommunicationTemplatePreview = (
  templateId: string,
  input: {
    eventType?: string;
    source?: CommunicationSource;
    userId?: number | null;
    payload?: Record<string, unknown>;
  } = {},
) => {
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error("Communication template was not found");
  }

  const event: CommunicationEvent = {
    event_type: input.eventType || (template.event_trigger === "*" ? "system.alert" : template.event_trigger),
    timestamp: new Date().toISOString(),
    source: input.source || "admin",
    user_id: input.userId ?? null,
    payload: input.payload || {},
  };
  const rendered = renderTemplate(template, event);
  const variableDiagnostics = buildVariableReport(template);
  const normalizedVariables = normalizeVariables({
    event_type: event.event_type,
    event_title: textValue(event.payload.event_title || event.event_type.replace(/[._-]+/g, " ")),
    source: event.source,
    reference_id: buildReference(event.payload),
    ...event.payload,
  }, template.defaults);

  return {
    template: getCommunicationTemplate(templateId),
    event,
    rendered,
    quality: analyzeTemplateQuality(template),
    variableDiagnostics: {
      ...variableDiagnostics,
      missingPayloadValues: variableDiagnostics.used.filter((token) => {
        const value = getPath(normalizedVariables, token);
        return value === undefined || value === null || value === "";
      }),
    },
  };
};

const persistCommunicationEvent = async (eventId: string, event: CommunicationEvent) => {
  appendJsonl(eventLogPath, { id: eventId, ...event });
  await storage.createCommunicationEvent({
    id: eventId,
    eventType: event.event_type,
    source: event.source,
    userId: event.user_id ?? null,
    priority: event.priority ?? "medium",
    payload: event.payload,
    status: "received",
    occurredAt: safeDate(event.timestamp),
  }).catch(() => undefined);
};

const updateCommunicationEventStatus = async (
  eventId: string,
  status: string,
  details: { processedAt?: Date | null; lastError?: string | null } = {},
) => {
  await storage.updateCommunicationEventStatus(eventId, status, details).catch(() => undefined);
};

type ReplayableCommunicationEvent = {
  event_type: string;
  source: CommunicationSource;
  user_id?: number | null;
  priority?: CommunicationPriority;
  payload: Record<string, unknown>;
  timestamp: string;
};

const getCommunicationEventForReplay = async (eventId: string): Promise<ReplayableCommunicationEvent | null> => {
  const dbEvent = await storage.getCommunicationEvent(eventId).catch(() => undefined);
  if (dbEvent) {
    return {
      event_type: dbEvent.eventType,
      source: isCommunicationSource(dbEvent.source) ? dbEvent.source : "system",
      user_id: dbEvent.userId,
      priority: isCommunicationPriority(dbEvent.priority) ? dbEvent.priority : undefined,
      payload: dbEvent.payload || {},
      timestamp: dbEvent.occurredAt instanceof Date ? dbEvent.occurredAt.toISOString() : new Date().toISOString(),
    };
  }

  const eventRecord = readJsonlRecords(eventLogPath).find((record) => record.id === eventId);
  if (!eventRecord) return null;
  return {
    event_type: textValue(eventRecord.event_type),
    source: isCommunicationSource(eventRecord.source) ? eventRecord.source : "system",
    user_id: typeof eventRecord.user_id === "number" ? eventRecord.user_id : null,
    priority: isCommunicationPriority(eventRecord.priority) ? eventRecord.priority : undefined,
    payload: eventRecord.payload && typeof eventRecord.payload === "object"
      ? eventRecord.payload as Record<string, unknown>
      : {},
    timestamp: textValue(eventRecord.timestamp || new Date().toISOString()),
  };
};

export const getCommunicationMessage = async (messageId: string) => {
  const dbMessage = await storage.getCommunicationMessage(messageId).catch(() => undefined);
  if (dbMessage) return mapCommunicationMessageRecord(dbMessage);

  return readJsonlRecords(messageAuditPath)
    .reverse()
    .find((record) => record.message_id === messageId) || null;
};

export const getCommunicationAnalytics = async (limit = 500) => {
  const messages = await getCommunicationAudit(limit);
  type CommunicationAnalyticsCounts = {
    byChannel: Record<string, number>;
    byStatus: Record<string, number>;
    byTemplate: Record<string, number>;
    byEventType: Record<string, number>;
    problemCount: number;
  };
  const initialCounts: CommunicationAnalyticsCounts = {
    byChannel: {},
    byStatus: {},
    byTemplate: {},
    byEventType: {},
    problemCount: 0,
  };
  const counts = messages.reduce<CommunicationAnalyticsCounts>(
    (acc, message) => {
      const channel = textValue(message.channel || "unknown");
      const status = textValue(message.status || "unknown");
      const template = textValue(message.template_id || "untemplated");
      const eventType = textValue(message.event_type || "unknown");
      acc.byChannel[channel] = (acc.byChannel[channel] || 0) + 1;
      acc.byStatus[status] = (acc.byStatus[status] || 0) + 1;
      acc.byTemplate[template] = (acc.byTemplate[template] || 0) + 1;
      acc.byEventType[eventType] = (acc.byEventType[eventType] || 0) + 1;
      if (/(failed|missing|unsupported|rate_limited|rejected|bounced|complaint)/i.test(status)) {
        acc.problemCount += 1;
      }
      return acc;
    },
    initialCounts,
  );

  return {
    total: messages.length,
    problemRate: messages.length > 0 ? counts.problemCount / messages.length : 0,
    ...counts,
    recentProblems: messages
      .filter((message) => /(failed|missing|unsupported|rate_limited|rejected|bounced|complaint)/i.test(textValue(message.status)))
      .slice(0, 20),
  };
};

export const getCommunicationTimeline = async (input: {
  userId?: number | null;
  email?: string | null;
  limit?: number;
}) => {
  const limit = Math.max(1, Math.min(input.limit || 100, 500));
  const normalizedEmail = extractEmailAddress(input.email || undefined);
  const userRecipient = input.userId ? String(input.userId) : null;
  const messages = await getCommunicationAudit(500);
  const filtered = messages.filter((message) => {
    const recipient = typeof message.recipient === "string" ? message.recipient.toLowerCase() : "";
    const metadata = message.metadata && typeof message.metadata === "object" ? message.metadata as Record<string, unknown> : {};
    const diagnostics = message.diagnostics && typeof message.diagnostics === "object" ? message.diagnostics as Record<string, unknown> : {};
    const haystack = JSON.stringify({ metadata, diagnostics }).toLowerCase();
    return (
      (normalizedEmail && (recipient === normalizedEmail || haystack.includes(normalizedEmail))) ||
      (userRecipient && (recipient === userRecipient || haystack.includes(`"userid":${userRecipient}`)))
    );
  });

  const items = await Promise.all(
    filtered.slice(0, limit).map(async (message) => {
      const eventId = typeof message.event_id === "string" ? message.event_id : null;
      const event = eventId ? await getCommunicationEventForReplay(eventId).catch(() => null) : null;
      return {
        ...message,
        sourceEvent: event
          ? {
              event_type: event.event_type,
              source: event.source,
              user_id: event.user_id,
              priority: event.priority,
              timestamp: event.timestamp,
            }
          : null,
      };
    }),
  );

  return {
    query: { userId: input.userId ?? null, email: normalizedEmail },
    total: filtered.length,
    items,
  };
};

export const replayCommunicationEvent = async (
  eventId: string,
  additions: Record<string, unknown> = {},
) => {
  const event = await getCommunicationEventForReplay(eventId);
  if (!event) {
    throw new Error("Communication event was not found");
  }

  return emitCommunicationEvent({
    event_type: event.event_type,
    source: event.source,
    user_id: event.user_id,
    priority: event.priority,
    payload: {
      ...event.payload,
      ...additions,
      replayed_from_event_id: eventId,
      replayed_at: new Date().toISOString(),
    },
  });
};

export const emitCommunicationEvent = async (
  input: Omit<CommunicationEvent, "timestamp"> & { timestamp?: string },
) => {
  const event: CommunicationEvent = {
    ...input,
    payload: input.payload || {},
    timestamp: input.timestamp || new Date().toISOString(),
  };
  const eventId = randomUUID();
  await persistCommunicationEvent(eventId, event);

  if (!checkCommunicationRateLimit(event)) {
    await auditCommunicationMessage({
      message_id: eventId,
      event_id: eventId,
      event_type: event.event_type,
      channel: "inapp",
      status: "rate_limited",
      recipient: textValue(event.payload.email || event.user_id || "system"),
      priority: event.priority ?? "medium",
      metadata: { source: event.source },
    });
    await updateCommunicationEventStatus(eventId, "rate_limited", { processedAt: new Date() });
    return { eventId, status: "rate_limited", results: [] };
  }

  try {
    const matchingRoutes = routes.filter((route) => route.eventType === event.event_type);
    const documentResults: GeneratedDocument[] = [];
    const results: Array<Record<string, unknown>> = [];

    if (matchingRoutes.length === 0) {
      await auditCommunicationMessage({
        message_id: randomUUID(),
        event_id: eventId,
        event_type: event.event_type,
        channel: "inapp",
        status: "skipped_no_routes",
        recipient: event.user_id ? String(event.user_id) : "system",
        priority: event.priority ?? "medium",
        metadata: { source: event.source },
      });
      await updateCommunicationEventStatus(eventId, "processed", { processedAt: new Date() });
      return { eventId, status: "processed", results, documents: documentResults };
    }

    for (const route of matchingRoutes.filter((item) => item.channel === "document")) {
      const template = getTemplate(route.templateId);
      if (!template) {
        await auditCommunicationMessage({
          message_id: randomUUID(),
          event_id: eventId,
          event_type: event.event_type,
          channel: route.channel,
          status: "skipped_missing_template",
          template_id: route.templateId,
          priority: event.priority ?? route.priority,
        });
        continue;
      }
      const document = await generateDocument(template, event, eventId);
      documentResults.push(document);
      results.push({ channel: "document", status: "generated", document });
    }

    const firstDocument = documentResults[0];
    const additions = firstDocument
      ? {
          document_link: firstDocument.downloadUrl,
          document_notice: `Download your official document: ${firstDocument.downloadUrl}`,
        }
      : {};

    for (const route of matchingRoutes.filter((item) => item.channel !== "document")) {
      const template = getTemplate(route.templateId);
      if (!template) {
        await auditCommunicationMessage({
          message_id: randomUUID(),
          event_id: eventId,
          event_type: event.event_type,
          channel: route.channel,
          status: "skipped_missing_template",
          template_id: route.templateId,
          priority: event.priority ?? route.priority,
        });
        continue;
      }

      const rendered = renderTemplate(template, event, additions);
      const recipient = resolveRecipient(event, route);
      const priority = event.priority || route.priority;

      if (route.channel === "email") {
        if (!recipient) {
          await auditCommunicationMessage({
            message_id: randomUUID(),
            event_id: eventId,
            event_type: event.event_type,
            channel: "email",
            status: "skipped_missing_recipient",
            template_id: template.template_id,
            subject: rendered.subject,
            priority,
            diagnostics: { recipientField: route.recipientField || null },
          });
          continue;
        }

        const delivery = await enqueueEmail(
          {
            to: recipient,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
            category: route.emailCategory || "admin_notification",
            metadata: {
              eventId,
              eventType: event.event_type,
              templateId: template.template_id,
              source: event.source,
              documentUrl: firstDocument?.downloadUrl,
            },
            headers: {
              "X-MEC-Event-Type": event.event_type,
              "X-MEC-Template": template.template_id,
            },
            priority: priorityRank[priority],
          },
          { awaitDelivery: priority === "high" },
        );
        await auditCommunicationMessage({
          message_id: delivery.id,
          event_id: eventId,
          event_type: event.event_type,
          channel: "email",
          status: delivery.status,
          recipient,
          template_id: template.template_id,
          subject: rendered.subject,
          priority,
          provider: delivery.provider,
          provider_message_id: delivery.providerMessageId ?? null,
          metadata: { provider: delivery.provider, providerMessageId: delivery.providerMessageId },
        });
        results.push({ channel: "email", recipient, delivery });
        continue;
      }

      if (route.channel === "inapp") {
        const notificationId = randomUUID();
        await storage.logAnalytics({
          event: "inapp_notification_created",
          userId: event.user_id ?? undefined,
          metadata: {
            notificationId,
            eventId,
            eventType: event.event_type,
            title: rendered.title,
            message: rendered.text,
            priority,
            payload: event.payload,
          },
        }).catch(() => undefined);
        await auditCommunicationMessage({
          message_id: notificationId,
          event_id: eventId,
          event_type: event.event_type,
          channel: "inapp",
          status: "created",
          recipient: event.user_id ? String(event.user_id) : "admin",
          template_id: template.template_id,
          subject: rendered.title,
          priority,
        });
        results.push({ channel: "inapp", status: "created", notificationId });
        continue;
      }

      if (route.channel === "sms" || route.channel === "whatsapp") {
        if (!recipient) {
          await auditCommunicationMessage({
            message_id: randomUUID(),
            event_id: eventId,
            event_type: event.event_type,
            channel: route.channel,
            status: "skipped_missing_recipient",
            template_id: template.template_id,
            subject: rendered.title,
            priority,
            diagnostics: { recipientField: route.recipientField || null },
          });
          continue;
        }

        const delivery = await sendNotification({
          channel: route.channel,
          to: recipient,
          message: rendered.text,
          priority,
          metadata: {
            eventId,
            eventType: event.event_type,
            templateId: template.template_id,
          },
        });
        const deliveryHttpStatus = "httpStatus" in delivery ? delivery.httpStatus : undefined;
        const deliveryMessage = "message" in delivery ? delivery.message : undefined;
        const deliveryError = "error" in delivery ? delivery.error : undefined;
        await auditCommunicationMessage({
          message_id: randomUUID(),
          event_id: eventId,
          event_type: event.event_type,
          channel: route.channel,
          status: delivery.status,
          recipient,
          template_id: template.template_id,
          subject: rendered.title,
          priority,
          provider: delivery.provider,
          provider_message_id: delivery.providerMessageId ?? null,
          metadata: {
            provider: delivery.provider,
            providerMessageId: delivery.providerMessageId,
            httpStatus: deliveryHttpStatus,
          },
          diagnostics: deliveryError || deliveryMessage
            ? { error: deliveryError, message: deliveryMessage }
            : undefined,
        });
        results.push({ channel: route.channel, recipient, delivery });
      }
    }

    await updateCommunicationEventStatus(eventId, "processed", { processedAt: new Date() });
    return { eventId, status: "processed", results, documents: documentResults };
  } catch (error) {
    const message = getErrorMessage(error);
    await updateCommunicationEventStatus(eventId, "failed", { processedAt: new Date(), lastError: message });
    await auditCommunicationMessage({
      message_id: randomUUID(),
      event_id: eventId,
      event_type: event.event_type,
      channel: "inapp",
      status: "failed",
      recipient: event.user_id ? String(event.user_id) : "system",
      priority: event.priority ?? "medium",
      metadata: { source: event.source },
      diagnostics: { error: message },
    });
    throw error;
  }
};
