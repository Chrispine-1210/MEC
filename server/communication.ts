import fs from "fs";
import path from "path";
import { createHash, createHmac, randomUUID } from "crypto";
import { env } from "./env";
import { enqueueEmail, renderMtendereEmail, type EmailCategory } from "./email";
import { getNotificationProviderDiagnostics, sendNotification } from "./notifications";
import { resolveWritableRuntimePath } from "./runtime-paths";
import { storage } from "./storage";

export type CommunicationChannel = "email" | "sms" | "whatsapp" | "inapp" | "document";
export type CommunicationPriority = "high" | "medium" | "low";
export type CommunicationSource = "admin" | "client" | "system";
export type TemplateType = "email" | "sms" | "document" | "inapp";

export const createDeterministicCommunicationId = (...parts: Array<string | number>) => {
  const bytes = createHash("sha256").update(parts.map(String).join("\u0000")).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export type CommunicationEvent = {
  event_type: string;
  timestamp: string;
  user_id?: number | null;
  payload: Record<string, unknown>;
  source: CommunicationSource;
  priority?: CommunicationPriority;
};

type TemplateCategory = "admissions" | "payments" | "system" | "crm" | "marketing" | "student";

type TemplateDefinition = {
  template_id: string;
  type: TemplateType;
  event_trigger: string;
  category?: TemplateCategory;
  language?: string;
  version?: number;
  status?: "draft" | "published" | "archived";
  subject?: string;
  title?: string;
  preheader?: string;
  body: string;
  variables: string[];
  defaults?: Record<string, string>;
  documentType?: string;
  sensitivity?: "public" | "internal" | "confidential";
  retentionDays?: number;
  brandVoice?: "trusted_advisor" | "official" | "operational" | "campaign";
};

type RouteCondition = {
  field: string;
  equals?: string | number | boolean;
  exists?: boolean;
};

type RouteDefinition = {
  eventType: string;
  channel: CommunicationChannel;
  templateId: string;
  priority: CommunicationPriority;
  emailCategory?: EmailCategory;
  recipientField?: string;
  condition?: RouteCondition;
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
  referenceId: string;
  documentType: string;
  expiresAt: string;
};

const communicationDataDir = resolveWritableRuntimePath("data");
const generatedDocumentDir = path.join(communicationDataDir, "generated-documents");
const eventLogPath = path.join(communicationDataDir, "communication-events.jsonl");
const messageAuditPath = path.join(communicationDataDir, "communication-messages.jsonl");
const documentAuditPath = path.join(communicationDataDir, "communication-documents.jsonl");
const workflowTaskAuditPath = path.join(communicationDataDir, "communication-workflow-tasks.jsonl");
const templateVersionAuditPath = path.join(communicationDataDir, "communication-template-versions.jsonl");

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
    status: "published",
    brandVoice: "trusted_advisor",
  },
  {
    template_id: "lead_created_email",
    type: "email",
    event_trigger: "lead.created",
    category: "crm",
    language: "en",
    version: 1,
    subject: "Your Mtendere inquiry is in progress - {{lead_name}}",
    title: "Inquiry received",
    preheader: "The Mtendere team will review your study goals and follow up with next steps.",
    body: "<p>Hello {{lead_name}},</p><p>Thank you for contacting {{institution_name}}. We have recorded your interest in <strong>{{interest_area}}</strong>.</p><p>An advisor will review your details and guide you on the most relevant next step.</p><p><strong>Reference:</strong> {{reference_id}}</p>",
    variables: ["lead_name", "interest_area", "reference_id", "institution_name"],
    defaults: { interest_area: "study opportunities" },
    status: "published",
    brandVoice: "trusted_advisor",
  },
  {
    template_id: "application_submitted_email",
    type: "email",
    event_trigger: "student.application_submitted",
    category: "admissions",
    language: "en",
    version: 1,
    subject: "Application Received - {{student_name}}",
    title: "Application received",
    preheader: "Your application is now in the Mtendere review workflow.",
    body: "<p>Hello {{student_name}},</p><p>Your application for <strong>{{program_name}}</strong> has been received.</p><p>The Mtendere team will review your submitted details, documents, and next-step readiness.</p><p><strong>Reference:</strong> {{reference_id}}</p>",
    variables: ["student_name", "program_name", "reference_id"],
    defaults: { program_name: "your selected opportunity" },
    status: "published",
    brandVoice: "trusted_advisor",
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
    status: "published",
    brandVoice: "official",
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
    status: "published",
    brandVoice: "trusted_advisor",
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
    status: "published",
    brandVoice: "operational",
  },
  {
    template_id: "invoice_generated_email",
    type: "email",
    event_trigger: "invoice.generated",
    category: "payments",
    language: "en",
    version: 1,
    subject: "Invoice Generated - {{invoice_number}}",
    title: "Invoice generated",
    preheader: "A Mtendere invoice is ready for review.",
    body: "<p>Hello {{recipient_name}},</p><p>Your invoice for <strong>{{amount}} {{currency}}</strong> has been generated.</p><p><strong>Invoice:</strong> {{invoice_number}}</p><p><strong>Due date:</strong> {{due_date}}</p><p>{{document_notice}}</p>",
    variables: ["recipient_name", "amount", "currency", "invoice_number", "due_date", "document_notice"],
    defaults: { currency: "USD", due_date: "Not provided", document_notice: "" },
    status: "published",
    brandVoice: "operational",
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
    status: "published",
    brandVoice: "operational",
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
    status: "published",
    sensitivity: "confidential",
    brandVoice: "operational",
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
    status: "published",
    sensitivity: "internal",
    brandVoice: "operational",
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
    status: "published",
    sensitivity: "internal",
    brandVoice: "operational",
  },
  {
    template_id: "admin_role_updated_inapp",
    type: "inapp",
    event_trigger: "admin.role_updated",
    category: "system",
    language: "en",
    version: 1,
    title: "Role updated",
    body: "Role {{role}} was updated by {{updated_by}}. Reference: {{reference_id}}.",
    variables: ["role", "updated_by", "reference_id"],
    defaults: { role: "admin role", updated_by: "system" },
    status: "published",
    sensitivity: "internal",
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
    status: "published",
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
    status: "published",
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
    status: "published",
    sensitivity: "confidential",
  },
  {
    template_id: "payment_received_whatsapp",
    type: "sms",
    event_trigger: "payment.received",
    category: "payments",
    language: "en",
    version: 1,
    body: "Mtendere payment update: {{amount}} {{currency}} received and recorded. Ref {{reference_id}}. Keep this reference for follow-up.",
    variables: ["amount", "currency", "reference_id"],
    defaults: { currency: "USD" },
    status: "published",
  },
  {
    template_id: "security_alert_whatsapp",
    type: "sms",
    event_trigger: "system.security_event",
    category: "system",
    language: "en",
    version: 1,
    body: "Mtendere security alert: {{event_title}}. Please review your account/admin console. Ref {{reference_id}}.",
    variables: ["event_title", "reference_id"],
    status: "published",
    sensitivity: "confidential",
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
    status: "published",
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
    documentType: "enrollment_confirmation",
    status: "published",
    brandVoice: "official",
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
    documentType: "payment_receipt",
    status: "published",
    brandVoice: "official",
  },
  {
    template_id: "invoice_document",
    type: "document",
    event_trigger: "invoice.generated",
    category: "payments",
    language: "en",
    version: 1,
    subject: "Invoice",
    title: "Invoice",
    body: "Invoice {{invoice_number}} has been generated for {{recipient_name}} in the amount of {{amount}} {{currency}}. Due date: {{due_date}}.",
    variables: ["invoice_number", "recipient_name", "amount", "currency", "due_date", "reference_id", "date"],
    defaults: { currency: "USD", due_date: "Not provided" },
    documentType: "invoice",
    status: "published",
    brandVoice: "official",
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
    documentType: "admission_letter",
    status: "published",
    brandVoice: "official",
  },
  {
    template_id: "offer_letter_document",
    type: "document",
    event_trigger: "student.offer_letter_requested",
    category: "admissions",
    language: "en",
    version: 1,
    subject: "Offer Letter",
    title: "Offer Letter",
    body: "This letter confirms that {{student_name}} has received an offer for {{program_name}} subject to the conditions communicated by administration.",
    variables: ["student_name", "program_name", "reference_id", "date"],
    documentType: "offer_letter",
    status: "published",
    brandVoice: "official",
  },
  {
    template_id: "acceptance_letter_document",
    type: "document",
    event_trigger: "student.acceptance_letter_requested",
    category: "admissions",
    language: "en",
    version: 1,
    subject: "Acceptance Letter",
    title: "Acceptance Letter",
    body: "This letter confirms that {{student_name}} has accepted the offer for {{program_name}}. Mtendere will continue to guide the required next steps.",
    variables: ["student_name", "program_name", "reference_id", "date"],
    documentType: "acceptance_letter",
    status: "published",
    brandVoice: "official",
  },
  {
    template_id: "enrollment_certificate_document",
    type: "document",
    event_trigger: "student.enrollment_certificate_requested",
    category: "admissions",
    language: "en",
    version: 1,
    subject: "Enrollment Certificate",
    title: "Enrollment Certificate",
    body: "This certificate confirms that {{student_name}} is enrolled in {{course_name}} with enrollment status {{enrollment_status}}.",
    variables: ["student_name", "course_name", "enrollment_status", "reference_id", "date"],
    defaults: { enrollment_status: "confirmed" },
    documentType: "enrollment_certificate",
    status: "published",
    brandVoice: "official",
  },
  {
    template_id: "recommendation_letter_document",
    type: "document",
    event_trigger: "student.recommendation_letter_requested",
    category: "admissions",
    language: "en",
    version: 1,
    subject: "Recommendation Letter",
    title: "Recommendation Letter",
    body: "Mtendere Education Consult provides this recommendation for {{student_name}} in support of {{recommendation_purpose}}. {{body_content}}",
    variables: ["student_name", "recommendation_purpose", "body_content", "reference_id", "date"],
    defaults: { recommendation_purpose: "education progression", body_content: "The student has engaged with the Mtendere administration team for education guidance and documented follow-up." },
    documentType: "recommendation_letter",
    status: "published",
    brandVoice: "official",
  },
];

const routes: RouteDefinition[] = [
  { eventType: "lead.created", channel: "email", templateId: "lead_created_email", priority: "medium", emailCategory: "contact_acknowledgement", recipientField: "email" },
  { eventType: "lead.created", channel: "inapp", templateId: "generic_inapp_alert", priority: "medium" },
  { eventType: "student.registered", channel: "email", templateId: "student_registration_email", priority: "medium", emailCategory: "welcome", recipientField: "email" },
  { eventType: "student.registered", channel: "inapp", templateId: "generic_inapp_alert", priority: "medium" },
  { eventType: "student.application_submitted", channel: "email", templateId: "application_submitted_email", priority: "medium", emailCategory: "application_submitted", recipientField: "email" },
  { eventType: "student.application_submitted", channel: "inapp", templateId: "generic_inapp_alert", priority: "medium" },
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
  { eventType: "student.payment_confirmed", channel: "whatsapp", templateId: "payment_received_whatsapp", priority: "high", recipientField: "phone", condition: { field: "whatsapp_opt_in", equals: true } },
  { eventType: "student.payment_confirmed", channel: "inapp", templateId: "generic_inapp_alert", priority: "high" },
  { eventType: "payment.received", channel: "email", templateId: "payment_received_email", priority: "high", emailCategory: "payment_confirmation", recipientField: "email" },
  { eventType: "payment.received", channel: "sms", templateId: "payment_received_sms", priority: "high", recipientField: "phone" },
  { eventType: "payment.received", channel: "whatsapp", templateId: "payment_received_whatsapp", priority: "high", recipientField: "phone", condition: { field: "whatsapp_opt_in", equals: true } },
  { eventType: "payment.received", channel: "inapp", templateId: "generic_inapp_alert", priority: "high" },
  { eventType: "payment.failed", channel: "email", templateId: "payment_failed_email", priority: "high", emailCategory: "payment_failed", recipientField: "email" },
  { eventType: "payment.failed", channel: "email", templateId: "system_alert_email", priority: "high", emailCategory: "admin_notification", recipientField: "admin_notification_email" },
  { eventType: "payment.failed", channel: "sms", templateId: "payment_failed_sms", priority: "high", recipientField: "phone" },
  { eventType: "payment.failed", channel: "inapp", templateId: "generic_inapp_alert", priority: "high" },
  { eventType: "invoice.generated", channel: "document", templateId: "invoice_document", priority: "medium" },
  { eventType: "invoice.generated", channel: "email", templateId: "invoice_generated_email", priority: "medium", emailCategory: "invoice_generated", recipientField: "email" },
  { eventType: "invoice.generated", channel: "inapp", templateId: "generic_inapp_alert", priority: "medium" },
  { eventType: "student.offer_letter_requested", channel: "document", templateId: "offer_letter_document", priority: "medium" },
  { eventType: "student.offer_letter_requested", channel: "email", templateId: "application_approved_email", priority: "medium", emailCategory: "application_approved", recipientField: "email" },
  { eventType: "student.acceptance_letter_requested", channel: "document", templateId: "acceptance_letter_document", priority: "medium" },
  { eventType: "student.enrollment_certificate_requested", channel: "document", templateId: "enrollment_certificate_document", priority: "medium" },
  { eventType: "student.recommendation_letter_requested", channel: "document", templateId: "recommendation_letter_document", priority: "medium" },
  { eventType: "admin.user_created", channel: "email", templateId: "admin_user_created_email", priority: "high", emailCategory: "admin_notification", recipientField: "admin_notification_email" },
  { eventType: "admin.user_created", channel: "inapp", templateId: "generic_inapp_alert", priority: "high" },
  { eventType: "admin.role_updated", channel: "inapp", templateId: "admin_role_updated_inapp", priority: "high" },
  { eventType: "admin.data_exported", channel: "inapp", templateId: "generic_inapp_alert", priority: "high" },
  { eventType: "system.security_event", channel: "email", templateId: "security_alert_email", priority: "high", emailCategory: "security_alert", recipientField: "admin_notification_email" },
  { eventType: "system.security_event", channel: "sms", templateId: "security_alert_sms", priority: "high", recipientField: "admin_phone" },
  { eventType: "system.security_event", channel: "whatsapp", templateId: "security_alert_whatsapp", priority: "high", recipientField: "admin_phone", condition: { field: "whatsapp_opt_in", equals: true } },
  { eventType: "system.security_event", channel: "inapp", templateId: "generic_inapp_alert", priority: "high" },
  { eventType: "system.alert", channel: "email", templateId: "system_alert_email", priority: "high", emailCategory: "admin_notification", recipientField: "admin_notification_email" },
  { eventType: "system.alert", channel: "inapp", templateId: "generic_inapp_alert", priority: "high" },
];

type WorkflowStepDefinition = {
  stepId: string;
  action: "emit_event" | "advisor_task" | "review_checkpoint";
  delayMinutes: number;
  eventType?: string;
  description: string;
  payloadAdditions?: Record<string, unknown>;
};

type WorkflowDefinition = {
  workflowId: string;
  name: string;
  eventTrigger: string;
  active: boolean;
  owner: "admissions" | "finance" | "crm" | "security" | "operations";
  steps: WorkflowStepDefinition[];
};

const workflowDefinitions: WorkflowDefinition[] = [
  {
    workflowId: "crm_lead_nurture",
    name: "Lead Nurture Sequence",
    eventTrigger: "lead.created",
    active: true,
    owner: "crm",
    steps: [
      {
        stepId: "advisor_review",
        action: "advisor_task",
        delayMinutes: 60,
        description: "Advisor reviews the inquiry and prepares the first consultative follow-up.",
        payloadAdditions: { event_title: "Lead follow-up due", message: "Review the new lead and prepare next-step guidance." },
      },
      {
        stepId: "three_day_follow_up",
        action: "emit_event",
        delayMinutes: 3 * 24 * 60,
        eventType: "system.alert",
        description: "If no response is recorded, remind the team to follow up with the lead.",
        payloadAdditions: { event_title: "Lead follow-up reminder", message: "A lead has reached the three-day follow-up checkpoint." },
      },
    ],
  },
  {
    workflowId: "application_review_followup",
    name: "Application Review Follow-Up",
    eventTrigger: "student.application_submitted",
    active: true,
    owner: "admissions",
    steps: [
      {
        stepId: "document_review_checkpoint",
        action: "review_checkpoint",
        delayMinutes: 24 * 60,
        description: "Review application documents within one business day.",
        payloadAdditions: { event_title: "Application review checkpoint", message: "Application review is due for this student." },
      },
      {
        stepId: "student_status_follow_up",
        action: "emit_event",
        delayMinutes: 3 * 24 * 60,
        eventType: "system.alert",
        description: "Alert the admissions team if the student has not received a status update.",
        payloadAdditions: { event_title: "Application status update due", message: "Check whether this applicant needs a status update." },
      },
    ],
  },
  {
    workflowId: "payment_recovery",
    name: "Payment Recovery",
    eventTrigger: "payment.failed",
    active: true,
    owner: "finance",
    steps: [
      {
        stepId: "same_day_finance_review",
        action: "advisor_task",
        delayMinutes: 30,
        description: "Finance reviews payment failure details before contacting the student.",
        payloadAdditions: { event_title: "Payment failure review", message: "Review failed payment diagnostics and decide next action." },
      },
      {
        stepId: "overdue_payment_reminder",
        action: "emit_event",
        delayMinutes: 24 * 60,
        eventType: "payment.failed",
        description: "Send a calm overdue payment reminder if the payment has not been resolved.",
        payloadAdditions: { payment_status: "overdue", event_title: "Payment still unresolved", message: "Payment is still unresolved after the first follow-up window." },
      },
    ],
  },
  {
    workflowId: "security_incident_escalation",
    name: "Security Incident Escalation",
    eventTrigger: "system.security_event",
    active: true,
    owner: "security",
    steps: [
      {
        stepId: "operator_review",
        action: "review_checkpoint",
        delayMinutes: 15,
        description: "Operator reviews the security event and confirms containment.",
        payloadAdditions: { event_title: "Security review due", message: "A security event needs operator review." },
      },
    ],
  },
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

const priorityWeight: Record<CommunicationPriority, number> = {
  high: 1,
  medium: 2,
  low: 3,
};

const resolveEventPriority = (event: Omit<CommunicationEvent, "timestamp">) => {
  if (event.priority) return event.priority;
  const matchingRoutes = routes.filter((route) => route.eventType === event.event_type);
  if (matchingRoutes.length > 0) {
    return matchingRoutes
      .map((route) => route.priority)
      .sort((left, right) => priorityWeight[left] - priorityWeight[right])[0];
  }
  if (/security|payment\.failed|payment\.received|payment_confirmed|admin\./.test(event.event_type)) return "high";
  if (/marketing|newsletter|campaign/.test(event.event_type)) return "low";
  return "medium";
};

const routeMatchesCondition = (event: CommunicationEvent, route: RouteDefinition) => {
  if (!route.condition) return true;
  const value = getPath(event.payload, route.condition.field);
  if (route.condition.exists !== undefined) {
    return route.condition.exists ? value !== undefined && value !== null && value !== "" : value === undefined || value === null || value === "";
  }
  if (route.condition.equals !== undefined) return value === route.condition.equals;
  return true;
};

const resolveRecipient = (event: CommunicationEvent, route: RouteDefinition) => {
  const field = route.recipientField;
  if (field === "admin_notification_email") return supportEmail;
  if (field === "admin_phone") return env.ADMIN_NOTIFICATION_PHONE || null;
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
  const expiresAtIso = new Date(expiresAt).toISOString();
  const downloadUrl = publicBaseUrl
    ? `${publicBaseUrl}/api/documents/generated/${fileName}?exp=${expiresAt}&t=${token}`
    : `/api/documents/generated/${fileName}?exp=${expiresAt}&t=${token}`;
  const documentType = template.documentType || template.template_id.replace(/_document$/, "");

  const documentRecord = {
    id: documentId,
    eventId,
    eventType: event.event_type,
    templateId: template.template_id,
    documentType,
    referenceId: reference,
    recipient: recipientName,
    fileName,
    downloadUrl,
    mimeType: "application/pdf",
    status: "generated",
    expiresAt: new Date(expiresAt),
    metadata: {
      source: event.source,
      userId: event.user_id ?? null,
      sensitivity: template.sensitivity || "internal",
      generatedAt: new Date().toISOString(),
    },
  } as const;
  appendJsonl(documentAuditPath, {
    ...documentRecord,
    expiresAt: expiresAtIso,
    metadata: documentRecord.metadata,
  });
  await storage.createCommunicationDocument(documentRecord).catch(() => undefined);

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
    metadata: { fileName, reference, downloadUrl, expiresAt, documentType },
  });

  return { documentId, fileName, filePath, downloadUrl, mimeType: "application/pdf", referenceId: reference, documentType, expiresAt: expiresAtIso };
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

const buildWorkflowTaskPayload = (
  workflow: WorkflowDefinition,
  step: WorkflowStepDefinition,
  event: CommunicationEvent,
  eventId: string,
) => ({
  workflowId: workflow.workflowId,
  workflowName: workflow.name,
  stepId: step.stepId,
  action: step.action,
  sourceEventId: eventId,
  sourceEventType: event.event_type,
  payload: {
    ...event.payload,
    ...(step.payloadAdditions || {}),
    workflow_id: workflow.workflowId,
    workflow_step_id: step.stepId,
    workflow_source_event_id: eventId,
  },
});

const scheduleWorkflowTasksForEvent = async (eventId: string, event: CommunicationEvent) => {
  if (event.payload.workflow_task_id || event.payload.replayed_from_event_id) return [];

  const matchingWorkflows = workflowDefinitions.filter(
    (workflow) => workflow.active && workflow.eventTrigger === event.event_type,
  );
  const scheduled: Array<Record<string, unknown>> = [];

  for (const workflow of matchingWorkflows) {
    for (const step of workflow.steps) {
      const taskId = randomUUID();
      const scheduledFor = new Date(Date.now() + step.delayMinutes * 60_000);
      const taskPayload = buildWorkflowTaskPayload(workflow, step, event, eventId);
      const taskRecord = {
        id: taskId,
        workflowId: workflow.workflowId,
        stepId: step.stepId,
        eventId,
        eventType: step.eventType || event.event_type,
        status: "pending",
        scheduledFor,
        executedAt: null,
        attempts: 0,
        payload: taskPayload,
        lastError: null,
      };

      appendJsonl(workflowTaskAuditPath, {
        ...taskRecord,
        scheduledFor: scheduledFor.toISOString(),
        createdAt: new Date().toISOString(),
      });
      await storage.createCommunicationWorkflowTask(taskRecord).catch(() => undefined);
      await auditCommunicationMessage({
        message_id: taskId,
        event_id: eventId,
        event_type: event.event_type,
        channel: "inapp",
        status: "workflow_scheduled",
        recipient: event.user_id ? String(event.user_id) : "operations",
        template_id: workflow.workflowId,
        subject: step.description,
        priority: event.priority,
        metadata: {
          workflowId: workflow.workflowId,
          stepId: step.stepId,
          action: step.action,
          scheduledFor: scheduledFor.toISOString(),
        },
      });
      scheduled.push({
        taskId,
        workflowId: workflow.workflowId,
        stepId: step.stepId,
        action: step.action,
        eventType: step.eventType || event.event_type,
        scheduledFor: scheduledFor.toISOString(),
      });
    }
  }

  return scheduled;
};

const mapWorkflowTaskRecord = (task: Awaited<ReturnType<typeof storage.getCommunicationWorkflowTasks>>[number]) => ({
  id: task.id,
  workflowId: task.workflowId,
  stepId: task.stepId,
  eventId: task.eventId,
  eventType: task.eventType,
  status: task.status,
  scheduledFor: task.scheduledFor instanceof Date ? task.scheduledFor.toISOString() : task.scheduledFor,
  executedAt: task.executedAt instanceof Date ? task.executedAt.toISOString() : task.executedAt,
  attempts: task.attempts,
  payload: task.payload,
  lastError: task.lastError,
  createdAt: task.createdAt instanceof Date ? task.createdAt.toISOString() : task.createdAt,
});

export const getCommunicationWorkflowTasks = async (limit = 100) => {
  const cappedLimit = Math.max(1, Math.min(limit, 500));
  const dbTasks = await storage.getCommunicationWorkflowTasks(cappedLimit).catch(() => []);
  if (dbTasks.length > 0) return dbTasks.map(mapWorkflowTaskRecord);

  return readJsonlRecords(workflowTaskAuditPath)
    .slice(-cappedLimit)
    .reverse();
};

export const getCommunicationWorkflows = async (limit = 100) => {
  const tasks = await getCommunicationWorkflowTasks(limit);
  return {
    workflows: workflowDefinitions.map((workflow) => ({
      ...workflow,
      pendingTasks: tasks.filter(
        (task) => task.workflowId === workflow.workflowId && task.status === "pending",
      ).length,
    })),
    tasks,
  };
};

export const processDueCommunicationWorkflowTasks = async (limit = 25) => {
  const now = Date.now();
  const tasks = (await storage.getCommunicationWorkflowTasks(500).catch(() => []))
    .filter((task) => task.status === "pending" && task.scheduledFor && task.scheduledFor.getTime() <= now)
    .slice(0, Math.max(1, Math.min(limit, 100)));
  const results: Array<Record<string, unknown>> = [];

  for (const task of tasks) {
    const payload = task.payload && typeof task.payload === "object" ? task.payload as Record<string, unknown> : {};
    const innerPayload = payload.payload && typeof payload.payload === "object"
      ? payload.payload as Record<string, unknown>
      : payload;
    try {
      const result = await emitCommunicationEvent({
        event_type: task.eventType,
        source: "system",
        priority: "medium",
        payload: {
          ...innerPayload,
          workflow_task_id: task.id,
          workflow_executed_at: new Date().toISOString(),
        },
      });
      await storage.updateCommunicationWorkflowTaskStatus(task.id, "executed", {
        executedAt: new Date(),
        lastError: null,
        attempts: task.attempts + 1,
      }).catch(() => undefined);
      results.push({ taskId: task.id, status: "executed", result });
    } catch (error) {
      const message = getErrorMessage(error);
      await storage.updateCommunicationWorkflowTaskStatus(task.id, "failed", {
        lastError: message,
        attempts: task.attempts + 1,
      }).catch(() => undefined);
      results.push({ taskId: task.id, status: "failed", error: message });
    }
  }

  return {
    processed: results.length,
    results,
  };
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
    status: template.status || "published",
    subject: template.subject,
    title: template.title,
    preheader: template.preheader,
    documentType: template.documentType,
    sensitivity: template.sensitivity || (template.type === "document" ? "internal" : "public"),
    brandVoice: template.brandVoice || "trusted_advisor",
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

const mapCommunicationDocumentRecord = (document: Awaited<ReturnType<typeof storage.getCommunicationDocuments>>[number]) => ({
  id: document.id,
  eventId: document.eventId,
  eventType: document.eventType,
  templateId: document.templateId,
  documentType: document.documentType,
  referenceId: document.referenceId,
  recipient: document.recipient,
  fileName: document.fileName,
  downloadUrl: document.downloadUrl,
  mimeType: document.mimeType,
  status: document.status,
  expiresAt: document.expiresAt instanceof Date ? document.expiresAt.toISOString() : document.expiresAt,
  metadata: document.metadata,
  createdAt: document.createdAt instanceof Date ? document.createdAt.toISOString() : document.createdAt,
});

export const getCommunicationDocuments = async (limit = 100) => {
  const cappedLimit = Math.max(1, Math.min(limit, 500));
  const dbDocuments = await storage.getCommunicationDocuments(cappedLimit).catch(() => []);
  if (dbDocuments.length > 0) return dbDocuments.map(mapCommunicationDocumentRecord);

  return readJsonlRecords(documentAuditPath)
    .slice(-cappedLimit)
    .reverse();
};

const mapCommunicationTemplateVersionRecord = (
  version: Awaited<ReturnType<typeof storage.getCommunicationTemplateVersions>>[number],
) => ({
  id: version.id,
  templateId: version.templateId,
  type: version.type,
  eventTrigger: version.eventTrigger,
  category: version.category,
  language: version.language,
  version: version.version,
  status: version.status,
  subject: version.subject,
  title: version.title,
  preheader: version.preheader,
  variables: version.variables,
  defaults: version.defaults,
  quality: version.quality,
  createdBy: version.createdBy,
  createdAt: version.createdAt instanceof Date ? version.createdAt.toISOString() : version.createdAt,
});

export const getCommunicationTemplateVersions = async (limit = 100, templateId?: string) => {
  const cappedLimit = Math.max(1, Math.min(limit, 500));
  const dbVersions = templateId
    ? await storage.getCommunicationTemplateVersionsByTemplateId(templateId).catch(() => [])
    : await storage.getCommunicationTemplateVersions(cappedLimit).catch(() => []);
  if (dbVersions.length > 0) return dbVersions.slice(0, cappedLimit).map(mapCommunicationTemplateVersionRecord);

  return readJsonlRecords(templateVersionAuditPath)
    .filter((record) => !templateId || record.templateId === templateId)
    .slice(-cappedLimit)
    .reverse();
};

export const seedCommunicationTemplateVersions = async (createdBy?: number | null) => {
  let created = 0;
  let skipped = 0;
  const errors: Array<{ templateId: string; error: string }> = [];

  for (const template of defaultTemplates) {
    const quality = analyzeTemplateQuality(template);
    const record = {
      templateId: template.template_id,
      type: template.type,
      eventTrigger: template.event_trigger,
      category: template.category || "system",
      language: template.language || "en",
      version: template.version || 1,
      status: template.status || "published",
      subject: template.subject ?? null,
      title: template.title ?? null,
      preheader: template.preheader ?? null,
      body: template.body,
      variables: template.variables,
      defaults: template.defaults ?? null,
      quality,
      createdBy: createdBy ?? null,
    };
    try {
      const saved = await storage.createCommunicationTemplateVersion(record);
      appendJsonl(templateVersionAuditPath, {
        ...record,
        id: saved.id,
        createdAt: new Date().toISOString(),
      });
      created += 1;
    } catch (error) {
      skipped += 1;
      const message = getErrorMessage(error);
      if (!/duplicate|unique|constraint/i.test(message)) {
        errors.push({ templateId: template.template_id, error: message });
      }
    }
  }

  return {
    total: defaultTemplates.length,
    created,
    skipped,
    errors,
  };
};

const campaignBlueprints = [
  {
    key: "campaign.application_followup",
    name: "Application Follow-Up",
    category: "admissions",
    templateKey: "application_submitted_email",
    audience: "Applicants with pending review status",
    governance: "Transactional or service follow-up; no marketing consent required when tied to an application.",
  },
  {
    key: "campaign.payment_recovery",
    name: "Payment Recovery",
    category: "payments",
    templateKey: "payment_failed_email",
    audience: "Students with unresolved invoices or failed payment attempts",
    governance: "High-priority finance communication; include reference and calm next step.",
  },
  {
    key: "campaign.scholarship_reengagement",
    name: "Scholarship Re-Engagement",
    category: "marketing",
    templateKey: "campaign.newsletter",
    audience: "Opted-in scholarship subscribers",
    governance: "Commercial campaign; honor unsubscribe and category preferences.",
  },
];

export const getCommunicationCampaigns = async (limit = 100) => {
  const campaigns = await storage.getEmailCampaigns(limit).catch(() => []);
  return {
    campaigns: campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      category: campaign.category,
      status: campaign.status,
      subject: campaign.subject,
      audienceSegment: campaign.audienceSegment,
      templateKey: campaign.templateKey,
      scheduledFor: campaign.scheduledFor instanceof Date ? campaign.scheduledFor.toISOString() : campaign.scheduledFor,
      sentAt: campaign.sentAt instanceof Date ? campaign.sentAt.toISOString() : campaign.sentAt,
      metrics: campaign.metrics,
      createdBy: campaign.createdBy,
      createdAt: campaign.createdAt instanceof Date ? campaign.createdAt.toISOString() : campaign.createdAt,
    })),
    blueprints: campaignBlueprints,
  };
};

export const createCommunicationCampaign = async (input: {
  name: string;
  category: string;
  subject: string;
  audienceSegment?: Record<string, unknown> | null;
  templateKey?: string | null;
  scheduledFor?: Date | null;
  createdBy?: number | null;
}) =>
  storage.createEmailCampaign({
    name: input.name,
    category: input.category,
    status: input.scheduledFor ? "scheduled" : "draft",
    subject: input.subject,
    audienceSegment: input.audienceSegment ?? null,
    templateKey: input.templateKey ?? null,
    scheduledFor: input.scheduledFor ?? null,
    sentAt: null,
    metrics: {
      createdFrom: "communication_center",
      delivery: "manual_review_required",
    },
    createdBy: input.createdBy ?? null,
  });

export const getCommunicationAiAssistance = (templateId: string, payload: Record<string, unknown> = {}) => {
  const template = getTemplate(templateId);
  if (!template) throw new Error("Communication template was not found");

  const preview = renderCommunicationTemplatePreview(templateId, { payload });
  const quality = analyzeTemplateQuality(template);
  const variableReport = preview.variableDiagnostics;
  const subject = preview.rendered.subject || template.subject || template.title || template.template_id;
  const text = preview.rendered.text || stripHtml(template.body);
  const lower = text.toLowerCase();
  const riskyClaims = [
    "guaranteed admission",
    "guaranteed visa",
    "guaranteed funding",
    "success is assured",
  ].filter((claim) => lower.includes(claim));
  const toneFlags = [
    /urgent!!!/i.test(text) ? "Excessive urgency" : null,
    /act now/i.test(text) ? "Marketing urgency in a transactional context" : null,
    riskyClaims.length > 0 ? "Unverified guarantee language" : null,
  ].filter(Boolean);
  const subjectSuggestions = [
    subject.length > 70 ? subject.slice(0, 67).trimEnd() : `${subject} - ${textValue(payload.reference_id || payload.referenceId || "MEC")}`,
    template.category === "payments" ? `Payment update - ${textValue(payload.reference_id || payload.referenceId || "Mtendere")}` : null,
    template.category === "admissions" ? `Mtendere application update - ${textValue(payload.student_name || payload.recipient_name || "Student")}` : null,
  ].filter((item): item is string => Boolean(item));

  return {
    templateId,
    quality,
    spamRiskScore: Math.min(100, (quality.spamSignals.length * 20) + (riskyClaims.length * 30) + (subject.length > 78 ? 10 : 0)),
    toneConsistencyScore: Math.max(0, 100 - toneFlags.length * 20 - riskyClaims.length * 30),
    subjectSuggestions: Array.from(new Set(subjectSuggestions)).slice(0, 3),
    riskyClaims,
    toneFlags,
    missingPayloadValues: variableReport.missingPayloadValues || [],
    governanceNotes: [
      "Variables are escaped before HTML rendering.",
      "Missing variables render with safe fallback text.",
      "Transactional templates use the standardized Mtendere footer.",
      template.category === "marketing"
        ? "Marketing use requires active consent and category preference enforcement."
        : "Transactional/service use is tied to an account, application, payment, or operational relationship.",
    ],
  };
};

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
    status: template.status || "published",
    documentType: template.documentType,
    sensitivity: template.sensitivity || (template.type === "document" ? "internal" : "public"),
    brandVoice: template.brandVoice || "trusted_advisor",
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
    channelMatrix: routes.reduce<Record<string, Record<string, boolean>>>((matrix, route) => {
      matrix[route.eventType] = matrix[route.eventType] || {};
      matrix[route.eventType][route.channel] = true;
      return matrix;
    }, {}),
    workflows: {
      total: workflowDefinitions.length,
      active: workflowDefinitions.filter((workflow) => workflow.active).length,
      triggers: workflowDefinitions.map((workflow) => workflow.eventTrigger),
    },
    governance: {
      brandFooterStandardized: true,
      variableEscaping: "HTML variables are escaped and text variables use safe fallbacks.",
      conditionals: "Templates support {{#if field=value}}...{{/if}} blocks.",
      rateLimit: "20 events per event/recipient per minute in-process, with delivery queues downstream.",
      documentLinks: "Generated PDF links are HMAC-signed and expire according to COMMUNICATION_DOCUMENT_LINK_TTL_DAYS.",
      preferenceEnforcement: "Commercial email categories pass through email preference suppression before delivery.",
      routePriorityPolicy: "Security, payment, and admin routes resolve to high priority unless explicitly downgraded.",
      inAppPersistence: "In-app routes write notification records when the notifications table is available.",
      workflowAutomation: "Workflow tasks are persisted and can be processed through the workflow processor endpoint.",
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
  options: { eventId?: string } = {},
) => {
  const event: CommunicationEvent = {
    ...input,
    priority: resolveEventPriority(input),
    payload: input.payload || {},
    timestamp: input.timestamp || new Date().toISOString(),
  };
  const eventId = options.eventId ?? randomUUID();
  if (options.eventId) {
    const existingEvent = await storage.getCommunicationEvent(eventId).catch(() => undefined);
    if (existingEvent?.status === "processed") {
      const existingMessages = await storage.getCommunicationMessages(2_000).catch(() => []);
      const results = existingMessages
        .filter((message) => message.eventId === eventId)
        .map((message) => ({
          channel: message.channel,
          recipient: message.recipient,
          delivery: {
            id: message.id,
            status: message.status,
            provider: message.provider,
            providerMessageId: message.providerMessageId,
            lastError: message.diagnostics && typeof message.diagnostics === "object"
              ? String((message.diagnostics as Record<string, unknown>).error ?? "") || null
              : null,
          },
        }));
      return {
        eventId,
        status: "processed",
        results,
        documents: [],
        workflowTasks: [],
        deduplicated: true,
      };
    }
  }
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
    const matchingRoutes = routes
      .filter((route) => route.eventType === event.event_type)
      .filter((route) => routeMatchesCondition(event, route));
    const documentResults: GeneratedDocument[] = [];
    const results: Array<Record<string, unknown>> = [];
    const workflowTasks = await scheduleWorkflowTasksForEvent(eventId, event);

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
      return { eventId, status: "processed", results, documents: documentResults, workflowTasks };
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
          {
            awaitDelivery: priority === "high",
            idempotencyKey: createDeterministicCommunicationId(
              eventId,
              "email",
              template.template_id,
              recipient.toLowerCase(),
            ),
          },
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
        const notification = await storage.createNotification({
          userId: event.user_id ?? null,
          channel: "in_app",
          title: rendered.title,
          message: rendered.text || rendered.title,
          status: "unread",
          metadata: {
            notificationId,
            eventId,
            eventType: event.event_type,
            templateId: template.template_id,
            priority,
            source: event.source,
            payload: event.payload,
          },
        }).catch(() => null);
        await storage.logAnalytics({
          event: "inapp_notification_created",
          userId: event.user_id ?? undefined,
          metadata: {
            notificationId,
            persistedNotificationId: notification?.id ?? null,
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
          provider: notification ? "database" : null,
          provider_message_id: notification ? String(notification.id) : null,
          metadata: { persistedNotificationId: notification?.id ?? null },
        });
        results.push({ channel: "inapp", status: "created", notificationId, persistedNotificationId: notification?.id ?? null });
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
    return { eventId, status: "processed", results, documents: documentResults, workflowTasks };
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
