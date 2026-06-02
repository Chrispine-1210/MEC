import express, { type CookieOptions, type Express, NextFunction, Request, Response } from "express";
import { createServer, type IncomingMessage, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertScholarshipSchema,
  insertJobSchema,
  insertApplicationSchema,
  insertPartnerSchema,
  insertTestimonialSchema,
  insertBlogPostSchema,
  insertBlogCommentSchema,
  insertTeamMemberSchema,
  insertEventSchema,
  insertEventRegistrationSchema,
  insertEventCommentSchema,
  insertEventReactionSchema,
  insertReferralSchema,
  insertSavedItemSchema,
  insertMessageSchema,
  insertSubscriberSchema,
} from "@shared/schema";
import bcrypt from "bcryptjs";
import { createHash, createHmac, randomBytes, randomUUID } from "crypto";
import fs from "fs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import QRCode from "qrcode";
import { z } from "zod";
import { env } from "./env";
import { getChatResponse } from "./ai";
import {
  createEmailPreferenceToken,
  createEmailPreferenceTokenHash,
  createEmailTokenHash,
  getEmailPlatformHealth,
  isTransactionalEmailDeliveryReady,
  recordEmailClick,
  recordEmailOpen,
  recordProviderWebhookEvent,
  sendAdminNotification,
  sendAccountVerification,
  sendApplicationConfirmation,
  sendApplicationStatusUpdate,
  sendContactAcknowledgement,
  sendEventRegistrationConfirmation,
  sendEventRegistrationStatusUpdate,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendPartnerOnboardingEmail,
  sendSubscriptionConfirmation,
  sendWelcomeEmail,
  verifyEmailPreferenceToken,
  verifyEmailTrackingSignature,
} from "./email";
import {
  deleteBlogMeta,
  deleteApplicationMeta,
  deleteJobMeta,
  deletePartnerMeta,
  deleteScholarshipMeta,
  deleteTeamMeta,
  deleteUserMeta,
  getAdminRoles,
  getAdminSettings,
  getApplicationMeta,
  getBlogMeta,
  getJobMeta,
  getPartnerMeta,
  getScholarshipMeta,
  getTeamMeta,
  getUserMeta,
  getAiChatConversation,
  isCoreAdminRole,
  isNotificationRead,
  listAiChatConversations,
  markNotificationRead,
  markNotificationsRead,
  setBlogMeta,
  setApplicationMeta,
  setJobMeta,
  setPartnerMeta,
  setScholarshipMeta,
  setTeamMeta,
  setUserMeta,
  closeAiChatConversation,
  upsertAiChatConversation,
  updateAdminSettings,
  upsertAdminRole,
  deleteAdminRole,
  type AiChatConversation,
  type AiChatMessage,
  type ApplicationMeta,
  type BlogMeta,
  type JobMeta,
  type ScholarshipMeta,
  type TeamMeta,
} from "./admin-state";
import {
  approvePayoutRequest,
  createCommissionRule,
  createReferralCampaign,
  attachReferralToNewUser,
  createCheckoutSession,
  ensureUserGrowthRecords,
  getReferralDashboard,
  getUserPayouts,
  listAdminReferralAnalytics,
  listCommissionRules,
  listPayoutRequests,
  listReferralCampaigns,
  logReferralAnalytics,
  persistStripeEvent,
  processStripeEvent,
  rejectPayoutRequest,
  releaseEligibleCommissions,
  requestPayout,
  trackReferralClick,
  updateCommissionRule,
  updateReferralCampaign,
  verifyStripeWebhookEvent,
} from "./referral-payments";
import { normalizeSearchQuery, parsePagination, searchAndRank } from "./search";
import { isVercelRuntime, resolveWritableRuntimePath } from "./runtime-paths";

const JWT_SECRET = env.JWT_SECRET;
const PASSWORD_HASH_ROUNDS = 12;
const ADMIN_PORTAL_ROLES = new Set(["viewer", "writer", "editor", "admin", "super_admin"]);
const ADMIN_SELF_SERVICE_ROLES = new Set(["viewer", "writer"]);
const ADMIN_ASSIGNABLE_ROLES = new Set(["viewer", "writer"]);
const ADMIN_CONTENT_ROLES = new Set(["writer", "editor", "admin", "super_admin"]);
const PROTECTED_ADMIN_ROLES = new Set(["super_admin"]);
const COMMON_WEAK_PASSWORDS = [
  "password",
  "password123",
  "admin",
  "admin123",
  "qwerty",
  "letmein",
  "welcome",
  "mtendere",
];

const strongPasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password must be 128 characters or fewer")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol")
  .refine(
    (password) => !COMMON_WEAK_PASSWORDS.some((weak) => password.toLowerCase().includes(weak)),
    "Password is too common or contains an unsafe word",
  );

const validateStrongPassword = (password: string) => strongPasswordSchema.parse(password);

const normalizeAdminRole = (role: unknown) => {
  if (typeof role !== "string") return null;
  const normalized = role.trim().toLowerCase();
  return normalized === "editor" ? "writer" : normalized;
};

const normalizeSelfServiceAdminRole = (role: unknown) => {
  const normalized = normalizeAdminRole(role);
  return normalized && ADMIN_SELF_SERVICE_ROLES.has(normalized) ? normalized : "viewer";
};

const isExplicitForbiddenAdminSignupRole = (role: unknown) => {
  if (role === undefined || role === null || role === "") return false;
  const normalized = normalizeAdminRole(role);
  return Boolean(normalized && !ADMIN_SELF_SERVICE_ROLES.has(normalized));
};

const normalizeAssignableAdminRole = (role: unknown) => {
  const normalized = normalizeAdminRole(role);
  return normalized && ADMIN_ASSIGNABLE_ROLES.has(normalized) ? normalized : null;
};

const isProtectedAdminRole = (role: string | null | undefined) =>
  Boolean(role && PROTECTED_ADMIN_ROLES.has(role));

const checkoutRequestSchema = z.object({
  mode: z.enum(["payment", "subscription"]).optional(),
  priceId: z.string().min(1).optional(),
  amount: z.coerce.number().int().positive().optional(),
  currency: z.string().length(3).optional(),
  productName: z.string().min(1).max(120).optional(),
  productType: z.string().min(1).max(60).optional(),
  quantity: z.coerce.number().int().positive().max(99).optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  clientReferenceId: z.string().min(1).max(120).optional(),
});

const payoutRequestSchema = z.object({
  amount: z.coerce.number().int().positive(),
  method: z.enum(["stripe_connect", "bank", "mobile_money", "manual"]),
  destination: z.record(z.unknown()).optional(),
});

const referralCampaignRequestSchema = z.object({
  name: z.string().min(2).max(160),
  codePrefix: z.string().max(20).nullable().optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().nullable().optional(),
  status: z.enum(["draft", "active", "paused", "ended"]).default("draft"),
  boostBps: z.coerce.number().int().positive().default(10000),
  maxRewardsPerReferrer: z.coerce.number().int().positive().nullable().optional(),
  attributionModel: z.enum(["last_click", "multi_touch"]).default("last_click"),
});

const commissionRuleRequestSchema = z.object({
  campaignId: z.coerce.number().int().positive().nullable().optional(),
  productType: z.string().max(60).nullable().optional(),
  level: z.coerce.number().int().positive().default(1),
  calculationType: z.enum(["percent", "flat", "hybrid"]),
  percentBps: z.coerce.number().int().min(0).max(10000).default(0),
  flatAmount: z.coerce.number().int().min(0).default(0),
  currency: z.string().length(3).default("USD"),
  releaseDelayDays: z.coerce.number().int().min(0).max(365).default(14),
  minPaymentAmount: z.coerce.number().int().min(0).nullable().optional(),
  maxCommissionAmount: z.coerce.number().int().positive().nullable().optional(),
  status: z.enum(["active", "paused", "archived"]).default("active"),
});

const subscriptionPreferenceCategories = [
  "scholarships",
  "jobs",
  "news",
  "events",
  "blog_updates",
  "partner_updates",
  "marketing",
] as const;

const subscriptionPreferenceAliases: Record<string, (typeof subscriptionPreferenceCategories)[number]> = {
  newsletter: "news",
  newsletters: "news",
  "study-abroad": "scholarships",
  study_abroad: "scholarships",
  studyabroad: "scholarships",
  blog: "blog_updates",
  blogs: "blog_updates",
  partners: "partner_updates",
};

const normalizeSubscriptionPreferences = (value: unknown) => {
  if (!Array.isArray(value)) return undefined;

  const allowed = new Set<string>(subscriptionPreferenceCategories);
  const normalized = value
    .map((item) => String(item).trim().toLowerCase())
    .map((item) => subscriptionPreferenceAliases[item] || item)
    .filter((item): item is (typeof subscriptionPreferenceCategories)[number] => allowed.has(item));

  return Array.from(new Set(normalized));
};

const subscriberRequestSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  name: z.string().trim().max(160).optional(),
  preferences: z.preprocess(
    normalizeSubscriptionPreferences,
    z.array(z.enum(subscriptionPreferenceCategories)).max(subscriptionPreferenceCategories.length).optional(),
  ),
  source: z.string().trim().max(80).default("website"),
  website: z.string().optional(),
  recaptchaToken: z.string().trim().max(4096).optional(),
  consentAccepted: z.boolean().optional().default(false),
});

const contactMessageRequestSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(160),
  email: z.string().trim().email("Valid email is required").max(255).transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(40).optional().nullable(),
  subject: z.string().trim().min(2, "Subject is required").max(220),
  inquiryCategory: z.string().trim().min(2, "Inquiry category is required").max(100),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(5000),
  website: z.string().optional(),
  recaptchaToken: z.string().trim().max(4096).optional(),
  consentAccepted: z.boolean().refine((value) => value, "Privacy consent is required"),
  source: z.string().trim().max(120).optional().default("contact_page"),
  landingPage: z.string().trim().max(500).optional(),
  referrer: z.string().trim().max(500).optional(),
  campaign: z.string().trim().max(160).optional(),
  utmSource: z.string().trim().max(160).optional(),
  utmMedium: z.string().trim().max(160).optional(),
  utmCampaign: z.string().trim().max(160).optional(),
  utmTerm: z.string().trim().max(160).optional(),
  utmContent: z.string().trim().max(160).optional(),
});

const publicAnalyticsTrackSchema = z.object({
  event: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9_:-]+$/i, "Event names may only contain letters, numbers, colon, dash, and underscore"),
  metadata: z.record(z.unknown()).optional().default({}),
  source: z.string().trim().max(120).optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
});

const resendVerificationSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
});

const changeVerificationEmailSchema = z.object({
  currentEmail: z.string().trim().email().transform((value) => value.toLowerCase()),
  newEmail: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(20),
  password: strongPasswordSchema,
});

const emailPreferenceUpdateSchema = z.object({
  categories: z.record(z.boolean()).optional(),
  unsubscribeAll: z.boolean().optional(),
});

const publicApplicationRequestSchema = z.object({
  type: z.enum(["job", "scholarship"]),
  referenceId: z.coerce.number().int().positive(),
  status: z.enum(["pending", "submitted", "in_review"]).default("pending"),
  documents: z.record(z.unknown()).optional(),
  notes: z.string().trim().max(4000).optional(),
});

const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  conversationId: z.string().trim().min(8).max(120).optional(),
});

const eventPayloadSchema = z.object({
  title: z.string().trim().min(3).max(220),
  slug: z.string().trim().max(180).optional(),
  summary: z.string().trim().max(500).optional().nullable(),
  description: z.string().trim().min(10),
  category: z.string().trim().min(1).max(100).default("General"),
  eventType: z.string().trim().min(1).max(80).default("Information Session"),
  organizer: z.string().trim().max(220).optional().nullable(),
  location: z.string().trim().min(1).max(220).default("Lilongwe, Malawi"),
  venueName: z.string().trim().max(220).optional().nullable(),
  address: z.string().trim().max(400).optional().nullable(),
  mapUrl: z.string().trim().max(1000).optional().nullable(),
  isVirtual: z.boolean().optional().default(false),
  virtualUrl: z.string().trim().max(1000).optional().nullable(),
  livestreamUrl: z.string().trim().max(1000).optional().nullable(),
  isPaid: z.boolean().optional().default(false),
  priceAmount: z.coerce.number().int().min(0).optional().default(0),
  currency: z.string().trim().min(3).max(10).optional().default("MWK"),
  capacity: z.coerce.number().int().positive().nullable().optional(),
  rsvpEnabled: z.boolean().optional().default(true),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  registrationDeadline: z.coerce.date().nullable().optional(),
  coverImage: z.string().trim().max(1000).optional().nullable(),
  videoUrl: z.string().trim().max(1000).optional().nullable(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  ticketTypes: z.array(z.record(z.unknown())).optional().nullable(),
  customFields: z.array(z.record(z.unknown())).optional().nullable(),
  agenda: z.array(z.record(z.unknown())).optional().nullable(),
  speakers: z.array(z.record(z.unknown())).optional().nullable(),
  sponsors: z.array(z.record(z.unknown())).optional().nullable(),
  partners: z.array(z.record(z.unknown())).optional().nullable(),
  faqs: z.array(z.record(z.unknown())).optional().nullable(),
  resources: z.array(z.record(z.unknown())).optional().nullable(),
  attachments: z.array(z.record(z.unknown())).optional().nullable(),
  gallery: z.array(z.record(z.unknown())).optional().nullable(),
  seoMeta: z.record(z.unknown()).optional().nullable(),
  socialMeta: z.record(z.unknown()).optional().nullable(),
  status: z.enum(["draft", "published", "archived", "cancelled"]).default("draft"),
  isFeatured: z.boolean().optional().default(false),
  isRecommended: z.boolean().optional().default(false),
  isTrending: z.boolean().optional().default(false),
  allowComments: z.boolean().optional().default(true),
  requiresApproval: z.boolean().optional().default(false),
});

const eventRegistrationRequestSchema = z.object({
  fullName: z.string().trim().min(2).max(180),
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(40).optional().nullable(),
  organization: z.string().trim().max(180).optional().nullable(),
  ticketType: z.string().trim().max(120).optional().nullable(),
  answers: z.record(z.unknown()).optional().nullable(),
  reminderOptIn: z.boolean().optional().default(true),
  source: z.string().trim().max(80).optional().default("public"),
});

const eventCommentRequestSchema = z.object({
  authorName: z.string().trim().min(2).max(180),
  authorEmail: z.string().trim().email().max(255).optional().nullable(),
  content: z.string().trim().min(2).max(2000),
  parentId: z.coerce.number().int().positive().optional().nullable(),
});

const eventRegistrationReviewSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "waitlisted", "checked_in", "cancelled"]).optional(),
  attendanceStatus: z.enum(["registered", "attended", "no_show", "checked_in", "checked_out", "cancelled"]).optional(),
  approvalNotes: z.string().trim().max(2000).optional().nullable(),
});

const adminApplicationReviewSchema = z.object({
  status: z
    .enum([
      "pending",
      "under_review",
      "shortlisted",
      "interview",
      "assessment",
      "offer",
      "hired",
      "approved",
      "rejected",
      "waitlisted",
    ])
    .optional(),
  reviewNotes: z.string().trim().max(4000).optional(),
  stage: z.string().trim().max(120).optional(),
  score: z.coerce.number().int().min(0).max(100).optional(),
  evaluationScores: z.array(z.record(z.unknown())).optional(),
  shortlist: z.boolean().optional(),
  interviewAt: z.coerce.date().optional().nullable(),
  interviewNotes: z.string().trim().max(4000).optional(),
  verificationChecks: z.array(z.record(z.unknown())).optional(),
});

const adminSettingsUpdateSchema = z.object({
  platformName: z.string().trim().min(2).max(160).optional(),
  supportEmail: z.string().trim().email().optional(),
  sessionTimeout: z.coerce.number().int().min(5).max(480).optional(),
  maxLoginAttempts: z.coerce.number().int().min(3).max(20).optional(),
  maintenanceMode: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  twoFactorRequired: z.boolean().optional(),
  weeklySummary: z.boolean().optional(),
  contentPublishedNotifications: z.boolean().optional(),
});

const mediaReplaceReferencesSchema = z.object({
  from: z.string().trim().min(1).max(1000),
  to: z.string().trim().min(1).max(1000),
});

const adminRoleInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().default(""),
  permissions: z.array(z.string().trim().min(1).max(80)).max(40).optional().default([]),
  isActive: z.boolean().optional().default(true),
});

const partnerActivityInputSchema = z.object({
  type: z.string().trim().min(2).max(80).default("note"),
  subject: z.string().trim().min(2).max(180),
  notes: z.string().trim().max(4000).optional().default(""),
  outcome: z.string().trim().max(1000).optional().default(""),
  dueAt: z.coerce.date().optional().nullable(),
  completedAt: z.coerce.date().optional().nullable(),
  owner: z.string().trim().max(120).optional().default("Admin"),
});

const partnerDocumentInputSchema = z.object({
  title: z.string().trim().min(2).max(180),
  type: z.string().trim().max(80).default("agreement"),
  url: z.string().trim().min(1).max(1000),
  version: z.coerce.number().int().positive().default(1),
  accessLevel: z.enum(["admin", "partner", "public"]).default("admin"),
  expiresAt: z.coerce.date().optional().nullable(),
});

const partnerFinancialInputSchema = z.object({
  type: z.string().trim().max(80).default("contribution"),
  amount: z.coerce.number().int().min(0),
  currency: z.string().trim().min(3).max(10).default("MWK"),
  status: z.string().trim().max(40).default("pledged"),
  notes: z.string().trim().max(1000).optional().default(""),
});

const adminPermissionIds = new Set([
  "view_dashboard",
  "manage_events",
  "manage_scholarships",
  "manage_jobs",
  "manage_partners",
  "manage_blog",
  "manage_team",
  "manage_media",
  "manage_users",
  "review_applications",
  "manage_roles",
  "view_analytics",
  "manage_settings",
  "create",
  "read",
  "update",
  "delete",
  "approve",
  "publish",
  "export",
  "archive",
  "manage_reports",
  "manage_webhooks",
  "manage_automation",
  "manage_security",
]);

const normalizeRoleId = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const escapeCsvValue = (value: unknown) => {
  const text = value instanceof Date ? value.toISOString() : String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

type JwtUser = {
  id: number;
  email: string;
  role: string;
  type?: "access" | "refresh" | "email_verification" | "password_reset";
  pwd?: string;
  jti?: string;
  iat?: number;
};

type AuthenticatedRequest = Request & {
  user: JwtUser;
};

type MulterRequest = Request & {
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
};

type SocketWithSubscriptions = WebSocket & {
  subscriptions?: string[];
  user?: JwtUser | null;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof z.ZodError) {
    return error.flatten();
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
};

const getErrorLogMessage = (error: unknown) => {
  const message = getErrorMessage(error);
  return typeof message === "string" ? message : JSON.stringify(message);
};

const getPublicErrorMessage = (error: unknown, fallback = "Request failed") => {
  if (error instanceof z.ZodError) {
    const flattened = error.flatten();
    const fieldMessages = Object.entries(flattened.fieldErrors)
      .flatMap(([field, messages]) => (messages || []).map((message) => `${field}: ${message}`));
    const formMessages = flattened.formErrors || [];
    return [...fieldMessages, ...formMessages].filter(Boolean).join(", ") || fallback;
  }

  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const logAnalyticsBestEffort = async (input: Parameters<typeof storage.logAnalytics>[0]) => {
  try {
    await storage.logAnalytics(input);
  } catch (error) {
    console.warn("Analytics logging skipped:", getErrorLogMessage(error));
  }
};

const isTransientDbConnectivityError = (error: unknown) => {
  const message = JSON.stringify(getErrorMessage(error)).toLowerCase();
  return (
    message.includes("fetch failed") ||
    message.includes("connecttimeout") ||
    message.includes("error connecting to database") ||
    message.includes("connection terminated") ||
    message.includes("network")
  );
};

const getRequestBaseUrl = (req: Request) =>
  env.PUBLIC_APP_URL || `${req.protocol}://${req.get("host")}`;

const getApiRequestBaseUrl = (req: Request) =>
  env.API_APP_URL || getRequestBaseUrl(req);

const getAdminBaseUrl = (req: Request) =>
  env.ADMIN_APP_URL || `${req.protocol}://${req.get("host")}/admin`;

const passwordFingerprint = (passwordHash: string) =>
  createHmac("sha256", JWT_SECRET).update(passwordHash).digest("hex").slice(0, 40);

const getClientIp = (req: Request) => req.ip || req.socket.remoteAddress || "unknown";

const flowRateLimits = new Map<string, { count: number; resetAt: number }>();

const guardPublicFlowRateLimit = (req: Request, res: Response, flow: string, max = 8, windowMs = 10 * 60 * 1000) => {
  const now = Date.now();
  const key = `${flow}:${getClientIp(req)}`;
  const current = flowRateLimits.get(key);

  if (!current || current.resetAt <= now) {
    flowRateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  current.count += 1;
  if (current.count <= max) return true;

  const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
  res.setHeader("Retry-After", String(retryAfterSeconds));
  res.status(429).json({
    message: "Too many submissions. Please wait a few minutes before trying again.",
    retryAfterSeconds,
  });
  return false;
};

const verifyRecaptcha = async (token: string | undefined, req: Request, action: string) => {
  if (!env.RECAPTCHA_SECRET_KEY) return { ok: true, skipped: true };
  if (!token) return { ok: false, reason: "reCAPTCHA verification is required" };

  const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: env.RECAPTCHA_SECRET_KEY,
      response: token,
      remoteip: getClientIp(req),
    }),
  });

  if (!response.ok) return { ok: false, reason: "reCAPTCHA verification failed" };

  const payload = (await response.json()) as {
    success?: boolean;
    score?: number;
    action?: string;
    hostname?: string;
    "error-codes"?: string[];
  };
  const score = typeof payload.score === "number" ? payload.score : 1;
  const actionMatches = !payload.action || payload.action === action;

  return {
    ok: Boolean(payload.success && actionMatches && score >= 0.5),
    reason: payload.success ? "reCAPTCHA risk score is too low" : "reCAPTCHA verification failed",
    score,
    hostname: payload.hostname,
    errorCodes: payload["error-codes"],
  };
};

const buildPublicUser = (user: {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  profilePicture?: string | null;
  phone?: string | null;
  dateOfBirth?: Date | null;
  referralCode?: string | null;
}) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
  profilePicture: user.profilePicture,
  phone: user.phone,
  dateOfBirth: user.dateOfBirth,
  referralCode: user.referralCode,
});

const toAdminUser = (user: {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  profilePicture?: string | null;
  isActive?: boolean | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}) => {
  const meta = getUserMeta(user.id);

  return {
    id: String(user.id),
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    profileImage: user.profilePicture ?? null,
    bio: meta.bio ?? "",
    avatar: meta.avatar ?? user.profilePicture ?? null,
    socialLinks: meta.socialLinks ?? {},
    preferences: meta.preferences ?? {},
    notificationPreferences: meta.notificationPreferences ?? {},
    savedItems: meta.savedItems ?? [],
    activityLogs: meta.activityLogs ?? [],
    loginHistory: meta.loginHistory ?? [],
    deviceHistory: meta.deviceHistory ?? [],
    verification: meta.verification ?? {},
    suspendedAt: meta.suspendedAt ?? null,
    suspensionReason: meta.suspensionReason ?? null,
    region: meta.region ?? null,
    isActive: user.isActive ?? true,
    lastLogin: null,
    createdAt: user.createdAt ?? null,
    updatedAt: user.updatedAt ?? null,
  };
};

const normalizeAdminStatus = (
  status?: string | null,
  fallbackIsActive?: boolean | null,
) => {
  if (status === "published" || status === "draft" || status === "archived") {
    return status;
  }

  if (typeof fallbackIsActive === "boolean") {
    return fallbackIsActive ? "published" : "draft";
  }

  return "draft";
};

const parseNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value.replace(/[^\d.-]/g, ""));
    if (!Number.isNaN(numeric)) return numeric;
  }
  return undefined;
};

const parseStringArray = (value: unknown) => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return undefined;
};

const parseRecordArray = (value: unknown): Array<Record<string, unknown>> | undefined => {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item));
};

const parseRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
};

const parseIsoDateString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const parseOptionalBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null) return undefined;
  return Boolean(value);
};

const parseOptionalUrl = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    return "";
  }
};

const parseAnalyticsMeta = (metadata: unknown) => {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  const record = metadata as Record<string, unknown>;
  const type = typeof record.type === "string" ? record.type : undefined;
  const referenceId =
    typeof record.referenceId === "string" || typeof record.referenceId === "number"
      ? record.referenceId
      : undefined;

  return { type, referenceId };
};

const compactRecord = <T extends Record<string, unknown>>(record: T) =>
  Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)) as Partial<T>;

const buildScholarshipMetaFromBody = (body: Record<string, unknown>, featuredImage?: string): ScholarshipMeta =>
  compactRecord({
    slug: typeof body.slug === "string" ? slugify(body.slug) : typeof body.title === "string" ? slugify(body.title) : undefined,
    shortDescription: typeof body.shortDescription === "string" ? body.shortDescription : undefined,
    fullContent: typeof body.fullContent === "string" ? body.fullContent : undefined,
    bannerImage: typeof body.bannerImage === "string" ? body.bannerImage : undefined,
    eligibility: typeof body.eligibility === "string" ? body.eligibility : undefined,
    scholarshipType: typeof body.scholarshipType === "string" ? body.scholarshipType : undefined,
    fundingType: typeof body.fundingType === "string" ? body.fundingType : undefined,
    eligibilityCriteria: typeof body.eligibilityCriteria === "string" ? body.eligibilityCriteria : undefined,
    countryRestrictions: parseStringArray(body.countryRestrictions),
    academicRequirements: parseStringArray(body.academicRequirements),
    openingDate: parseIsoDateString(body.openingDate),
    fundingAmount: typeof body.fundingAmount === "string" ? body.fundingAmount : undefined,
    sponsorOrganization: typeof body.sponsorOrganization === "string" ? body.sponsorOrganization : undefined,
    benefits: parseStringArray(body.benefits),
    applicationSteps: parseStringArray(body.applicationSteps),
    requiredDocuments: parseStringArray(body.requiredDocuments),
    faq: parseRecordArray(body.faq),
    brochures: parseRecordArray(body.brochures),
    videoEmbeds: parseRecordArray(body.videoEmbeds),
    tags: parseStringArray(body.tags),
    seoMeta: parseRecord(body.seoMeta),
    socialMeta: parseRecord(body.socialMeta),
    applicationForm: parseRecordArray(body.applicationForm),
    conditionalRules: parseRecordArray(body.conditionalRules),
    reviewPipeline: parseRecordArray(body.reviewPipeline),
    visibilitySchedule: parseRecord(body.visibilitySchedule),
    automationHooks: parseRecord(body.automationHooks),
    analytics: parseRecord(body.analytics),
    status: typeof body.status === "string" ? normalizeAdminStatus(body.status) : undefined,
    isPremium: parseOptionalBoolean(body.isPremium),
    isFeatured: parseOptionalBoolean(body.isFeatured),
    paymentStatus: typeof body.paymentStatus === "string" ? body.paymentStatus : undefined,
    featuredImage,
    region: typeof body.region === "string" ? body.region : undefined,
  }) as ScholarshipMeta;

const buildJobMetaFromBody = (body: Record<string, unknown>, featuredImage?: string): JobMeta =>
  compactRecord({
    slug: typeof body.slug === "string" ? slugify(body.slug) : typeof body.title === "string" ? slugify(body.title) : undefined,
    category: typeof body.category === "string" ? body.category : undefined,
    department: typeof body.department === "string" ? body.department : undefined,
    companyLogo: typeof body.companyLogo === "string" ? body.companyLogo : undefined,
    companyProfile: typeof body.companyProfile === "string" ? body.companyProfile : undefined,
    companyOverview: typeof body.companyOverview === "string" ? body.companyOverview : undefined,
    aboutTeam: typeof body.aboutTeam === "string" ? body.aboutTeam : undefined,
    workMode: typeof body.workMode === "string" ? body.workMode : undefined,
    responsibilities: parseStringArray(body.responsibilities),
    qualifications: parseStringArray(body.qualifications),
    educationRequirements: parseStringArray(body.educationRequirements),
    requiredSkills: parseStringArray(body.requiredSkills),
    preferredSkills: parseStringArray(body.preferredSkills),
    requirements: parseStringArray(body.requirements),
    skills: parseStringArray(body.skills),
    experienceLevel: typeof body.experienceLevel === "string" ? body.experienceLevel : undefined,
    employmentType: typeof body.employmentType === "string" ? body.employmentType : undefined,
    numberOfPositions: typeof body.numberOfPositions === "string" ? body.numberOfPositions : undefined,
    salaryMin: typeof body.salaryMin === "string" ? body.salaryMin : undefined,
    salaryMax: typeof body.salaryMax === "string" ? body.salaryMax : undefined,
    applicationInstructions: typeof body.applicationInstructions === "string" ? body.applicationInstructions : undefined,
    contactInformation: parseRecord(body.contactInformation),
    attachments: parseRecordArray(body.attachments),
    seoMeta: parseRecord(body.seoMeta),
    socialMeta: parseRecord(body.socialMeta),
    tags: parseStringArray(body.tags),
    isFeatured: parseOptionalBoolean(body.isFeatured),
    dynamicQuestions: parseRecordArray(body.dynamicQuestions),
    conditionalRules: parseRecordArray(body.conditionalRules),
    assessments: parseRecordArray(body.assessments),
    interviewTasks: parseRecordArray(body.interviewTasks),
    applicationForm: parseRecordArray(body.applicationForm),
    pipelineStages: parseRecordArray(body.pipelineStages),
    emailTemplates: parseRecordArray(body.emailTemplates),
    recruiterNotes: parseRecordArray(body.recruiterNotes),
    automationHooks: parseRecord(body.automationHooks),
    analytics: parseRecord(body.analytics),
    salaryRange: typeof body.salaryRange === "string" ? body.salaryRange : undefined,
    applicationUrl: typeof body.applicationUrl === "string" ? body.applicationUrl : undefined,
    status: typeof body.status === "string" ? normalizeAdminStatus(body.status) : undefined,
    region: typeof body.region === "string" ? body.region : undefined,
    isPremium: parseOptionalBoolean(body.isPremium),
    price: typeof body.price === "string" ? body.price : undefined,
    paymentStatus: typeof body.paymentStatus === "string" ? body.paymentStatus : undefined,
    featuredImage,
    benefits: typeof body.benefits === "string" ? body.benefits : undefined,
  }) as JobMeta;

const buildBlogMetaFromBody = (body: Record<string, unknown>, featuredImage?: string): BlogMeta =>
  compactRecord({
    slug: typeof body.slug === "string" ? slugify(body.slug) : typeof body.title === "string" ? slugify(body.title) : undefined,
    gallery: parseRecordArray(body.gallery),
    videos: parseRecordArray(body.videos),
    pullQuotes: parseStringArray(body.pullQuotes),
    tables: parseRecordArray(body.tables),
    codeBlocks: parseRecordArray(body.codeBlocks),
    seoMeta: parseRecord(body.seoMeta),
    socialMeta: parseRecord(body.socialMeta),
    structuredData: parseRecord(body.structuredData),
    readingTimeMinutes: typeof body.readingTimeMinutes === "number" ? body.readingTimeMinutes : undefined,
    revisionHistory: parseRecordArray(body.revisionHistory),
    relatedPosts: parseRecordArray(body.relatedPosts),
    authorProfile: parseRecord(body.authorProfile),
    scheduledAt: parseIsoDateString(body.scheduledAt),
    automationHooks: parseRecord(body.automationHooks),
    status: typeof body.status === "string" ? normalizeAdminStatus(body.status) : undefined,
    featuredImage,
  }) as BlogMeta;

const buildTeamMetaFromBody = (body: Record<string, unknown>, profileImage?: string): TeamMeta =>
  compactRecord({
    department: typeof body.department === "string" ? body.department : undefined,
    profileImage,
    title: typeof body.title === "string" ? body.title : undefined,
    biography: typeof body.biography === "string" ? body.biography : undefined,
    cvUrl: typeof body.cvUrl === "string" ? body.cvUrl : undefined,
    skills: parseStringArray(body.skills),
    achievements: parseStringArray(body.achievements),
    certifications: parseStringArray(body.certifications),
    socialLinks: parseRecord(body.socialLinks) as Record<string, string> | undefined,
    contactInfo: parseRecord(body.contactInfo),
    visibility: typeof body.visibility === "string" ? body.visibility : undefined,
    leadershipLevel: typeof body.leadershipLevel === "string" ? body.leadershipLevel : undefined,
    displayGroup: typeof body.displayGroup === "string" ? body.displayGroup : undefined,
  }) as TeamMeta;

const buildApplicationMetaFromBody = (body: Record<string, unknown>): ApplicationMeta =>
  compactRecord({
    workflowType: typeof body.workflowType === "string" ? body.workflowType : undefined,
    stage: typeof body.stage === "string" ? body.stage : undefined,
    score: typeof body.score === "number" ? body.score : undefined,
    source: typeof body.source === "string" ? body.source : undefined,
    applicantSnapshot: parseRecord(body.applicantSnapshot),
    professionalSnapshot: parseRecord(body.professionalSnapshot),
    educationHistory: parseRecordArray(body.educationHistory),
    experienceHistory: parseRecordArray(body.experienceHistory),
    references: parseRecordArray(body.references),
    roleAnswers: parseRecord(body.roleAnswers),
    cvBuilderSnapshot: parseRecord(body.cvBuilderSnapshot),
    atsScore: typeof body.atsScore === "number" ? body.atsScore : undefined,
    evaluationScores: parseRecordArray(body.evaluationScores),
    interviewNotes: parseRecordArray(body.interviewNotes),
    reviewerComments: parseRecordArray(body.reviewerComments),
    reviewHistory: parseRecordArray(body.reviewHistory),
    documents: parseRecordArray(body.documents),
    verificationChecks: parseRecordArray(body.verificationChecks),
    interviewSchedule: parseRecordArray(body.interviewSchedule),
    shortlist: parseOptionalBoolean(body.shortlist),
    pipeline: parseRecordArray(body.pipeline),
    pdfUrl: typeof body.pdfUrl === "string" ? body.pdfUrl : undefined,
    notificationHistory: parseRecordArray(body.notificationHistory),
    automationHooks: parseRecord(body.automationHooks),
    analytics: parseRecord(body.analytics),
  }) as ApplicationMeta;

const toAdminScholarship = (scholarship: any) => {
  const meta = getScholarshipMeta(scholarship.id);
  return {
    id: String(scholarship.id),
    title: scholarship.title,
    slug: meta.slug ?? slugify(scholarship.title ?? `scholarship-${scholarship.id}`),
    shortDescription: meta.shortDescription ?? "",
    fullContent: meta.fullContent ?? scholarship.description,
    description: scholarship.description,
    eligibility: meta.eligibility ?? "",
    scholarshipType: meta.scholarshipType ?? "",
    fundingType: meta.fundingType ?? "",
    eligibilityCriteria: meta.eligibilityCriteria ?? meta.eligibility ?? "",
    countryRestrictions: meta.countryRestrictions ?? [],
    academicRequirements: meta.academicRequirements ?? [],
    openingDate: meta.openingDate ?? null,
    fundingAmount: meta.fundingAmount ?? "",
    sponsorOrganization: meta.sponsorOrganization ?? scholarship.institution,
    benefits: meta.benefits ?? [],
    applicationSteps: meta.applicationSteps ?? [],
    requiredDocuments: meta.requiredDocuments ?? [],
    faq: meta.faq ?? [],
    brochures: meta.brochures ?? [],
    videoEmbeds: meta.videoEmbeds ?? [],
    tags: meta.tags ?? [],
    seoMeta: meta.seoMeta ?? {},
    socialMeta: meta.socialMeta ?? {},
    applicationForm: meta.applicationForm ?? [],
    conditionalRules: meta.conditionalRules ?? [],
    reviewPipeline: meta.reviewPipeline ?? [],
    visibilitySchedule: meta.visibilitySchedule ?? {},
    automationHooks: meta.automationHooks ?? {},
    analytics: meta.analytics ?? {},
    amount: scholarship.amount ? String(scholarship.amount) : "",
    deadline: scholarship.deadline,
    requirements: scholarship.requirements ?? [],
    category: scholarship.category,
    institution: scholarship.institution,
    region: meta.region ?? "Global",
    isPremium: meta.isPremium ?? false,
    paymentStatus: meta.paymentStatus ?? "unpaid",
    status: normalizeAdminStatus(meta.status, scholarship.isActive),
    isFeatured: meta.isFeatured ?? false,
    featuredImage: meta.featuredImage ?? scholarship.imageUrl ?? "",
    createdBy: scholarship.createdBy ? String(scholarship.createdBy) : null,
    createdAt: scholarship.createdAt ?? null,
    updatedAt: scholarship.updatedAt ?? null,
  };
};

const toAdminJob = (job: any) => {
  const meta = getJobMeta(job.id);
  const requirements = meta.requirements ?? (Array.isArray(job.requirements) ? job.requirements : []);
  const requiredSkills = meta.requiredSkills ?? meta.skills ?? [];
  return {
    id: String(job.id),
    title: job.title,
    slug: meta.slug ?? slugify(job.title ?? `job-${job.id}`),
    description: job.description,
    category: meta.category ?? job.jobType ?? "General",
    company: job.company,
    companyLogo: meta.companyLogo ?? "",
    companyProfile: meta.companyProfile ?? "",
    companyOverview: meta.companyOverview ?? "",
    aboutTeam: meta.aboutTeam ?? "",
    department: meta.department ?? "",
    location: job.location,
    workMode: meta.workMode ?? (job.isRemote ? "Remote" : "Onsite"),
    region: meta.region ?? "Global",
    salaryRange: meta.salaryRange ?? "",
    salaryMin: meta.salaryMin ?? "",
    salaryMax: meta.salaryMax ?? "",
    jobType: job.jobType,
    employmentType: meta.employmentType ?? job.jobType,
    experienceLevel: meta.experienceLevel ?? "",
    educationRequirements: meta.educationRequirements ?? [],
    requiredSkills,
    preferredSkills: meta.preferredSkills ?? [],
    numberOfPositions: meta.numberOfPositions ?? "1",
    responsibilities: meta.responsibilities ?? [],
    qualifications: meta.qualifications ?? [],
    skills: requiredSkills,
    requirements,
    benefits: meta.benefits ?? "",
    applicationInstructions: meta.applicationInstructions ?? "",
    contactInformation: meta.contactInformation ?? {},
    attachments: meta.attachments ?? [],
    seoMeta: meta.seoMeta ?? {},
    socialMeta: meta.socialMeta ?? {},
    tags: meta.tags ?? [],
    dynamicQuestions: meta.dynamicQuestions ?? [],
    conditionalRules: meta.conditionalRules ?? [],
    assessments: meta.assessments ?? [],
    interviewTasks: meta.interviewTasks ?? [],
    applicationForm: meta.applicationForm ?? [],
    pipelineStages: meta.pipelineStages ?? [],
    emailTemplates: meta.emailTemplates ?? [],
    recruiterNotes: meta.recruiterNotes ?? [],
    automationHooks: meta.automationHooks ?? {},
    analytics: meta.analytics ?? {},
    applicationUrl: meta.applicationUrl ?? "",
    deadline: job.deadline ?? null,
    isPremium: meta.isPremium ?? false,
    isFeatured: meta.isFeatured ?? false,
    price: meta.price ?? "",
    paymentStatus: meta.paymentStatus ?? "unpaid",
    status: normalizeAdminStatus(meta.status, job.isActive),
    featuredImage: meta.featuredImage ?? job.imageUrl ?? "",
    createdBy: job.createdBy ? String(job.createdBy) : null,
    createdAt: job.createdAt ?? null,
    updatedAt: job.updatedAt ?? null,
  };
};

const toPublicJob = (job: any) => {
  const meta = getJobMeta(job.id);
  const requirements = meta.requirements ?? (Array.isArray(job.requirements) ? job.requirements : []);
  const requiredSkills = meta.requiredSkills ?? meta.skills ?? [];
  const benefits =
    Array.isArray(job.benefits)
      ? job.benefits
      : typeof meta.benefits === "string"
        ? parseStringArray(meta.benefits) ?? []
        : [];
  return {
    ...job,
    slug: meta.slug ?? slugify(job.title ?? `job-${job.id}`),
    imageUrl: meta.featuredImage ?? job.imageUrl ?? null,
    category: meta.category ?? job.jobType ?? "General",
    department: meta.department ?? null,
    employmentType: meta.employmentType ?? job.jobType,
    companyLogo: meta.companyLogo ?? null,
    companyProfile: meta.companyProfile ?? null,
    companyOverview: meta.companyOverview ?? null,
    aboutTeam: meta.aboutTeam ?? null,
    workMode: meta.workMode ?? (job.isRemote ? "Remote" : "Onsite"),
    numberOfPositions: meta.numberOfPositions ?? "1",
    experienceLevel: meta.experienceLevel ?? null,
    educationRequirements: meta.educationRequirements ?? [],
    requiredSkills,
    preferredSkills: meta.preferredSkills ?? [],
    responsibilities: meta.responsibilities ?? [],
    qualifications: meta.qualifications ?? [],
    requirements,
    benefits,
    skills: requiredSkills,
    salaryRange: meta.salaryRange ?? null,
    salaryMin: meta.salaryMin ?? null,
    salaryMax: meta.salaryMax ?? null,
    applicationInstructions: meta.applicationInstructions ?? null,
    contactInformation: meta.contactInformation ?? null,
    attachments: meta.attachments ?? [],
    seoMeta: meta.seoMeta ?? {},
    socialMeta: meta.socialMeta ?? {},
    tags: meta.tags ?? [],
    isFeatured: meta.isFeatured ?? false,
    dynamicQuestions: meta.dynamicQuestions ?? [],
    conditionalRules: meta.conditionalRules ?? [],
    assessments: meta.assessments ?? [],
    interviewTasks: meta.interviewTasks ?? [],
    applicationForm: meta.applicationForm ?? [],
    applicationUrl: meta.applicationUrl ?? null,
    region: meta.region ?? null,
  };
};

const toPublicScholarship = (scholarship: any) => {
  const meta = getScholarshipMeta(scholarship.id);
  return {
    ...scholarship,
    slug: meta.slug ?? slugify(scholarship.title ?? `scholarship-${scholarship.id}`),
    shortDescription: meta.shortDescription ?? scholarship.description ?? "",
    fullContent: meta.fullContent ?? scholarship.description ?? "",
    imageUrl: meta.featuredImage ?? scholarship.imageUrl ?? null,
    bannerImage: meta.featuredImage ?? scholarship.imageUrl ?? null,
    scholarshipType: meta.scholarshipType ?? null,
    fundingType: meta.fundingType ?? null,
    eligibilityCriteria: meta.eligibilityCriteria ?? meta.eligibility ?? null,
    countryRestrictions: meta.countryRestrictions ?? [],
    academicRequirements: meta.academicRequirements ?? [],
    openingDate: meta.openingDate ?? null,
    fundingAmount: meta.fundingAmount ?? null,
    sponsorOrganization: meta.sponsorOrganization ?? scholarship.institution ?? null,
    benefits: meta.benefits ?? [],
    applicationSteps: meta.applicationSteps ?? [],
    requiredDocuments: meta.requiredDocuments ?? [],
    faq: meta.faq ?? [],
    brochures: meta.brochures ?? [],
    videoEmbeds: meta.videoEmbeds ?? [],
    seoMeta: meta.seoMeta ?? {},
    socialMeta: meta.socialMeta ?? {},
    tags: meta.tags ?? [],
    isFeatured: meta.isFeatured ?? false,
    region: meta.region ?? scholarship.country ?? "Global",
  };
};

const findJobByIdentifier = async (identifier: string, requester?: JwtUser | null) => {
  const numericId = Number.parseInt(identifier, 10);
  if (!Number.isNaN(numericId) && String(numericId) === identifier) {
    return storage.getJob(numericId);
  }

  const normalized = slugify(identifier);
  const jobs = isAdmin(requester ?? null) ? await storage.getAllJobs() : await storage.getActiveJobs();
  return jobs.find((job) => {
    const meta = getJobMeta(job.id);
    return (meta.slug ?? slugify(job.title ?? `job-${job.id}`)) === normalized;
  });
};

const findScholarshipByIdentifier = async (identifier: string, requester?: JwtUser | null) => {
  const numericId = Number.parseInt(identifier, 10);
  if (!Number.isNaN(numericId) && String(numericId) === identifier) {
    return storage.getScholarship(numericId);
  }

  const normalized = slugify(identifier);
  const scholarships = isAdmin(requester ?? null) ? await storage.getAllScholarships() : await storage.getActiveScholarships();
  return scholarships.find((scholarship) => {
    const meta = getScholarshipMeta(scholarship.id);
    return (meta.slug ?? slugify(scholarship.title ?? `scholarship-${scholarship.id}`)) === normalized;
  });
};

const findTeamMemberByIdentifier = async (identifier: string, requester?: JwtUser | null) => {
  const numericId = Number.parseInt(identifier, 10);
  if (!Number.isNaN(numericId) && String(numericId) === identifier) {
    return storage.getTeamMember(numericId);
  }

  const normalized = slugify(identifier);
  const members = isAdmin(requester ?? null) ? await storage.getAllTeamMembers() : await storage.getActiveTeamMembers();
  return members.find((member) => {
    const meta = getTeamMeta(member.id);
    return slugify(String(meta.title ?? member.position ?? member.name ?? `team-${member.id}`)) === normalized || slugify(member.name ?? "") === normalized;
  });
};

const toAdminPartner = (partner: any) => {
  const meta = getPartnerMeta(partner.id);
  return {
    id: String(partner.id),
    name: partner.name,
    description: partner.description,
    logo: meta.logo ?? partner.logoUrl ?? "",
    logoUrl: meta.logo ?? partner.logoUrl ?? "",
    coverImage: meta.coverImage ?? partner.coverImage ?? "",
    website: partner.website ?? "",
    contactName: meta.contactName ?? partner.contactName ?? "",
    contactEmail: meta.contactEmail ?? partner.contactEmail ?? "",
    contactPhone: meta.contactPhone ?? partner.contactPhone ?? "",
    address: meta.address ?? partner.address ?? "",
    country: meta.country ?? partner.country ?? "Global",
    region: meta.region ?? partner.region ?? partner.country ?? "Global",
    industryCategory: meta.industryCategory ?? partner.industryCategory ?? "",
    partnershipLevel: meta.partnershipLevel ?? partner.partnershipLevel ?? "",
    sponsorshipTier: meta.sponsorshipTier ?? partner.sponsorshipTier ?? "",
    status: meta.status ?? partner.status ?? (partner.isActive === false ? "inactive" : "active"),
    partnershipType: meta.partnershipType ?? "partner",
    socialLinks: meta.socialLinks ?? partner.socialLinks ?? {},
    documents: meta.documents ?? partner.documents ?? [],
    agreements: meta.agreements ?? partner.agreements ?? [],
    notes: meta.notes ?? partner.notes ?? "",
    internalComments: meta.internalComments ?? partner.internalComments ?? "",
    linkedEvents: meta.linkedEvents ?? partner.linkedEvents ?? [],
    linkedSponsorships: meta.linkedSponsorships ?? partner.linkedSponsorships ?? [],
    linkedOpportunities: meta.linkedOpportunities ?? partner.linkedOpportunities ?? [],
    partnershipHistory: meta.partnershipHistory ?? partner.partnershipHistory ?? [],
    activities: meta.activities ?? [],
    meetings: meta.meetings ?? [],
    reminders: meta.reminders ?? [],
    financialRecords: meta.financialRecords ?? [],
    performanceMetrics: meta.performanceMetrics ?? {},
    videoUrl: meta.videoUrl ?? "",
    videoTitle: meta.videoTitle ?? "",
    videoDescription: meta.videoDescription ?? "",
    isFeatured: meta.isFeatured ?? false,
    isPremium: meta.isPremium ?? false,
    paymentStatus: meta.paymentStatus ?? "unpaid",
    isActive: partner.isActive ?? true,
    createdBy: null,
    createdAt: partner.createdAt ?? null,
    updatedAt: partner.updatedAt ?? null,
  };
};

const toAdminBlogPost = (post: any) => {
  const meta = getBlogMeta(post.id);
  return {
    id: String(post.id),
    title: post.title,
    content: post.content,
    excerpt: post.excerpt ?? "",
    slug: meta.slug ?? `post-${post.id}`,
    featuredImage: meta.featuredImage ?? post.imageUrl ?? "",
    gallery: meta.gallery ?? [],
    videos: meta.videos ?? [],
    pullQuotes: meta.pullQuotes ?? [],
    tables: meta.tables ?? [],
    codeBlocks: meta.codeBlocks ?? [],
    seoMeta: meta.seoMeta ?? {},
    socialMeta: meta.socialMeta ?? {},
    structuredData: meta.structuredData ?? {},
    readingTimeMinutes: meta.readingTimeMinutes ?? Math.max(1, Math.ceil(String(post.content ?? "").split(/\s+/).length / 220)),
    revisionHistory: meta.revisionHistory ?? [],
    relatedPosts: meta.relatedPosts ?? [],
    authorProfile: meta.authorProfile ?? {},
    scheduledAt: meta.scheduledAt ?? null,
    automationHooks: meta.automationHooks ?? {},
    category: post.category,
    status: normalizeAdminStatus(meta.status, post.isPublished),
    tags: Array.isArray(post.tags) ? post.tags : [],
    createdBy: post.authorId ? String(post.authorId) : null,
    createdAt: post.createdAt ?? null,
    updatedAt: post.updatedAt ?? null,
  };
};

const toAdminTeamMember = (member: any) => {
  const meta = getTeamMeta(member.id);
  return {
    id: String(member.id),
    name: member.name,
    position: member.position,
    title: meta.title ?? member.position,
    bio: meta.biography ?? member.bio ?? "",
    profileImage: meta.profileImage ?? member.imageUrl ?? "",
    email: member.email ?? "",
    linkedIn: member.linkedin ?? "",
    twitter: member.twitter ?? "",
    department: meta.department ?? "",
    cvUrl: meta.cvUrl ?? "",
    skills: meta.skills ?? [],
    achievements: meta.achievements ?? [],
    certifications: meta.certifications ?? [],
    socialLinks: meta.socialLinks ?? {},
    contactInfo: meta.contactInfo ?? {},
    visibility: meta.visibility ?? "public",
    leadershipLevel: meta.leadershipLevel ?? "",
    displayGroup: meta.displayGroup ?? "",
    isActive: member.isActive ?? true,
    order: member.order ?? 0,
    createdBy: null,
    createdAt: member.createdAt ?? null,
    updatedAt: member.updatedAt ?? null,
  };
};

const toPublicBlogPost = (post: any) => {
  const meta = getBlogMeta(post.id);
  const content = String(post.content ?? "");
  return {
    ...post,
    slug: meta.slug ?? slugify(post.title ?? `post-${post.id}`),
    imageUrl: meta.featuredImage ?? post.imageUrl ?? null,
    gallery: meta.gallery ?? [],
    videos: meta.videos ?? [],
    seoMeta: meta.seoMeta ?? {},
    socialMeta: meta.socialMeta ?? {},
    structuredData: meta.structuredData ?? {},
    readingTimeMinutes: meta.readingTimeMinutes ?? Math.max(1, Math.ceil(content.split(/\s+/).filter(Boolean).length / 220)),
    relatedPosts: meta.relatedPosts ?? [],
    authorProfile: meta.authorProfile ?? {},
  };
};

const findBlogPostByIdentifier = async (identifier: string, requester?: JwtUser | null) => {
  const numericId = Number.parseInt(identifier, 10);
  if (!Number.isNaN(numericId) && String(numericId) === identifier) {
    return storage.getBlogPost(numericId);
  }

  const normalized = slugify(identifier);
  const posts = isAdmin(requester ?? null) ? await storage.getAllBlogPosts() : await storage.getPublishedBlogPosts();
  return posts.find((post) => {
    const meta = getBlogMeta(post.id);
    return (meta.slug ?? slugify(post.title ?? `post-${post.id}`)) === normalized;
  });
};

const toPublicTeamMember = (member: any) => {
  const meta = getTeamMeta(member.id);
  const title = meta.title ?? member.position ?? "";
  return {
    ...member,
    slug: slugify(String(title || member.name || `team-${member.id}`)),
    title,
    bio: meta.biography ?? member.bio ?? "",
    biography: meta.biography ?? member.bio ?? "",
    imageUrl: meta.profileImage ?? member.imageUrl ?? null,
    profileImage: meta.profileImage ?? member.imageUrl ?? null,
    department: meta.department ?? null,
    cvUrl: meta.cvUrl ?? null,
    skills: meta.skills ?? [],
    achievements: meta.achievements ?? [],
    certifications: meta.certifications ?? [],
    socialLinks: meta.socialLinks ?? {},
    contactInfo: meta.contactInfo ?? {},
    visibility: meta.visibility ?? "public",
    leadershipLevel: meta.leadershipLevel ?? null,
    displayGroup: meta.displayGroup ?? null,
  };
};

const toPublicPartner = (partner: any) => {
  const meta = getPartnerMeta(partner.id);

  return {
    ...partner,
    logoUrl: meta.logo ?? partner.logoUrl ?? null,
    coverImage: meta.coverImage ?? partner.coverImage ?? null,
    country: meta.region ?? partner.country ?? null,
    region: meta.region ?? partner.region ?? partner.country ?? null,
    industryCategory: meta.industryCategory ?? partner.industryCategory ?? null,
    partnershipLevel: meta.partnershipLevel ?? partner.partnershipLevel ?? null,
    sponsorshipTier: meta.sponsorshipTier ?? partner.sponsorshipTier ?? null,
    partnershipType: meta.partnershipType ?? "partner",
    socialLinks: meta.socialLinks ?? partner.socialLinks ?? null,
    linkedEvents: meta.linkedEvents ?? partner.linkedEvents ?? null,
    partnershipHistory: meta.partnershipHistory ?? partner.partnershipHistory ?? null,
    videoUrl: meta.videoUrl ?? null,
    videoTitle: meta.videoTitle ?? null,
    videoDescription: meta.videoDescription ?? null,
    isFeatured: meta.isFeatured ?? false,
  };
};

const createOperationalRecord = <T extends Record<string, unknown>>(payload: T) => ({
  id: randomUUID(),
  ...payload,
  createdAt: new Date().toISOString(),
});

const getPartnerCrmSnapshot = (partnerId: number) => {
  const meta = getPartnerMeta(partnerId);
  const activities = meta.activities ?? [];
  const reminders = meta.reminders ?? [];
  const documents = meta.documents ?? [];
  const agreements = meta.agreements ?? [];
  const financialRecords = meta.financialRecords ?? [];
  const sponsorships = meta.linkedSponsorships ?? [];
  const opportunities = meta.linkedOpportunities ?? [];
  const activeReminders = reminders.filter((item) => !item.completedAt);
  const totalContribution = financialRecords.reduce((sum, item) => {
    const amount = Number(item.amount ?? 0);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);

  return {
    activities,
    meetings: meta.meetings ?? [],
    reminders,
    activeReminders,
    documents,
    agreements,
    financialRecords,
    sponsorships,
    opportunities,
    performanceMetrics: {
      totalActivities: activities.length,
      openFollowUps: activeReminders.length,
      documentCount: documents.length + agreements.length,
      sponsorshipCount: sponsorships.length,
      opportunityCount: opportunities.length,
      totalContribution,
      ...(meta.performanceMetrics ?? {}),
    },
  };
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160) || `event-${Date.now()}`;

const normalizeEventTags = (value: unknown) => parseStringArray(value) ?? [];

const deriveEventRuntimeStatus = (event: {
  status?: string | null;
  startAt?: Date | string | null;
  endAt?: Date | string | null;
}) => {
  if (event.status === "draft" || event.status === "archived" || event.status === "cancelled") {
    return event.status;
  }

  const now = Date.now();
  const start = event.startAt ? new Date(event.startAt).getTime() : 0;
  const end = event.endAt ? new Date(event.endAt).getTime() : 0;

  if (start <= now && end >= now) return "live";
  if (start > now) return "upcoming";
  return "past";
};

const getEventStats = async (eventId: number) => {
  const [registrations, comments] = await Promise.all([
    storage.getEventRegistrations(eventId),
    storage.getEventComments(eventId, true),
  ]);

  const approved = registrations.filter((item) => item.status === "approved" || item.status === "checked_in").length;
  const attended = registrations.filter(
    (item) => item.attendanceStatus === "attended" || item.attendanceStatus === "checked_in",
  ).length;

  return {
    registrations: registrations.length,
    approvedRegistrations: approved,
    attended,
    comments: comments.length,
    pendingRegistrations: registrations.filter((item) => item.status === "pending").length,
  };
};

const toPublicEvent = async (event: any) => {
  const stats = await getEventStats(event.id);
  const capacity = typeof event.capacity === "number" ? event.capacity : null;
  return {
    ...event,
    runtimeStatus: deriveEventRuntimeStatus(event),
    registrationCount: stats.registrations,
    approvedRegistrationCount: stats.approvedRegistrations,
    commentCount: stats.comments,
    remainingSeats: capacity === null ? null : Math.max(0, capacity - stats.approvedRegistrations),
  };
};

const toAdminEvent = async (event: any) => {
  const publicEvent = await toPublicEvent(event);
  return {
    ...publicEvent,
    status: event.status,
    conversionRate:
      Number(event.viewCount || 0) > 0
        ? Math.round((publicEvent.registrationCount / Number(event.viewCount || 1)) * 100)
        : 0,
  };
};

const createTicketCode = (eventId: number) =>
  `MEC-${eventId}-${randomBytes(4).toString("hex").toUpperCase()}`;

const signToken = (user: { id: number; email: string; role: string; password: string }) => {
  const timeoutMinutes = Math.max(5, Math.min(480, getAdminSettings().sessionTimeout || 30));
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      type: "access",
      pwd: passwordFingerprint(user.password),
    },
    JWT_SECRET,
    {
    expiresIn: `${timeoutMinutes}m`,
    },
  );
};

const refreshTokenCookieName = "mec_refresh_token";
const refreshTokenMaxAgeMs = 7 * 24 * 60 * 60 * 1000;

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: refreshTokenMaxAgeMs,
  path: "/",
};

const signRefreshToken = (user: { id: number; email: string; role: string; password: string }) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role, type: "refresh", pwd: passwordFingerprint(user.password) }, JWT_SECRET, {
    expiresIn: "7d",
  });

const signEmailVerificationToken = (
  user: { id: number; email: string; role: string; password: string },
  jwtId = randomUUID(),
) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      type: "email_verification",
      pwd: passwordFingerprint(user.password),
      jti: jwtId,
    },
    JWT_SECRET,
    { expiresIn: "24h" },
  );

const issueAccountVerificationEmail = async (
  req: Request,
  user: { id: number; email: string; firstName: string; lastName: string; role: string; password: string },
) => {
  const normalizedEmail = user.email.toLowerCase();
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recentRequests = await storage.countEmailVerificationRequests(normalizedEmail, since);
  if (recentRequests >= 3) {
    const retryAfterSeconds = Math.max(60, Math.ceil((since.getTime() + 60 * 60 * 1000 - Date.now()) / 1000));
    return {
      ok: false as const,
      statusCode: 429,
      retryAfterSeconds,
      message: "Maximum verification requests reached. Please try again later.",
    };
  }

  await storage.revokePendingEmailVerificationTokens(user.id);
  const jwtId = randomUUID();
  const token = signEmailVerificationToken(user, jwtId);
  const tokenRecord = await storage.createEmailVerificationToken({
    userId: user.id,
    email: normalizedEmail,
    tokenHash: createEmailTokenHash(token),
    jwtId,
    status: "pending",
    requestIpAddress: getClientIp(req),
    requestUserAgent: req.get("user-agent") || null,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    usedAt: null,
    replacedAt: null,
  });
  const verificationUrl = `${getApiRequestBaseUrl(req)}/api/auth/verify-email/${encodeURIComponent(token)}`;
  const queued = await sendAccountVerification({
    email: normalizedEmail,
    name: `${user.firstName} ${user.lastName}`.trim(),
    verificationUrl,
    tokenId: tokenRecord.id,
  });

  if (queued?.status === "failed") {
    return {
      ok: false as const,
      statusCode: 503,
      retryAfterSeconds: 60,
      message: "Verification email could not be queued. Please try again shortly.",
    };
  }

  await storage.logAnalytics({
    event: "email_verification_requested",
    userId: user.id,
    metadata: {
      email: normalizedEmail,
      tokenId: tokenRecord.id,
      emailJobId: queued?.id,
      emailJobStatus: queued?.status,
    },
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  return { ok: true as const, tokenRecord, queued };
};

const signPasswordResetToken = (user: { id: number; email: string; role: string; password: string }) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      type: "password_reset",
      pwd: passwordFingerprint(user.password),
    },
    JWT_SECRET,
    { expiresIn: "20m" },
  );

const getCookieValue = (req: Request, name: string) => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const targetPrefix = `${name}=`;
  const match = cookies.find((cookie) => cookie.startsWith(targetPrefix));
  if (!match) return null;

  try {
    return decodeURIComponent(match.slice(targetPrefix.length));
  } catch {
    return match.slice(targetPrefix.length);
  }
};

const setRefreshCookie = (res: Response, user: { id: number; email: string; role: string; password: string }) => {
  res.cookie(refreshTokenCookieName, signRefreshToken(user), refreshCookieOptions);
};

const clearRefreshCookie = (res: Response) => {
  res.clearCookie(refreshTokenCookieName, {
    httpOnly: refreshCookieOptions.httpOnly,
    secure: refreshCookieOptions.secure,
    sameSite: refreshCookieOptions.sameSite,
    path: refreshCookieOptions.path,
  });
};

const getAuthenticatedUser = (req: Request) => (req as AuthenticatedRequest).user;

const isJwtUserInvalidated = (jwtUser: JwtUser) => {
  const invalidBefore = getAdminSettings().authTokenInvalidBefore;
  if (!invalidBefore) return false;

  const invalidBeforeMs = Date.parse(invalidBefore);
  const invalidBeforeSeconds = Math.floor(invalidBeforeMs / 1000);
  const issuedAtSeconds = typeof jwtUser.iat === "number" ? jwtUser.iat : 0;
  return !Number.isNaN(invalidBeforeMs) && issuedAtSeconds < invalidBeforeSeconds;
};

const getOptionalAuthenticatedUser = (req: Request): JwtUser | null => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return null;
  }

  try {
    const jwtUser = jwt.verify(token, JWT_SECRET) as JwtUser;
    return isJwtUserInvalidated(jwtUser) ? null : jwtUser;
  } catch {
    return null;
  }
};

const isAdmin = (user: JwtUser | null) => user?.role === "super_admin";

const isAdminPortalUser = (user: JwtUser | null) =>
  Boolean(user?.role && ADMIN_PORTAL_ROLES.has(user.role));

const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const jwtUser = jwt.verify(token, JWT_SECRET) as JwtUser;
    if (jwtUser.type && jwtUser.type !== "access") {
      return res.status(403).json({ message: "Invalid token type" });
    }

    if (isJwtUserInvalidated(jwtUser)) {
      return res.status(401).json({ message: "Session was invalidated by an administrator" });
    }

    const user = await storage.getUser(Number(jwtUser.id));
    if (!user || user.isActive === false) {
      return res.status(401).json({ message: "Account is inactive or email verification is still pending" });
    }

    if (!jwtUser.pwd || jwtUser.pwd !== passwordFingerprint(user.password)) {
      return res.status(401).json({ message: "Session expired. Please sign in again." });
    }

    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
      role: user.role,
      type: "access",
      pwd: jwtUser.pwd,
      iat: jwtUser.iat,
    };
    next();
  } catch {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!isAdmin(getAuthenticatedUser(req))) {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
};

const requireAdminPortal = (req: Request, res: Response, next: NextFunction) => {
  if (!isAdminPortalUser(getAuthenticatedUser(req))) {
    return res.status(403).json({ message: "Admin portal access required" });
  }

  next();
};

const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (getAuthenticatedUser(req)?.role !== "super_admin") {
    return res.status(403).json({ message: "Super administrator access required" });
  }

  next();
};

const isEditor = (user: JwtUser | null) =>
  Boolean(user?.role && ADMIN_CONTENT_ROLES.has(user.role));

const requireEditor = (req: Request, res: Response, next: NextFunction) => {
  if (!isEditor(getAuthenticatedUser(req))) {
    return res.status(403).json({ message: "Writer access required" });
  }

  next();
};

const loginFailures = new Map<string, { count: number; lockedUntil?: number }>();
const loginLockoutMs = 15 * 60 * 1000;

const getLoginFailure = (identifier: string) => {
  const key = identifier.toLowerCase();
  const record = loginFailures.get(key);
  if (!record) return null;

  if (record.lockedUntil && record.lockedUntil <= Date.now()) {
    loginFailures.delete(key);
    return null;
  }

  return record;
};

const registerLoginFailure = (identifier: string) => {
  const key = identifier.toLowerCase();
  const settings = getAdminSettings();
  const maxAttempts = Math.max(3, Math.min(20, settings.maxLoginAttempts || 5));
  const current = getLoginFailure(key) ?? { count: 0 };
  const nextCount = current.count + 1;
  const next = {
    count: nextCount,
    lockedUntil: nextCount >= maxAttempts ? Date.now() + loginLockoutMs : undefined,
  };

  loginFailures.set(key, next);
  return next;
};

const clearLoginFailure = (identifier: string) => {
  loginFailures.delete(identifier.toLowerCase());
};

const publicRealtimeChannels = new Set([
  "scholarships",
  "jobs",
  "partners",
  "partner-videos",
  "testimonials",
  "blog-posts",
  "team-members",
  "events",
  "announcements",
]);

const adminRealtimeChannels = new Set([
  "applications",
  "user_activity",
  "admin-dashboard",
  "admin-notifications",
  "admin-roles",
  "admin-settings",
  "ai-chat",
  "referrals",
]);

const getWebSocketUser = (req: IncomingMessage): JwtUser | null => {
  try {
    const baseUrl = env.VITE_API_URL || env.PUBLIC_APP_URL || "https://api.mtendereeducationconsult.com";
    const url = new URL(req.url || "/ws", baseUrl);
    const token = url.searchParams.get("token");
    if (!token) return null;

    const user = jwt.verify(token, JWT_SECRET) as JwtUser;
    return isJwtUserInvalidated(user) ? null : user;
  } catch {
    return null;
  }
};

const canSubscribeToRealtimeChannel = (channel: string, user: JwtUser | null | undefined) => {
  if (publicRealtimeChannels.has(channel)) return true;
  if (adminRealtimeChannels.has(channel)) return isAdminPortalUser(user ?? null);
  return false;
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket setup for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: SocketWithSubscriptions, req) => {
    ws.subscriptions = [];
    ws.user = getWebSocketUser(req);

    ws.on("message", (rawMessage: Buffer) => {
      try {
        const payload = JSON.parse(rawMessage.toString()) as {
          type?: string;
          channels?: string[];
          data?: { channels?: string[] };
        };
        const channels = Array.isArray(payload.channels)
          ? payload.channels
          : Array.isArray(payload.data?.channels)
            ? payload.data.channels
            : [];
        const allowedChannels = channels
          .filter((channel): channel is string => typeof channel === "string")
          .filter((channel) => canSubscribeToRealtimeChannel(channel, ws.user));

        if (payload.type === "subscribe") {
          ws.subscriptions = Array.from(new Set([...(ws.subscriptions ?? []), ...allowedChannels]));
        }

        if (payload.type === "unsubscribe") {
          ws.subscriptions = (ws.subscriptions ?? []).filter(
            (channel) => !allowedChannels.includes(channel),
          );
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });
  });

  app.use((req, res, next) => {
    const settings = getAdminSettings();
    if (!settings.maintenanceMode) {
      return next();
    }

    const requestPath = req.path;
    const isAdminOrSystemPath =
      requestPath.startsWith("/admin") ||
      requestPath.startsWith("/api/admin") ||
      requestPath.startsWith("/api/auth") ||
      requestPath.startsWith("/auth") ||
      requestPath.startsWith("/media-assets") ||
      requestPath.startsWith("/uploads") ||
      requestPath.startsWith("/assets") ||
      requestPath.startsWith("/src") ||
      requestPath.startsWith("/@vite") ||
      requestPath.startsWith("/@react-refresh") ||
      requestPath.startsWith("/node_modules") ||
      requestPath === "/api/health" ||
      /\.[a-z0-9]+$/i.test(requestPath) ||
      requestPath === "/ws";

    if (isAdminOrSystemPath) {
      return next();
    }

    if (requestPath.startsWith("/api")) {
      return res.status(503).json({
        message: "The public platform is temporarily in maintenance mode.",
      });
    }

    if (req.method === "GET") {
      return res.status(503).send(`
        <!doctype html>
        <html>
          <head><title>Maintenance | Mtendere Education Consult</title></head>
          <body style="font-family: Arial, sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f5f7fb; color: #1f2937;">
            <main style="max-width: 560px; padding: 32px; text-align: center;">
              <h1 style="margin: 0 0 12px; color: #0f4c81;">Scheduled maintenance</h1>
              <p style="font-size: 16px; line-height: 1.6;">Mtendere Education Consult is temporarily updating the platform. Please check back shortly.</p>
            </main>
          </body>
        </html>
      `);
    }

    return next();
  });

  const realtimePublicApiPrefixes = [
    "/api/scholarships",
    "/api/jobs",
    "/api/partners",
    "/api/partner-videos",
    "/api/testimonials",
    "/api/blog-posts",
    "/api/team-members",
  ];

  app.use((req, res, next) => {
    if (req.method === "GET" && realtimePublicApiPrefixes.some((prefix) => req.path.startsWith(prefix))) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Surrogate-Control", "no-store");
    }

    next();
  });

  const getPublicBaseUrl = (req: Request) =>
    (env.PUBLIC_APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/+$/, "");

  const escapeXml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  type SitemapImage = { loc: string; title?: string; caption?: string };
  type SitemapUrl = {
    loc: string;
    lastmod?: string | Date | null;
    changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
    priority?: string;
    images?: SitemapImage[];
  };
  type PublicSitemapData = {
    pages: SitemapUrl[];
    scholarships: SitemapUrl[];
    jobs: SitemapUrl[];
    blog: SitemapUrl[];
    events: SitemapUrl[];
    partners: SitemapUrl[];
    team: SitemapUrl[];
  };

  const sitemapDefaultImages = {
    logo: "/media-assets/logos/Mtendere_Logo.png",
    home: "/media-assets/programs/international-studies.jpg",
    scholarship: "/media-assets/scholarships/application-guidance.jpg",
    job: "/media-assets/jobs/corporate.jpg",
    blog: "/media-assets/blogs/application-guidance.jpg",
    event: "/media-assets/events/IMG-20250321-WA0250.jpg",
    partner: "/media-assets/partners/cu-logo-white.webp",
    team: "/media-assets/teams/ms-brenda.jpg",
    about: "/media-assets/misc/about-mtendere.jpg",
    service: "/media-assets/programs/students-campus.jpg",
  };

  const sitemapPaths = [
    "/pages-sitemap.xml",
    "/scholarships-sitemap.xml",
    "/jobs-sitemap.xml",
    "/blog-sitemap.xml",
    "/events-sitemap.xml",
    "/partners-sitemap.xml",
    "/team-sitemap.xml",
    "/images-sitemap.xml",
  ];

  const staticSitemapPages = [
    { path: "/", changefreq: "weekly" as const, priority: "1.0", title: "Mtendere Education Consult", image: sitemapDefaultImages.home },
    { path: "/scholarships", changefreq: "daily" as const, priority: "0.9", title: "Scholarships", image: sitemapDefaultImages.scholarship },
    { path: "/jobs", changefreq: "daily" as const, priority: "0.9", title: "Jobs", image: sitemapDefaultImages.job },
    { path: "/resume-building", changefreq: "monthly" as const, priority: "0.75", title: "AI CV Builder", image: sitemapDefaultImages.job },
    { path: "/events", changefreq: "daily" as const, priority: "0.85", title: "Events", image: sitemapDefaultImages.event },
    { path: "/partners", changefreq: "weekly" as const, priority: "0.8", title: "Partners", image: sitemapDefaultImages.partner },
    { path: "/partnership-opportunities", changefreq: "monthly" as const, priority: "0.7", title: "Partnership Opportunities", image: "/media-assets/partners/gbs-dubai.webp" },
    { path: "/blog", changefreq: "daily" as const, priority: "0.85", title: "Blog", image: sitemapDefaultImages.blog },
    { path: "/team", changefreq: "monthly" as const, priority: "0.65", title: "Team", image: sitemapDefaultImages.team },
    { path: "/about", changefreq: "monthly" as const, priority: "0.7", title: "About", image: sitemapDefaultImages.about },
    { path: "/contact", changefreq: "monthly" as const, priority: "0.7", title: "Contact", image: sitemapDefaultImages.logo },
    { path: "/study-abroad", changefreq: "monthly" as const, priority: "0.8", title: "Study Abroad", image: "/media-assets/programs/abroad-students.jpg" },
    { path: "/university-applications", changefreq: "monthly" as const, priority: "0.75", title: "University Applications", image: sitemapDefaultImages.service },
    { path: "/career-counseling", changefreq: "monthly" as const, priority: "0.75", title: "Career Counseling", image: "/media-assets/blogs/career-motivation.jpg" },
  ];

  const absoluteSitemapUrl = (value: string, baseUrl: string) => {
    try {
      return new URL(value, `${baseUrl}/`).href;
    } catch {
      return `${baseUrl}/${value.replace(/^\/+/, "")}`;
    }
  };

  const sitemapDate = (value?: string | Date | null) => {
    const date = value ? new Date(value) : new Date();
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  };

  const imageEntry = (src: unknown, title: string, caption: string, baseUrl: string): SitemapImage | undefined => {
    if (typeof src !== "string" || !src.trim()) return undefined;
    if (/^(data:|blob:|javascript:)/i.test(src)) return undefined;
    const normalizedMediaReference = normalizeMediaAssetReference(src);
    const source = normalizedMediaReference
      ? `/media-assets/${normalizedMediaReference}`
      : src;
    const loc = absoluteSitemapUrl(source, baseUrl);
    if (!/^https?:\/\//i.test(loc)) return undefined;
    return {
      loc,
      title: title.slice(0, 140),
      caption: caption.slice(0, 240),
    };
  };

  const withImages = (url: SitemapUrl, images: Array<SitemapImage | undefined>): SitemapUrl => {
    const seen = new Set<string>();
    const resolvedImages = images.filter((item): item is SitemapImage => Boolean(item)).filter((item) => {
      if (seen.has(item.loc)) return false;
      seen.add(item.loc);
      return true;
    });
    return resolvedImages.length ? { ...url, images: resolvedImages } : url;
  };

  let sitemapCache: { baseUrl: string; generatedAt: number; data: PublicSitemapData } | null = null;
  const sitemapCacheTtlMs = 60_000;

  const safeSitemapList = async <T>(label: string, loader: () => Promise<T[]>): Promise<T[]> => {
    try {
      return await loader();
    } catch (error) {
      console.error(`${label} sitemap source error:`, error);
      return [];
    }
  };

  const buildPublicSitemapData = async (baseUrl: string): Promise<PublicSitemapData> => {
    if (sitemapCache && sitemapCache.baseUrl === baseUrl && Date.now() - sitemapCache.generatedAt < sitemapCacheTtlMs) {
      return sitemapCache.data;
    }

    const [scholarshipsRaw, jobsRaw, partnersRaw, blogRaw, eventsRaw, teamRaw] = await Promise.all([
      safeSitemapList("Scholarships", () => storage.getActiveScholarships()),
      safeSitemapList("Jobs", () => storage.getActiveJobs()),
      safeSitemapList("Partners", () => storage.getActivePartners()),
      safeSitemapList("Blog", () => storage.getPublishedBlogPosts()),
      safeSitemapList("Events", () => storage.getPublishedEvents()),
      safeSitemapList("Team", () => storage.getActiveTeamMembers()),
    ]);

    const scholarships = scholarshipsRaw.map(toPublicScholarship);
    const jobs = jobsRaw.map(toPublicJob);
    const partners = partnersRaw.map(toPublicPartner);
    const blogPosts = blogRaw.map(toPublicBlogPost);
    const teamMembers = teamRaw.map(toPublicTeamMember);
    const now = new Date().toISOString();

    const pages: SitemapUrl[] = staticSitemapPages.map((page) =>
      withImages(
        {
          loc: absoluteSitemapUrl(page.path, baseUrl),
          lastmod: now,
          changefreq: page.changefreq,
          priority: page.priority,
        },
        [imageEntry(page.image, page.title, `${page.title} page from Mtendere Education Consult`, baseUrl)],
      ),
    );

    const scholarshipUrls: SitemapUrl[] = scholarships.map((item) =>
      withImages(
        {
          loc: absoluteSitemapUrl(`/scholarships/${item.slug || item.id}`, baseUrl),
          lastmod: item.updatedAt ?? item.createdAt,
          changefreq: "weekly",
          priority: item.isFeatured ? "0.95" : "0.82",
        },
        [
          imageEntry(item.bannerImage || item.imageUrl || sitemapDefaultImages.scholarship, `${item.title} scholarship`, `${item.title} scholarship at ${item.institution}`, baseUrl),
        ],
      ),
    );

    const jobUrls: SitemapUrl[] = jobs.map((item) =>
      withImages(
        {
          loc: absoluteSitemapUrl(`/jobs/${item.slug || item.id}`, baseUrl),
          lastmod: item.updatedAt ?? item.createdAt,
          changefreq: "daily",
          priority: item.isFeatured ? "0.95" : "0.82",
        },
        [
          imageEntry(item.imageUrl || sitemapDefaultImages.job, `${item.title} job`, `${item.title} role at ${item.company}`, baseUrl),
          imageEntry(item.companyLogo, `${item.company} logo`, `${item.company} hiring organization logo`, baseUrl),
        ],
      ),
    );

    const blogUrls: SitemapUrl[] = blogPosts.map((item) =>
      withImages(
        {
          loc: absoluteSitemapUrl(`/blog/${item.slug || item.id}`, baseUrl),
          lastmod: item.updatedAt ?? item.createdAt,
          changefreq: "weekly",
          priority: "0.78",
        },
        [imageEntry(item.imageUrl || sitemapDefaultImages.blog, `${item.title} article`, `${item.title} article by Mtendere Education Consult`, baseUrl)],
      ),
    );

    const eventUrls: SitemapUrl[] = eventsRaw.map((item) =>
      withImages(
        {
          loc: absoluteSitemapUrl(`/events/${item.slug || item.id}`, baseUrl),
          lastmod: item.updatedAt ?? item.createdAt,
          changefreq: deriveEventRuntimeStatus(item) === "upcoming" ? "daily" : "monthly",
          priority: item.isFeatured ? "0.9" : "0.76",
        },
        [imageEntry(item.coverImage || sitemapDefaultImages.event, `${item.title} event`, `${item.title} event in ${item.location}`, baseUrl)],
      ),
    );

    const partnerUrls: SitemapUrl[] = partners.map((item) =>
      withImages(
        {
          loc: absoluteSitemapUrl(`/partners/${item.id}`, baseUrl),
          lastmod: item.updatedAt ?? item.createdAt,
          changefreq: "monthly",
          priority: item.isFeatured ? "0.85" : "0.72",
        },
        [
          imageEntry(item.logoUrl || sitemapDefaultImages.partner, `${item.name} logo`, `${item.name} official partner logo`, baseUrl),
          imageEntry(item.coverImage, `${item.name} campus`, `${item.name} partner profile imagery`, baseUrl),
        ],
      ),
    );

    const teamUrls: SitemapUrl[] = teamMembers.map((item) =>
      withImages(
        {
          loc: absoluteSitemapUrl(`/team/${item.slug || slugify(String(item.title ?? item.position ?? item.name ?? `team-${item.id}`))}`, baseUrl),
          lastmod: item.updatedAt ?? item.createdAt,
          changefreq: "monthly",
          priority: "0.62",
        },
        [imageEntry(item.imageUrl || item.profileImage || sitemapDefaultImages.team, `${item.name} profile photo`, `${item.name}, ${item.title || item.position}`, baseUrl)],
      ),
    );

    const data = { pages, scholarships: scholarshipUrls, jobs: jobUrls, blog: blogUrls, events: eventUrls, partners: partnerUrls, team: teamUrls };
    sitemapCache = { baseUrl, generatedAt: Date.now(), data };
    return data;
  };

  const renderUrlset = (urls: SitemapUrl[], includeImages = false) => {
    const xmlns = includeImages
      ? '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'
      : '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      xmlns,
      ...urls.map((url) => {
        const imageXml = includeImages
          ? (url.images ?? [])
              .map((image) =>
                [
                  "    <image:image>",
                  `      <image:loc>${escapeXml(image.loc)}</image:loc>`,
                  image.title ? `      <image:title>${escapeXml(image.title)}</image:title>` : "",
                  image.caption ? `      <image:caption>${escapeXml(image.caption)}</image:caption>` : "",
                  "    </image:image>",
                ]
                  .filter(Boolean)
                  .join("\n"),
              )
              .join("\n")
          : "";
        return [
          "  <url>",
          `    <loc>${escapeXml(url.loc)}</loc>`,
          `    <lastmod>${sitemapDate(url.lastmod)}</lastmod>`,
          url.changefreq ? `    <changefreq>${url.changefreq}</changefreq>` : "",
          url.priority ? `    <priority>${url.priority}</priority>` : "",
          imageXml,
          "  </url>",
        ]
          .filter(Boolean)
          .join("\n");
      }),
      "</urlset>",
    ].join("\n");
  };

  const renderSitemapIndex = (baseUrl: string) =>
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...sitemapPaths.map((path) =>
        ["  <sitemap>", `    <loc>${escapeXml(absoluteSitemapUrl(path, baseUrl))}</loc>`, `    <lastmod>${new Date().toISOString()}</lastmod>`, "  </sitemap>"].join("\n"),
      ),
      "</sitemapindex>",
    ].join("\n");

  const sendXml = (res: Response, xml: string) => {
    res.setHeader("Cache-Control", "public, max-age=900, stale-while-revalidate=3600");
    res.type("application/xml").send(xml);
  };

  app.get("/robots.txt", (req, res) => {
    const baseUrl = getPublicBaseUrl(req);
    res.setHeader("Cache-Control", "public, max-age=900, stale-while-revalidate=3600");
    res.type("text/plain").send(
      [
        "User-agent: *",
        "Allow: /",
        "Allow: /assets/",
        "Allow: /media-assets/",
        "Allow: /uploads/",
        "Allow: /*.jpg$",
        "Allow: /*.jpeg$",
        "Allow: /*.png$",
        "Allow: /*.webp$",
        "Allow: /*.avif$",
        "Disallow: /admin",
        "Disallow: /admin/",
        "Disallow: /dashboard",
        "Disallow: /api/",
        "Disallow: /auth/",
        "Disallow: /*?token=",
        "Disallow: /*?password=",
        "Disallow: /*?mfa=",
        ...sitemapPaths.map((path) => `Sitemap: ${absoluteSitemapUrl(path, baseUrl)}`),
        `Sitemap: ${absoluteSitemapUrl("/sitemap.xml", baseUrl)}`,
        `Host: ${new URL(baseUrl).host}`,
      ].join("\n"),
    );
  });

  app.get("/sitemap.xml", (req, res) => {
    sendXml(res, renderSitemapIndex(getPublicBaseUrl(req)));
  });

  app.get("/pages-sitemap.xml", async (req, res) => {
    try {
      const data = await buildPublicSitemapData(getPublicBaseUrl(req));
      sendXml(res, renderUrlset(data.pages));
    } catch (error) {
      console.error("Pages sitemap generation error:", error);
      res.status(500).type("text/plain").send("Failed to generate pages sitemap");
    }
  });

  app.get("/scholarships-sitemap.xml", async (req, res) => {
    try {
      const data = await buildPublicSitemapData(getPublicBaseUrl(req));
      sendXml(res, renderUrlset(data.scholarships));
    } catch (error) {
      console.error("Scholarships sitemap generation error:", error);
      res.status(500).type("text/plain").send("Failed to generate scholarships sitemap");
    }
  });

  app.get("/jobs-sitemap.xml", async (req, res) => {
    try {
      const data = await buildPublicSitemapData(getPublicBaseUrl(req));
      sendXml(res, renderUrlset(data.jobs));
    } catch (error) {
      console.error("Jobs sitemap generation error:", error);
      res.status(500).type("text/plain").send("Failed to generate jobs sitemap");
    }
  });

  app.get("/blog-sitemap.xml", async (req, res) => {
    try {
      const data = await buildPublicSitemapData(getPublicBaseUrl(req));
      sendXml(res, renderUrlset(data.blog));
    } catch (error) {
      console.error("Blog sitemap generation error:", error);
      res.status(500).type("text/plain").send("Failed to generate blog sitemap");
    }
  });

  app.get("/events-sitemap.xml", async (req, res) => {
    try {
      const data = await buildPublicSitemapData(getPublicBaseUrl(req));
      sendXml(res, renderUrlset(data.events));
    } catch (error) {
      console.error("Events sitemap generation error:", error);
      res.status(500).type("text/plain").send("Failed to generate events sitemap");
    }
  });

  app.get("/partners-sitemap.xml", async (req, res) => {
    try {
      const data = await buildPublicSitemapData(getPublicBaseUrl(req));
      sendXml(res, renderUrlset(data.partners));
    } catch (error) {
      console.error("Partners sitemap generation error:", error);
      res.status(500).type("text/plain").send("Failed to generate partners sitemap");
    }
  });

  app.get("/team-sitemap.xml", async (req, res) => {
    try {
      const data = await buildPublicSitemapData(getPublicBaseUrl(req));
      sendXml(res, renderUrlset(data.team));
    } catch (error) {
      console.error("Team sitemap generation error:", error);
      res.status(500).type("text/plain").send("Failed to generate team sitemap");
    }
  });

  app.get("/images-sitemap.xml", async (req, res) => {
    try {
      const data = await buildPublicSitemapData(getPublicBaseUrl(req));
      const imageUrls = [...data.pages, ...data.scholarships, ...data.jobs, ...data.blog, ...data.events, ...data.partners, ...data.team]
        .filter((url) => (url.images ?? []).length > 0)
        .map((url) => ({ loc: url.loc, lastmod: url.lastmod, images: url.images }));
      sendXml(res, renderUrlset(imageUrls, true));
    } catch (error) {
      console.error("Images sitemap generation error:", error);
      res.status(500).type("text/plain").send("Failed to generate images sitemap");
    }
  });

  // Broadcast function for real-time updates
  const broadcast = (channel: string, data: any) => {
    wss.clients.forEach((client) => {
      const socket = client as SocketWithSubscriptions;

      if (socket.readyState === WebSocket.OPEN) {
        const subscriptions = socket.subscriptions || [];
        if (subscriptions.includes(channel)) {
          socket.send(JSON.stringify({ channel, data }));
        }
      }
    });
  };

  app.get("/r/:code", async (req, res) => {
    try {
      const referralCode = await trackReferralClick(req, res, req.params.code);
      if (!referralCode) {
        return res.redirect(302, "/register");
      }

      await logReferralAnalytics("referral_click", referralCode.userId, req, {
        referralCode: referralCode.code,
        campaignId: referralCode.campaignId,
      });

      res.redirect(302, `/register?ref=${encodeURIComponent(referralCode.code)}`);
    } catch (error) {
      console.error("Referral redirect error:", error);
      res.redirect(302, "/register");
    }
  });

  const emitAdminRealtimeEvent = async (
    req: Request,
    {
      event,
      channel,
      entityType,
      referenceId,
      payload,
    }: {
      event: string;
      channel: string;
      entityType: string;
      referenceId?: number | string;
      payload?: Record<string, unknown>;
    },
  ) => {
    try {
      const user = getAuthenticatedUser(req);

      await storage.logAnalytics({
        event,
        userId: user.id,
        metadata: {
          type: entityType,
          referenceId,
          channel,
          ...(payload ?? {}),
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      broadcast(channel, { type: event, ...(payload ?? {}) });
      broadcast("admin-dashboard", { type: event, channel, entityType, referenceId });
      broadcast("admin-notifications", { type: event, channel, entityType, referenceId });
    } catch (error) {
      console.error("Admin realtime event error:", error);
    }
  };

  const buildAiPlatformContext = async () => {
    const [scholarshipsList, jobsList, partnersList, blogList] = await Promise.all([
      storage.getActiveScholarships(),
      storage.getActiveJobs(),
      storage.getActivePartners(),
      storage.getPublishedBlogPosts(),
    ]);

    const scholarshipsContext = scholarshipsList
      .slice(0, 8)
      .map((item) => `Scholarship: ${item.title} at ${item.institution}, ${item.country}; category ${item.category}; deadline ${item.deadline}`)
      .join("\n");
    const jobsContext = jobsList
      .slice(0, 8)
      .map((item) => `Job: ${item.title} at ${item.company}, ${item.location}; type ${item.jobType}; deadline ${item.deadline ?? "open"}`)
      .join("\n");
    const partnersContext = partnersList
      .map(toPublicPartner)
      .slice(0, 8)
      .map((item) => `Partner: ${item.name}; ${item.country ?? "Global"}; ${item.partnershipType ?? "partner"}; video ${item.videoUrl ? "available" : "not listed"}`)
      .join("\n");
    const blogContext = blogList
      .slice(0, 5)
      .map((item) => `Blog: ${item.title}; category ${item.category}`)
      .join("\n");

    return [scholarshipsContext, jobsContext, partnersContext, blogContext]
      .filter(Boolean)
      .join("\n");
  };

  const detectChatFlags = (message: string) => {
    const normalized = normalizeSearchQuery(message);
    const flags: string[] = [];
    if (/(urgent|emergency|asap|immediately|deadline today)/.test(normalized)) flags.push("urgent");
    if (/(visa|passport|immigration|payment|refund|fees?|bank|money)/.test(normalized)) flags.push("sensitive");
    if (/(angry|complaint|scam|fraud|lawsuit|legal|police)/.test(normalized)) flags.push("escalation");
    return flags;
  };

  const buildConversationSummary = (messages: AiChatMessage[]) => {
    const lastUserMessage = [...messages].reverse().find((item) => item.role === "user");
    return lastUserMessage?.content.slice(0, 180) ?? "AI chat conversation";
  };

  const appendAiConversationTurn = ({
    conversationId,
    userId,
    userEmail,
    channel,
    message,
    response,
  }: {
    conversationId?: string;
    userId: string | null;
    userEmail?: string | null;
    channel: "public" | "admin";
    message: string;
    response: string;
  }) => {
    const now = new Date().toISOString();
    const id = conversationId || randomUUID();
    const existing = getAiChatConversation(id);
    const messages: AiChatMessage[] = [
      ...(existing?.messages ?? []),
      { role: "user", content: message, createdAt: now },
      { role: "assistant", content: response, createdAt: new Date().toISOString() },
    ];
    const flags = Array.from(new Set([...(existing?.moderationFlags ?? []), ...detectChatFlags(message)]));

    return upsertAiChatConversation({
      id,
      userId,
      userEmail,
      channel,
      messages,
      summary: buildConversationSummary(messages),
      isActive: true,
      moderationFlags: flags,
      createdAt: existing?.createdAt ?? now,
      lastMessageAt: now,
    });
  };

  const uploadsDir = resolveWritableRuntimePath("uploads");
  fs.mkdirSync(uploadsDir, { recursive: true });
  const uploadStaticOptions: NonNullable<Parameters<typeof express.static>[1]> = {
    dotfiles: "deny",
    fallthrough: true,
    index: false,
    redirect: false,
    setHeaders: (res, filePath) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "public, max-age=300");
      if (/\.(?:jpe?g|png|webp|avif)$/i.test(filePath)) {
        res.setHeader("X-Robots-Tag", "index, follow, max-image-preview:large");
      } else {
        res.setHeader("X-Robots-Tag", "noindex, nofollow");
      }
      if (!/\.(?:jpe?g|png|webp|pdf)$/i.test(filePath)) {
        res.setHeader("Content-Disposition", "attachment");
      }
    },
  };
  app.use("/uploads", express.static(uploadsDir, uploadStaticOptions));
  app.use("/api/uploads", express.static(uploadsDir, uploadStaticOptions));

  const allowedUploadMimeTypes = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadsDir,
      filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, "") || "upload";
        cb(null, `${base}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
      },
    }),
    fileFilter: (_req, file, cb) => {
      if (!allowedUploadMimeTypes.has(file.mimetype)) {
        cb(new Error("Unsupported file type. Upload PDF, DOC, DOCX, JPG, PNG, or WEBP files."));
        return;
      }
      cb(null, true);
    },
    limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  });

  const deployMediaAssetRoot = path.resolve(process.cwd(), "vercel-media-assets");
  const getSourceMediaAssetRoots = () => {
    if (isVercelRuntime) return [];

    const sourceMediaSegments = [
      String.fromCharCode(99, 108, 105, 101, 110, 116),
      String.fromCharCode(115, 114, 99),
      String.fromCharCode(97, 115, 115, 101, 116, 115),
      String.fromCharCode(105, 109, 103, 115),
    ];

    return [
      path.resolve(import.meta.dirname, "..", ...sourceMediaSegments),
      path.resolve(process.cwd(), ...sourceMediaSegments),
    ];
  };
  const sourceMediaAssetRoots = getSourceMediaAssetRoots();
  const bundledMediaAssetRoot = isVercelRuntime
    ? deployMediaAssetRoot
    : sourceMediaAssetRoots[0] || deployMediaAssetRoot;
  const mediaAssetRoot = isVercelRuntime
    ? resolveWritableRuntimePath("media-assets")
    : bundledMediaAssetRoot;
  const mediaAssetReadRoots = Array.from(
    new Set([
      mediaAssetRoot,
      deployMediaAssetRoot,
      bundledMediaAssetRoot,
      ...sourceMediaAssetRoots,
    ].filter(Boolean)),
  );
  const mediaAssetModules = new Set([
    "blogs",
    "team",
    "teams",
    "partners",
    "universities",
    "logos",
    "hero-banners",
    "backgrounds",
    "scholarships",
    "jobs",
    "events",
    "opportunities",
    "projects",
    "programs",
    "news",
    "testimonials",
    "students",
    "misc",
    "defaults",
  ]);
  const mediaImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  const mediaDefaultReferences: Record<string, string> = {
    blogs: "blogs/application-guidance.jpg",
    teams: "teams/ms-brenda.jpg",
    partners: "partners/cu-logo-white.webp",
    universities: "partners/cu-logo-white.webp",
    logos: "partners/cu-logo-white.webp",
    "hero-banners": "programs/international-studies.jpg",
    backgrounds: "misc/mtendere.jpg",
    scholarships: "scholarships/application-guidance.jpg",
    jobs: "jobs/corporate.jpg",
    events: "events/IMG-20250321-WA0250.jpg",
    opportunities: "scholarships/application-guidance.jpg",
    projects: "projects/foundation.jpg",
    programs: "programs/international-studies.jpg",
    news: "events/IMG-20250321-WA0250.jpg",
    testimonials: "students/Janet Kandulu.jpg",
    misc: "misc/mtendere.jpg",
    defaults: "defaults/mtendere-default.png",
  };

  for (const moduleName of mediaAssetModules) {
    fs.mkdirSync(path.join(mediaAssetRoot, moduleName), { recursive: true });
  }

  const mediaAssetUpload = multer({
    storage: multer.diskStorage({
      destination: (req, _file, cb) => {
        const moduleName = String(req.params.module || "").toLowerCase();
        if (!mediaAssetModules.has(moduleName)) {
          cb(new Error("Unsupported media module."), mediaAssetRoot);
          return;
        }

        const destination = path.join(mediaAssetRoot, moduleName);
        fs.mkdirSync(destination, { recursive: true });
        cb(null, destination);
      },
      filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const base =
          path
            .basename(file.originalname, ext)
            .toLowerCase()
            .replace(/[^a-z0-9-_]+/g, "-")
            .replace(/^-+|-+$/g, "") || "image";
        cb(null, `${base}-${Date.now()}${ext}`);
      },
    }),
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!mediaImageMimeTypes.has(file.mimetype) || ![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
        cb(new Error("Unsupported image type. Upload JPG, PNG, or WEBP files."));
        return;
      }
      cb(null, true);
    },
    limits: { fileSize: 8 * 1024 * 1024, files: 10 },
  });

  const isValidImageFile = (filePath: string) => {
    try {
      const descriptor = fs.openSync(filePath, "r");
      try {
        const header = Buffer.alloc(12);
        const bytesRead = fs.readSync(descriptor, header, 0, header.length, 0);
        const ext = path.extname(filePath).toLowerCase();

        if ((ext === ".jpg" || ext === ".jpeg") && bytesRead >= 3) {
          return header[0] === 0xff && header[1] === 0xd8;
        }

        if (ext === ".png" && bytesRead >= 8) {
          return header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
        }

        if (ext === ".webp" && bytesRead >= 12) {
          return header.toString("ascii", 0, 4) === "RIFF" && header.toString("ascii", 8, 12) === "WEBP";
        }

        return false;
      } finally {
        fs.closeSync(descriptor);
      }
    } catch {
      return false;
    }
  };

  const getMediaAssetHash = (filePath: string) => {
    try {
      return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
    } catch {
      return "";
    }
  };

  const getMediaAssetKind = (relative: string): "image" | "logo" | "hero" | "background" => {
    const normalized = relative.toLowerCase();
    const moduleName = normalized.split("/")[0] || "";
    if (
      moduleName === "logos" ||
      normalized.includes("logo") ||
      normalized.includes("crest") ||
      normalized.includes("shield") ||
      normalized.includes("gbs-dubai") ||
      normalized.includes("gedu") ||
      normalized.includes("msm-unify") ||
      normalized.includes("cu-logo") ||
      normalized.includes("ct-logo") ||
      normalized.includes("au-logo")
    ) return "logo";
    if (moduleName === "hero-banners" || normalized.includes("hero")) return "hero";
    if (moduleName === "backgrounds" || normalized.includes("background")) return "background";
    return "image";
  };

  const isRootLogoAssetReference = (relative: string) =>
    !relative.includes("/") && /\.(jpe?g|png|webp)$/i.test(relative) && getMediaAssetKind(relative) === "logo";

  const getMediaContentType = (relative: string) => {
    const extension = path.extname(relative).toLowerCase();
    if (extension === ".png") return "image/png";
    if (extension === ".webp") return "image/webp";
    return "image/jpeg";
  };

  const getMediaQualityFlags = (relative: string, size: number) => {
    const normalized = relative.toLowerCase();
    const flags: string[] = [];
    if (size > 2 * 1024 * 1024) flags.push("large-source-file");
    if (!normalized.endsWith(".webp") && getMediaAssetKind(relative) !== "logo") flags.push("webp-recommended");
    if (/(default|placeholder|partners-default|partners-2|our-partners|jobs-default|events-default|graduates-default)/i.test(normalized)) {
      flags.push("generic-or-placeholder");
    }
    return flags;
  };

  const toMediaAssetUrl = (relative: string) =>
    `/media-assets/${relative
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/")}`;

  const isPathInsideRoot = (candidate: string, root: string) => {
    const relative = path.relative(root, candidate);
    return relative === "" || (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative));
  };

  const normalizeMediaAssetReference = (value?: string | null) => {
    if (!value || /^https?:\/\//i.test(value) || value.startsWith("/uploads/")) return "";

    const normalized = value
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .replace(/^assets\/imgs\//i, "")
      .replace(/^media-assets\//i, "")
      .trim();

    if (!normalized || normalized.includes("..") || !/\.(jpe?g|png|webp)$/i.test(normalized)) return "";
    const moduleName = (normalized.split("/")[0] || "").toLowerCase();
    if (!mediaAssetModules.has(moduleName) && isRootLogoAssetReference(normalized)) return `logos/${normalized}`;
    if (!mediaAssetModules.has(moduleName)) return "";
    return normalized;
  };

  const listMediaAssets = () => {
    const files: Array<{
      module: string;
      path: string;
      reference: string;
      previewUrl: string;
      size: number;
      updatedAt: Date;
      valid: boolean;
      hash: string;
      kind: "image" | "logo" | "hero" | "background";
      contentType: string;
      qualityFlags: string[];
    }> = [];

    const walk = (directory: string, root: string) => {
      if (!fs.existsSync(directory)) return;
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          if (directory === root && !mediaAssetModules.has(entry.name.toLowerCase())) continue;
          walk(fullPath, root);
          continue;
        }

        if (entry.name.startsWith(".") || !/\.(jpe?g|png|webp)$/i.test(entry.name)) continue;
        const stat = fs.statSync(fullPath);
        const relative = path.relative(root, fullPath).replace(/\\/g, "/");
        const exposedRelative = isRootLogoAssetReference(relative) ? `logos/${relative}` : relative;
        const moduleName = (exposedRelative.split("/")[0] || "misc").toLowerCase();
        if (!mediaAssetModules.has(moduleName)) continue;
        files.push({
          module: moduleName,
          path: `assets/imgs/${relative}`,
          reference: exposedRelative,
          previewUrl: toMediaAssetUrl(exposedRelative),
          size: stat.size,
          updatedAt: stat.mtime,
          valid: isValidImageFile(fullPath),
          hash: getMediaAssetHash(fullPath),
          kind: getMediaAssetKind(relative),
          contentType: getMediaContentType(relative),
          qualityFlags: getMediaQualityFlags(relative, stat.size),
        });
      }
    };

    for (const root of mediaAssetReadRoots) {
      walk(root, root);
    }
    return files.sort((left, right) => left.path.localeCompare(right.path));
  };

  const isValidMediaReference = (value?: string | null) => {
    const normalized = normalizeMediaAssetReference(value);
    if (!normalized) return false;
    const normalizedPath = normalized.toLowerCase();
    return listMediaAssets().some((asset) => {
      const assetPath = asset.reference.toLowerCase();
      return asset.valid && assetPath === normalizedPath;
    });
  };

  const resolveMediaAssetFullPath = (reference: string) => {
    const segments = reference.split("/").filter(Boolean);

    for (const root of mediaAssetReadRoots) {
      if (segments[0]?.toLowerCase() === "logos" && segments.length === 2) {
        const rootLogoMatch = fs.existsSync(root)
          ? fs
              .readdirSync(root, { withFileTypes: true })
              .find((entry) => entry.isFile() && entry.name.toLowerCase() === segments[1].toLowerCase())
          : undefined;

        if (rootLogoMatch) {
          const rootLogoPath = path.resolve(root, rootLogoMatch.name);
          if (isPathInsideRoot(rootLogoPath, root)) return rootLogoPath;
        }
      }

      let current = root;

      for (const segment of segments) {
        if (!fs.existsSync(current)) {
          current = "";
          break;
        }

        const match = fs
          .readdirSync(current, { withFileTypes: true })
          .find((entry) => entry.name.toLowerCase() === segment.toLowerCase());

        if (!match) {
          current = "";
          break;
        }

        current = path.join(current, match.name);
      }

      if (!current) continue;

      const resolved = path.resolve(current);
      if (isPathInsideRoot(resolved, root)) return resolved;
    }

    return null;
  };

  const ensureMediaReference = (value: unknown, moduleName: keyof typeof mediaDefaultReferences) => {
    const candidate = typeof value === "string" ? normalizeMediaAssetReference(value) : "";
    if (candidate && isValidMediaReference(candidate)) return candidate;
    return mediaDefaultReferences[moduleName] || mediaDefaultReferences.defaults;
  };

  const serveMediaAsset = (req: Request, res: Response) => {
    try {
      const requestedPath = normalizeMediaAssetReference((req.params as Record<string, string>)["0"]);
      if (!requestedPath) return res.status(404).send("Not found");

      const fullPath = resolveMediaAssetFullPath(requestedPath);
      const isAllowedMediaPath = fullPath
        ? mediaAssetReadRoots.some((root) => isPathInsideRoot(fullPath, root))
        : false;
      if (!fullPath || !isAllowedMediaPath || !fs.existsSync(fullPath) || !isValidImageFile(fullPath)) {
        return res.status(404).send("Not found");
      }

      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Robots-Tag", "index, follow, max-image-preview:large");
      res.setHeader("Content-Type", getMediaContentType(requestedPath));
      res.setHeader("Content-Disposition", "inline");
      res.sendFile(fullPath);
    } catch (error) {
      console.error("Media asset delivery error:", error);
      res.status(404).send("Not found");
    }
  };

  app.get("/media-assets/*", serveMediaAsset);
  app.get("/api/media-assets/*", serveMediaAsset);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Authentication routes
  const registerHandler = async (req: Request, res: Response) => {
    try {
      const isAdminRegistration =
        req.path === "/auth/register" ||
        req.path === "/api/auth/admin/register" ||
        req.path === "/api/admin/auth/register";

      if (isAdminRegistration) {
        return res.status(403).json({
          message: "Admin account creation is restricted to the super administrator. Use Admin > Users to create Viewer or Writer accounts.",
        });
      }

      const { referralCode: bodyReferralCode, ...registrationBody } =
        req.body && typeof req.body === "object" ? req.body : {};
      const referralCode =
        typeof bodyReferralCode === "string"
          ? bodyReferralCode
          : typeof req.query.ref === "string"
            ? req.query.ref
            : null;
      const userData = insertUserSchema.parse(registrationBody);
      userData.email = userData.email.trim().toLowerCase();
      userData.username = userData.username.trim();

      userData.role = "user";
      validateStrongPassword(userData.password);
      
      // Check if user already exists
      const [existingEmailUser, existingUsernameUser] = await Promise.all([
        storage.getUserByEmail(userData.email),
        storage.getUserByUsername(userData.username),
      ]);
      if (existingEmailUser || existingUsernameUser) {
        return res.status(409).json({
          message: "A user with that email or username already exists",
          fields: {
            ...(existingEmailUser ? { email: "This email is already registered" } : {}),
            ...(existingUsernameUser ? { username: "This username is already taken" } : {}),
          },
        });
      }

      if (!isTransactionalEmailDeliveryReady()) {
        return res.status(503).json({
          message: "Email delivery is not configured. Please contact support before creating an account.",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, PASSWORD_HASH_ROUNDS);
      
      // Create user
      const createdUser = await storage.createUser({
        ...userData,
        password: hashedPassword,
        isActive: false,
      });
      const generatedReferralCode = await ensureUserGrowthRecords(
        createdUser.id,
        createdUser.defaultCurrency || env.STRIPE_DEFAULT_CURRENCY,
      );
      const user = { ...createdUser, referralCode: generatedReferralCode };
      await attachReferralToNewUser(user, req, referralCode);

      // Generate JWT token
      // Log analytics
      await storage.logAnalytics({
        event: 'user_registered',
        userId: user.id,
        metadata: { email: user.email, role: user.role, requiresEmailVerification: true },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      broadcast('user_activity', { type: 'user_registered', user: buildPublicUser(user) });

      const verification = await issueAccountVerificationEmail(req, user);
      if (!verification.ok) {
        return res.status(verification.statusCode).json({
          message: verification.message,
          retryAfterSeconds: verification.retryAfterSeconds,
        });
      }

      res.status(201).json({
        message: 'Account created. Please verify your email before signing in.',
        requiresEmailVerification: true,
        verificationEmailJobId: verification.queued?.id,
        user: buildPublicUser(user),
      });
    } catch (error) {
      console.error('Registration error:', getErrorLogMessage(error));
      res.status(400).json({ message: 'Registration failed', error: getErrorMessage(error) });
    }
  };

  const loginHandler = async (req: Request, res: Response) => {
    try {
      const identifier = req.body.email ?? req.body.username ?? req.body.identifier;
      const { password } = req.body;
      
      if (!identifier || !password) {
        return res.status(400).json({ message: 'Email or username and password are required' });
      }

      const normalizedIdentifier = String(identifier).trim();
      const looksLikeEmail = normalizedIdentifier.includes("@");
      const lookupIdentifier = looksLikeEmail ? normalizedIdentifier.toLowerCase() : normalizedIdentifier;
      const existingFailure = getLoginFailure(normalizedIdentifier);
      if (existingFailure?.lockedUntil && existingFailure.lockedUntil > Date.now()) {
        const retryAfterSeconds = Math.ceil((existingFailure.lockedUntil - Date.now()) / 1000);
        res.setHeader("Retry-After", String(retryAfterSeconds));
        return res.status(429).json({
          message: "Too many failed login attempts. Please try again later.",
          retryAfterSeconds,
        });
      }

      // Use a single targeted lookup to avoid unnecessary DB round-trips during login.
      const user = looksLikeEmail
        ? await storage.getUserByEmail(lookupIdentifier)
        : await storage.getUserByUsername(lookupIdentifier);
      if (!user) {
        registerLoginFailure(normalizedIdentifier);
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      if (user.isActive === false) {
        registerLoginFailure(normalizedIdentifier);
        return res.status(403).json({ message: 'This account is inactive or email verification is still pending.' });
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        registerLoginFailure(normalizedIdentifier);
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      clearLoginFailure(normalizedIdentifier);

      // Generate JWT token
      // Log analytics
      await storage.logAnalytics({
        event: 'user_logged_in',
        userId: user.id,
        metadata: { email: user.email },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      broadcast('user_activity', { type: 'user_logged_in', user: buildPublicUser(user) });

      setRefreshCookie(res, user);

      res.json({
        message: 'Login successful',
        token: signToken(user),
        user: buildPublicUser(user),
      });
    } catch (error) {
      console.error('Login error:', error);
      if (isTransientDbConnectivityError(error)) {
        return res.status(503).json({
          message: 'Login temporarily unavailable',
          error: 'Database connection timed out. Please try again in a moment.',
        });
      }

      res.status(500).json({ message: 'Login failed', error: getErrorMessage(error) });
    }
  };

  app.post('/api/auth/register', registerHandler);
  app.post('/api/auth/admin/register', registerHandler);
  app.post('/api/admin/auth/register', registerHandler);
  app.post('/api/auth/login', loginHandler);

  // Admin client aliases
  app.post('/auth/register', registerHandler);
  app.post('/auth/login', loginHandler);

  const verifyEmailHandler = async (req: Request, res: Response) => {
    try {
      const rawToken = req.params.token;
      const decoded = jwt.verify(rawToken, JWT_SECRET) as JwtUser;
      if (decoded.type !== "email_verification" || !decoded.id || !decoded.email || !decoded.pwd) {
        return res.status(400).json({ message: "Invalid verification link" });
      }

      const tokenRecord = await storage.getEmailVerificationTokenByHash(createEmailTokenHash(rawToken));
      if (!tokenRecord || tokenRecord.status !== "pending") {
        return res.status(400).json({ message: "Verification link has already been used or replaced" });
      }

      if (tokenRecord.expiresAt.getTime() <= Date.now()) {
        return res.status(400).json({ message: "Verification link has expired" });
      }

      if (decoded.jti && tokenRecord.jwtId !== decoded.jti) {
        return res.status(400).json({ message: "Invalid verification link" });
      }

      const user = await storage.getUser(Number(decoded.id));
      if (
        !user ||
        user.id !== tokenRecord.userId ||
        user.email.toLowerCase() !== decoded.email.toLowerCase() ||
        tokenRecord.email.toLowerCase() !== decoded.email.toLowerCase()
      ) {
        return res.status(400).json({ message: "Invalid verification link" });
      }

      if (decoded.pwd !== passwordFingerprint(user.password)) {
        return res.status(400).json({ message: "Verification link has expired" });
      }

      const verifiedUser = user.isActive === false
        ? await storage.updateUser(user.id, { isActive: true })
        : user;
      await storage.useEmailVerificationToken(tokenRecord.id);

      await storage.logAnalytics({
        event: "email_verified",
        userId: verifiedUser.id,
        metadata: { role: verifiedUser.role, tokenId: tokenRecord.id },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      void sendWelcomeEmail({
        email: verifiedUser.email,
        name: `${verifiedUser.firstName} ${verifiedUser.lastName}`.trim(),
        dashboardUrl: `${getRequestBaseUrl(req)}/dashboard`,
      });

      res.redirect(302, `${getRequestBaseUrl(req)}/login?verified=1`);
    } catch (error) {
      console.error("Email verification error:", getErrorLogMessage(error));
      res.status(400).json({ message: "Verification link is invalid or expired" });
    }
  };

  app.get('/api/auth/verify-email/:token', verifyEmailHandler);
  app.get('/auth/verify-email/:token', verifyEmailHandler);

  const resendVerificationHandler = async (req: Request, res: Response) => {
    try {
      if (!guardPublicFlowRateLimit(req, res, "resend_verification", 8, 60 * 60 * 1000)) return;
      const payload = resendVerificationSchema.parse(req.body);
      const user = await storage.getUserByEmail(payload.email);

      if (user && user.isActive === false) {
        const verification = await issueAccountVerificationEmail(req, user);
        if (!verification.ok) {
          res.setHeader("Retry-After", String(verification.retryAfterSeconds));
          return res.status(verification.statusCode).json({
            message: verification.message,
            retryAfterSeconds: verification.retryAfterSeconds,
          });
        }
      }

      res.json({
        message: "If an unverified account exists for that email, a new verification link has been sent.",
      });
    } catch (error) {
      console.error("Resend verification error:", getErrorLogMessage(error));
      res.status(400).json({ message: "Verification resend failed", error: getErrorMessage(error) });
    }
  };

  const changeVerificationEmailHandler = async (req: Request, res: Response) => {
    try {
      if (!guardPublicFlowRateLimit(req, res, "change_verification_email", 5, 60 * 60 * 1000)) return;
      const payload = changeVerificationEmailSchema.parse(req.body);
      if (payload.currentEmail === payload.newEmail) {
        return res.status(400).json({ message: "Use a different email address for the update" });
      }

      const user = await storage.getUserByEmail(payload.currentEmail);
      if (!user || user.isActive !== false) {
        return res.status(400).json({ message: "Pending verification account not found" });
      }

      const isPasswordValid = await bcrypt.compare(payload.password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Password confirmation failed" });
      }

      const existingNewEmail = await storage.getUserByEmail(payload.newEmail);
      if (existingNewEmail) {
        return res.status(409).json({ message: "This email address is already registered" });
      }

      const updatedUser = await storage.updateUser(user.id, { email: payload.newEmail });
      const verification = await issueAccountVerificationEmail(req, updatedUser);
      if (!verification.ok) {
        res.setHeader("Retry-After", String(verification.retryAfterSeconds));
        return res.status(verification.statusCode).json({
          message: verification.message,
          retryAfterSeconds: verification.retryAfterSeconds,
        });
      }

      await storage.logAnalytics({
        event: "verification_email_changed",
        userId: updatedUser.id,
        metadata: { from: payload.currentEmail, to: payload.newEmail },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json({ message: "Email address updated. Please check the new inbox for verification." });
    } catch (error) {
      console.error("Change verification email error:", getErrorLogMessage(error));
      res.status(400).json({ message: "Email change failed", error: getErrorMessage(error) });
    }
  };

  app.post('/api/auth/resend-verification', resendVerificationHandler);
  app.post('/auth/resend-verification', resendVerificationHandler);
  app.post('/api/auth/change-verification-email', changeVerificationEmailHandler);
  app.post('/auth/change-verification-email', changeVerificationEmailHandler);

  const forgotPasswordHandler = async (req: Request, res: Response) => {
    try {
      if (!guardPublicFlowRateLimit(req, res, "forgot_password", 5, 15 * 60 * 1000)) return;
      const payload = forgotPasswordSchema.parse(req.body);
      const user = await storage.getUserByEmail(payload.email);

      if (user && user.isActive !== false) {
        const resetUrl = `${getRequestBaseUrl(req)}/reset-password?token=${encodeURIComponent(signPasswordResetToken(user))}`;
        void sendPasswordResetEmail({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim(),
          resetUrl,
        });
        await storage.logAnalytics({
          event: "password_reset_requested",
          userId: user.id,
          metadata: { email: user.email },
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        });
      }

      res.json({
        message: "If an active account exists for that email, a password reset link has been sent.",
      });
    } catch (error) {
      console.error("Forgot password error:", getErrorLogMessage(error));
      res.status(400).json({ message: "Password reset request failed", error: getErrorMessage(error) });
    }
  };

  const resetPasswordHandler = async (req: Request, res: Response) => {
    try {
      if (!guardPublicFlowRateLimit(req, res, "reset_password", 8, 15 * 60 * 1000)) return;
      const payload = resetPasswordSchema.parse(req.body);
      const decoded = jwt.verify(payload.token, JWT_SECRET) as JwtUser;
      if (decoded.type !== "password_reset" || !decoded.id || !decoded.email || !decoded.pwd) {
        return res.status(400).json({ message: "Invalid password reset token" });
      }

      const user = await storage.getUser(Number(decoded.id));
      if (!user || user.email.toLowerCase() !== decoded.email.toLowerCase()) {
        return res.status(400).json({ message: "Invalid password reset token" });
      }

      if (decoded.pwd !== passwordFingerprint(user.password)) {
        return res.status(400).json({ message: "Password reset token has already been used or expired" });
      }

      const isSamePassword = await bcrypt.compare(payload.password, user.password);
      if (isSamePassword) {
        return res.status(400).json({ message: "Choose a new password that is different from your current password" });
      }

      const updatedUser = await storage.updateUser(user.id, {
        password: await bcrypt.hash(payload.password, PASSWORD_HASH_ROUNDS),
      });

      await storage.logAnalytics({
        event: "password_reset_completed",
        userId: updatedUser.id,
        metadata: { email: updatedUser.email },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      void sendPasswordChangedEmail({
        email: updatedUser.email,
        name: `${updatedUser.firstName} ${updatedUser.lastName}`.trim(),
        loginUrl: `${getRequestBaseUrl(req)}/login`,
      });

      clearRefreshCookie(res);
      res.json({ message: "Password reset successful. Please sign in with your new password." });
    } catch (error) {
      console.error("Reset password error:", getErrorLogMessage(error));
      res.status(400).json({ message: "Password reset failed", error: getErrorMessage(error) });
    }
  };

  app.post('/api/auth/forgot-password', forgotPasswordHandler);
  app.post('/auth/forgot-password', forgotPasswordHandler);
  app.post('/api/auth/reset-password', resetPasswordHandler);
  app.post('/auth/reset-password', resetPasswordHandler);

  app.get('/api/email/track/open/:jobId', async (req, res) => {
    try {
      const jobId = req.params.jobId;
      const signature = typeof req.query.s === "string" ? req.query.s : null;
      if (!verifyEmailTrackingSignature(jobId, signature)) {
        return res.status(400).send("Invalid tracking signature");
      }

      await recordEmailOpen({
        jobId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || null,
      });

      const pixel = Buffer.from("R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==", "base64");
      res.setHeader("Content-Type", "image/gif");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.end(pixel);
    } catch (error) {
      console.error("Email open tracking error:", getErrorLogMessage(error));
      res.status(400).send("Tracking failed");
    }
  });

  app.get('/api/email/track/click/:jobId', async (req, res) => {
    try {
      const jobId = req.params.jobId;
      const url = typeof req.query.u === "string" ? req.query.u : "";
      const signature = typeof req.query.s === "string" ? req.query.s : null;
      if (!/^https?:\/\//i.test(url) || !verifyEmailTrackingSignature(`${jobId}:${url}`, signature)) {
        return res.status(400).send("Invalid tracking link");
      }

      await recordEmailClick({
        jobId,
        url,
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || null,
      });
      res.redirect(302, url);
    } catch (error) {
      console.error("Email click tracking error:", getErrorLogMessage(error));
      res.status(400).send("Tracking failed");
    }
  });

  app.post('/api/email/webhooks/:provider', async (req, res) => {
    try {
      if (env.EMAIL_WEBHOOK_SIGNING_SECRET) {
        const providedSecret = req.get("x-mec-webhook-secret");
        if (providedSecret !== env.EMAIL_WEBHOOK_SIGNING_SECRET) {
          return res.status(401).json({ message: "Invalid webhook secret" });
        }
      }

      await recordProviderWebhookEvent(req.params.provider, req.body);
      res.json({ received: true });
    } catch (error) {
      console.error("Email provider webhook error:", getErrorLogMessage(error));
      res.status(400).json({ message: "Webhook processing failed", error: getErrorMessage(error) });
    }
  });

  const preferenceLabels: Record<string, string> = {
    scholarships: "Scholarships",
    jobs: "Jobs",
    news: "News",
    events: "Events",
    blog_updates: "Blog Updates",
    partner_updates: "Partner Updates",
    marketing: "Marketing Emails",
  };

  const getPreferenceRecord = async (token: string) => {
    const decoded = verifyEmailPreferenceToken(token);
    const tokenHash = createEmailPreferenceTokenHash(token);
    const existing =
      (await storage.getEmailPreferenceByTokenHash(tokenHash)) ||
      (await storage.getEmailPreferenceByEmail(decoded.email));
    if (existing) return existing;

    return storage.upsertEmailPreference({
      userId: null,
      email: decoded.email,
      categories: Object.fromEntries(subscriptionPreferenceCategories.map((category) => [category, true])),
      consentStatus: "pending",
      consentSource: "preference_center",
      consentAt: null,
      unsubscribedAt: null,
      unsubscribeTokenHash: tokenHash,
      auditTrail: [{ action: "created_from_preference_center", at: new Date().toISOString() }],
    });
  };

  const renderPreferenceCenter = (token: string, email: string, categories: Record<string, boolean>, saved = false) => `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Email Preferences | Mtendere Education Consult</title>
      </head>
      <body style="margin:0; font-family:Arial,sans-serif; background:#eef4f8; color:#1f2937;">
        <main style="max-width:640px; margin:40px auto; background:#fff; border:1px solid #dbe4ea; border-radius:8px; padding:28px;">
          <h1 style="margin:0 0 8px; color:#0f4c81;">Email Preferences</h1>
          <p style="margin:0 0 20px; color:#64748b;">${escapeHtml(email)}</p>
          ${saved ? `<p style="background:#dcfce7; color:#166534; padding:12px; border-radius:8px;">Your preferences have been updated.</p>` : ""}
          <form method="post" action="/api/email/preferences/${encodeURIComponent(token)}">
            ${subscriptionPreferenceCategories
              .map(
                (category) => `
                  <label style="display:flex; gap:10px; align-items:center; padding:10px 0; border-bottom:1px solid #edf2f7;">
                    <input type="checkbox" name="${category}" value="true" ${categories[category] !== false ? "checked" : ""}>
                    <span>${preferenceLabels[category]}</span>
                  </label>
                `,
              )
              .join("")}
            <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:22px;">
              <button type="submit" style="border:0; background:#0f4c81; color:#fff; padding:12px 16px; border-radius:8px; font-weight:700;">Save Preferences</button>
              <button type="submit" name="unsubscribeAll" value="true" style="border:1px solid #dc2626; background:#fff; color:#dc2626; padding:12px 16px; border-radius:8px; font-weight:700;">Unsubscribe All</button>
            </div>
          </form>
        </main>
      </body>
    </html>
  `;

  const updatePreferenceRecord = async (
    token: string,
    categories: Record<string, boolean>,
    unsubscribeAll: boolean,
  ) => {
    const existing = await getPreferenceRecord(token);
    const nextCategories = unsubscribeAll
      ? Object.fromEntries(subscriptionPreferenceCategories.map((category) => [category, false]))
      : { ...(existing.categories || {}), ...categories };
    const isFullyUnsubscribed = subscriptionPreferenceCategories.every((category) => nextCategories[category] === false);
    const updated = await storage.updateEmailPreference(existing.id, {
      categories: nextCategories,
      consentStatus: isFullyUnsubscribed ? "unsubscribed" : "active",
      unsubscribedAt: isFullyUnsubscribed ? new Date() : null,
      auditTrail: [
        ...(existing.auditTrail || []),
        {
          action: isFullyUnsubscribed ? "unsubscribe_all" : "update_preferences",
          categories: nextCategories,
          at: new Date().toISOString(),
        },
      ],
    });

    const subscriber = await storage.getSubscriberByEmail(existing.email);
    if (subscriber) {
      await storage.updateSubscriber(subscriber.id, {
        preferences: subscriptionPreferenceCategories.filter((category) => nextCategories[category] !== false),
        status: isFullyUnsubscribed ? "unsubscribed" : "active",
        unsubscribedAt: isFullyUnsubscribed ? new Date() : null,
      });
    }

    return updated;
  };

  app.get('/api/email/preferences/:token', async (req, res) => {
    try {
      const preference = await getPreferenceRecord(req.params.token);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(renderPreferenceCenter(req.params.token, preference.email, preference.categories || {}));
    } catch (error) {
      console.error("Email preference center error:", getErrorLogMessage(error));
      res.status(400).send("Invalid email preference link");
    }
  });

  app.post('/api/email/preferences/:token', async (req, res) => {
    try {
      const isJsonRequest = req.is("application/json");
      const payload = isJsonRequest ? emailPreferenceUpdateSchema.parse(req.body) : null;
      const unsubscribeAll = Boolean(payload?.unsubscribeAll || req.body.unsubscribeAll);
      const categories = payload?.categories || Object.fromEntries(
        subscriptionPreferenceCategories.map((category) => [category, Boolean(req.body[category])]),
      );
      const updated = await updatePreferenceRecord(req.params.token, categories, unsubscribeAll);

      if (isJsonRequest) {
        return res.json({ message: "Email preferences updated", preferences: updated.categories });
      }

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(renderPreferenceCenter(req.params.token, updated.email, updated.categories || {}, true));
    } catch (error) {
      console.error("Email preference update error:", getErrorLogMessage(error));
      res.status(400).json({ message: "Preference update failed", error: getErrorMessage(error) });
    }
  });

  app.get('/api/email/unsubscribe/:token', async (req, res) => {
    try {
      await updatePreferenceRecord(req.params.token, {}, true);
      res.redirect(302, `${getRequestBaseUrl(req)}/?subscription=unsubscribed`);
    } catch (error) {
      console.error("Email unsubscribe error:", getErrorLogMessage(error));
      res.status(400).send("Invalid unsubscribe link");
    }
  });

  app.get('/api/admin/email/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const days = Number(req.query.days ?? 30);
      res.json(await getEmailPlatformHealth(Number.isFinite(days) ? days : 30));
    } catch (error) {
      console.error("Admin email stats error:", getErrorLogMessage(error));
      res.status(500).json({ message: "Failed to fetch email platform stats" });
    }
  });

  app.get('/api/admin/email/templates', authenticateToken, requireAdmin, async (_req, res) => {
    try {
      const health = await getEmailPlatformHealth(30);
      res.json({ templates: health.templates });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email templates" });
    }
  });

  const logoutHandler = (_req: Request, res: Response) => {
    clearRefreshCookie(res);
    res.json({ message: 'Logged out successfully' });
  };

  const refreshHandler = async (req: Request, res: Response) => {
    try {
      const refreshToken = getCookieValue(req, refreshTokenCookieName);
      if (!refreshToken) {
        return res.status(401).json({ message: "Refresh token missing" });
      }

      const decoded = jwt.verify(refreshToken, JWT_SECRET) as JwtUser & { type?: string };
      if (decoded.type !== "refresh" || !decoded.id || !decoded.pwd) {
        clearRefreshCookie(res);
        return res.status(401).json({ message: "Invalid refresh token" });
      }

      const user = await storage.getUser(Number(decoded.id));
      if (!user || user.isActive === false) {
        clearRefreshCookie(res);
        return res.status(401).json({ message: "Invalid refresh token" });
      }

      if (decoded.pwd !== passwordFingerprint(user.password)) {
        clearRefreshCookie(res);
        return res.status(401).json({ message: "Refresh token expired. Please sign in again." });
      }

      setRefreshCookie(res, user);
      res.json({
        token: signToken(user),
        user: buildPublicUser(user),
      });
    } catch (error) {
      clearRefreshCookie(res);
      res.status(401).json({ message: "Invalid refresh token" });
    }
  };

  app.post('/api/auth/logout', logoutHandler);
  app.post('/auth/logout', logoutHandler);
  app.post('/api/auth/refresh', refreshHandler);
  app.post('/auth/refresh', refreshHandler);

  const mfaStatusHandler = (req: Request, res: Response) => {
    const user = getAuthenticatedUser(req);
    res.json({
      mfaSupported: false,
      mfaEnabled: false,
      mfaRequiredForRole: false,
      role: user.role,
      message: "MFA enforcement is not enabled for this backend.",
    });
  };

  app.get('/api/auth/mfa/status', authenticateToken, mfaStatusHandler);
  app.get('/auth/mfa/status', authenticateToken, mfaStatusHandler);

  // User profile route
  const sendUserProfile = async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthenticatedUser(req).id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(buildPublicUser(user));
    } catch (error) {
      console.error('Profile fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch profile' });
    }
  };

  app.get('/api/user', authenticateToken, sendUserProfile);
  app.get('/api/user/profile', authenticateToken, sendUserProfile);

  app.get('/api/users', authenticateToken, requireSuperAdmin, async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map(buildPublicUser));
    } catch (error) {
      console.error('Users fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.post('/api/users', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      userData.email = userData.email.trim().toLowerCase();
      userData.username = userData.username.trim();
      const requestedRole = normalizeAssignableAdminRole(userData.role);
      if (!requestedRole) {
        return res.status(403).json({ message: "Only viewer and writer accounts can be created from user management" });
      }
      validateStrongPassword(userData.password);
      userData.role = requestedRole;
      const existingUser =
        (await storage.getUserByEmail(userData.email)) ||
        (await storage.getUserByUsername(userData.username));

      if (existingUser) {
        return res.status(400).json({ message: 'A user with that email or username already exists' });
      }

      const user = await storage.createUser({
        ...userData,
        password: await bcrypt.hash(userData.password, PASSWORD_HASH_ROUNDS),
      });

      res.status(201).json(buildPublicUser(user));
    } catch (error) {
      console.error('User creation error:', getErrorLogMessage(error));
      res.status(400).json({ message: 'Failed to create user', error: getErrorMessage(error) });
    }
  });

  app.put('/api/users/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

      const updateData = insertUserSchema.partial().parse(req.body);
      if (updateData.email) updateData.email = updateData.email.trim().toLowerCase();
      if (updateData.username) updateData.username = updateData.username.trim();
      const existingUser = await storage.getUser(id);
      if (!existingUser) return res.status(404).json({ message: 'User not found' });
      if (isProtectedAdminRole(existingUser.role) && updateData.role && updateData.role !== existingUser.role) {
        return res.status(403).json({ message: "Super administrator role cannot be changed from user management" });
      }
      if (isProtectedAdminRole(existingUser.role) && updateData.isActive === false) {
        return res.status(403).json({ message: "Super administrator accounts cannot be suspended from user management" });
      }
      if (updateData.role && !isProtectedAdminRole(existingUser.role)) {
        const requestedRole = normalizeAssignableAdminRole(updateData.role);
        if (!requestedRole) {
          return res.status(403).json({ message: "Only viewer and writer roles can be assigned" });
        }
        updateData.role = requestedRole;
      }
      if (updateData.password) validateStrongPassword(updateData.password);
      const nextUser = updateData.password
        ? { ...updateData, password: await bcrypt.hash(updateData.password, PASSWORD_HASH_ROUNDS) }
        : updateData;

      const user = await storage.updateUser(id, nextUser);

      res.json(buildPublicUser(user));
    } catch (error) {
      console.error('User update error:', getErrorLogMessage(error));
      res.status(400).json({ message: 'Failed to update user', error: getErrorMessage(error) });
    }
  });

  app.delete('/api/users/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

      const authUser = getAuthenticatedUser(req);
      if (authUser.id === id) {
        return res.status(400).json({ message: 'You cannot delete your own account' });
      }
      const targetUser = await storage.getUser(id);
      if (!targetUser) return res.status(404).json({ message: 'User not found' });
      if (isProtectedAdminRole(targetUser.role)) {
        return res.status(403).json({ message: "Super administrator accounts cannot be deleted from user management" });
      }

      const success = await storage.deleteUser(id);
      if (!success) return res.status(404).json({ message: 'User not found' });

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('User deletion error:', error);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  });

  app.get('/api/search', async (req, res) => {
    try {
      const query = normalizeSearchQuery(req.query.q ?? req.query.search);
      if (query.length < 2) {
        return res.json({ query, results: [], total: 0 });
      }

      const [scholarshipsList, jobsList, partnersList, blogList, eventsList, teamList] = await Promise.all([
        storage.getActiveScholarships(),
        storage.getActiveJobs(),
        storage.getActivePartners(),
        storage.getPublishedBlogPosts(),
        storage.getPublishedEvents(),
        storage.getActiveTeamMembers(),
      ]);

      const results = [
        ...searchAndRank(scholarshipsList.map(toPublicScholarship), query, (item) => [
          item.title,
          item.description,
          item.institution,
          item.country,
          item.category,
          item.requirements as any,
        ]).slice(0, 8).map((item) => ({
          id: item.id,
          type: "scholarship",
          title: item.title,
          description: item.description,
          href: `/scholarships/${item.slug || item.id}`,
          category: item.category,
          imageUrl: item.imageUrl,
        })),
        ...searchAndRank(jobsList, query, (item) => [
          item.title,
          item.description,
          item.company,
          item.location,
          item.jobType,
          item.requirements as any,
        ]).slice(0, 8).map((item) => ({
          id: item.id,
          type: "job",
          title: item.title,
          description: item.description,
          href: `/jobs/${getJobMeta(item.id).slug ?? slugify(item.title ?? `job-${item.id}`)}`,
          category: item.jobType,
          imageUrl: getJobMeta(item.id).featuredImage ?? null,
        })),
        ...searchAndRank(partnersList.map(toPublicPartner), query, (item) => [
          item.name,
          item.description,
          item.country,
          item.partnershipType,
          item.ranking,
        ]).slice(0, 8).map((item) => ({
          id: item.id,
          type: "partner",
          title: item.name,
          description: item.description,
          href: `/partners/${item.id}`,
          category: item.partnershipType ?? item.country,
          imageUrl: item.logoUrl,
        })),
        ...searchAndRank(blogList.map(toPublicBlogPost), query, (item) => [
          item.title,
          item.excerpt,
          item.content,
          item.category,
          item.tags,
        ]).slice(0, 8).map((item) => ({
          id: item.id,
          type: "blog",
          title: item.title,
          description: item.excerpt ?? item.content,
          href: `/blog/${item.slug || item.id}`,
          category: item.category,
          imageUrl: item.imageUrl,
        })),
        ...searchAndRank(eventsList, query, (item) => [
          item.title,
          item.summary,
          item.description,
          item.category,
          item.location,
          item.tags,
        ]).slice(0, 6).map((item) => ({
          id: item.id,
          type: "event",
          title: item.title,
          description: item.summary ?? item.description,
          href: `/events/${item.slug || item.id}`,
          category: item.category,
          imageUrl: item.coverImage,
        })),
        ...searchAndRank(teamList, query, (item) => [
          item.name,
          item.position,
          item.bio,
          item.email,
        ]).slice(0, 6).map((item) => ({
          id: item.id,
          type: "team",
          title: item.name,
          description: item.position,
          href: "/team",
          category: "Team",
          imageUrl: item.imageUrl,
        })),
      ].slice(0, 30);

      await storage.logAnalytics({
        event: "site_search",
        userId: getOptionalAuthenticatedUser(req)?.id ?? null,
        metadata: { query, total: results.length },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json({ query, results, total: results.length });
    } catch (error) {
      console.error("Site search error:", error);
      res.status(500).json({ message: "Failed to search content" });
    }
  });

  // Scholarships routes
  app.get('/api/scholarships', async (req, res) => {
    try {
      const requester = getOptionalAuthenticatedUser(req);
      const scholarships = isAdmin(requester)
        ? await storage.getAllScholarships()
        : await storage.getActiveScholarships();
      res.json(scholarships.map(toPublicScholarship));
    } catch (error) {
      console.error('Scholarships fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch scholarships' });
    }
  });

  app.get('/api/scholarships/search', async (req, res) => {
    try {
      const q = normalizeSearchQuery(req.query.q ?? req.query.p0);
      if (q.length < 2) {
        return res.status(400).json({ message: 'Search query is required' });
      }
      
      const scholarships = await storage.searchScholarships(q);
      res.json(scholarships.map(toPublicScholarship));
    } catch (error) {
      console.error('Scholarship search error:', error);
      res.status(500).json({ message: 'Failed to search scholarships' });
    }
  });

  app.get('/api/scholarships/:id', async (req, res) => {
    try {
      const requester = getOptionalAuthenticatedUser(req);
      const scholarship = await findScholarshipByIdentifier(req.params.id, requester);
      const isVisible =
        scholarship &&
        (isAdmin(requester) ||
          (scholarship.isActive !== false && new Date(scholarship.deadline).getTime() > Date.now()));

      if (!isVisible) return res.status(404).json({ message: 'Scholarship not found' });
      res.json(toPublicScholarship(scholarship));
    } catch (error) {
      console.error('Scholarship detail fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch scholarship' });
    }
  });

  app.post('/api/scholarships', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const scholarshipData = insertScholarshipSchema.parse({
        ...req.body,
        createdBy: getAuthenticatedUser(req).id,
      });
      
      const scholarship = await storage.createScholarship(scholarshipData);
      broadcast('scholarships', { type: 'scholarship_created', scholarship });
      
      res.status(201).json(scholarship);
    } catch (error) {
      console.error('Scholarship creation error:', error);
      res.status(400).json({ message: 'Failed to create scholarship', error: getErrorMessage(error) });
    }
  });

  app.put('/api/scholarships/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });
      const updateData = insertScholarshipSchema.partial().parse(req.body);
      
      const scholarship = await storage.updateScholarship(id, updateData);
      if (!scholarship) return res.status(404).json({ message: 'Scholarship not found' });
      broadcast('scholarships', { type: 'scholarship_updated', scholarship });
      
      res.json(scholarship);
    } catch (error) {
      console.error('Scholarship update error:', error);
      res.status(400).json({ message: 'Failed to update scholarship', error: getErrorMessage(error) });
    }
  });

  app.delete('/api/scholarships/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteScholarship(id);
      
      if (success) {
        broadcast('scholarships', { type: 'scholarship_deleted', id });
        res.json({ message: 'Scholarship deleted successfully' });
      } else {
        res.status(404).json({ message: 'Scholarship not found' });
      }
    } catch (error) {
      console.error('Scholarship deletion error:', error);
      res.status(500).json({ message: 'Failed to delete scholarship' });
    }
  });

  // Jobs routes
  app.get('/api/jobs', async (req, res) => {
    try {
      const requester = getOptionalAuthenticatedUser(req);
      const jobs = isAdmin(requester)
        ? await storage.getAllJobs()
        : await storage.getActiveJobs();
      res.json(jobs.map(toPublicJob));
    } catch (error) {
      console.error('Jobs fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch jobs' });
    }
  });

  app.get('/api/jobs/search', async (req, res) => {
    try {
      const q = normalizeSearchQuery(req.query.q ?? req.query.p0);
      if (q.length < 2) {
        return res.status(400).json({ message: 'Search query is required' });
      }
      
      const jobs = await storage.searchJobs(q);
      res.json(jobs.map(toPublicJob));
    } catch (error) {
      console.error('Job search error:', error);
      res.status(500).json({ message: 'Failed to search jobs' });
    }
  });

  app.get('/api/jobs/:id', async (req, res) => {
    try {
      const requester = getOptionalAuthenticatedUser(req);
      const job = await findJobByIdentifier(req.params.id, requester);
      const isVisible = job && (isAdmin(requester) || job.isActive !== false);

      if (!isVisible) return res.status(404).json({ message: 'Job not found' });
      res.json(toPublicJob(job));
    } catch (error) {
      console.error('Job detail fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch job' });
    }
  });

  app.post('/api/jobs', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const jobData = insertJobSchema.parse({
        ...req.body,
        createdBy: getAuthenticatedUser(req).id,
      });
      
      const job = await storage.createJob(jobData);
      broadcast('jobs', { type: 'job_created', job });
      
      res.status(201).json(job);
    } catch (error) {
      console.error('Job creation error:', error);
      res.status(400).json({ message: 'Failed to create job', error: getErrorMessage(error) });
    }
  });

  app.put('/api/jobs/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });
      const updateData = insertJobSchema.partial().parse(req.body);
      
      const job = await storage.updateJob(id, updateData);
      if (!job) return res.status(404).json({ message: 'Job not found' });
      broadcast('jobs', { type: 'job_updated', job });
      
      res.json(job);
    } catch (error) {
      console.error('Job update error:', error);
      res.status(400).json({ message: 'Failed to update job', error: getErrorMessage(error) });
    }
  });

  app.delete('/api/jobs/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteJob(id);
      
      if (success) {
        broadcast('jobs', { type: 'job_deleted', id });
        res.json({ message: 'Job deleted successfully' });
      } else {
        res.status(404).json({ message: 'Job not found' });
      }
    } catch (error) {
      console.error('Job deletion error:', error);
      res.status(500).json({ message: 'Failed to delete job' });
    }
  });

  // Applications routes
  app.get('/api/applications', authenticateToken, async (req, res) => {
    try {
      const authUser = getAuthenticatedUser(req);
      const applications = isAdmin(authUser)
        ? await storage.getAllApplications()
        : await storage.getUserApplications(authUser.id);
      
      res.json(applications.map((application) => ({ ...application, meta: getApplicationMeta(application.id) })));
    } catch (error) {
      console.error('Applications fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch applications' });
    }
  });

  app.post(
    '/api/application-assets',
    authenticateToken,
    upload.fields([
      { name: "cv", maxCount: 1 },
      { name: "coverLetter", maxCount: 1 },
      { name: "portfolio", maxCount: 1 },
    ]),
    (req, res) => {
      const filesPayload = (req as MulterRequest).files;
      const fileGroups = !Array.isArray(filesPayload) && filesPayload ? filesPayload : {};
      const documents = Object.entries(fileGroups).reduce<Record<string, unknown>>((acc, [field, files]) => {
        const [file] = files;
        if (!file) return acc;
        acc[field] = {
          url: `/uploads/${file.filename}`,
          originalName: file.originalname,
          size: file.size,
          type: file.mimetype,
        };
        return acc;
      }, {});

      res.status(201).json({ documents });
    },
  );

  app.post('/api/applications', authenticateToken, async (req, res) => {
    try {
      const authUser = getAuthenticatedUser(req);
      const payload = publicApplicationRequestSchema.parse(req.body);
      const userApplications = await storage.getUserApplications(authUser.id);
      const duplicate = userApplications.find(
        (application) =>
          application.type === payload.type && application.referenceId === payload.referenceId,
      );

      if (duplicate) {
        return res.status(409).json({
          message: "You have already applied for this opportunity",
          application: duplicate,
        });
      }

      const target =
        payload.type === "job"
          ? await storage.getJob(payload.referenceId)
          : await storage.getScholarship(payload.referenceId);

      if (!target || target.isActive === false) {
        return res.status(404).json({ message: "Opportunity not found" });
      }

      const applicationData = insertApplicationSchema.parse({
        ...payload,
        userId: authUser.id,
      });
      
      const application = await storage.createApplication(applicationData);
      const documentsRecord =
        payload.documents && typeof payload.documents === "object"
          ? (payload.documents as Record<string, unknown>)
          : {};
      const applicantProfile = parseRecord(documentsRecord.applicant);
      const professionalProfile = parseRecord(documentsRecord.professional);
      const educationHistory = parseRecordArray(documentsRecord.education);
      const experienceHistory = parseRecordArray(documentsRecord.experience);
      const references = parseRecordArray(documentsRecord.references);
      const roleAnswers = parseRecord(documentsRecord.answers);
      const cvBuilderSnapshot = parseRecord(documentsRecord.cvBuilder);
      const atsScore =
        typeof documentsRecord.atsScore === "number"
          ? documentsRecord.atsScore
          : typeof cvBuilderSnapshot?.atsScore === "number"
            ? cvBuilderSnapshot.atsScore
            : undefined;
      setApplicationMeta(application.id, {
        workflowType: payload.type,
        stage: payload.type === "job" ? "applied" : "submitted",
        source: typeof documentsRecord.source === "string" ? documentsRecord.source : "public",
        applicantSnapshot: applicantProfile,
        professionalSnapshot: professionalProfile,
        educationHistory,
        experienceHistory,
        references,
        roleAnswers,
        cvBuilderSnapshot,
        atsScore,
        pipeline:
          payload.type === "job"
            ? [
                { id: "applied", label: "Applied", completedAt: new Date().toISOString() },
                { id: "under_review", label: "Under Review" },
                { id: "shortlisted", label: "Shortlisted" },
                { id: "interview", label: "Interview" },
                { id: "assessment", label: "Assessment" },
                { id: "offer", label: "Offer" },
                { id: "hired", label: "Hired" },
                { id: "rejected", label: "Rejected" },
              ]
            : undefined,
        documents:
          Object.keys(documentsRecord).length > 0
            ? Object.entries(documentsRecord).map(([key, value]) => ({
                key,
                value,
                status: "received",
                uploadedAt: new Date().toISOString(),
              }))
            : [],
        reviewHistory: [
          createOperationalRecord({
            status: application.status,
            stage: "submitted",
            actor: "applicant",
          }),
        ],
        notificationHistory: [],
      });
      broadcast('applications', { type: 'application_created', application });
      const opportunityTitle = "title" in target ? target.title : "Opportunity";
      const dashboardUrl = `${env.PUBLIC_APP_URL || `${req.protocol}://${req.get("host")}`}/dashboard`;
      const applicant = await storage.getUser(authUser.id);

      void sendApplicationConfirmation({
        email: authUser.email,
        name: applicant ? `${applicant.firstName} ${applicant.lastName}`.trim() : undefined,
        opportunityTitle,
        opportunityType: payload.type,
        dashboardUrl,
      });

      if (getAdminSettings().emailNotifications) {
        void sendAdminNotification({
          subject: "New Mtendere application submitted",
          message: `${applicant ? `${applicant.firstName} ${applicant.lastName}`.trim() : authUser.email} submitted a ${payload.type} application for ${opportunityTitle}.`,
          metadata: {
            applicationId: application.id,
            opportunityType: payload.type,
            referenceId: payload.referenceId,
          },
        });
      }
      
      // Log analytics
      await storage.logAnalytics({
        event: 'application_submitted',
        userId: authUser.id,
        metadata: { 
          type: applicationData.type,
          referenceId: applicationData.referenceId 
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      
      res.status(201).json({ ...application, meta: getApplicationMeta(application.id) });
    } catch (error) {
      console.error('Application creation error:', error);
      res.status(400).json({ message: 'Failed to create application', error: getErrorMessage(error) });
    }
  });

  app.put('/api/applications/:id', authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });
      const updateData = insertApplicationSchema.partial().parse(req.body);
      
      // Check if user owns the application or is admin
      const existingApplication = await storage.getApplication(id);
      if (!existingApplication) {
        return res.status(404).json({ message: 'Application not found' });
      }
      
      const user = getAuthenticatedUser(req);
      if (existingApplication.userId !== user.id && !isAdmin(user)) {
        return res.status(403).json({ message: 'Not authorized to update this application' });
      }
      
      const application = await storage.updateApplication(id, updateData);
      const meta = getApplicationMeta(id);
      setApplicationMeta(id, {
        ...buildApplicationMetaFromBody(req.body),
        reviewHistory: [
          createOperationalRecord({
            status: application.status,
            stage: req.body.stage ?? meta.stage ?? "updated",
            actor: user.id,
          }),
          ...(meta.reviewHistory ?? []),
        ].slice(0, 100),
      });
      broadcast('applications', { type: 'application_updated', application });
      
      res.json({ ...application, meta: getApplicationMeta(id) });
    } catch (error) {
      console.error('Application update error:', error);
      res.status(400).json({ message: 'Failed to update application', error: getErrorMessage(error) });
    }
  });

  // Partners routes
  app.get('/api/partners', async (req, res) => {
    try {
      const requester = getOptionalAuthenticatedUser(req);
      const partners = isAdmin(requester)
        ? await storage.getAllPartners()
        : await storage.getActivePartners();
      res.json(partners.map(toPublicPartner));
    } catch (error) {
      console.error('Partners fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch partners' });
    }
  });

  app.get('/api/partners/:id', async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

      const partner = await storage.getPartner(id);
      const requester = getOptionalAuthenticatedUser(req);
      const isVisible = partner && (isAdmin(requester) || partner.isActive !== false);

      if (!isVisible) return res.status(404).json({ message: 'Partner not found' });
      res.json(toPublicPartner(partner));
    } catch (error) {
      console.error('Partner detail fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch partner' });
    }
  });

  app.get('/api/partner-videos', async (_req, res) => {
    try {
      const partners = await storage.getActivePartners();
      const videos = partners
        .map(toPublicPartner)
        .filter((partner) => typeof partner.videoUrl === "string" && partner.videoUrl.trim().length > 0)
        .sort((a, b) => Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)))
        .map((partner) => ({
          id: partner.id,
          partnerId: partner.id,
          partnerName: partner.name,
          title: partner.videoTitle || partner.name,
          description: partner.videoDescription || partner.description,
          videoUrl: partner.videoUrl,
          logoUrl: partner.logoUrl,
          website: partner.website,
          country: partner.country,
          isFeatured: partner.isFeatured,
        }));

      res.json(videos);
    } catch (error) {
      console.error('Partner videos fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch partner videos' });
    }
  });

  app.post('/api/partners', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const partnerData = insertPartnerSchema.parse(req.body);
      const partner = await storage.createPartner(partnerData);
      broadcast('partners', { type: 'partner_created', partner });
      
      res.status(201).json(partner);
    } catch (error) {
      console.error('Partner creation error:', error);
      res.status(400).json({ message: 'Failed to create partner', error: getErrorMessage(error) });
    }
  });

  // Testimonials routes
  app.get('/api/testimonials', async (req, res) => {
    try {
      const requester = getOptionalAuthenticatedUser(req);
      const testimonials = isAdmin(requester)
        ? await storage.getAllTestimonials()
        : await storage.getApprovedTestimonials();
      res.json(testimonials);
    } catch (error) {
      console.error('Testimonials fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch testimonials' });
    }
  });

  app.post('/api/testimonials', authenticateToken, async (req, res) => {
    try {
      const authUser = getAuthenticatedUser(req);
      const testimonialData = insertTestimonialSchema.parse({
        ...req.body,
        userId: authUser.id,
        isApproved: isAdmin(authUser) ? req.body.isApproved ?? false : false,
      });
      
      const testimonial = await storage.createTestimonial(testimonialData);
      broadcast('testimonials', { type: 'testimonial_created', testimonial });
      
      res.status(201).json(testimonial);
    } catch (error) {
      console.error('Testimonial creation error:', error);
      res.status(400).json({ message: 'Failed to create testimonial', error: getErrorMessage(error) });
    }
  });

  app.put('/api/testimonials/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ message: 'Invalid testimonial id' });
      }

      const existing = await storage.getTestimonial(id);
      if (!existing) {
        return res.status(404).json({ message: 'Testimonial not found' });
      }

      const testimonialData = insertTestimonialSchema.partial().parse(req.body);
      const testimonial = await storage.updateTestimonial(id, testimonialData);
      broadcast('testimonials', { type: 'testimonial_updated', testimonial });
      
      res.json(testimonial);
    } catch (error) {
      console.error('Testimonial update error:', error);
      res.status(400).json({ message: 'Failed to update testimonial', error: getErrorMessage(error) });
    }
  });

  app.delete('/api/testimonials/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ message: 'Invalid testimonial id' });
      }

      const deleted = await storage.deleteTestimonial(id);
      if (!deleted) {
        return res.status(404).json({ message: 'Testimonial not found' });
      }

      broadcast('testimonials', { type: 'testimonial_deleted', id });
      res.json({ message: 'Testimonial deleted successfully' });
    } catch (error) {
      console.error('Testimonial deletion error:', error);
      res.status(500).json({ message: 'Failed to delete testimonial', error: getErrorMessage(error) });
    }
  });

  // Blog posts routes
  app.get('/api/blog-posts', async (req, res) => {
    try {
      const requester = getOptionalAuthenticatedUser(req);
      const blogPosts = isAdmin(requester)
        ? await storage.getAllBlogPosts()
        : await storage.getPublishedBlogPosts();
      res.json(blogPosts.map(toPublicBlogPost));
    } catch (error) {
      console.error('Blog posts fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch blog posts' });
    }
  });

  app.get('/api/blog-posts/search', async (req, res) => {
    try {
      const q = normalizeSearchQuery(req.query.q ?? req.query.p0);
      if (q.length < 2) {
        return res.status(400).json({ message: 'Search query is required' });
      }
      
      const requester = getOptionalAuthenticatedUser(req);
      const blogPosts = await storage.searchBlogPosts(q);
      res.json((isAdmin(requester) ? blogPosts : blogPosts.filter((post) => post.isPublished)).map(toPublicBlogPost));
    } catch (error) {
      console.error('Blog search error:', error);
      res.status(500).json({ message: 'Failed to search blog posts' });
    }
  });

  app.get('/api/blog-posts/:id', async (req, res) => {
    try {
      const requester = getOptionalAuthenticatedUser(req);
      const post = await findBlogPostByIdentifier(req.params.id, requester);
      if (!post || (!isAdmin(requester) && !post.isPublished)) {
        return res.status(404).json({ message: 'Blog post not found' });
      }
      res.json(toPublicBlogPost(post));
    } catch (error) {
      console.error('Blog post fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch blog post' });
    }
  });

  app.post('/api/blog-posts/:id/like', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });
      const post = await storage.incrementBlogLikes(id);
      broadcast('blog-posts', { type: 'blog_post_liked', blogPost: post });
      res.json(post);
    } catch (error) {
      console.error('Blog like error:', error);
      res.status(500).json({ message: 'Failed to like blog post' });
    }
  });

  app.get('/api/blog-posts/:id/comments', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });
      const comments = await storage.getBlogComments(id);
      res.json(comments);
    } catch (error) {
      console.error('Blog comments fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch comments' });
    }
  });

  app.post('/api/blog-posts/:id/comments', authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });
      const commentData = insertBlogCommentSchema.parse({
        ...req.body,
        blogPostId: id,
        userId: getAuthenticatedUser(req).id,
      });
      const comment = await storage.createBlogComment(commentData);
      broadcast('blog-posts', { type: 'comment_created', comment });
      res.status(201).json(comment);
    } catch (error) {
      console.error('Comment creation error:', error);
      res.status(400).json({ 
        message: 'Failed to create comment', 
        error: getErrorMessage(error),
      });
    }
  });

  app.post('/api/blog-posts', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const blogPostData = insertBlogPostSchema.parse({
        ...req.body,
        authorId: getAuthenticatedUser(req).id,
      });
      
      const blogPost = await storage.createBlogPost(blogPostData);
      broadcast('blog-posts', { type: 'blog_post_created', blogPost });
      
      res.status(201).json(blogPost);
    } catch (error) {
      console.error('Blog post creation error:', error);
      res.status(400).json({ 
        message: 'Failed to create blog post', 
        error: getErrorMessage(error),
      });
    }
  });

  app.put('/api/blog-posts/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

      const updateData = insertBlogPostSchema.partial().parse(req.body);
      
      const blogPost = await storage.updateBlogPost(id, updateData);
      if (!blogPost) return res.status(404).json({ message: 'Blog post not found' });
      
      broadcast('blog-posts', { type: 'blog_post_updated', blogPost });
      res.json(blogPost);
    } catch (error) {
      console.error('Blog post update error:', error);
      res.status(400).json({ 
        message: 'Failed to update blog post', 
        error: getErrorMessage(error),
      });
    }
  });

  app.delete('/api/blog-posts/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

      const success = await storage.deleteBlogPost(id);
      if (success) {
        broadcast('blog-posts', { type: 'blog_post_deleted', id });
        res.json({ message: 'Blog post deleted successfully' });
      } else {
        res.status(404).json({ message: 'Blog post not found' });
      }
    } catch (error) {
      console.error('Blog post deletion error:', error);
      res.status(500).json({ message: 'Failed to delete blog post' });
    }
  });

  // Team members routes
  app.get('/api/team-members', async (req, res) => {
    try {
      const requester = getOptionalAuthenticatedUser(req);
      const teamMembers = isAdmin(requester)
        ? await storage.getAllTeamMembers()
        : await storage.getActiveTeamMembers();
      res.json(teamMembers.map(toPublicTeamMember));
    } catch (error) {
      console.error('Team members fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch team members' });
    }
  });

  app.get('/api/team-members/:id', async (req, res) => {
    try {
      const requester = getOptionalAuthenticatedUser(req);
      const teamMember = await findTeamMemberByIdentifier(req.params.id, requester);
      const isVisible = teamMember && (isAdmin(requester) || teamMember.isActive !== false);

      if (!isVisible) return res.status(404).json({ message: 'Team member not found' });
      res.json(toPublicTeamMember(teamMember));
    } catch (error) {
      console.error('Team member detail fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch team member' });
    }
  });

  app.post('/api/team-members', authenticateToken, requireAdmin, async (req, res) => {
    try {
      // Strict validation for creation
      const teamMemberData = insertTeamMemberSchema.parse(req.body);
      const teamMember = await storage.createTeamMember(teamMemberData);
      broadcast('team-members', { type: 'team_member_created', teamMember });
      res.status(201).json(teamMember);
    } catch (error) {
      console.error('Team member creation error:', error);
      res.status(400).json({ 
        message: 'Failed to create team member', 
        error: getErrorMessage(error),
      });
    }
  });

  app.put('/api/team-members/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

      // Partial validation for updates
      const updateData = insertTeamMemberSchema.partial().parse(req.body);
      
      const teamMember = await storage.updateTeamMember(id, updateData);
      if (!teamMember) return res.status(404).json({ message: 'Team member not found' });

      broadcast('team-members', { type: 'team_member_updated', teamMember });
      res.json(teamMember);
    } catch (error) {
      console.error('Team member update error:', error);
      res.status(400).json({ 
        message: 'Failed to update team member', 
        error: getErrorMessage(error),
      });
    }
  });

  app.delete('/api/team-members/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

      const success = await storage.deleteTeamMember(id);
      if (success) {
        broadcast('team-members', { type: 'team_member_deleted', id });
        res.json({ message: 'Team member deleted successfully' });
      } else {
        res.status(404).json({ message: 'Team member not found' });
      }
    } catch (error) {
      console.error('Team member deletion error:', error);
      res.status(500).json({ message: 'Failed to delete team member' });
    }
  });

  // Events routes
  app.get('/api/events', async (req, res) => {
    try {
      const requester = getOptionalAuthenticatedUser(req);
      const allEvents = isAdmin(requester)
        ? await storage.getAllEvents()
        : await storage.getPublishedEvents();

      const search = normalizeSearchQuery(req.query.search ?? req.query.q);
      const category = String(req.query.category ?? "").toLowerCase();
      const location = String(req.query.location ?? "").toLowerCase();
      const type = String(req.query.type ?? "").toLowerCase();
      const format = String(req.query.format ?? "").toLowerCase();
      const price = String(req.query.price ?? "").toLowerCase();
      const status = String(req.query.status ?? "").toLowerCase();
      const date = String(req.query.date ?? "").toLowerCase();

      const enriched = await Promise.all(allEvents.map(toPublicEvent));
      const searchMatched = searchAndRank(enriched, search, (event) => [
        event.title,
        event.summary,
        event.description,
        event.category,
        event.location,
        event.eventType,
        event.tags,
      ]);
      const filtered = searchMatched.filter((event) => {
        const runtimeStatus = String(event.runtimeStatus ?? "").toLowerCase();
        const startsAt = new Date(event.startAt).getTime();
        const matchesCategory = !category || event.category.toLowerCase() === category;
        const matchesLocation = !location || event.location.toLowerCase().includes(location);
        const matchesType = !type || event.eventType.toLowerCase().includes(type);
        const matchesFormat =
          !format ||
          (format === "virtual" && event.isVirtual) ||
          (format === "physical" && !event.isVirtual) ||
          (format === "hybrid" && event.isVirtual && event.location);
        const matchesPrice =
          !price ||
          (price === "free" && !event.isPaid) ||
          (price === "paid" && event.isPaid);
        const matchesStatus =
          !status ||
          runtimeStatus === status ||
          (status === "featured" && event.isFeatured) ||
          (status === "recommended" && event.isRecommended) ||
          (status === "trending" && event.isTrending);
        const matchesDate =
          !date ||
          (date === "today" && new Date(event.startAt).toDateString() === new Date().toDateString()) ||
          (date === "week" && startsAt <= Date.now() + 7 * 24 * 60 * 60 * 1000) ||
          (date === "month" && startsAt <= Date.now() + 30 * 24 * 60 * 60 * 1000);

        return matchesCategory && matchesLocation && matchesType && matchesFormat && matchesPrice && matchesStatus && matchesDate;
      });

      res.json(filtered);
    } catch (error) {
      console.error('Events fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch events' });
    }
  });

  app.get('/api/events/search', async (req, res) => {
    try {
      const q = normalizeSearchQuery(req.query.q ?? req.query.p0);
      if (q.length < 2) {
        return res.status(400).json({ message: 'Search query is required' });
      }
      const events = await storage.searchEvents(q);
      res.json(await Promise.all(events.map(toPublicEvent)));
    } catch (error) {
      console.error('Event search error:', error);
      res.status(500).json({ message: 'Failed to search events' });
    }
  });

  app.get('/api/events/registrations/:ticketCode/ticket', async (req, res) => {
    try {
      const registrations = await storage.getAllEventRegistrations();
      const registration = registrations.find((item) => item.ticketCode === req.params.ticketCode);
      if (!registration) return res.status(404).send("Ticket not found");
      const event = await storage.getEvent(registration.eventId);
      if (!event) return res.status(404).send("Event not found");
      const ticketPayload = {
        ticketCode: registration.ticketCode,
        eventId: event.id,
        eventTitle: event.title,
        attendee: registration.fullName,
        status: registration.status,
      };
      const qrCode = await QRCode.toDataURL(JSON.stringify(ticketPayload), {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 220,
      });
      const safeTitle = escapeHtml(event.title);
      const safeAttendee = escapeHtml(registration.fullName);
      const safeLocation = escapeHtml(event.isVirtual ? "Virtual event" : event.location);
      const safeTicketCode = escapeHtml(registration.ticketCode);

      res.setHeader("Content-Type", "text/html");
      res.send(`
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>${safeTitle} Ticket</title>
          </head>
          <body style="font-family: Arial, sans-serif; margin: 0; padding: 32px; background: #f5f7fb; color: #111827;">
            <main style="max-width: 720px; margin: 0 auto; background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 28px;">
              <p style="margin: 0 0 8px; color: #0f766e; font-weight: 700;">Mtendere Event Confirmation</p>
              <h1 style="margin: 0 0 16px; color: #0f4c81;">${safeTitle}</h1>
              <p><strong>Attendee:</strong> ${safeAttendee}</p>
              <p><strong>Date:</strong> ${new Date(event.startAt).toLocaleString()}</p>
              <p><strong>Location:</strong> ${safeLocation}</p>
              <p><strong>Status:</strong> ${escapeHtml(registration.status.replace(/_/g, " "))}</p>
              <div style="margin-top: 24px; display: grid; gap: 16px; justify-items: center; padding: 18px; border: 2px dashed #f59e0b; text-align: center;">
                <img src="${qrCode}" alt="QR code for ${safeTicketCode}" width="220" height="220" style="display:block;">
                <div style="font-size: 24px; font-weight: 800;">${safeTicketCode}</div>
              </div>
            </main>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Event ticket error:', error);
      res.status(500).send("Failed to generate ticket");
    }
  });

  app.get('/api/events/:identifier', async (req, res) => {
    try {
      const identifier = req.params.identifier;
      const event = /^\d+$/.test(identifier)
        ? await storage.getEvent(Number(identifier))
        : await storage.getEventBySlug(identifier);
      const requester = getOptionalAuthenticatedUser(req);
      const isVisible = event && (isAdmin(requester) || event.status === "published");
      if (!isVisible) return res.status(404).json({ message: 'Event not found' });

      const [comments, registrations] = await Promise.all([
        storage.getEventComments(event.id, isAdmin(requester)),
        storage.getEventRegistrations(event.id),
      ]);

      res.json({
        ...(await toPublicEvent(event)),
        comments,
        registrations: isAdmin(requester) ? registrations : undefined,
      });
    } catch (error) {
      console.error('Event detail fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch event' });
    }
  });

  app.post('/api/events/:id/view', async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });
      const event = await storage.incrementEventView(id);
      await storage.logAnalytics({
        event: "event_viewed",
        userId: getOptionalAuthenticatedUser(req)?.id ?? null,
        metadata: { type: "event", referenceId: id },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      res.json(await toPublicEvent(event));
    } catch (error) {
      console.error('Event view tracking error:', error);
      res.status(400).json({ message: 'Failed to track event view' });
    }
  });

  app.post('/api/events/:id/share', async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });
      const event = await storage.incrementEventShare(id);
      await storage.logAnalytics({
        event: "event_shared",
        userId: getOptionalAuthenticatedUser(req)?.id ?? null,
        metadata: { type: "event", referenceId: id, channel: req.body?.channel ?? "native" },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      broadcast('events', { type: 'event_shared', eventId: id, shareCount: event.shareCount });
      res.json(await toPublicEvent(event));
    } catch (error) {
      console.error('Event share tracking error:', error);
      res.status(400).json({ message: 'Failed to track event share' });
    }
  });

  app.post('/api/events/:id/like', async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });
      const user = getOptionalAuthenticatedUser(req);
      await storage.createEventReaction(insertEventReactionSchema.parse({
        eventId: id,
        userId: user?.id ?? null,
        visitorId: user ? null : String(req.body?.visitorId ?? req.ip ?? "anonymous").slice(0, 120),
        reaction: String(req.body?.reaction ?? "like").slice(0, 40),
      }));
      const event = await storage.incrementEventLike(id);
      broadcast('events', { type: 'event_liked', eventId: id, likeCount: event.likeCount });
      res.json(await toPublicEvent(event));
    } catch (error) {
      console.error('Event like error:', error);
      res.status(400).json({ message: 'Failed to like event', error: getErrorMessage(error) });
    }
  });

  app.get('/api/events/:id/comments', async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });
      const requester = getOptionalAuthenticatedUser(req);
      const comments = await storage.getEventComments(id, isAdmin(requester));
      res.json(comments);
    } catch (error) {
      console.error('Event comments fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch comments' });
    }
  });

  app.post('/api/events/:id/comments', async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });
      const event = await storage.getEvent(id);
      if (!event || event.status !== "published" || event.allowComments === false) {
        return res.status(404).json({ message: 'Event discussion is not available' });
      }

      const user = getOptionalAuthenticatedUser(req);
      const payload = eventCommentRequestSchema.parse(req.body);
      const comment = await storage.createEventComment(insertEventCommentSchema.parse({
        eventId: id,
        userId: user?.id ?? null,
        parentId: payload.parentId ?? null,
        authorName: payload.authorName,
        authorEmail: user?.email ?? payload.authorEmail ?? null,
        content: payload.content,
        status: "approved",
      }));
      broadcast('events', { type: 'event_comment_created', eventId: id, comment });
      res.status(201).json(comment);
    } catch (error) {
      console.error('Event comment creation error:', error);
      res.status(400).json({ message: 'Failed to comment on event', error: getErrorMessage(error) });
    }
  });

  app.post('/api/events/:id/registrations', async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });
      const event = await storage.getEvent(id);
      if (!event || event.status !== "published") {
        return res.status(404).json({ message: 'Event not found' });
      }

      const now = Date.now();
      if (event.registrationDeadline && new Date(event.registrationDeadline).getTime() < now) {
        return res.status(400).json({ message: 'Registration is closed for this event' });
      }
      if (new Date(event.endAt).getTime() < now) {
        return res.status(400).json({ message: 'This event has already ended' });
      }

      const payload = eventRegistrationRequestSchema.parse(req.body);
      const existing = (await storage.getEventRegistrations(id)).find(
        (registration) => registration.email.toLowerCase() === payload.email,
      );
      if (existing) {
        return res.status(409).json({ message: 'This email is already registered for the event', registration: existing });
      }

      const publicEvent = await toPublicEvent(event);
      const isFull = publicEvent.remainingSeats !== null && publicEvent.remainingSeats <= 0;
      const status = isFull ? "waitlisted" : event.requiresApproval ? "pending" : "approved";
      const user = getOptionalAuthenticatedUser(req);
      const registration = await storage.createEventRegistration(insertEventRegistrationSchema.parse({
        eventId: id,
        userId: user?.id ?? null,
        fullName: payload.fullName,
        email: payload.email,
        phone: payload.phone ?? null,
        organization: payload.organization ?? null,
        ticketType: payload.ticketType ?? null,
        status,
        ticketCode: createTicketCode(id),
        attendanceStatus: "registered",
        answers: payload.answers ?? null,
        reminderOptIn: payload.reminderOptIn,
        source: payload.source ?? "public",
        qrPayload: {
          eventId: id,
          eventTitle: event.title,
          issuedAt: new Date().toISOString(),
        },
      }));

      await storage.logAnalytics({
        event: "event_registered",
        userId: user?.id ?? null,
        metadata: { type: "event", referenceId: id, status },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      broadcast('events', { type: 'event_registration_created', eventId: id, registration });
      const ticketUrl = `${env.PUBLIC_APP_URL || `${req.protocol}://${req.get("host")}`}/api/events/registrations/${registration.ticketCode}/ticket`;
      void sendEventRegistrationConfirmation({
        email: registration.email,
        name: registration.fullName,
        eventTitle: event.title,
        eventDate: new Date(event.startAt).toLocaleString(),
        ticketUrl,
        status: registration.status,
      });
      res.status(201).json({ registration, ticketUrl: `/api/events/registrations/${registration.ticketCode}/ticket` });
    } catch (error) {
      console.error('Event registration error:', error);
      res.status(400).json({ message: 'Failed to register for event', error: getErrorMessage(error) });
    }
  });

  app.post('/api/events', authenticateToken, requireEditor, async (req, res) => {
    try {
      const payload = eventPayloadSchema.parse(req.body);
      if (payload.endAt <= payload.startAt) {
        return res.status(400).json({ message: "Event end date must be after start date" });
      }

      const coverImage = ensureMediaReference(payload.coverImage, "events");
      const baseSlug = slugify(payload.slug || payload.title);
      const existing = await storage.getEventBySlug(baseSlug);
      const slug = existing ? `${baseSlug}-${randomBytes(2).toString("hex")}` : baseSlug;
      const eventData = insertEventSchema.parse({
        ...payload,
        slug,
        coverImage,
        tags: normalizeEventTags(payload.tags),
        createdBy: getAuthenticatedUser(req).id,
      });

      const event = await storage.createEvent(eventData);
      await emitAdminRealtimeEvent(req, {
        event: "event_created",
        channel: "events",
        entityType: "event",
        referenceId: event.id,
        payload: { event: await toAdminEvent(event) },
      });
      res.status(201).json(await toAdminEvent(event));
    } catch (error) {
      console.error('Event creation error:', error);
      res.status(400).json({ message: 'Failed to create event', error: getErrorMessage(error) });
    }
  });

  app.put('/api/events/:id', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });
      const payload = eventPayloadSchema.partial().parse(req.body);
      if (payload.startAt && payload.endAt && payload.endAt <= payload.startAt) {
        return res.status(400).json({ message: "Event end date must be after start date" });
      }

      const updatePayload: Record<string, unknown> = { ...payload };
      if (payload.slug) updatePayload.slug = slugify(payload.slug);
      if (payload.coverImage !== undefined) updatePayload.coverImage = ensureMediaReference(payload.coverImage, "events");
      if (payload.tags !== undefined) updatePayload.tags = normalizeEventTags(payload.tags);
      const updateData = insertEventSchema.partial().parse(updatePayload);
      const event = await storage.updateEvent(id, updateData);
      if (!event) return res.status(404).json({ message: 'Event not found' });
      await emitAdminRealtimeEvent(req, {
        event: "event_updated",
        channel: "events",
        entityType: "event",
        referenceId: event.id,
        payload: { event: await toAdminEvent(event) },
      });
      res.json(await toAdminEvent(event));
    } catch (error) {
      console.error('Event update error:', error);
      res.status(400).json({ message: 'Failed to update event', error: getErrorMessage(error) });
    }
  });

  app.delete('/api/events/:id', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });
      const success = await storage.deleteEvent(id);
      if (!success) return res.status(404).json({ message: 'Event not found' });
      await emitAdminRealtimeEvent(req, {
        event: "event_deleted",
        channel: "events",
        entityType: "event",
        referenceId: id,
        payload: { id: String(id) },
      });
      res.status(204).send();
    } catch (error) {
      console.error('Event deletion error:', error);
      res.status(500).json({ message: 'Failed to delete event' });
    }
  });

  // Referrals routes
  app.get('/api/referrals/me', authenticateToken, async (req, res) => {
    try {
      const protocol = req.get("x-forwarded-proto") || req.protocol || "http";
      const origin = env.PUBLIC_APP_URL || `${protocol}://${req.get("host")}`;
      const dashboard = await getReferralDashboard(getAuthenticatedUser(req).id, origin.replace(/\/$/, ""));
      res.json(dashboard);
    } catch (error) {
      console.error('Referral dashboard fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch referral dashboard' });
    }
  });

  app.get('/api/referrals', authenticateToken, async (req, res) => {
    try {
      const protocol = req.get("x-forwarded-proto") || req.protocol || "http";
      const origin = env.PUBLIC_APP_URL || `${protocol}://${req.get("host")}`;
      const dashboard = await getReferralDashboard(getAuthenticatedUser(req).id, origin.replace(/\/$/, ""));
      res.json(dashboard.referrals);
    } catch (error) {
      console.error('Referrals fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch referrals' });
    }
  });

  app.get('/api/referrals/ledger', authenticateToken, async (req, res) => {
    try {
      const protocol = req.get("x-forwarded-proto") || req.protocol || "http";
      const origin = env.PUBLIC_APP_URL || `${protocol}://${req.get("host")}`;
      const dashboard = await getReferralDashboard(getAuthenticatedUser(req).id, origin.replace(/\/$/, ""));
      res.json(dashboard.ledger);
    } catch (error) {
      console.error('Referral ledger fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch referral ledger' });
    }
  });

  app.post('/api/referrals/invites', authenticateToken, async (req, res) => {
    try {
      const referralData = insertReferralSchema.parse({
        referrerId: getAuthenticatedUser(req).id,
        referredEmail: req.body.referredEmail,
        status: "pending",
        rewardAmount: 0,
      });

      const referral = await storage.createReferral(referralData);
      broadcast('referrals', { type: 'referral_created', referral });

      res.status(201).json(referral);
    } catch (error) {
      console.error('Referral invite creation error:', error);
      res.status(400).json({
        message: 'Failed to create referral invite',
        error: getErrorMessage(error),
      });
    }
  });

  app.post('/api/referrals', authenticateToken, async (req, res) => {
    try {
      const referralData = insertReferralSchema.parse({
        ...req.body,
        referrerId: getAuthenticatedUser(req).id,
        rewardAmount: 0,
      });
      
      const referral = await storage.createReferral(referralData);
      broadcast('referrals', { type: 'referral_created', referral });
      
      res.status(201).json(referral);
    } catch (error) {
      console.error('Referral creation error:', error);
      res.status(400).json({ 
        message: 'Failed to create referral', 
        error: getErrorMessage(error),
      });
    }
  });

  // Payments, Stripe webhooks, commissions, and payouts
  app.post('/api/payments/checkout', authenticateToken, async (req, res) => {
    try {
      const payload = checkoutRequestSchema.parse(req.body);
      const session = await createCheckoutSession(getAuthenticatedUser(req).id, payload, req);
      res.status(201).json(session);
    } catch (error) {
      console.error('Checkout session error:', error);
      const status = typeof error === "object" && error !== null && "status" in error
        ? Number((error as { status?: number }).status) || 500
        : 500;
      res.status(status).json({ message: 'Failed to create checkout session', error: getErrorMessage(error) });
    }
  });

  app.post('/api/stripe/webhook', async (req, res) => {
    let event;
    try {
      event = verifyStripeWebhookEvent(req);
    } catch (error) {
      console.error('Stripe webhook verification error:', error);
      return res.status(400).json({ message: 'Invalid Stripe webhook signature' });
    }

    try {
      const saved = await persistStripeEvent(event);
      res.json({ received: true, duplicate: !saved });

      if (saved) {
        setImmediate(() => {
          processStripeEvent(event).catch((error) => {
            console.error('Stripe event processing error:', error);
          });
        });
      }
    } catch (error) {
      console.error('Stripe webhook persistence error:', error);
      res.status(500).json({ message: 'Failed to persist Stripe event' });
    }
  });

  app.get('/api/payouts', authenticateToken, async (req, res) => {
    try {
      const payouts = await getUserPayouts(getAuthenticatedUser(req).id);
      res.json(payouts);
    } catch (error) {
      console.error('Payout fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch payouts' });
    }
  });

  app.post('/api/payouts', authenticateToken, async (req, res) => {
    try {
      const payload = payoutRequestSchema.parse(req.body);
      const payout = await requestPayout(
        getAuthenticatedUser(req).id,
        payload.amount,
        payload.method,
        payload.destination,
      );
      res.status(201).json(payout);
    } catch (error) {
      console.error('Payout request error:', error);
      const status = typeof error === "object" && error !== null && "status" in error
        ? Number((error as { status?: number }).status) || 500
        : 400;
      res.status(status).json({ message: 'Failed to request payout', error: getErrorMessage(error) });
    }
  });

  app.post('/api/admin/commissions/release', authenticateToken, requireAdmin, async (_req, res) => {
    try {
      const released = await releaseEligibleCommissions();
      res.json({ released });
    } catch (error) {
      console.error('Commission release error:', error);
      res.status(500).json({ message: 'Failed to release commissions', error: getErrorMessage(error) });
    }
  });

  app.get('/api/admin/revenue/referrals', authenticateToken, requireAdmin, async (_req, res) => {
    try {
      const analytics = await listAdminReferralAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error('Referral revenue analytics error:', error);
      res.status(500).json({ message: 'Failed to fetch referral revenue analytics' });
    }
  });

  app.get('/api/admin/referral-campaigns', authenticateToken, requireAdmin, async (_req, res) => {
    try {
      const campaigns = await listReferralCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error('Referral campaign fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch referral campaigns' });
    }
  });

  app.post('/api/admin/referral-campaigns', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const payload = referralCampaignRequestSchema.parse(req.body);
      const campaign = await createReferralCampaign({
        ...payload,
        createdBy: getAuthenticatedUser(req).id,
      });
      res.status(201).json(campaign);
    } catch (error) {
      console.error('Referral campaign creation error:', error);
      res.status(400).json({ message: 'Failed to create referral campaign', error: getErrorMessage(error) });
    }
  });

  app.put('/api/admin/referral-campaigns/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const payload = referralCampaignRequestSchema.partial().parse(req.body);
      const campaign = await updateReferralCampaign(Number(req.params.id), payload);
      res.json(campaign);
    } catch (error) {
      console.error('Referral campaign update error:', error);
      res.status(400).json({ message: 'Failed to update referral campaign', error: getErrorMessage(error) });
    }
  });

  app.get('/api/admin/commission-rules', authenticateToken, requireAdmin, async (_req, res) => {
    try {
      const rules = await listCommissionRules();
      res.json(rules);
    } catch (error) {
      console.error('Commission rule fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch commission rules' });
    }
  });

  app.post('/api/admin/commission-rules', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const payload = commissionRuleRequestSchema.parse(req.body);
      const rule = await createCommissionRule({
        ...payload,
        currency: payload.currency.toUpperCase(),
      });
      res.status(201).json(rule);
    } catch (error) {
      console.error('Commission rule creation error:', error);
      res.status(400).json({ message: 'Failed to create commission rule', error: getErrorMessage(error) });
    }
  });

  app.put('/api/admin/commission-rules/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const payload = commissionRuleRequestSchema.partial().parse(req.body);
      const rule = await updateCommissionRule(Number(req.params.id), {
        ...payload,
        currency: payload.currency?.toUpperCase(),
      });
      res.json(rule);
    } catch (error) {
      console.error('Commission rule update error:', error);
      res.status(400).json({ message: 'Failed to update commission rule', error: getErrorMessage(error) });
    }
  });

  app.get('/api/admin/payouts', authenticateToken, requireAdmin, async (_req, res) => {
    try {
      const payouts = await listPayoutRequests();
      res.json(payouts);
    } catch (error) {
      console.error('Admin payout fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch payouts' });
    }
  });

  app.post('/api/admin/payouts/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const payout = await approvePayoutRequest(Number(req.params.id), getAuthenticatedUser(req).id);
      res.json(payout);
    } catch (error) {
      console.error('Payout approval error:', error);
      res.status(400).json({ message: 'Failed to approve payout', error: getErrorMessage(error) });
    }
  });

  app.post('/api/admin/payouts/:id/reject', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const payout = await rejectPayoutRequest(Number(req.params.id), String(req.body.reason || "Rejected by admin"));
      res.json(payout);
    } catch (error) {
      console.error('Payout rejection error:', error);
      res.status(400).json({ message: 'Failed to reject payout', error: getErrorMessage(error) });
    }
  });

  const shouldRunReferralReleaseWorker =
    env.REFERRAL_RELEASE_WORKER_ENABLED ?? env.NODE_ENV === "production";

  if (shouldRunReferralReleaseWorker) {
    const releaseWorker = setInterval(() => {
      releaseEligibleCommissions().catch((error) => {
        if (isTransientDbConnectivityError(error)) {
          console.warn(
            `[referrals] Scheduled commission release skipped after a transient database connection issue: ${getErrorMessage(error)}`,
          );
          return;
        }

        console.error('Scheduled commission release error:', error);
      });
    }, env.REFERRAL_RELEASE_WORKER_MS);
    releaseWorker.unref?.();
  } else {
    console.info(
      `[referrals] Scheduled commission release worker disabled in ${env.NODE_ENV}. Set REFERRAL_RELEASE_WORKER_ENABLED=true to run it locally.`,
    );
  }

  // Admin routes (shared backend)
  const paginate = <T,>(items: T[], page: number, limit: number) => {
    const total = items.length;
    const start = (page - 1) * limit;
    return { items: items.slice(start, start + limit), total };
  };

  const compactText = (value: unknown, fallback = "") => {
    const text =
      typeof value === "string"
        ? value
        : value === null || value === undefined
          ? fallback
          : JSON.stringify(value);

    return text.replace(/\s+/g, " ").trim().slice(0, 180);
  };

  app.get('/api/admin/search', authenticateToken, requireAdminPortal, async (req, res) => {
    try {
      const query = normalizeSearchQuery(req.query.q ?? req.query.search);
      const requester = getAuthenticatedUser(req);
      const canSearchSensitive = isAdmin(requester);

      if (query.length < 2) {
        return res.json({ query, results: [], total: 0 });
      }

      const [
        scholarships,
        jobs,
        partners,
        blogPosts,
        teamMembers,
        events,
        users,
        applications,
        messages,
      ] = await Promise.all([
        storage.getAllScholarships(),
        storage.getAllJobs(),
        storage.getAllPartners(),
        storage.getAllBlogPosts(),
        storage.getAllTeamMembers(),
        storage.getAllEvents(),
        canSearchSensitive ? storage.getAllUsers() : Promise.resolve([]),
        canSearchSensitive ? storage.getAllApplications() : Promise.resolve([]),
        canSearchSensitive ? storage.getAllMessages() : Promise.resolve([]),
      ]);
      const usersById = new Map(users.map((user) => [user.id, user]));

      const results = [
        ...searchAndRank(scholarships.map(toAdminScholarship), query, (item) => [
          item.title,
          item.description,
          item.institution,
          item.region,
          item.category,
          item.status,
          item.requirements,
        ]).slice(0, 8).map((item) => ({
          id: item.id,
          type: "scholarship",
          title: item.title,
          description: `${item.institution || "Scholarship"} • ${item.region || "Global"} • ${item.status}`,
          href: `/admin/scholarships?search=${encodeURIComponent(item.title)}`,
          category: item.category,
          status: item.status,
        })),
        ...searchAndRank(jobs.map(toAdminJob), query, (item) => [
          item.title,
          item.description,
          item.company,
          item.location,
          item.region,
          item.jobType,
          item.status,
          item.requirements,
        ]).slice(0, 8).map((item) => ({
          id: item.id,
          type: "job",
          title: item.title,
          description: `${item.company || "Job"} • ${item.location || item.region || "Global"} • ${item.status}`,
          href: `/admin/jobs?search=${encodeURIComponent(item.title)}`,
          category: item.jobType,
          status: item.status,
        })),
        ...searchAndRank(partners.map(toAdminPartner), query, (item) => [
          item.name,
          item.description,
          item.website,
          item.region,
          item.partnershipType,
          item.videoTitle,
          item.videoDescription,
        ]).slice(0, 8).map((item) => ({
          id: item.id,
          type: "partner",
          title: item.name,
          description: `${item.partnershipType || "Partner"} • ${item.region || "Global"}`,
          href: `/admin/partners?search=${encodeURIComponent(item.name)}`,
          category: item.partnershipType,
          status: item.isActive ? "active" : "inactive",
        })),
        ...searchAndRank(blogPosts.map(toAdminBlogPost), query, (item) => [
          item.title,
          item.excerpt,
          item.content,
          item.category,
          item.tags,
          item.status,
        ]).slice(0, 8).map((item) => ({
          id: item.id,
          type: "blog",
          title: item.title,
          description: `${item.category || "Blog"} • ${item.status}`,
          href: `/admin/blog?search=${encodeURIComponent(item.title)}`,
          category: item.category,
          status: item.status,
        })),
        ...searchAndRank(teamMembers.map(toAdminTeamMember), query, (item) => [
          item.name,
          item.position,
          item.bio,
          item.email,
          item.department,
          item.linkedIn,
          item.twitter,
        ]).slice(0, 6).map((item) => ({
          id: item.id,
          type: "team",
          title: item.name,
          description: `${item.position || "Team member"}${item.department ? ` • ${item.department}` : ""}`,
          href: `/admin/team?search=${encodeURIComponent(item.name)}`,
          category: item.department || "Team",
          status: item.isActive ? "active" : "inactive",
        })),
        ...searchAndRank(await Promise.all(events.map(toAdminEvent)), query, (item) => [
          item.title,
          item.summary,
          item.description,
          item.location,
          item.category,
          item.status,
          item.tags,
        ]).slice(0, 6).map((item) => ({
          id: item.id,
          type: "event",
          title: item.title,
          description: `${item.category || "Event"} • ${item.location || "Location TBA"} • ${item.status}`,
          href: `/admin/activity?search=${encodeURIComponent(item.title)}`,
          category: item.category,
          status: item.status,
        })),
        ...searchAndRank(users.map(toAdminUser), query, (item) => [
          item.username,
          item.email,
          item.firstName,
          item.lastName,
          item.role,
          item.region,
        ]).slice(0, 6).map((item) => ({
          id: item.id,
          type: "user",
          title: `${item.firstName} ${item.lastName}`.trim() || item.username,
          description: `${item.email} • ${item.role}`,
          href: `/admin/users?search=${encodeURIComponent(item.email || item.username)}`,
          category: item.role,
          status: item.isActive ? "active" : "inactive",
        })),
        ...searchAndRank(applications, query, (item) => [
          item.id,
          item.type,
          item.status,
          usersById.get(item.userId)?.firstName,
          usersById.get(item.userId)?.lastName,
          usersById.get(item.userId)?.email,
          item.documents as any,
          item.referenceId,
        ]).slice(0, 6).map((item: any) => {
          const applicantName =
            compactText(`${usersById.get(item.userId)?.firstName ?? ""} ${usersById.get(item.userId)?.lastName ?? ""}`) ||
            compactText(usersById.get(item.userId)?.email) ||
            `Application ${item.id}`;
          return {
            id: String(item.id),
            type: "application",
            title: applicantName,
            description: `${item.type || "Application"} • ${item.status || "pending"}`,
            href: `/admin/applications?search=${encodeURIComponent(applicantName)}`,
            category: item.type,
            status: item.status,
          };
        }),
        ...searchAndRank(messages, query, (item) => [
          item.name,
          item.email,
          item.phone,
          item.subject,
          item.message,
          item.isRead ? "read" : "unread",
        ]).slice(0, 6).map((item) => ({
          id: String(item.id),
          type: "message",
          title: item.subject || `Message from ${item.name}`,
          description: `${item.name} • ${item.email} • ${compactText(item.message)}`,
          href: `/admin/messages?search=${encodeURIComponent(item.email || item.name)}`,
          category: "Message",
          status: item.isRead ? "read" : "unread",
        })),
        ...searchAndRank(listAiChatConversations(), query, (item) => [
          item.id,
          item.userEmail,
          item.channel,
          item.summary,
          item.moderationFlags,
          item.messages.map((message) => message.content),
        ]).slice(0, 6).map((item) => ({
          id: item.id,
          type: "ai",
          title: item.summary || "AI conversation",
          description: `${item.channel} chat • ${item.messages.length} messages`,
          href: `/admin/ai-chat?search=${encodeURIComponent(item.summary || item.id)}`,
          category: item.channel,
          status: item.isActive ? "active" : "closed",
        })),
      ].slice(0, 40);

      await storage.logAnalytics({
        event: "admin_global_search",
        userId: requester.id,
        metadata: { query, total: results.length },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json({ query, results, total: results.length });
    } catch (error) {
      console.error("Admin global search error:", error);
      res.status(500).json({ message: "Failed to search admin content" });
    }
  });

  app.get('/api/admin/dashboard/stats', authenticateToken, requireAdminPortal, async (_req, res) => {
    try {
      const [
        users,
        scholarships,
        jobs,
        partners,
        blogPosts,
        events,
        eventRegistrations,
        applications,
        publishedBlogPosts,
        activeScholarships,
        activeJobs,
      ] = await Promise.all([
        storage.getAllUsers(),
        storage.getAllScholarships(),
        storage.getAllJobs(),
        storage.getAllPartners(),
        storage.getAllBlogPosts(),
        storage.getAllEvents(),
        storage.getAllEventRegistrations(),
        storage.getAllApplications(),
        storage.getPublishedBlogPosts(),
        storage.getActiveScholarships(),
        storage.getActiveJobs(),
      ]);

      const pendingApplications = applications.filter((app) => app.status === "pending").length;
      const applicationStats = applications.reduce<Record<string, number>>((acc, app) => {
        acc[app.status] = (acc[app.status] ?? 0) + 1;
        return acc;
      }, {});

      const recentActivity = (await storage.getAnalytics())
        .slice(0, 10)
        .map((item) => {
          const meta = parseAnalyticsMeta(item.metadata);
          return {
            id: String(item.id),
            action: item.event,
            entityType: meta.type ?? "activity",
            details:
              meta.referenceId !== undefined && meta.referenceId !== null
                ? String(meta.referenceId)
                : "",
            createdAt: item.timestamp,
          };
        });

      res.json({
        totalUsers: users.length,
        totalScholarships: scholarships.length,
        totalJobs: jobs.length,
        totalPartners: partners.length,
        totalBlogPosts: blogPosts.length,
        totalEvents: events.length,
        publishedEvents: events.filter((event) => event.status === "published").length,
        upcomingEvents: events.filter((event) => deriveEventRuntimeStatus(event) === "upcoming").length,
        eventRegistrations: eventRegistrations.length,
        checkedInEventRegistrations: eventRegistrations.filter((registration) =>
          ["checked_in", "checked_out", "attended"].includes(registration.attendanceStatus),
        ).length,
        totalApplications: applications.length,
        totalActiveChats: listAiChatConversations().filter((conversation) => conversation.isActive).length,
        activeScholarships: activeScholarships.length,
        activeJobs: activeJobs.length,
        pendingApplications,
        publishedPosts: publishedBlogPosts.length,
        applicationStats,
        applicationStatusStats: applicationStats,
        contentModerationStats: { flaggedCount: 0, approvedCount: scholarships.length + jobs.length },
        userGrowth: [],
        regionalStats: [],
        recentActivity,
      });
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  app.get('/api/admin/dashboard/recent-activity', authenticateToken, requireAdminPortal, async (_req, res) => {
    try {
      const recentActivity = (await storage.getAnalytics())
        .slice(0, 20)
        .map((item) => {
          const meta = parseAnalyticsMeta(item.metadata);
          return {
            id: String(item.id),
            action: item.event,
            entityType: meta.type ?? "activity",
            details:
              meta.referenceId !== undefined && meta.referenceId !== null
                ? String(meta.referenceId)
                : "",
            createdAt: item.timestamp,
          };
        });
      res.json({ activity: recentActivity, total: recentActivity.length });
    } catch (error) {
      console.error("Admin activity error:", error);
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });

  app.get('/api/admin/ecosystem/overview', authenticateToken, requireAdmin, async (_req, res) => {
    try {
      const sourceErrors: string[] = [];
      const safeList = async <T>(label: string, loader: () => Promise<T[]>): Promise<T[]> => {
        try {
          return await loader();
        } catch (error) {
          sourceErrors.push(label);
          console.warn(`Admin ecosystem overview degraded for ${label}:`, getErrorMessage(error));
          return [];
        }
      };

      const [
        users,
        scholarships,
        jobs,
        partners,
        blogPosts,
        teamMembers,
        events,
        eventRegistrations,
        applications,
        analytics,
      ] = await Promise.all([
        safeList("users", () => storage.getAllUsers()),
        safeList("scholarships", () => storage.getAllScholarships()),
        safeList("jobs", () => storage.getAllJobs()),
        safeList("partners", () => storage.getAllPartners()),
        safeList("blog", () => storage.getAllBlogPosts()),
        safeList("team", () => storage.getAllTeamMembers()),
        safeList("events", () => storage.getAllEvents()),
        safeList("eventRegistrations", () => storage.getAllEventRegistrations()),
        safeList("applications", () => storage.getAllApplications()),
        safeList("analytics", () => storage.getAnalytics()),
      ]);

      const modules = [
        {
          id: "scholarships",
          name: "Scholarships",
          total: scholarships.length,
          active: scholarships.filter((item) => item.isActive).length,
          workflowItems: applications.filter((app) => app.type === "scholarship").length,
          risk: scholarships.filter((item) => item.isActive && new Date(item.deadline).getTime() < Date.now()).length,
        },
        {
          id: "jobs",
          name: "Jobs",
          total: jobs.length,
          active: jobs.filter((item) => item.isActive).length,
          workflowItems: applications.filter((app) => app.type === "job").length,
          risk: jobs.filter((item) => item.isActive && item.deadline && new Date(item.deadline).getTime() < Date.now()).length,
        },
        {
          id: "partners",
          name: "Partners",
          total: partners.length,
          active: partners.filter((item) => item.isActive).length,
          workflowItems: partners.reduce((sum, item) => sum + ((getPartnerMeta(item.id).activities ?? []).length), 0),
          risk: partners.filter((item) => (getPartnerMeta(item.id).reminders ?? []).some((reminder) => !reminder.completedAt)).length,
        },
        {
          id: "blog",
          name: "Blog/CMS",
          total: blogPosts.length,
          active: blogPosts.filter((item) => item.isPublished).length,
          workflowItems: blogPosts.reduce((sum, item) => sum + ((getBlogMeta(item.id).revisionHistory ?? []).length), 0),
          risk: blogPosts.filter((item) => getBlogMeta(item.id).status === "draft").length,
        },
        {
          id: "team",
          name: "Team",
          total: teamMembers.length,
          active: teamMembers.filter((item) => item.isActive).length,
          workflowItems: teamMembers.reduce((sum, item) => sum + ((getTeamMeta(item.id).skills ?? []).length), 0),
          risk: teamMembers.filter((item) => !getTeamMeta(item.id).profileImage && !item.imageUrl).length,
        },
        {
          id: "users",
          name: "Users",
          total: users.length,
          active: users.filter((item) => item.isActive).length,
          workflowItems: users.reduce((sum, item) => sum + ((getUserMeta(item.id).activityLogs ?? []).length), 0),
          risk: users.filter((item) => !item.isActive).length,
        },
        {
          id: "applications",
          name: "Applications",
          total: applications.length,
          active: applications.filter((item) => ["pending", "under_review"].includes(item.status)).length,
          workflowItems: applications.reduce((sum, item) => sum + ((getApplicationMeta(item.id).reviewHistory ?? []).length), 0),
          risk: applications.filter((item) => item.status === "pending").length,
        },
        {
          id: "events",
          name: "Events",
          total: events.length,
          active: events.filter((item) => item.status === "published").length,
          workflowItems: eventRegistrations.length,
          risk: events.filter((item) => item.status === "published" && item.endAt && new Date(item.endAt).getTime() < Date.now()).length,
        },
      ];

      const totals = modules.reduce(
        (acc, module) => ({
          totalRecords: acc.totalRecords + module.total,
          activeRecords: acc.activeRecords + module.active,
          workflowItems: acc.workflowItems + module.workflowItems,
          riskItems: acc.riskItems + module.risk,
        }),
        { totalRecords: 0, activeRecords: 0, workflowItems: 0, riskItems: 0 },
      );

      res.json({
        generatedAt: new Date().toISOString(),
        totals,
        modules,
        analyticsEvents: analytics.length,
        security: {
          rbacRoles: getAdminRoles().length,
          permissions: adminPermissionIds.size,
          auditEvents: analytics.filter((item) => item.event.startsWith("admin_")).length,
        },
        automationReadiness: {
          notifications: true,
          webhooks: true,
          scheduledReports: true,
          queueReady: true,
          aiReady: true,
        },
        sourceHealth: {
          degraded: sourceErrors.length > 0,
          unavailable: sourceErrors,
        },
      });
    } catch (error) {
      console.error("Admin ecosystem overview error:", error);
      res.status(500).json({ message: "Failed to fetch ecosystem overview" });
    }
  });

  app.get('/api/admin/users', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 50);
      const search = normalizeSearchQuery(req.query.search);

      const allUsers = await storage.getAllUsers();
      const filtered = searchAndRank(allUsers, search, (user) => [
        user.username,
        user.email,
        user.firstName,
        user.lastName,
        user.role,
        getUserMeta(user.id).region,
      ]);

      const { items, total } = paginate(filtered, page, limit);
      res.json({ users: items.map(toAdminUser), total });
    } catch (error) {
      console.error("Admin users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/users/:id(\\d+)', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const user = await storage.getUser(id);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(toAdminUser(user));
    } catch (error) {
      console.error("Admin user error:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/admin/users', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      userData.email = userData.email.trim().toLowerCase();
      userData.username = userData.username.trim();
      const requestedRole = normalizeAssignableAdminRole(userData.role);
      if (!requestedRole) {
        return res.status(403).json({
          message: "Only viewer and writer accounts can be created from admin management. Super admin is provisioned outside the portal.",
        });
      }
      validateStrongPassword(userData.password);
      userData.role = requestedRole;

      const existing =
        (await storage.getUserByEmail(userData.email)) ||
        (await storage.getUserByUsername(userData.username));
      if (existing) {
        return res.status(400).json({ message: "User already exists" });
      }

      const user = await storage.createUser({
        ...userData,
        password: await bcrypt.hash(userData.password, PASSWORD_HASH_ROUNDS),
      });
      if (req.body.region) {
        setUserMeta(user.id, { region: String(req.body.region) });
      }
      await emitAdminRealtimeEvent(req, {
        event: "user_created",
        channel: "user_activity",
        entityType: "user",
        referenceId: user.id,
        payload: { user: toAdminUser(user) },
      });
      res.status(201).json(toAdminUser(user));
    } catch (error) {
      console.error("Admin user create error:", getErrorLogMessage(error));
      res.status(400).json({ message: "Failed to create user", error: getErrorMessage(error) });
    }
  });

  app.put('/api/admin/users/:id(\\d+)', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const requester = getAuthenticatedUser(req);
      const existingUser = await storage.getUser(id);
      if (!existingUser) return res.status(404).json({ message: "User not found" });

      const updateData = insertUserSchema.partial().parse(req.body);
      if (updateData.email) updateData.email = updateData.email.trim().toLowerCase();
      if (updateData.username) updateData.username = updateData.username.trim();
      if (id === requester.id && updateData.isActive === false) {
        return res.status(400).json({ message: "You cannot deactivate your own account" });
      }
      if (id === requester.id && updateData.role && updateData.role !== requester.role) {
        return res.status(400).json({ message: "You cannot change your own role" });
      }
      if (isProtectedAdminRole(existingUser.role) && updateData.role && updateData.role !== existingUser.role) {
        return res.status(403).json({ message: "Super administrator role cannot be changed from admin management" });
      }
      if (isProtectedAdminRole(existingUser.role) && updateData.isActive === false) {
        return res.status(403).json({ message: "Super administrator accounts cannot be suspended from admin management" });
      }
      if (updateData.role && !isProtectedAdminRole(existingUser.role)) {
        const requestedRole = normalizeAssignableAdminRole(updateData.role);
        if (!requestedRole) {
          return res.status(403).json({ message: "Only viewer and writer roles can be assigned" });
        }
        updateData.role = requestedRole;
      }
      if (updateData.password) validateStrongPassword(updateData.password);

      const nextUser = updateData.password
        ? { ...updateData, password: await bcrypt.hash(updateData.password, PASSWORD_HASH_ROUNDS) }
        : updateData;

      const user = await storage.updateUser(id, nextUser);
      if (req.body.region !== undefined) {
        setUserMeta(id, { region: String(req.body.region) });
      }
      await emitAdminRealtimeEvent(req, {
        event: "user_updated",
        channel: "user_activity",
        entityType: "user",
        referenceId: id,
        payload: { user: toAdminUser(user) },
      });
      res.json(toAdminUser(user));
    } catch (error) {
      console.error("Admin user update error:", getErrorLogMessage(error));
      res.status(400).json({ message: "Failed to update user", error: getErrorMessage(error) });
    }
  });

  app.delete('/api/admin/users/:id(\\d+)', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const requester = getAuthenticatedUser(req);
      if (id === requester.id) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }

      const targetUser = await storage.getUser(id);
      if (!targetUser) return res.status(404).json({ message: "User not found" });
      if (isProtectedAdminRole(targetUser.role)) {
        return res.status(403).json({ message: "Super administrator accounts cannot be deleted from admin management" });
      }

      const success = await storage.deleteUser(id);
      deleteUserMeta(id);
      if (!success) return res.status(404).json({ message: "User not found" });
      await emitAdminRealtimeEvent(req, {
        event: "user_deleted",
        channel: "user_activity",
        entityType: "user",
        referenceId: id,
        payload: { id: String(id) },
      });
      res.status(204).send();
    } catch (error) {
      console.error("Admin user delete error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.patch('/api/admin/users/:id(\\d+)/status', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const requester = getAuthenticatedUser(req);
      if (id === requester.id && req.body.isActive === false) {
        return res.status(400).json({ message: "You cannot suspend your own account" });
      }
      const target = await storage.getUser(id);
      if (!target) return res.status(404).json({ message: "User not found" });
      if (isProtectedAdminRole(target.role)) {
        return res.status(403).json({ message: "Super administrator accounts cannot be suspended from admin management" });
      }
      const isActive = req.body.isActive !== false;
      const user = await storage.updateUser(id, { isActive });
      setUserMeta(id, {
        suspendedAt: isActive ? null : new Date().toISOString(),
        suspensionReason: isActive ? null : String(req.body.reason ?? "Administrative suspension"),
      });
      await emitAdminRealtimeEvent(req, {
        event: isActive ? "user_activated" : "user_suspended",
        channel: "user_activity",
        entityType: "user",
        referenceId: id,
        payload: { user: toAdminUser(user) },
      });
      res.json(toAdminUser(user));
    } catch (error) {
      console.error("Admin user status error:", error);
      res.status(400).json({ message: "Failed to update user status", error: getErrorMessage(error) });
    }
  });

  app.get('/api/admin/users/analytics', authenticateToken, requireSuperAdmin, async (_req, res) => {
    try {
      const users = (await storage.getAllUsers()).map(toAdminUser);
      const byRole = users.reduce<Record<string, number>>((acc, user) => {
        acc[user.role] = (acc[user.role] ?? 0) + 1;
        return acc;
      }, {});
      const byRegion = users.reduce<Record<string, number>>((acc, user) => {
        const region = user.region || "Global";
        acc[region] = (acc[region] ?? 0) + 1;
        return acc;
      }, {});
      res.json({
        totalUsers: users.length,
        activeUsers: users.filter((user) => user.isActive).length,
        suspendedUsers: users.filter((user) => !user.isActive).length,
        verifiedUsers: users.filter((user) => Boolean(user.verification?.verifiedAt)).length,
        adminUsers: users.filter((user) => ADMIN_PORTAL_ROLES.has(user.role)).length,
        byRole,
        byRegion,
      });
    } catch (error) {
      console.error("Admin user analytics error:", error);
      res.status(500).json({ message: "Failed to fetch user analytics" });
    }
  });

  app.get('/api/admin/users/export', authenticateToken, requireSuperAdmin, async (_req, res) => {
    try {
      const users = (await storage.getAllUsers()).map(toAdminUser);
      const headers = ["ID", "Username", "Email", "Name", "Role", "Region", "Active", "Suspended At"];
      const rows = users.map((user) => [
        user.id,
        user.username,
        user.email,
        `${user.firstName} ${user.lastName}`.trim(),
        user.role,
        user.region,
        user.isActive,
        user.suspendedAt,
      ]);
      const csv = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="mtendere-users-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Admin user export error:", error);
      res.status(500).json({ message: "Failed to export users" });
    }
  });

  app.get('/api/admin/scholarships', authenticateToken, requireEditor, async (req, res) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 50);
      const search = normalizeSearchQuery(req.query.search);
      const statusFilter = String(req.query.status ?? "").toLowerCase();

      const allScholarships = await storage.getAllScholarships();
      const mapped = allScholarships.map(toAdminScholarship);
      const filtered = searchAndRank(mapped, search, (item) => [
        item.title,
        item.description,
        item.institution,
        item.category,
        item.region,
        item.requirements,
        item.eligibility,
      ]).filter((item) => {
        const matchesStatus = !statusFilter || item.status === statusFilter;
        return matchesStatus;
      });

      const { items, total } = paginate(filtered, page, limit);
      res.json({ data: items, total });
    } catch (error) {
      console.error("Admin scholarships error:", error);
      res.status(500).json({ message: "Failed to fetch scholarships" });
    }
  });

  app.post('/api/admin/scholarships', authenticateToken, requireEditor, async (req, res) => {
    try {
      const createdBy = getAuthenticatedUser(req).id;
      const amount = parseNumber(req.body.amount);
      const deadline = req.body.deadline ? new Date(req.body.deadline) : new Date();
      const featuredImage = ensureMediaReference(req.body.featuredImage, "scholarships");
      const scholarshipData = insertScholarshipSchema.parse({
        title: req.body.title ?? "",
        description: req.body.description ?? "",
        institution: req.body.institution ?? "",
        country: req.body.region ?? "Global",
        amount,
        currency: req.body.currency ?? "USD",
        deadline,
        requirements: req.body.requirements ?? null,
        category: req.body.category ?? "General",
        imageUrl: featuredImage,
        isActive: req.body.status === "published",
        createdBy,
      });

      const scholarship = await storage.createScholarship(scholarshipData);
      setScholarshipMeta(
        scholarship.id,
        buildScholarshipMetaFromBody(
          {
            ...req.body,
            status: normalizeAdminStatus(req.body.status, scholarship.isActive),
            isPremium: Boolean(req.body.isPremium),
            paymentStatus: req.body.paymentStatus ?? "unpaid",
            region: req.body.region ?? "Global",
          },
          featuredImage,
        ),
      );

      await emitAdminRealtimeEvent(req, {
        event: "scholarship_created",
        channel: "scholarships",
        entityType: "scholarship",
        referenceId: scholarship.id,
        payload: { scholarship: toAdminScholarship(scholarship) },
      });

      res.status(201).json(toAdminScholarship(scholarship));
    } catch (error) {
      console.error("Admin scholarship create error:", error);
      res.status(400).json({ message: "Failed to create scholarship", error: getErrorMessage(error) });
    }
  });

  app.put('/api/admin/scholarships/:id', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const payload: Record<string, unknown> = {};
      if (req.body.title !== undefined) payload.title = req.body.title;
      if (req.body.description !== undefined) payload.description = req.body.description;
      if (req.body.institution !== undefined) payload.institution = req.body.institution;
      if (req.body.region !== undefined) payload.country = req.body.region;
      if (req.body.amount !== undefined) payload.amount = parseNumber(req.body.amount);
      if (req.body.currency !== undefined) payload.currency = req.body.currency;
      if (req.body.deadline !== undefined) payload.deadline = new Date(req.body.deadline);
      if (req.body.requirements !== undefined) payload.requirements = req.body.requirements;
      if (req.body.category !== undefined) payload.category = req.body.category;
      const featuredImage =
        req.body.featuredImage !== undefined ? ensureMediaReference(req.body.featuredImage, "scholarships") : undefined;
      if (featuredImage !== undefined) payload.imageUrl = featuredImage;
      if (req.body.status !== undefined) payload.isActive = req.body.status === "published";

      const updateData = insertScholarshipSchema.partial().parse(payload);
      const scholarship = await storage.updateScholarship(id, updateData);
      if (!scholarship) return res.status(404).json({ message: "Scholarship not found" });

      setScholarshipMeta(id, buildScholarshipMetaFromBody(req.body, featuredImage));

      await emitAdminRealtimeEvent(req, {
        event: "scholarship_updated",
        channel: "scholarships",
        entityType: "scholarship",
        referenceId: scholarship.id,
        payload: { scholarship: toAdminScholarship(scholarship) },
      });

      res.json(toAdminScholarship(scholarship));
    } catch (error) {
      console.error("Admin scholarship update error:", error);
      res.status(400).json({ message: "Failed to update scholarship", error: getErrorMessage(error) });
    }
  });

  app.delete('/api/admin/scholarships/:id', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const success = await storage.deleteScholarship(id);
      deleteScholarshipMeta(id);
      if (!success) return res.status(404).json({ message: "Scholarship not found" });
      await emitAdminRealtimeEvent(req, {
        event: "scholarship_deleted",
        channel: "scholarships",
        entityType: "scholarship",
        referenceId: id,
        payload: { id: String(id) },
      });
      res.status(204).send();
    } catch (error) {
      console.error("Admin scholarship delete error:", error);
      res.status(500).json({ message: "Failed to delete scholarship" });
    }
  });

  app.post('/api/admin/scholarships/:id/duplicate', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const source = await storage.getScholarship(id);
      if (!source) return res.status(404).json({ message: "Scholarship not found" });

      const copy = await storage.createScholarship({
        title: `${source.title} Copy`,
        description: source.description,
        institution: source.institution,
        country: source.country,
        amount: source.amount,
        currency: source.currency,
        deadline: source.deadline,
        requirements: source.requirements as any,
        category: source.category,
        imageUrl: source.imageUrl,
        isActive: false,
        createdBy: getAuthenticatedUser(req).id,
      });
      setScholarshipMeta(copy.id, {
        ...getScholarshipMeta(id),
        slug: `${getScholarshipMeta(id).slug ?? slugify(source.title)}-copy-${copy.id}`,
        status: "draft",
      });
      await emitAdminRealtimeEvent(req, {
        event: "scholarship_duplicated",
        channel: "scholarships",
        entityType: "scholarship",
        referenceId: copy.id,
        payload: { sourceId: id, scholarship: toAdminScholarship(copy) },
      });
      res.status(201).json(toAdminScholarship(copy));
    } catch (error) {
      console.error("Admin scholarship duplicate error:", error);
      res.status(400).json({ message: "Failed to duplicate scholarship", error: getErrorMessage(error) });
    }
  });

  app.patch('/api/admin/scholarships/:id/status', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const status = normalizeAdminStatus(String(req.body.status ?? ""));
      const scholarship = await storage.updateScholarship(id, { isActive: status === "published" });
      if (!scholarship) return res.status(404).json({ message: "Scholarship not found" });
      setScholarshipMeta(id, { status });
      await emitAdminRealtimeEvent(req, {
        event: "scholarship_status_updated",
        channel: "scholarships",
        entityType: "scholarship",
        referenceId: id,
        payload: { status },
      });
      res.json(toAdminScholarship(scholarship));
    } catch (error) {
      console.error("Admin scholarship status error:", error);
      res.status(400).json({ message: "Failed to update scholarship status", error: getErrorMessage(error) });
    }
  });

  app.get('/api/admin/scholarships/analytics', authenticateToken, requireEditor, async (_req, res) => {
    try {
      const [scholarships, applications] = await Promise.all([
        storage.getAllScholarships(),
        storage.getAllApplications(),
      ]);
      const mapped = scholarships.map(toAdminScholarship);
      const scholarshipApps = applications.filter((app) => app.type === "scholarship");
      const statusCounts = mapped.reduce<Record<string, number>>((acc, item) => {
        acc[item.status] = (acc[item.status] ?? 0) + 1;
        return acc;
      }, {});
      const applicationStatusCounts = scholarshipApps.reduce<Record<string, number>>((acc, app) => {
        acc[app.status] = (acc[app.status] ?? 0) + 1;
        return acc;
      }, {});
      const byCategory = mapped.reduce<Record<string, number>>((acc, item) => {
        acc[item.category] = (acc[item.category] ?? 0) + 1;
        return acc;
      }, {});
      res.json({
        totalScholarships: mapped.length,
        publishedScholarships: mapped.filter((item) => item.status === "published").length,
        featuredScholarships: mapped.filter((item) => item.isFeatured).length,
        expiringSoon: mapped.filter((item) => {
          const diff = new Date(item.deadline).getTime() - Date.now();
          return diff > 0 && diff <= 30 * 24 * 60 * 60 * 1000;
        }).length,
        applications: scholarshipApps.length,
        approvals: scholarshipApps.filter((app) => app.status === "approved").length,
        conversionRate: mapped.length ? Math.round((scholarshipApps.length / mapped.length) * 100) : 0,
        statusCounts,
        applicationStatusCounts,
        byCategory,
        topScholarships: mapped
          .map((item) => ({
            id: item.id,
            title: item.title,
            applications: scholarshipApps.filter((app) => String(app.referenceId) === item.id).length,
            status: item.status,
          }))
          .sort((left, right) => right.applications - left.applications)
          .slice(0, 8),
      });
    } catch (error) {
      console.error("Admin scholarship analytics error:", error);
      res.status(500).json({ message: "Failed to fetch scholarship analytics" });
    }
  });

  app.get('/api/admin/scholarships/reports/summary', authenticateToken, requireEditor, async (_req, res) => {
    try {
      const [scholarships, applications] = await Promise.all([
        storage.getAllScholarships(),
        storage.getAllApplications(),
      ]);
      const mapped = scholarships.map(toAdminScholarship);
      const scholarshipApps = applications.filter((app) => app.type === "scholarship");
      res.json({
        generatedAt: new Date().toISOString(),
        module: "scholarships",
        executiveSummary: {
          total: mapped.length,
          published: mapped.filter((item) => item.status === "published").length,
          drafts: mapped.filter((item) => item.status === "draft").length,
          applications: scholarshipApps.length,
          pendingReview: scholarshipApps.filter((app) => app.status === "pending").length,
        },
        operationalRisks: mapped
          .filter((item) => item.status === "published" && new Date(item.deadline).getTime() < Date.now())
          .map((item) => ({ id: item.id, title: item.title, risk: "Published scholarship past deadline" })),
        automationReadiness: ["deadline reminders", "reviewer assignment", "status notifications", "PDF generation"],
      });
    } catch (error) {
      console.error("Admin scholarship report error:", error);
      res.status(500).json({ message: "Failed to build scholarship report" });
    }
  });

  app.get('/api/admin/scholarships/export', authenticateToken, requireEditor, async (_req, res) => {
    try {
      const mapped = (await storage.getAllScholarships()).map(toAdminScholarship);
      const headers = ["ID", "Title", "Category", "Institution", "Status", "Deadline", "Featured", "Region"];
      const rows = mapped.map((item) => [item.id, item.title, item.category, item.institution, item.status, item.deadline, item.isFeatured, item.region]);
      const csv = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="mtendere-scholarships-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Admin scholarship export error:", error);
      res.status(500).json({ message: "Failed to export scholarships" });
    }
  });

  app.get('/api/admin/jobs', authenticateToken, requireEditor, async (req, res) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 50);
      const search = normalizeSearchQuery(req.query.search);
      const statusFilter = String(req.query.status ?? "").toLowerCase();

      const allJobs = await storage.getAllJobs();
      const mapped = allJobs.map(toAdminJob);
      const filtered = searchAndRank(mapped, search, (item) => [
        item.title,
        item.description,
        item.category,
        item.company,
        item.companyProfile,
        item.department,
        item.location,
        item.workMode,
        item.region,
        item.jobType,
        item.employmentType,
        item.experienceLevel,
        item.requirements,
        item.requiredSkills,
        item.preferredSkills,
        item.responsibilities,
        item.benefits,
      ]).filter((item) => {
        const matchesStatus = !statusFilter || item.status === statusFilter;
        return matchesStatus;
      });

      const { items, total } = paginate(filtered, page, limit);
      res.json({ data: items, total });
    } catch (error) {
      console.error("Admin jobs error:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.post('/api/admin/jobs', authenticateToken, requireEditor, async (req, res) => {
    try {
      const createdBy = getAuthenticatedUser(req).id;
      const featuredImage = ensureMediaReference(req.body.featuredImage, "jobs");
      const jobData = insertJobSchema.parse({
        title: req.body.title ?? "",
        description: req.body.description ?? "",
        company: req.body.company ?? "",
        location: req.body.location ?? "",
        salary: parseNumber(req.body.salary ?? req.body.salaryMax ?? req.body.salaryMin),
        currency: req.body.currency ?? "USD",
        jobType: req.body.employmentType ?? req.body.jobType ?? "Full-Time",
        requirements: parseStringArray(req.body.requirements) ?? parseStringArray(req.body.requiredSkills) ?? null,
        benefits: parseStringArray(req.body.benefits) ?? null,
        isRemote: Boolean(req.body.isRemote) || String(req.body.workMode ?? "").toLowerCase() === "remote",
        deadline: req.body.deadline ? new Date(req.body.deadline) : null,
        imageUrl: featuredImage,
        isActive: req.body.status === "published",
        createdBy,
      });

      const job = await storage.createJob(jobData);
      setJobMeta(
        job.id,
        buildJobMetaFromBody(
          {
            ...req.body,
            status: normalizeAdminStatus(req.body.status, job.isActive),
            region: req.body.region ?? "Global",
            isPremium: Boolean(req.body.isPremium),
            price: req.body.price ?? "",
            paymentStatus: req.body.paymentStatus ?? "unpaid",
            employmentType: req.body.employmentType ?? req.body.jobType ?? "Full-Time",
            workMode: req.body.workMode ?? (req.body.isRemote ? "Remote" : "Onsite"),
          },
          featuredImage,
        ),
      );

      await emitAdminRealtimeEvent(req, {
        event: "job_created",
        channel: "jobs",
        entityType: "job",
        referenceId: job.id,
        payload: { job: toAdminJob(job) },
      });

      res.status(201).json(toAdminJob(job));
    } catch (error) {
      console.error("Admin job create error:", error);
      res.status(400).json({ message: "Failed to create job", error: getErrorMessage(error) });
    }
  });

  app.put('/api/admin/jobs/:id', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const payload: Record<string, unknown> = {};
      if (req.body.title !== undefined) payload.title = req.body.title;
      if (req.body.description !== undefined) payload.description = req.body.description;
      if (req.body.company !== undefined) payload.company = req.body.company;
      if (req.body.location !== undefined) payload.location = req.body.location;
      if (req.body.jobType !== undefined || req.body.employmentType !== undefined) payload.jobType = req.body.employmentType ?? req.body.jobType;
      if (req.body.salary !== undefined || req.body.salaryMin !== undefined || req.body.salaryMax !== undefined) {
        payload.salary = parseNumber(req.body.salary ?? req.body.salaryMax ?? req.body.salaryMin);
      }
      if (req.body.currency !== undefined) payload.currency = req.body.currency;
      if (req.body.requirements !== undefined || req.body.requiredSkills !== undefined) {
        payload.requirements = parseStringArray(req.body.requirements) ?? parseStringArray(req.body.requiredSkills) ?? null;
      }
      if (req.body.benefits !== undefined) payload.benefits = parseStringArray(req.body.benefits) ?? null;
      if (req.body.isRemote !== undefined || req.body.workMode !== undefined) {
        payload.isRemote = Boolean(req.body.isRemote) || String(req.body.workMode ?? "").toLowerCase() === "remote";
      }
      if (req.body.deadline !== undefined) payload.deadline = req.body.deadline ? new Date(req.body.deadline) : null;
      const featuredImage = req.body.featuredImage !== undefined ? ensureMediaReference(req.body.featuredImage, "jobs") : undefined;
      if (featuredImage !== undefined) payload.imageUrl = featuredImage;
      if (req.body.status !== undefined) payload.isActive = req.body.status === "published";

      const updateData = insertJobSchema.partial().parse(payload);
      const job = await storage.updateJob(id, updateData);
      if (!job) return res.status(404).json({ message: "Job not found" });

      setJobMeta(id, buildJobMetaFromBody(req.body, featuredImage));

      await emitAdminRealtimeEvent(req, {
        event: "job_updated",
        channel: "jobs",
        entityType: "job",
        referenceId: job.id,
        payload: { job: toAdminJob(job) },
      });

      res.json(toAdminJob(job));
    } catch (error) {
      console.error("Admin job update error:", error);
      res.status(400).json({ message: "Failed to update job", error: getErrorMessage(error) });
    }
  });

  app.delete('/api/admin/jobs/:id', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const success = await storage.deleteJob(id);
      deleteJobMeta(id);
      if (!success) return res.status(404).json({ message: "Job not found" });
      await emitAdminRealtimeEvent(req, {
        event: "job_deleted",
        channel: "jobs",
        entityType: "job",
        referenceId: id,
        payload: { id: String(id) },
      });
      res.status(204).send();
    } catch (error) {
      console.error("Admin job delete error:", error);
      res.status(500).json({ message: "Failed to delete job" });
    }
  });

  app.post('/api/admin/jobs/:id/duplicate', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const source = await storage.getJob(id);
      if (!source) return res.status(404).json({ message: "Job not found" });

      const copy = await storage.createJob({
        title: `${source.title} Copy`,
        description: source.description,
        company: source.company,
        location: source.location,
        salary: source.salary,
        currency: source.currency,
        jobType: source.jobType,
        requirements: source.requirements as any,
        benefits: source.benefits as any,
        isRemote: source.isRemote,
        deadline: source.deadline,
        isActive: false,
        createdBy: getAuthenticatedUser(req).id,
      });
      setJobMeta(copy.id, {
        ...getJobMeta(id),
        slug: `${getJobMeta(id).slug ?? slugify(source.title)}-copy-${copy.id}`,
        status: "draft",
      });
      await emitAdminRealtimeEvent(req, {
        event: "job_duplicated",
        channel: "jobs",
        entityType: "job",
        referenceId: copy.id,
        payload: { sourceId: id, job: toAdminJob(copy) },
      });
      res.status(201).json(toAdminJob(copy));
    } catch (error) {
      console.error("Admin job duplicate error:", error);
      res.status(400).json({ message: "Failed to duplicate job", error: getErrorMessage(error) });
    }
  });

  app.patch('/api/admin/jobs/:id/status', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const status = normalizeAdminStatus(String(req.body.status ?? ""));
      const job = await storage.updateJob(id, { isActive: status === "published" });
      if (!job) return res.status(404).json({ message: "Job not found" });
      setJobMeta(id, { status });
      await emitAdminRealtimeEvent(req, {
        event: "job_status_updated",
        channel: "jobs",
        entityType: "job",
        referenceId: id,
        payload: { status },
      });
      res.json(toAdminJob(job));
    } catch (error) {
      console.error("Admin job status error:", error);
      res.status(400).json({ message: "Failed to update job status", error: getErrorMessage(error) });
    }
  });

  app.get('/api/admin/jobs/analytics', authenticateToken, requireEditor, async (_req, res) => {
    try {
      const [jobs, applications] = await Promise.all([
        storage.getAllJobs(),
        storage.getAllApplications(),
      ]);
      const mapped = jobs.map(toAdminJob);
      const jobApps = applications.filter((app) => app.type === "job");
      const byType = mapped.reduce<Record<string, number>>((acc, item) => {
        acc[item.employmentType || item.jobType] = (acc[item.employmentType || item.jobType] ?? 0) + 1;
        return acc;
      }, {});
      const byStage = jobApps.reduce<Record<string, number>>((acc, app) => {
        const stage = getApplicationMeta(app.id).stage ?? app.status;
        acc[stage] = (acc[stage] ?? 0) + 1;
        return acc;
      }, {});
      const byLocation = mapped.reduce<Record<string, number>>((acc, item) => {
        acc[item.location || "Unspecified"] = (acc[item.location || "Unspecified"] ?? 0) + 1;
        return acc;
      }, {});
      const sourceTracking = jobApps.reduce<Record<string, number>>((acc, app) => {
        const source = getApplicationMeta(app.id).source ?? "public";
        acc[source] = (acc[source] ?? 0) + 1;
        return acc;
      }, {});
      const byCountry = jobApps.reduce<Record<string, number>>((acc, app) => {
        const country = String(getApplicationMeta(app.id).applicantSnapshot?.country ?? "Unspecified");
        acc[country] = (acc[country] ?? 0) + 1;
        return acc;
      }, {});
      res.json({
        totalJobs: mapped.length,
        publishedJobs: mapped.filter((item) => item.status === "published").length,
        featuredJobs: mapped.filter((item) => item.isFeatured).length,
        applications: jobApps.length,
        shortlisted: jobApps.filter((app) => getApplicationMeta(app.id).shortlist).length,
        interviews: jobApps.reduce((sum, app) => sum + (getApplicationMeta(app.id).interviewSchedule?.length ?? 0), 0),
        conversionRate: mapped.length ? Math.round((jobApps.length / mapped.length) * 100) : 0,
        byType,
        byStage,
        byLocation,
        byCountry,
        sourceTracking,
        topJobs: mapped
          .map((item) => ({
            id: item.id,
            title: item.title,
            company: item.company,
            applications: jobApps.filter((app) => String(app.referenceId) === item.id).length,
            status: item.status,
          }))
          .sort((left, right) => right.applications - left.applications)
          .slice(0, 8),
      });
    } catch (error) {
      console.error("Admin job analytics error:", error);
      res.status(500).json({ message: "Failed to fetch job analytics" });
    }
  });

  app.get('/api/admin/jobs/reports/summary', authenticateToken, requireEditor, async (_req, res) => {
    try {
      const [jobs, applications] = await Promise.all([
        storage.getAllJobs(),
        storage.getAllApplications(),
      ]);
      const mapped = jobs.map(toAdminJob);
      const jobApps = applications.filter((app) => app.type === "job");
      res.json({
        generatedAt: new Date().toISOString(),
        module: "jobs",
        executiveSummary: {
          total: mapped.length,
          published: mapped.filter((item) => item.status === "published").length,
          applications: jobApps.length,
          shortlisted: jobApps.filter((app) => getApplicationMeta(app.id).shortlist).length,
          interviews: jobApps.reduce((sum, app) => sum + (getApplicationMeta(app.id).interviewSchedule?.length ?? 0), 0),
        },
        operationalRisks: mapped
          .filter((item) => item.status === "published" && item.deadline && new Date(item.deadline).getTime() < Date.now())
          .map((item) => ({ id: item.id, title: item.title, risk: "Published job past application deadline" })),
        automationReadiness: ["candidate scoring", "interview scheduling", "recruiter templates", "job alerts"],
      });
    } catch (error) {
      console.error("Admin job report error:", error);
      res.status(500).json({ message: "Failed to build job report" });
    }
  });

  app.get('/api/admin/jobs/export', authenticateToken, requireEditor, async (_req, res) => {
    try {
      const mapped = (await storage.getAllJobs()).map(toAdminJob);
      const headers = ["ID", "Title", "Company", "Location", "Type", "Status", "Deadline", "Featured"];
      const rows = mapped.map((item) => [item.id, item.title, item.company, item.location, item.employmentType || item.jobType, item.status, item.deadline, item.isFeatured]);
      const csv = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="mtendere-jobs-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Admin job export error:", error);
      res.status(500).json({ message: "Failed to export jobs" });
    }
  });

  app.get('/api/admin/partners', authenticateToken, requireEditor, async (req, res) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 50);
      const search = normalizeSearchQuery(req.query.search);

      const allPartners = await storage.getAllPartners();
      const mapped = allPartners.map(toAdminPartner);
      const filtered = searchAndRank(mapped, search, (item) => [
        item.name,
        item.description,
        item.region,
        item.partnershipType,
        item.website,
        item.videoTitle,
        item.videoDescription,
        item.contactEmail,
      ]);

      const { items, total } = paginate(filtered, page, limit);
      res.json({ partners: items, total });
    } catch (error) {
      console.error("Admin partners error:", error);
      res.status(500).json({ message: "Failed to fetch partners" });
    }
  });

  app.post('/api/admin/partners', authenticateToken, requireEditor, async (req, res) => {
    try {
      const logo = ensureMediaReference(req.body.logo, "partners");
      const partnerData = insertPartnerSchema.parse({
        name: req.body.name ?? "",
        description: req.body.description ?? "",
        logoUrl: logo,
        coverImage: req.body.coverImage ?? null,
        website: req.body.website ?? null,
        contactName: req.body.contactName ?? null,
        contactEmail: req.body.contactEmail ?? null,
        contactPhone: req.body.contactPhone ?? null,
        socialLinks: req.body.socialLinks ?? null,
        industryCategory: req.body.industryCategory ?? req.body.partnershipType ?? null,
        partnershipLevel: req.body.partnershipLevel ?? null,
        sponsorshipTier: req.body.sponsorshipTier ?? null,
        status: req.body.status ?? (req.body.isActive === false ? "inactive" : "active"),
        country: req.body.country ?? req.body.region ?? "Global",
        region: req.body.region ?? req.body.country ?? "Global",
        address: req.body.address ?? null,
        documents: req.body.documents ?? null,
        agreements: req.body.agreements ?? null,
        notes: req.body.notes ?? null,
        internalComments: req.body.internalComments ?? null,
        linkedEvents: req.body.linkedEvents ?? null,
        linkedSponsorships: req.body.linkedSponsorships ?? null,
        linkedOpportunities: req.body.linkedOpportunities ?? null,
        partnershipHistory: req.body.partnershipHistory ?? null,
        studentCount: req.body.studentCount ?? null,
        ranking: req.body.ranking ?? null,
        programs: req.body.programs ?? null,
        isActive: req.body.isActive ?? true,
      });

      const partner = await storage.createPartner(partnerData);
      setPartnerMeta(partner.id, {
        partnershipType: req.body.partnershipType ?? "partner",
        logo,
        coverImage: req.body.coverImage ?? "",
        contactName: req.body.contactName ?? "",
        contactEmail: req.body.contactEmail ?? "",
        contactPhone: req.body.contactPhone ?? "",
        address: req.body.address ?? "",
        country: req.body.country ?? req.body.region ?? "Global",
        region: req.body.region ?? req.body.country ?? "Global",
        industryCategory: req.body.industryCategory ?? req.body.partnershipType ?? "",
        partnershipLevel: req.body.partnershipLevel ?? "",
        sponsorshipTier: req.body.sponsorshipTier ?? "",
        status: req.body.status ?? "active",
        socialLinks: req.body.socialLinks ?? {},
        documents: req.body.documents ?? [],
        agreements: req.body.agreements ?? [],
        notes: req.body.notes ?? "",
        internalComments: req.body.internalComments ?? "",
        linkedEvents: req.body.linkedEvents ?? [],
        linkedSponsorships: req.body.linkedSponsorships ?? [],
        linkedOpportunities: req.body.linkedOpportunities ?? [],
        partnershipHistory: req.body.partnershipHistory ?? [],
        activities: req.body.activities ?? [],
        meetings: req.body.meetings ?? [],
        reminders: req.body.reminders ?? [],
        financialRecords: req.body.financialRecords ?? [],
        performanceMetrics: req.body.performanceMetrics ?? {},
        videoUrl: parseOptionalUrl(req.body.videoUrl) ?? "",
        videoTitle: req.body.videoTitle ?? "",
        videoDescription: req.body.videoDescription ?? "",
        isFeatured: Boolean(req.body.isFeatured),
        isPremium: Boolean(req.body.isPremium),
        paymentStatus: req.body.paymentStatus ?? "unpaid",
      });

      if (req.body.contactEmail) {
        void sendPartnerOnboardingEmail({
          email: String(req.body.contactEmail),
          organizationName: partner.name,
          contactName: req.body.contactName ?? partner.name,
          adminUrl: `${env.ADMIN_APP_URL || env.PUBLIC_APP_URL || ""}/admin/partners?search=${encodeURIComponent(partner.name)}`,
        });
      }

      await emitAdminRealtimeEvent(req, {
        event: "partner_created",
        channel: "partners",
        entityType: "partner",
        referenceId: partner.id,
        payload: { partner: toAdminPartner(partner) },
      });

      res.status(201).json(toAdminPartner(partner));
    } catch (error) {
      console.error("Admin partner create error:", error);
      res.status(400).json({ message: "Failed to create partner", error: getErrorMessage(error) });
    }
  });

  app.put('/api/admin/partners/:id', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const payload: Record<string, unknown> = {};
      if (req.body.name !== undefined) payload.name = req.body.name;
      if (req.body.description !== undefined) payload.description = req.body.description;
      const logo = req.body.logo !== undefined ? ensureMediaReference(req.body.logo, "partners") : undefined;
      if (logo !== undefined) payload.logoUrl = logo;
      if (req.body.coverImage !== undefined) payload.coverImage = req.body.coverImage;
      if (req.body.website !== undefined) payload.website = req.body.website;
      if (req.body.contactName !== undefined) payload.contactName = req.body.contactName;
      if (req.body.contactEmail !== undefined) payload.contactEmail = req.body.contactEmail;
      if (req.body.contactPhone !== undefined) payload.contactPhone = req.body.contactPhone;
      if (req.body.socialLinks !== undefined) payload.socialLinks = req.body.socialLinks;
      if (req.body.industryCategory !== undefined) payload.industryCategory = req.body.industryCategory;
      if (req.body.partnershipLevel !== undefined) payload.partnershipLevel = req.body.partnershipLevel;
      if (req.body.sponsorshipTier !== undefined) payload.sponsorshipTier = req.body.sponsorshipTier;
      if (req.body.status !== undefined) payload.status = req.body.status;
      if (req.body.country !== undefined) payload.country = req.body.country;
      if (req.body.region !== undefined) {
        payload.region = req.body.region;
        payload.country = req.body.country ?? req.body.region;
      }
      if (req.body.address !== undefined) payload.address = req.body.address;
      if (req.body.documents !== undefined) payload.documents = req.body.documents;
      if (req.body.agreements !== undefined) payload.agreements = req.body.agreements;
      if (req.body.notes !== undefined) payload.notes = req.body.notes;
      if (req.body.internalComments !== undefined) payload.internalComments = req.body.internalComments;
      if (req.body.linkedEvents !== undefined) payload.linkedEvents = req.body.linkedEvents;
      if (req.body.linkedSponsorships !== undefined) payload.linkedSponsorships = req.body.linkedSponsorships;
      if (req.body.linkedOpportunities !== undefined) payload.linkedOpportunities = req.body.linkedOpportunities;
      if (req.body.partnershipHistory !== undefined) payload.partnershipHistory = req.body.partnershipHistory;
      if (req.body.studentCount !== undefined) payload.studentCount = req.body.studentCount;
      if (req.body.ranking !== undefined) payload.ranking = req.body.ranking;
      if (req.body.programs !== undefined) payload.programs = req.body.programs;
      if (req.body.isActive !== undefined) payload.isActive = req.body.isActive;

      const updateData = insertPartnerSchema.partial().parse(payload);
      const partner = await storage.updatePartner(id, updateData);
      if (!partner) return res.status(404).json({ message: "Partner not found" });

      setPartnerMeta(id, {
        partnershipType: req.body.partnershipType,
        logo,
        coverImage: req.body.coverImage,
        contactName: req.body.contactName,
        contactEmail: req.body.contactEmail,
        contactPhone: req.body.contactPhone,
        address: req.body.address,
        country: req.body.country,
        region: req.body.region,
        industryCategory: req.body.industryCategory,
        partnershipLevel: req.body.partnershipLevel,
        sponsorshipTier: req.body.sponsorshipTier,
        status: req.body.status,
        socialLinks: req.body.socialLinks,
        documents: req.body.documents,
        agreements: req.body.agreements,
        notes: req.body.notes,
        internalComments: req.body.internalComments,
        linkedEvents: req.body.linkedEvents,
        linkedSponsorships: req.body.linkedSponsorships,
        linkedOpportunities: req.body.linkedOpportunities,
        partnershipHistory: req.body.partnershipHistory,
        activities: req.body.activities,
        meetings: req.body.meetings,
        reminders: req.body.reminders,
        financialRecords: req.body.financialRecords,
        performanceMetrics: req.body.performanceMetrics,
        videoUrl: parseOptionalUrl(req.body.videoUrl),
        videoTitle: req.body.videoTitle,
        videoDescription: req.body.videoDescription,
        isFeatured: parseOptionalBoolean(req.body.isFeatured),
        isPremium: parseOptionalBoolean(req.body.isPremium),
        paymentStatus: req.body.paymentStatus,
      });

      await emitAdminRealtimeEvent(req, {
        event: "partner_updated",
        channel: "partners",
        entityType: "partner",
        referenceId: partner.id,
        payload: { partner: toAdminPartner(partner) },
      });

      res.json(toAdminPartner(partner));
    } catch (error) {
      console.error("Admin partner update error:", error);
      res.status(400).json({ message: "Failed to update partner", error: getErrorMessage(error) });
    }
  });

  app.delete('/api/admin/partners/:id', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const success = await storage.deletePartner(id);
      deletePartnerMeta(id);
      if (!success) return res.status(404).json({ message: "Partner not found" });
      await emitAdminRealtimeEvent(req, {
        event: "partner_deleted",
        channel: "partners",
        entityType: "partner",
        referenceId: id,
        payload: { id: String(id) },
      });
      res.status(204).send();
    } catch (error) {
      console.error("Admin partner delete error:", error);
      res.status(500).json({ message: "Failed to delete partner" });
    }
  });

  app.get('/api/admin/partners/:id/crm', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const partner = await storage.getPartner(id);
      if (!partner) return res.status(404).json({ message: "Partner not found" });
      res.json({ partner: toAdminPartner(partner), crm: getPartnerCrmSnapshot(id) });
    } catch (error) {
      console.error("Admin partner CRM fetch error:", error);
      res.status(500).json({ message: "Failed to fetch partner CRM" });
    }
  });

  app.post('/api/admin/partners/:id/activities', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const partner = await storage.getPartner(id);
      if (!partner) return res.status(404).json({ message: "Partner not found" });
      const payload = partnerActivityInputSchema.parse(req.body);
      const meta = getPartnerMeta(id);
      const record = createOperationalRecord({
        ...payload,
        dueAt: payload.dueAt?.toISOString() ?? null,
        completedAt: payload.completedAt?.toISOString() ?? null,
        createdBy: getAuthenticatedUser(req).id,
      });
      const nextActivities = [record, ...(meta.activities ?? [])].slice(0, 100);
      const nextReminders =
        payload.dueAt && !payload.completedAt
          ? [record, ...(meta.reminders ?? [])].slice(0, 100)
          : meta.reminders;
      setPartnerMeta(id, {
        activities: nextActivities,
        reminders: nextReminders,
        performanceMetrics: {
          ...(meta.performanceMetrics ?? {}),
          lastTouchAt: record.createdAt,
        },
      });
      await emitAdminRealtimeEvent(req, {
        event: "partner_activity_created",
        channel: "partners",
        entityType: "partner_activity",
        referenceId: id,
        payload: { partnerId: id, activity: record },
      });
      res.status(201).json(record);
    } catch (error) {
      console.error("Admin partner activity create error:", error);
      res.status(400).json({ message: "Failed to create partner activity", error: getErrorMessage(error) });
    }
  });

  app.post('/api/admin/partners/:id/documents', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const partner = await storage.getPartner(id);
      if (!partner) return res.status(404).json({ message: "Partner not found" });
      const payload = partnerDocumentInputSchema.parse(req.body);
      const meta = getPartnerMeta(id);
      const record = createOperationalRecord({
        ...payload,
        expiresAt: payload.expiresAt?.toISOString() ?? null,
        uploadedBy: getAuthenticatedUser(req).id,
      });
      const collection = payload.type === "agreement" ? "agreements" : "documents";
      setPartnerMeta(id, {
        [collection]: [record, ...((meta as Record<string, any>)[collection] ?? [])].slice(0, 100),
      });
      res.status(201).json(record);
    } catch (error) {
      console.error("Admin partner document create error:", error);
      res.status(400).json({ message: "Failed to add partner document", error: getErrorMessage(error) });
    }
  });

  app.post('/api/admin/partners/:id/financial-records', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const partner = await storage.getPartner(id);
      if (!partner) return res.status(404).json({ message: "Partner not found" });
      const payload = partnerFinancialInputSchema.parse(req.body);
      const meta = getPartnerMeta(id);
      const record = createOperationalRecord({
        ...payload,
        recordedAt: new Date().toISOString(),
        createdBy: getAuthenticatedUser(req).id,
      });
      const financialRecords = [record, ...(meta.financialRecords ?? [])].slice(0, 100);
      const totalContribution = financialRecords.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
      setPartnerMeta(id, {
        financialRecords,
        performanceMetrics: {
          ...(meta.performanceMetrics ?? {}),
          totalContribution,
          lastContributionAt: record.createdAt,
        },
      });
      res.status(201).json(record);
    } catch (error) {
      console.error("Admin partner financial record create error:", error);
      res.status(400).json({ message: "Failed to add financial record", error: getErrorMessage(error) });
    }
  });

  app.get('/api/admin/partners/analytics/summary', authenticateToken, requireEditor, async (_req, res) => {
    try {
      const partners = await storage.getAllPartners();
      const mapped = partners.map(toAdminPartner);
      const activePartners = mapped.filter((partner) => partner.isActive !== false && partner.status !== "inactive");
      const totalContribution = mapped.reduce((sum, partner) => {
        const crm = getPartnerCrmSnapshot(Number(partner.id));
        return sum + Number(crm.performanceMetrics.totalContribution ?? 0);
      }, 0);
      const byTier = mapped.reduce<Record<string, number>>((acc, partner) => {
        const tier = partner.sponsorshipTier || partner.partnershipLevel || "Unassigned";
        acc[tier] = (acc[tier] ?? 0) + 1;
        return acc;
      }, {});
      res.json({
        totalPartners: mapped.length,
        activePartners: activePartners.length,
        featuredPartners: mapped.filter((partner) => partner.isFeatured).length,
        premiumPartners: mapped.filter((partner) => partner.isPremium).length,
        totalContribution,
        byTier,
        renewalAlerts: mapped.flatMap((partner) =>
          (partner.agreements ?? [])
            .filter((item: Record<string, unknown>) => {
              if (!item.expiresAt) return false;
              const diff = new Date(String(item.expiresAt)).getTime() - Date.now();
              return diff >= 0 && diff <= 60 * 24 * 60 * 60 * 1000;
            })
            .map((item: Record<string, unknown>) => ({ partnerId: partner.id, partnerName: partner.name, document: item })),
        ),
      });
    } catch (error) {
      console.error("Admin partner analytics error:", error);
      res.status(500).json({ message: "Failed to fetch partner analytics" });
    }
  });

  app.get('/api/admin/blog', authenticateToken, requireEditor, async (req, res) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 50);
      const search = normalizeSearchQuery(req.query.search);
      const statusFilter = String(req.query.status ?? "").toLowerCase();

      const allPosts = await storage.getAllBlogPosts();
      const mapped = allPosts.map(toAdminBlogPost);
      const filtered = searchAndRank(mapped, search, (item) => [
        item.title,
        item.excerpt,
        item.content,
        item.category,
        item.tags,
        item.slug,
      ]).filter((item) => {
        const matchesStatus = !statusFilter || item.status === statusFilter;
        return matchesStatus;
      });

      const { items, total } = paginate(filtered, page, limit);
      res.json({ posts: items, total });
    } catch (error) {
      console.error("Admin blog error:", error);
      res.status(500).json({ message: "Failed to fetch blog posts" });
    }
  });

  app.post('/api/admin/blog', authenticateToken, requireEditor, async (req, res) => {
    try {
      const authorId = getAuthenticatedUser(req).id;
      const featuredImage = ensureMediaReference(req.body.featuredImage, "blogs");
      const postData = insertBlogPostSchema.parse({
        title: req.body.title ?? "",
        content: req.body.content ?? "",
        excerpt: req.body.excerpt ?? null,
        imageUrl: featuredImage,
        category: req.body.category ?? "General",
        tags: parseStringArray(req.body.tags) ?? [],
        isPublished: req.body.status === "published",
        authorId,
      });

      const post = await storage.createBlogPost(postData);
      setBlogMeta(
        post.id,
        buildBlogMetaFromBody(
          {
            ...req.body,
            slug: req.body.slug ?? `post-${post.id}`,
            status: normalizeAdminStatus(req.body.status, post.isPublished),
          },
          featuredImage,
        ),
      );

      await emitAdminRealtimeEvent(req, {
        event: "blog_post_created",
        channel: "blog-posts",
        entityType: "blog",
        referenceId: post.id,
        payload: { blogPost: toAdminBlogPost(post) },
      });

      res.status(201).json(toAdminBlogPost(post));
    } catch (error) {
      console.error("Admin blog create error:", error);
      res.status(400).json({ message: "Failed to create blog post", error: getErrorMessage(error) });
    }
  });

  app.put('/api/admin/blog/:id', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const payload: Record<string, unknown> = {};
      if (req.body.title !== undefined) payload.title = req.body.title;
      if (req.body.content !== undefined) payload.content = req.body.content;
      if (req.body.excerpt !== undefined) payload.excerpt = req.body.excerpt;
      const featuredImage = req.body.featuredImage !== undefined ? ensureMediaReference(req.body.featuredImage, "blogs") : undefined;
      if (featuredImage !== undefined) payload.imageUrl = featuredImage;
      if (req.body.category !== undefined) payload.category = req.body.category;
      if (req.body.tags !== undefined) payload.tags = parseStringArray(req.body.tags) ?? [];
      if (req.body.status !== undefined) payload.isPublished = req.body.status === "published";

      const updateData = insertBlogPostSchema.partial().parse(payload);
      const post = await storage.updateBlogPost(id, updateData);
      if (!post) return res.status(404).json({ message: "Blog post not found" });

      setBlogMeta(id, buildBlogMetaFromBody(req.body, featuredImage));

      await emitAdminRealtimeEvent(req, {
        event: "blog_post_updated",
        channel: "blog-posts",
        entityType: "blog",
        referenceId: post.id,
        payload: { blogPost: toAdminBlogPost(post) },
      });

      res.json(toAdminBlogPost(post));
    } catch (error) {
      console.error("Admin blog update error:", error);
      res.status(400).json({ message: "Failed to update blog post", error: getErrorMessage(error) });
    }
  });

  app.delete('/api/admin/blog/:id', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const success = await storage.deleteBlogPost(id);
      deleteBlogMeta(id);
      if (!success) return res.status(404).json({ message: "Blog post not found" });
      await emitAdminRealtimeEvent(req, {
        event: "blog_post_deleted",
        channel: "blog-posts",
        entityType: "blog",
        referenceId: id,
        payload: { id: String(id) },
      });
      res.status(204).send();
    } catch (error) {
      console.error("Admin blog delete error:", error);
      res.status(500).json({ message: "Failed to delete blog post" });
    }
  });

  app.post('/api/admin/blog/:id/duplicate', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const source = await storage.getBlogPost(id);
      if (!source) return res.status(404).json({ message: "Blog post not found" });

      const post = await storage.createBlogPost({
        title: `${source.title} Copy`,
        content: source.content,
        excerpt: source.excerpt,
        imageUrl: source.imageUrl,
        category: source.category,
        tags: Array.isArray(source.tags) ? source.tags : [],
        isPublished: false,
        authorId: getAuthenticatedUser(req).id,
      });
      setBlogMeta(post.id, {
        ...getBlogMeta(id),
        slug: `${getBlogMeta(id).slug ?? slugify(source.title)}-copy-${post.id}`,
        status: "draft",
        revisionHistory: [
          createOperationalRecord({ action: "duplicated", sourceId: id, actor: getAuthenticatedUser(req).id }),
          ...(getBlogMeta(id).revisionHistory ?? []),
        ].slice(0, 100),
      });
      await emitAdminRealtimeEvent(req, {
        event: "blog_post_duplicated",
        channel: "blog-posts",
        entityType: "blog",
        referenceId: post.id,
        payload: { sourceId: id, blogPost: toAdminBlogPost(post) },
      });
      res.status(201).json(toAdminBlogPost(post));
    } catch (error) {
      console.error("Admin blog duplicate error:", error);
      res.status(400).json({ message: "Failed to duplicate blog post", error: getErrorMessage(error) });
    }
  });

  app.patch('/api/admin/blog/:id/status', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const status = normalizeAdminStatus(String(req.body.status ?? ""));
      const post = await storage.updateBlogPost(id, { isPublished: status === "published" });
      if (!post) return res.status(404).json({ message: "Blog post not found" });
      const meta = getBlogMeta(id);
      setBlogMeta(id, {
        status,
        revisionHistory: [
          createOperationalRecord({ action: "status_changed", status, actor: getAuthenticatedUser(req).id }),
          ...(meta.revisionHistory ?? []),
        ].slice(0, 100),
      });
      await emitAdminRealtimeEvent(req, {
        event: "blog_post_status_updated",
        channel: "blog-posts",
        entityType: "blog",
        referenceId: id,
        payload: { status },
      });
      res.json(toAdminBlogPost(post));
    } catch (error) {
      console.error("Admin blog status error:", error);
      res.status(400).json({ message: "Failed to update blog status", error: getErrorMessage(error) });
    }
  });

  app.get('/api/admin/blog/analytics', authenticateToken, requireEditor, async (_req, res) => {
    try {
      const mapped = (await storage.getAllBlogPosts()).map(toAdminBlogPost);
      const byCategory = mapped.reduce<Record<string, number>>((acc, item) => {
        acc[item.category] = (acc[item.category] ?? 0) + 1;
        return acc;
      }, {});
      res.json({
        totalPosts: mapped.length,
        publishedPosts: mapped.filter((item) => item.status === "published").length,
        drafts: mapped.filter((item) => item.status === "draft").length,
        scheduled: mapped.filter((item) => Boolean(item.scheduledAt)).length,
        averageReadingTime: mapped.length
          ? Math.round(mapped.reduce((sum, item) => sum + Number(item.readingTimeMinutes ?? 0), 0) / mapped.length)
          : 0,
        byCategory,
        revisionCount: mapped.reduce((sum, item) => sum + (item.revisionHistory?.length ?? 0), 0),
        topContent: mapped
          .map((item) => ({
            id: item.id,
            title: item.title,
            status: item.status,
            readingTimeMinutes: item.readingTimeMinutes,
            revisions: item.revisionHistory?.length ?? 0,
          }))
          .slice(0, 8),
      });
    } catch (error) {
      console.error("Admin blog analytics error:", error);
      res.status(500).json({ message: "Failed to fetch blog analytics" });
    }
  });

  app.get('/api/admin/blog/export', authenticateToken, requireEditor, async (_req, res) => {
    try {
      const mapped = (await storage.getAllBlogPosts()).map(toAdminBlogPost);
      const headers = ["ID", "Title", "Slug", "Category", "Status", "Reading Time", "Created"];
      const rows = mapped.map((item) => [item.id, item.title, item.slug, item.category, item.status, item.readingTimeMinutes, item.createdAt]);
      const csv = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="mtendere-blog-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Admin blog export error:", error);
      res.status(500).json({ message: "Failed to export blog posts" });
    }
  });

  app.get('/api/admin/team', authenticateToken, requireEditor, async (req, res) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 50);
      const search = normalizeSearchQuery(req.query.search);

      const allMembers = await storage.getAllTeamMembers();
      const mapped = allMembers.map(toAdminTeamMember);
      const filtered = searchAndRank(mapped, search, (item) => [
        item.name,
        item.position,
        item.department,
        item.bio,
        item.email,
      ]);

      const { items, total } = paginate(filtered, page, limit);
      res.json({ members: items, total });
    } catch (error) {
      console.error("Admin team error:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  app.post('/api/admin/team', authenticateToken, requireEditor, async (req, res) => {
    try {
      const profileImage = ensureMediaReference(req.body.profileImage, "teams");
      const memberData = insertTeamMemberSchema.parse({
        name: req.body.name ?? "",
        position: req.body.position ?? "",
        bio: req.body.bio ?? null,
        imageUrl: profileImage,
        email: req.body.email ?? null,
        linkedin: req.body.linkedIn ?? null,
        twitter: req.body.twitter ?? null,
        order: req.body.order ?? 0,
        isActive: req.body.isActive ?? true,
      });

      const member = await storage.createTeamMember(memberData);
      setTeamMeta(member.id, buildTeamMetaFromBody({ ...req.body, department: req.body.department ?? "" }, profileImage));
      await emitAdminRealtimeEvent(req, {
        event: "team_member_created",
        channel: "team-members",
        entityType: "team",
        referenceId: member.id,
        payload: { teamMember: toAdminTeamMember(member) },
      });
      res.status(201).json(toAdminTeamMember(member));
    } catch (error) {
      console.error("Admin team create error:", error);
      res.status(400).json({ message: "Failed to create team member", error: getErrorMessage(error) });
    }
  });

  app.put('/api/admin/team/:id', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const payload: Record<string, unknown> = {};
      if (req.body.name !== undefined) payload.name = req.body.name;
      if (req.body.position !== undefined) payload.position = req.body.position;
      if (req.body.bio !== undefined) payload.bio = req.body.bio;
      const profileImage = req.body.profileImage !== undefined ? ensureMediaReference(req.body.profileImage, "teams") : undefined;
      if (profileImage !== undefined) payload.imageUrl = profileImage;
      if (req.body.email !== undefined) payload.email = req.body.email;
      if (req.body.linkedIn !== undefined) payload.linkedin = req.body.linkedIn;
      if (req.body.twitter !== undefined) payload.twitter = req.body.twitter;
      if (req.body.order !== undefined) payload.order = req.body.order;
      if (req.body.isActive !== undefined) payload.isActive = req.body.isActive;

      const updateData = insertTeamMemberSchema.partial().parse(payload);
      const member = await storage.updateTeamMember(id, updateData);
      if (!member) return res.status(404).json({ message: "Team member not found" });

      setTeamMeta(id, buildTeamMetaFromBody(req.body, profileImage));

      await emitAdminRealtimeEvent(req, {
        event: "team_member_updated",
        channel: "team-members",
        entityType: "team",
        referenceId: member.id,
        payload: { teamMember: toAdminTeamMember(member) },
      });

      res.json(toAdminTeamMember(member));
    } catch (error) {
      console.error("Admin team update error:", error);
      res.status(400).json({ message: "Failed to update team member", error: getErrorMessage(error) });
    }
  });

  app.delete('/api/admin/team/:id', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const success = await storage.deleteTeamMember(id);
      deleteTeamMeta(id);
      if (!success) return res.status(404).json({ message: "Team member not found" });
      await emitAdminRealtimeEvent(req, {
        event: "team_member_deleted",
        channel: "team-members",
        entityType: "team",
        referenceId: id,
        payload: { id: String(id) },
      });
      res.status(204).send();
    } catch (error) {
      console.error("Admin team delete error:", error);
      res.status(500).json({ message: "Failed to delete team member" });
    }
  });

  app.patch('/api/admin/team/:id/status', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const isActive = req.body.isActive !== false;
      const member = await storage.updateTeamMember(id, { isActive });
      if (!member) return res.status(404).json({ message: "Team member not found" });
      await emitAdminRealtimeEvent(req, {
        event: "team_member_status_updated",
        channel: "team-members",
        entityType: "team",
        referenceId: id,
        payload: { isActive },
      });
      res.json(toAdminTeamMember(member));
    } catch (error) {
      console.error("Admin team status error:", error);
      res.status(400).json({ message: "Failed to update team status", error: getErrorMessage(error) });
    }
  });

  app.get('/api/admin/team/analytics', authenticateToken, requireEditor, async (_req, res) => {
    try {
      const mapped = (await storage.getAllTeamMembers()).map(toAdminTeamMember);
      const byDepartment = mapped.reduce<Record<string, number>>((acc, item) => {
        const department = item.department || "Unassigned";
        acc[department] = (acc[department] ?? 0) + 1;
        return acc;
      }, {});
      res.json({
        totalTeamMembers: mapped.length,
        activeTeamMembers: mapped.filter((item) => item.isActive).length,
        publicProfiles: mapped.filter((item) => item.visibility === "public").length,
        leadershipProfiles: mapped.filter((item) => item.leadershipLevel).length,
        skillsCatalogued: Array.from(new Set(mapped.flatMap((item) => item.skills ?? []))).length,
        byDepartment,
      });
    } catch (error) {
      console.error("Admin team analytics error:", error);
      res.status(500).json({ message: "Failed to fetch team analytics" });
    }
  });

  app.get('/api/admin/team/export', authenticateToken, requireEditor, async (_req, res) => {
    try {
      const mapped = (await storage.getAllTeamMembers()).map(toAdminTeamMember);
      const headers = ["ID", "Name", "Position", "Department", "Visibility", "Active", "Skills"];
      const rows = mapped.map((item) => [item.id, item.name, item.position, item.department, item.visibility, item.isActive, (item.skills ?? []).join("; ")]);
      const csv = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="mtendere-team-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Admin team export error:", error);
      res.status(500).json({ message: "Failed to export team members" });
    }
  });

  app.get('/api/admin/events', authenticateToken, requireEditor, async (req, res) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 50);
      const search = normalizeSearchQuery(req.query.search);
      const statusFilter = String(req.query.status ?? "").toLowerCase();

      const allEvents = await storage.getAllEvents();
      const mapped = await Promise.all(allEvents.map(toAdminEvent));
      const filtered = mapped.filter((item) => {
        const matchesSearch =
          !search ||
          item.title.toLowerCase().includes(search) ||
          item.description.toLowerCase().includes(search) ||
          item.category.toLowerCase().includes(search) ||
          item.location.toLowerCase().includes(search);
        const matchesStatus =
          !statusFilter ||
          item.status === statusFilter ||
          String(item.runtimeStatus).toLowerCase() === statusFilter;
        return matchesSearch && matchesStatus;
      });

      const { items, total } = paginate(filtered, page, limit);
      res.json({ data: items, total });
    } catch (error) {
      console.error("Admin events error:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get('/api/admin/events/analytics', authenticateToken, requireEditor, async (_req, res) => {
    try {
      const [events, registrations, analytics] = await Promise.all([
        storage.getAllEvents(),
        storage.getAllEventRegistrations(),
        storage.getAnalytics(),
      ]);

      const eventAnalytics = analytics.filter((item) => {
        const meta = parseAnalyticsMeta(item.metadata);
        return meta.type === "event";
      });
      const views = eventAnalytics.filter((item) => item.event === "event_viewed").length;
      const shares = eventAnalytics.filter((item) => item.event === "event_shared").length;
      const published = events.filter((event) => event.status === "published").length;
      const live = events.filter((event) => deriveEventRuntimeStatus(event) === "live").length;
      const upcoming = events.filter((event) => deriveEventRuntimeStatus(event) === "upcoming").length;
      const categoryStats = events.reduce<Record<string, number>>((acc, event) => {
        acc[event.category] = (acc[event.category] ?? 0) + 1;
        return acc;
      }, {});

      res.json({
        totalEvents: events.length,
        publishedEvents: published,
        liveEvents: live,
        upcomingEvents: upcoming,
        registrations: registrations.length,
        approvedRegistrations: registrations.filter((item) => item.status === "approved" || item.status === "checked_in").length,
        views,
        shares,
        conversionRate: views > 0 ? Math.round((registrations.length / views) * 100) : 0,
        categoryStats,
        topEvents: events
          .slice()
          .sort((left, right) => Number(right.viewCount ?? 0) - Number(left.viewCount ?? 0))
          .slice(0, 5),
      });
    } catch (error) {
      console.error("Admin events analytics error:", error);
      res.status(500).json({ message: "Failed to fetch event analytics" });
    }
  });

  app.get('/api/admin/events/reports/summary', authenticateToken, requireEditor, async (_req, res) => {
    try {
      const [events, registrations, analytics] = await Promise.all([
        storage.getAllEvents(),
        storage.getAllEventRegistrations(),
        storage.getAnalytics(),
      ]);
      const eventRows = await Promise.all(events.map(toAdminEvent));
      const revenue = registrations.reduce((sum, registration) => {
        const event = events.find((item) => item.id === registration.eventId);
        if (!event?.isPaid || registration.status === "rejected" || registration.status === "cancelled") return sum;
        return sum + Number(event.priceAmount ?? 0);
      }, 0);
      const byCountry = registrations.reduce<Record<string, number>>((acc, registration) => {
        const country = String((registration.answers as Record<string, unknown> | null)?.country ?? "Unspecified");
        acc[country] = (acc[country] ?? 0) + 1;
        return acc;
      }, {});
      const traffic = analytics
        .filter((item) => parseAnalyticsMeta(item.metadata).type === "event")
        .reduce<Record<string, number>>((acc, item) => {
          acc[item.event] = (acc[item.event] ?? 0) + 1;
          return acc;
        }, {});
      res.json({
        generatedAt: new Date().toISOString(),
        totals: {
          events: events.length,
          published: events.filter((event) => event.status === "published").length,
          registrations: registrations.length,
          attended: registrations.filter((item) => ["attended", "checked_in", "checked_out"].includes(item.attendanceStatus)).length,
          revenue,
          conversionRate: traffic.event_viewed ? Math.round((registrations.length / traffic.event_viewed) * 100) : 0,
        },
        byCountry,
        traffic,
        popularEvents: eventRows
          .slice()
          .sort((left, right) => (right.registrationCount ?? 0) - (left.registrationCount ?? 0))
          .slice(0, 10),
      });
    } catch (error) {
      console.error("Admin event report error:", error);
      res.status(500).json({ message: "Failed to generate event report" });
    }
  });

  app.post('/api/admin/events/:id/duplicate', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const source = await storage.getEvent(id);
      if (!source) return res.status(404).json({ message: "Event not found" });
      const baseSlug = slugify(`${source.slug || source.title}-copy`);
      const startsAt = new Date(source.startAt);
      const endsAt = new Date(source.endAt);
      startsAt.setDate(startsAt.getDate() + 7);
      endsAt.setDate(endsAt.getDate() + 7);
      const duplicate = await storage.createEvent(insertEventSchema.parse({
        title: `${source.title} Copy`,
        slug: `${baseSlug}-${randomBytes(2).toString("hex")}`,
        summary: source.summary,
        description: source.description,
        category: source.category,
        eventType: source.eventType,
        organizer: source.organizer,
        location: source.location,
        venueName: source.venueName,
        address: source.address,
        mapUrl: source.mapUrl,
        isVirtual: source.isVirtual,
        virtualUrl: source.virtualUrl,
        livestreamUrl: source.livestreamUrl,
        isPaid: source.isPaid,
        priceAmount: source.priceAmount,
        currency: source.currency,
        capacity: source.capacity,
        rsvpEnabled: source.rsvpEnabled,
        startAt: startsAt,
        endAt: endsAt,
        registrationDeadline: null,
        coverImage: source.coverImage,
        videoUrl: source.videoUrl,
        tags: source.tags,
        ticketTypes: source.ticketTypes,
        customFields: source.customFields,
        agenda: source.agenda,
        speakers: source.speakers,
        sponsors: source.sponsors,
        partners: source.partners,
        faqs: source.faqs,
        resources: source.resources,
        attachments: source.attachments,
        gallery: source.gallery,
        seoMeta: source.seoMeta,
        socialMeta: source.socialMeta,
        status: "draft",
        isFeatured: false,
        isRecommended: source.isRecommended,
        isTrending: false,
        allowComments: source.allowComments,
        requiresApproval: source.requiresApproval,
        createdBy: getAuthenticatedUser(req).id,
      }));
      await emitAdminRealtimeEvent(req, {
        event: "event_duplicated",
        channel: "events",
        entityType: "event",
        referenceId: duplicate.id,
        payload: { sourceId: id, event: await toAdminEvent(duplicate) },
      });
      res.status(201).json(await toAdminEvent(duplicate));
    } catch (error) {
      console.error("Admin event duplicate error:", error);
      res.status(400).json({ message: "Failed to duplicate event", error: getErrorMessage(error) });
    }
  });

  app.patch('/api/admin/events/:id/status', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const status = z.enum(["draft", "published", "archived", "cancelled"]).parse(req.body.status);
      const event = await storage.updateEvent(id, { status });
      if (!event) return res.status(404).json({ message: "Event not found" });
      await emitAdminRealtimeEvent(req, {
        event: "event_status_updated",
        channel: "events",
        entityType: "event",
        referenceId: event.id,
        payload: { id, status },
      });
      res.json(await toAdminEvent(event));
    } catch (error) {
      console.error("Admin event status update error:", error);
      res.status(400).json({ message: "Failed to update event status", error: getErrorMessage(error) });
    }
  });

  app.post('/api/admin/events', authenticateToken, requireEditor, async (req, res) => {
    try {
      const payload = eventPayloadSchema.parse(req.body);
      if (payload.endAt <= payload.startAt) {
        return res.status(400).json({ message: "Event end date must be after start date" });
      }

      const coverImage = ensureMediaReference(payload.coverImage, "events");
      const baseSlug = slugify(payload.slug || payload.title);
      const existing = await storage.getEventBySlug(baseSlug);
      const eventData = insertEventSchema.parse({
        ...payload,
        slug: existing ? `${baseSlug}-${randomBytes(2).toString("hex")}` : baseSlug,
        coverImage,
        tags: normalizeEventTags(payload.tags),
        createdBy: getAuthenticatedUser(req).id,
      });
      const event = await storage.createEvent(eventData);
      await emitAdminRealtimeEvent(req, {
        event: "event_created",
        channel: "events",
        entityType: "event",
        referenceId: event.id,
        payload: { event: await toAdminEvent(event) },
      });
      res.status(201).json(await toAdminEvent(event));
    } catch (error) {
      console.error("Admin event create error:", error);
      res.status(400).json({ message: "Failed to create event", error: getErrorMessage(error) });
    }
  });

  app.put('/api/admin/events/:id', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const payload = eventPayloadSchema.partial().parse(req.body);
      if (payload.startAt && payload.endAt && payload.endAt <= payload.startAt) {
        return res.status(400).json({ message: "Event end date must be after start date" });
      }

      const updatePayload: Record<string, unknown> = { ...payload };
      if (payload.slug) updatePayload.slug = slugify(payload.slug);
      if (payload.coverImage !== undefined) updatePayload.coverImage = ensureMediaReference(payload.coverImage, "events");
      if (payload.tags !== undefined) updatePayload.tags = normalizeEventTags(payload.tags);
      const updateData = insertEventSchema.partial().parse(updatePayload);
      const event = await storage.updateEvent(id, updateData);
      if (!event) return res.status(404).json({ message: "Event not found" });
      await emitAdminRealtimeEvent(req, {
        event: "event_updated",
        channel: "events",
        entityType: "event",
        referenceId: event.id,
        payload: { event: await toAdminEvent(event) },
      });
      res.json(await toAdminEvent(event));
    } catch (error) {
      console.error("Admin event update error:", error);
      res.status(400).json({ message: "Failed to update event", error: getErrorMessage(error) });
    }
  });

  app.delete('/api/admin/events/:id', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const success = await storage.deleteEvent(id);
      if (!success) return res.status(404).json({ message: "Event not found" });
      await emitAdminRealtimeEvent(req, {
        event: "event_deleted",
        channel: "events",
        entityType: "event",
        referenceId: id,
        payload: { id: String(id) },
      });
      res.status(204).send();
    } catch (error) {
      console.error("Admin event delete error:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  app.get('/api/admin/events/:id/registrations', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      res.json(await storage.getEventRegistrations(id));
    } catch (error) {
      console.error("Admin event registration fetch error:", error);
      res.status(500).json({ message: "Failed to fetch event registrations" });
    }
  });

  app.get('/api/admin/events/:id/registrations/export', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const event = await storage.getEvent(id);
      if (!event) return res.status(404).json({ message: "Event not found" });
      const registrations = await storage.getEventRegistrations(id);
      const format = String(req.query.format ?? "csv").toLowerCase();
      const rows = [
        ["Name", "Email", "Phone", "Organization", "Ticket Type", "Status", "Attendance", "Ticket Code", "Registered At", "Checked In", "Checked Out"],
        ...registrations.map((registration) => [
          registration.fullName,
          registration.email,
          registration.phone ?? "",
          registration.organization ?? "",
          registration.ticketType ?? "",
          registration.status,
          registration.attendanceStatus,
          registration.ticketCode,
          registration.createdAt ?? "",
          registration.checkedInAt ?? "",
          registration.checkedOutAt ?? "",
        ]),
      ];

      const filename = `${event.slug || `event-${event.id}`}-registrations`;
      if (format === "excel" || format === "xls") {
        const htmlRows = rows
          .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
          .join("");
        res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.xls"`);
        res.send(`<table>${htmlRows}</table>`);
        return;
      }

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
      res.send(rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n"));
    } catch (error) {
      console.error("Admin event registration export error:", error);
      res.status(500).json({ message: "Failed to export registrations" });
    }
  });

  app.post('/api/admin/event-registrations/:id/check-in', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const registration = await storage.updateEventRegistration(id, {
        status: "checked_in",
        attendanceStatus: "checked_in",
        checkedInAt: new Date(),
      });
      await emitAdminRealtimeEvent(req, {
        event: "event_registration_checked_in",
        channel: "events",
        entityType: "event_registration",
        referenceId: registration.eventId,
        payload: { registration },
      });
      res.json(registration);
    } catch (error) {
      console.error("Admin event check-in error:", error);
      res.status(400).json({ message: "Failed to check in attendee", error: getErrorMessage(error) });
    }
  });

  app.post('/api/admin/event-registrations/:id/check-out', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const registration = await storage.updateEventRegistration(id, {
        attendanceStatus: "checked_out",
        checkedOutAt: new Date(),
      });
      await emitAdminRealtimeEvent(req, {
        event: "event_registration_checked_out",
        channel: "events",
        entityType: "event_registration",
        referenceId: registration.eventId,
        payload: { registration },
      });
      res.json(registration);
    } catch (error) {
      console.error("Admin event check-out error:", error);
      res.status(400).json({ message: "Failed to check out attendee", error: getErrorMessage(error) });
    }
  });

  app.put('/api/admin/event-registrations/:id', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const payload = eventRegistrationReviewSchema.parse(req.body);
      const registration = await storage.updateEventRegistration(id, {
        ...payload,
        checkedInAt: payload.status === "checked_in" ? new Date() : undefined,
        checkedOutAt: payload.attendanceStatus === "checked_out" ? new Date() : undefined,
      });
      const event = await storage.getEvent(registration.eventId);
      if (event && (payload.status || payload.approvalNotes)) {
        void sendEventRegistrationStatusUpdate({
          email: registration.email,
          name: registration.fullName,
          eventTitle: event.title,
          status: registration.status,
          notes: payload.approvalNotes,
          ticketUrl: `${env.PUBLIC_APP_URL || `${req.protocol}://${req.get("host")}`}/api/events/registrations/${registration.ticketCode}/ticket`,
        });
      }
      await emitAdminRealtimeEvent(req, {
        event: "event_registration_updated",
        channel: "events",
        entityType: "event_registration",
        referenceId: registration.eventId,
        payload: { registration },
      });
      res.json(registration);
    } catch (error) {
      console.error("Admin event registration update error:", error);
      res.status(400).json({ message: "Failed to update registration", error: getErrorMessage(error) });
    }
  });

  app.get('/api/admin/applications', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 50);
      const search = normalizeSearchQuery(req.query.search);
      const statusFilter = String(req.query.status ?? "").toLowerCase();

      const allApplications = await storage.getAllApplications();
      const filtered = statusFilter
        ? allApplications.filter((app) => app.status === statusFilter)
        : allApplications;

      const enriched = await Promise.all(
        filtered.map(async (app) => {
          const user = await storage.getUser(app.userId);
          const scholarship = app.type === "scholarship" ? await storage.getScholarship(app.referenceId) : null;
          const job = app.type === "job" ? await storage.getJob(app.referenceId) : null;

          return {
            ...app,
            id: String(app.id),
            applicantName: user ? `${user.firstName} ${user.lastName}`.trim() : "Applicant",
            applicantEmail: user?.email ?? "",
            opportunityTitle: scholarship?.title ?? job?.title ?? "Opportunity",
            opportunityType: app.type ?? "application",
            coverLetter: app.notes ?? "",
            meta: getApplicationMeta(app.id),
          };
        }),
      );

      const searched = search
        ? searchAndRank(enriched, search, (app) => [
            app.applicantName,
            app.applicantEmail,
            app.opportunityTitle,
            app.opportunityType,
            app.status,
            app.coverLetter,
          ])
        : enriched;

      const { items, total } = paginate(searched, page, limit);
      res.json({ applications: items, total });
    } catch (error) {
      console.error("Admin applications error:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.get('/api/admin/applications/export', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const search = normalizeSearchQuery(req.query.search);
      const statusFilter = String(req.query.status ?? "").toLowerCase();

      const allApplications = await storage.getAllApplications();
      const filtered = statusFilter
        ? allApplications.filter((app) => app.status === statusFilter)
        : allApplications;

      const enriched = await Promise.all(
        filtered.map(async (app) => {
          const user = await storage.getUser(app.userId);
          const scholarship = app.type === "scholarship" ? await storage.getScholarship(app.referenceId) : null;
          const job = app.type === "job" ? await storage.getJob(app.referenceId) : null;

          return {
            id: app.id,
            applicantName: user ? `${user.firstName} ${user.lastName}`.trim() : "Applicant",
            applicantEmail: user?.email ?? "",
            opportunityTitle: scholarship?.title ?? job?.title ?? "Opportunity",
            opportunityType: app.type ?? "application",
            status: app.status,
            submittedAt: app.submittedAt,
            updatedAt: app.updatedAt,
          };
        }),
      );

      const searched = search
        ? searchAndRank(enriched, search, (app) => [
            app.applicantName,
            app.applicantEmail,
            app.opportunityTitle,
            app.opportunityType,
            app.status,
          ])
        : enriched;

      const headers = [
        "Application ID",
        "Applicant Name",
        "Applicant Email",
        "Opportunity",
        "Type",
        "Status",
        "Submitted At",
        "Updated At",
      ];
      const rows = searched.map((app) => [
        app.id,
        app.applicantName,
        app.applicantEmail,
        app.opportunityTitle,
        app.opportunityType,
        app.status,
        app.submittedAt,
        app.updatedAt,
      ]);
      const csv = [headers, ...rows]
        .map((row) => row.map(escapeCsvValue).join(","))
        .join("\n");

      await storage.logAnalytics({
        event: "applications_exported",
        userId: getAuthenticatedUser(req).id,
        metadata: { total: searched.length, status: statusFilter || "all", search: search || null },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="mtendere-applications-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Admin applications export error:", error);
      res.status(500).json({ message: "Failed to export applications" });
    }
  });

  app.get('/api/admin/applications/analytics', authenticateToken, requireAdmin, async (_req, res) => {
    try {
      const applications = await storage.getAllApplications();
      const byType = applications.reduce<Record<string, number>>((acc, app) => {
        acc[app.type] = (acc[app.type] ?? 0) + 1;
        return acc;
      }, {});
      const byStatus = applications.reduce<Record<string, number>>((acc, app) => {
        acc[app.status] = (acc[app.status] ?? 0) + 1;
        return acc;
      }, {});
      const byStage = applications.reduce<Record<string, number>>((acc, app) => {
        const stage = getApplicationMeta(app.id).stage ?? app.status;
        acc[stage] = (acc[stage] ?? 0) + 1;
        return acc;
      }, {});
      const byCountry = applications.reduce<Record<string, number>>((acc, app) => {
        const applicant = getApplicationMeta(app.id).applicantSnapshot;
        const country = String(applicant?.country ?? "Unspecified");
        acc[country] = (acc[country] ?? 0) + 1;
        return acc;
      }, {});
      const sourceTracking = applications.reduce<Record<string, number>>((acc, app) => {
        const source = getApplicationMeta(app.id).source ?? "public";
        acc[source] = (acc[source] ?? 0) + 1;
        return acc;
      }, {});
      const scores = applications
        .map((app) => getApplicationMeta(app.id).score)
        .filter((score): score is number => typeof score === "number");
      const offerOrHired = applications.filter((app) => ["offer", "hired", "approved"].includes(app.status)).length;
      res.json({
        totalApplications: applications.length,
        pendingApplications: applications.filter((app) => app.status === "pending").length,
        approvedApplications: applications.filter((app) => app.status === "approved").length,
        rejectedApplications: applications.filter((app) => app.status === "rejected").length,
        shortlisted: applications.filter((app) => getApplicationMeta(app.id).shortlist).length,
        interviewsScheduled: applications.reduce((sum, app) => sum + (getApplicationMeta(app.id).interviewSchedule?.length ?? 0), 0),
        averageScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
        conversionRate: applications.length ? Math.round((offerOrHired / applications.length) * 100) : 0,
        byType,
        byStatus,
        byStage,
        byCountry,
        sourceTracking,
      });
    } catch (error) {
      console.error("Admin application analytics error:", error);
      res.status(500).json({ message: "Failed to fetch application analytics" });
    }
  });

  app.get('/api/admin/applications/reports/summary', authenticateToken, requireAdmin, async (_req, res) => {
    try {
      const applications = await storage.getAllApplications();
      res.json({
        generatedAt: new Date().toISOString(),
        module: "applications",
        executiveSummary: {
          total: applications.length,
          pending: applications.filter((app) => app.status === "pending").length,
          inReview: applications.filter((app) => getApplicationMeta(app.id).stage === "review").length,
          approved: applications.filter((app) => app.status === "approved").length,
          interviews: applications.reduce((sum, app) => sum + (getApplicationMeta(app.id).interviewSchedule?.length ?? 0), 0),
        },
        queues: applications
          .filter((app) => ["pending", "under_review"].includes(app.status))
          .map((app) => ({
            id: app.id,
            type: app.type,
            referenceId: app.referenceId,
            status: app.status,
            stage: getApplicationMeta(app.id).stage ?? app.status,
            score: getApplicationMeta(app.id).score ?? null,
          }))
          .slice(0, 50),
        automationReadiness: ["review assignment", "scorecards", "interview scheduling", "status notifications", "PDF confirmations"],
      });
    } catch (error) {
      console.error("Admin application report error:", error);
      res.status(500).json({ message: "Failed to build application report" });
    }
  });

  app.post('/api/admin/applications/:id/comments', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const application = await storage.getApplication(id);
      if (!application) return res.status(404).json({ message: "Application not found" });
      const comment = createOperationalRecord({
        comment: String(req.body.comment ?? "").slice(0, 4000),
        visibility: req.body.visibility === "applicant" ? "applicant" : "internal",
        reviewerId: getAuthenticatedUser(req).id,
      });
      const meta = getApplicationMeta(id);
      setApplicationMeta(id, {
        reviewerComments: [comment, ...(meta.reviewerComments ?? [])].slice(0, 100),
        reviewHistory: [
          createOperationalRecord({ action: "comment_added", reviewerId: getAuthenticatedUser(req).id }),
          ...(meta.reviewHistory ?? []),
        ].slice(0, 100),
      });
      res.status(201).json(comment);
    } catch (error) {
      console.error("Admin application comment error:", error);
      res.status(400).json({ message: "Failed to add application comment", error: getErrorMessage(error) });
    }
  });

  app.put('/api/admin/applications/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const payload = adminApplicationReviewSchema.parse(req.body);
      const existingApplication = await storage.getApplication(id);
      if (!existingApplication) {
        return res.status(404).json({ message: "Application not found" });
      }

      const updateData: Partial<z.infer<typeof insertApplicationSchema>> = {};
      if (payload.status) {
        updateData.status = payload.status;
      }
      if (payload.reviewNotes !== undefined) {
        const existingDocuments =
          existingApplication.documents && typeof existingApplication.documents === "object"
            ? (existingApplication.documents as Record<string, unknown>)
            : {};

        updateData.documents = {
          ...existingDocuments,
          adminReview: {
            notes: payload.reviewNotes,
            reviewedBy: getAuthenticatedUser(req).id,
            reviewedAt: new Date().toISOString(),
          },
        };
      }

      const application =
        Object.keys(updateData).length > 0
          ? await storage.updateApplication(id, updateData)
          : existingApplication;

      const applicationMeta = getApplicationMeta(id);
      const nextReviewRecord = createOperationalRecord({
        status: application.status,
        stage: payload.stage ?? applicationMeta.stage ?? "review",
        score: payload.score ?? applicationMeta.score ?? null,
        shortlist: payload.shortlist ?? applicationMeta.shortlist ?? false,
        interviewAt: payload.interviewAt?.toISOString() ?? null,
        reviewedBy: getAuthenticatedUser(req).id,
        notes: payload.reviewNotes ?? "",
      });
      setApplicationMeta(id, {
        stage:
          payload.stage ??
          (payload.status === "approved" ? "approved" : payload.status && payload.status !== "pending" ? payload.status : applicationMeta.stage ?? "review"),
        score: payload.score ?? applicationMeta.score,
        shortlist: payload.shortlist ?? applicationMeta.shortlist,
        verificationChecks: payload.verificationChecks ?? applicationMeta.verificationChecks,
        evaluationScores: payload.evaluationScores
          ? [
              ...payload.evaluationScores.map((score) =>
                createOperationalRecord({
                  ...score,
                  reviewerId: getAuthenticatedUser(req).id,
                }),
              ),
              ...(applicationMeta.evaluationScores ?? []),
            ].slice(0, 100)
          : applicationMeta.evaluationScores,
        interviewNotes: payload.interviewNotes
          ? [
              createOperationalRecord({
                note: payload.interviewNotes,
                reviewerId: getAuthenticatedUser(req).id,
              }),
              ...(applicationMeta.interviewNotes ?? []),
            ].slice(0, 100)
          : applicationMeta.interviewNotes,
        interviewSchedule: payload.interviewAt
          ? [
              createOperationalRecord({
                startsAt: payload.interviewAt.toISOString(),
                status: "scheduled",
                reviewerId: getAuthenticatedUser(req).id,
              }),
              ...(applicationMeta.interviewSchedule ?? []),
            ].slice(0, 50)
          : applicationMeta.interviewSchedule,
        reviewerComments: payload.reviewNotes
          ? [
              createOperationalRecord({
                comment: payload.reviewNotes,
                reviewerId: getAuthenticatedUser(req).id,
              }),
              ...(applicationMeta.reviewerComments ?? []),
            ].slice(0, 100)
          : applicationMeta.reviewerComments,
        reviewHistory: [nextReviewRecord, ...(applicationMeta.reviewHistory ?? [])].slice(0, 100),
      });

      const [user, scholarship, job] = await Promise.all([
        storage.getUser(application.userId),
        application.type === "scholarship"
          ? storage.getScholarship(application.referenceId)
          : Promise.resolve(null),
        application.type === "job" ? storage.getJob(application.referenceId) : Promise.resolve(null),
      ]);

      const applicantName = user ? `${user.firstName} ${user.lastName}`.trim() : "Applicant";
      const opportunityTitle = scholarship?.title ?? job?.title ?? "Opportunity";
      const enrichedApplication = {
        ...application,
        id: String(application.id),
        applicantName,
        applicantEmail: user?.email ?? "",
        opportunityTitle,
        opportunityType: application.type ?? "application",
        coverLetter: application.notes ?? "",
        meta: getApplicationMeta(id),
      };

      await emitAdminRealtimeEvent(req, {
        event: "application_updated",
        channel: "applications",
        entityType: "application",
        referenceId: id,
        payload: {
          application: enrichedApplication,
          review: {
            previousStatus: existingApplication.status,
            nextStatus: application.status,
            hasReviewNotes: Boolean(payload.reviewNotes),
          },
        },
      });

      await storage.logAnalytics({
        event: "application_reviewed",
        userId: getAuthenticatedUser(req).id,
        metadata: {
          applicationId: id,
          previousStatus: existingApplication.status,
          nextStatus: application.status,
          hasReviewNotes: Boolean(payload.reviewNotes),
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      if (payload.status && payload.status !== existingApplication.status && user?.email) {
        const dashboardUrl = `${env.PUBLIC_APP_URL || `${req.protocol}://${req.get("host")}`}/dashboard`;
        void sendApplicationStatusUpdate({
          email: user.email,
          name: applicantName,
          opportunityTitle,
          opportunityType: application.type,
          status: payload.status,
          reviewNotes: payload.reviewNotes,
          dashboardUrl,
        });
      }

      res.json(enrichedApplication);
    } catch (error) {
      console.error("Admin applications update error:", error);
      res.status(400).json({ message: "Failed to update application", error: getErrorMessage(error) });
    }
  });

  app.get('/api/admin/ai-chat/conversations', authenticateToken, requireAdmin, (req, res) => {
    const { page, limit, offset } = parsePagination(req.query.page, req.query.limit, 100);
    const search = normalizeSearchQuery(req.query.search);
    const channel = normalizeSearchQuery(req.query.channel);
    const flag = normalizeSearchQuery(req.query.flag);
    const status = normalizeSearchQuery(req.query.status);

    const filtered = searchAndRank(listAiChatConversations(), search, (conversation) => [
      conversation.id,
      conversation.userId,
      conversation.userEmail,
      conversation.channel,
      conversation.summary,
      conversation.moderationFlags,
      conversation.messages.map((item) => item.content),
    ]).filter((conversation) => {
      const matchesChannel = !channel || conversation.channel === channel;
      const matchesFlag =
        !flag ||
        ((flag === "any" || flag === "flagged") && conversation.moderationFlags.length > 0) ||
        conversation.moderationFlags.includes(flag);
      const matchesStatus =
        !status ||
        (status === "active" && conversation.isActive) ||
        (status === "closed" && !conversation.isActive);
      return matchesChannel && matchesFlag && matchesStatus;
    });

    res.json({
      conversations: filtered.slice(offset, offset + limit),
      total: filtered.length,
      page,
      limit,
    });
  });

  app.get('/api/admin/ai-chat/conversations/:id', authenticateToken, requireAdmin, (req, res) => {
    const conversation = getAiChatConversation(req.params.id);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });
    res.json(conversation);
  });

  app.put('/api/admin/ai-chat/conversations/:id/close', authenticateToken, requireAdmin, async (req, res) => {
    const conversation = closeAiChatConversation(req.params.id);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });

    await storage.logAnalytics({
      event: "admin_ai_chat_closed",
      userId: getAuthenticatedUser(req).id,
      metadata: { conversationId: conversation.id },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    broadcast("ai-chat", { type: "ai_chat_updated", conversation });
    res.json(conversation);
  });

  app.get('/api/admin/ai/conversations', authenticateToken, requireAdmin, (req, res) => {
    res.redirect(307, "/api/admin/ai-chat/conversations");
  });

  app.post('/api/admin/ai/chat', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const payload = chatRequestSchema.parse(req.body);
      const user = getAuthenticatedUser(req);
      const existing = payload.conversationId ? getAiChatConversation(payload.conversationId) : undefined;
      const response = await getChatResponse(payload.message, {
        channel: "admin",
        platformContext: await buildAiPlatformContext(),
        history: existing?.messages.map((item) => ({
          role: item.role === "system" ? "assistant" : item.role,
          content: item.content,
        })),
      });
      const conversation = appendAiConversationTurn({
        conversationId: payload.conversationId,
        userId: String(user.id),
        userEmail: user.email,
        channel: "admin",
        message: payload.message,
        response,
      });

      await storage.logAnalytics({
        event: "admin_ai_chat_message",
        userId: user.id,
        metadata: {
          conversationId: conversation.id,
          flags: conversation.moderationFlags,
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      broadcast("ai-chat", { type: "ai_chat_updated", conversation });
      res.json({ response, conversationId: conversation.id, conversation });
    } catch (error) {
      console.error("Admin AI chat error:", error);
      res.status(400).json({ message: "Failed to get chat response", error: getErrorMessage(error) });
    }
  });

  app.get('/api/admin/permissions/catalog', authenticateToken, requireAdmin, (_req, res) => {
    const modules = [
      "dashboard",
      "scholarships",
      "jobs",
      "partners",
      "blog",
      "team",
      "users",
      "roles",
      "applications",
      "events",
      "analytics",
      "media",
      "settings",
    ];
    const actions = ["create", "read", "update", "delete", "approve", "publish", "export", "archive"];
    res.json({
      permissions: Array.from(adminPermissionIds).sort(),
      modules,
      actions,
      matrix: modules.map((module) => ({
        module,
        permissions: actions.map((action) => `${module}.${action}`),
      })),
      inheritance: {
        viewer: ["read"],
        writer: ["create", "read", "update", "publish"],
        super_admin: ["*"],
      },
    });
  });

  app.get('/api/admin/roles', authenticateToken, requireSuperAdmin, (req, res) => {
    const search = normalizeSearchQuery(req.query.search);
    const roles = searchAndRank(getAdminRoles(), search, (role) => [
      role.id,
      role.name,
      role.description,
      role.permissions,
    ]).map((role) => ({
      ...role,
      isSystem: isCoreAdminRole(role.id),
    }));
    res.json({ roles, total: roles.length });
  });

  app.post('/api/admin/roles', authenticateToken, requireSuperAdmin, async (req, res) => {
    const payload = adminRoleInputSchema.parse(req.body);
    const id = normalizeRoleId(payload.name) || String(Date.now());
    if (isCoreAdminRole(id) || getAdminRoles().some((role) => role.id === id)) {
      return res.status(409).json({ message: "A role with this name already exists" });
    }

    const role = upsertAdminRole({
      id,
      name: payload.name,
      description: payload.description,
      permissions: payload.permissions.filter((permission) => adminPermissionIds.has(permission)),
      isActive: payload.isActive,
    });
    await emitAdminRealtimeEvent(req, {
      event: "role_created",
      channel: "admin-roles",
      entityType: "role",
      referenceId: role.id,
      payload: { role },
    });
    res.status(201).json(role);
  });

  app.put('/api/admin/roles/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
    const existing = getAdminRoles().find((role) => role.id === req.params.id);
    if (!existing) return res.status(404).json({ message: "Role not found" });
    const payload = adminRoleInputSchema.parse(req.body);
    const role = upsertAdminRole({
      id: req.params.id,
      name: isCoreAdminRole(req.params.id) ? existing.name : payload.name,
      description: payload.description,
      permissions: payload.permissions.filter((permission) => adminPermissionIds.has(permission)),
      isActive: isCoreAdminRole(req.params.id) ? true : payload.isActive,
    });
    await emitAdminRealtimeEvent(req, {
      event: "role_updated",
      channel: "admin-roles",
      entityType: "role",
      referenceId: role.id,
      payload: { role },
    });
    res.json(role);
  });

  app.delete('/api/admin/roles/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
    const deleted = deleteAdminRole(req.params.id);
    if (!deleted) {
      return res.status(isCoreAdminRole(req.params.id) ? 409 : 404).json({
        message: isCoreAdminRole(req.params.id)
          ? "System roles are protected and cannot be deleted"
          : "Role not found",
      });
    }

    await emitAdminRealtimeEvent(req, {
      event: "role_deleted",
      channel: "admin-roles",
      entityType: "role",
      referenceId: req.params.id,
      payload: { id: req.params.id },
    });
    res.status(204).send();
  });

  app.get('/api/admin/settings', authenticateToken, requireSuperAdmin, (_req, res) => {
    res.json(getAdminSettings());
  });

  app.put('/api/admin/settings', authenticateToken, requireSuperAdmin, async (req, res) => {
    const payload = adminSettingsUpdateSchema.parse(req.body);
    const settings = updateAdminSettings(payload);
    await emitAdminRealtimeEvent(req, {
      event: "settings_updated",
      channel: "admin-settings",
      entityType: "settings",
      payload: { settings },
    });
    res.json(settings);
  });

  app.post('/api/admin/settings/invalidate-sessions', authenticateToken, requireSuperAdmin, async (req, res) => {
    const invalidatedAt = new Date().toISOString();
    const settings = updateAdminSettings({ authTokenInvalidBefore: invalidatedAt });
    await storage.logAnalytics({
      event: "admin_sessions_invalidated",
      userId: getAuthenticatedUser(req).id,
      metadata: { invalidatedAt },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    await emitAdminRealtimeEvent(req, {
      event: "sessions_invalidated",
      channel: "admin-settings",
      entityType: "settings",
      payload: { invalidatedAt },
    });
    res.json({ invalidatedAt, settings });
  });

  app.post('/api/admin/settings/cache/clear', authenticateToken, requireSuperAdmin, async (req, res) => {
    const clearedAt = new Date().toISOString();
    const currentSettings = getAdminSettings();
    const settings = updateAdminSettings({
      cacheVersion: (currentSettings.cacheVersion || 1) + 1,
    });
    await storage.logAnalytics({
      event: "admin_cache_cleared",
      userId: getAuthenticatedUser(req).id,
      metadata: { clearedAt, cacheVersion: settings.cacheVersion },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    await emitAdminRealtimeEvent(req, {
      event: "cache_cleared",
      channel: "admin-settings",
      entityType: "settings",
      payload: { clearedAt, cacheVersion: settings.cacheVersion },
    });
    res.json({ clearedAt, cacheVersion: settings.cacheVersion });
  });

  app.get('/api/admin/notifications', authenticateToken, requireAdminPortal, async (req, res) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const items = (await storage.getAnalytics()).map((item) => ({
        id: `analytics-${item.id}`,
        title: item.event,
        message: item.metadata ? JSON.stringify(item.metadata) : "",
        type: "info",
        isRead: isNotificationRead(`analytics-${item.id}`),
        createdAt: item.timestamp,
      }));
      const { items: paged, total } = paginate(items, page, limit);
      res.json({ notifications: paged, total });
    } catch (error) {
      console.error("Admin notifications error:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.put('/api/admin/notifications/:id/read', authenticateToken, requireAdminPortal, (req, res) => {
    markNotificationRead(req.params.id);
    res.status(204).send();
  });

  app.put('/api/admin/notifications/read-all', authenticateToken, requireAdminPortal, async (_req, res) => {
    const ids = (await storage.getAnalytics()).map((item) => `analytics-${item.id}`);
    markNotificationsRead(ids);
    res.status(204).send();
  });

  app.get('/api/admin/audit-logs', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 50);

      const logs = (await storage.getAnalytics()).map((item) => {
        const meta = parseAnalyticsMeta(item.metadata);
        return {
          id: String(item.id),
          userId: item.userId ? String(item.userId) : null,
          action: item.event,
          entityType: meta.type ?? "activity",
          entityId:
            meta.referenceId !== undefined && meta.referenceId !== null
              ? String(meta.referenceId)
              : null,
          oldData: null,
          newData: item.metadata ?? null,
          ipAddress: item.ipAddress ?? null,
          userAgent: item.userAgent ?? null,
          createdAt: item.timestamp,
        };
      });

      const { items, total } = paginate(logs, page, limit);
      res.json({ logs: items, total });
    } catch (error) {
      console.error("Admin audit logs error:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  app.post('/api/admin/upload', authenticateToken, requireEditor, upload.single("file"), (req, res) => {
    const file = (req as MulterRequest).file;
    if (!file) return res.status(400).json({ message: "No file uploaded" });
    res.json({
      url: `/uploads/${file.filename}`,
      originalName: file.originalname,
      size: file.size,
      type: file.mimetype,
    });
  });

  app.post('/api/admin/upload/multiple', authenticateToken, requireEditor, upload.array("files", 10), (req, res) => {
    const filesPayload = (req as MulterRequest).files;
    const files = Array.isArray(filesPayload) ? filesPayload : [];
    res.json({
      files: files.map((file) => ({
        url: `/uploads/${file.filename}`,
        originalName: file.originalname,
        size: file.size,
        type: file.mimetype,
      })),
    });
  });

  app.get("/api/admin/media/assets", authenticateToken, requireEditor, (_req, res) => {
    res.json({
      root: "assets/imgs",
      modules: Array.from(mediaAssetModules).sort(),
      assets: listMediaAssets(),
    });
  });

  app.post(
    "/api/admin/media/assets/:module",
    authenticateToken,
    requireEditor,
    mediaAssetUpload.array("files", 10),
    (req, res) => {
      const moduleName = String(req.params.module || "").toLowerCase();
      const filesPayload = (req as MulterRequest).files;
      const files = Array.isArray(filesPayload) ? filesPayload : [];
      const rejected: Array<{ originalName: string; reason: string }> = [];
      const accepted = files.filter((file) => {
        if (isValidImageFile(file.path)) return true;

        rejected.push({ originalName: file.originalname, reason: "invalid-image-signature" });
        try {
          fs.unlinkSync(file.path);
        } catch (error) {
          console.error("Failed to remove invalid media upload:", error);
        }
        return false;
      });

      if (!accepted.length && rejected.length) {
        return res.status(400).json({
          message: "No valid image files uploaded.",
          rejected,
        });
      }

      res.json({
        module: moduleName,
        files: accepted.map((file) => {
          const relativePath = path.relative(mediaAssetRoot, file.path).replace(/\\/g, "/");
          return {
            path: `assets/imgs/${relativePath}`,
            reference: relativePath,
            previewUrl: toMediaAssetUrl(relativePath),
            module: moduleName,
            originalName: file.originalname,
            size: file.size,
            type: file.mimetype,
            valid: true,
            hash: getMediaAssetHash(file.path),
            kind: getMediaAssetKind(relativePath),
            contentType: getMediaContentType(relativePath),
            qualityFlags: getMediaQualityFlags(relativePath, file.size),
            note: "This source asset is governed and can be assigned immediately.",
          };
        }),
        rejected,
      });
    },
  );

  app.post("/api/admin/media/replace-references", authenticateToken, requireEditor, async (req, res) => {
    try {
      const payload = mediaReplaceReferencesSchema.parse(req.body);
      const fromReference = normalizeMediaAssetReference(payload.from) || payload.from.trim();
      const toReference = normalizeMediaAssetReference(payload.to);

      if (!toReference || !isValidMediaReference(toReference)) {
        return res.status(400).json({ message: "Replacement asset must be a valid governed media reference." });
      }

      if (fromReference === toReference) {
        return res.status(400).json({ message: "Choose two different media references." });
      }

      const matchesReference = (value?: string | null) =>
        Boolean(value && (value === payload.from || normalizeMediaAssetReference(value) === fromReference));
      const replacements: Array<{ module: string; id: number; title: string; field: string }> = [];

      const [blogs, team, scholarshipsList, jobsList, partnersList, testimonialsList, eventsList] = await Promise.all([
        storage.getAllBlogPosts(),
        storage.getAllTeamMembers(),
        storage.getAllScholarships(),
        storage.getAllJobs(),
        storage.getAllPartners(),
        storage.getAllTestimonials(),
        storage.getAllEvents(),
      ]);

      for (const item of blogs) {
        const meta = getBlogMeta(item.id);
        if (matchesReference(item.imageUrl)) {
          await storage.updateBlogPost(item.id, { imageUrl: toReference });
          replacements.push({ module: "blogs", id: item.id, title: item.title, field: "imageUrl" });
        }
        if (matchesReference(meta.featuredImage)) {
          setBlogMeta(item.id, { ...meta, featuredImage: toReference });
          replacements.push({ module: "blogs", id: item.id, title: item.title, field: "featuredImage" });
        }
      }

      for (const item of team) {
        const meta = getTeamMeta(item.id);
        if (matchesReference(item.imageUrl)) {
          await storage.updateTeamMember(item.id, { imageUrl: toReference });
          replacements.push({ module: "teams", id: item.id, title: item.name, field: "imageUrl" });
        }
        if (matchesReference(meta.profileImage)) {
          setTeamMeta(item.id, { ...meta, profileImage: toReference });
          replacements.push({ module: "teams", id: item.id, title: item.name, field: "profileImage" });
        }
      }

      for (const item of scholarshipsList) {
        const meta = getScholarshipMeta(item.id);
        if (matchesReference(item.imageUrl)) {
          await storage.updateScholarship(item.id, { imageUrl: toReference });
          replacements.push({ module: "scholarships", id: item.id, title: item.title, field: "imageUrl" });
        }
        if (matchesReference(meta.featuredImage)) {
          setScholarshipMeta(item.id, { ...meta, featuredImage: toReference });
          replacements.push({ module: "scholarships", id: item.id, title: item.title, field: "featuredImage" });
        }
      }

      for (const item of jobsList) {
        const meta = getJobMeta(item.id);
        if (matchesReference(meta.featuredImage)) {
          setJobMeta(item.id, { ...meta, featuredImage: toReference });
          replacements.push({ module: "jobs", id: item.id, title: item.title, field: "featuredImage" });
        }
      }

      for (const item of partnersList) {
        const meta = getPartnerMeta(item.id);
        let nextMeta = meta;
        if (matchesReference(item.logoUrl)) {
          await storage.updatePartner(item.id, { logoUrl: toReference });
          replacements.push({ module: "partners", id: item.id, title: item.name, field: "logoUrl" });
        }
        if (matchesReference(item.coverImage)) {
          await storage.updatePartner(item.id, { coverImage: toReference });
          replacements.push({ module: "partners", id: item.id, title: item.name, field: "coverImage" });
        }
        if (matchesReference(meta.logo)) {
          nextMeta = { ...nextMeta, logo: toReference };
          setPartnerMeta(item.id, nextMeta);
          replacements.push({ module: "partners", id: item.id, title: item.name, field: "logo" });
        }
        if (matchesReference(meta.coverImage)) {
          nextMeta = { ...nextMeta, coverImage: toReference };
          setPartnerMeta(item.id, nextMeta);
          replacements.push({ module: "partners", id: item.id, title: item.name, field: "meta.coverImage" });
        }
      }

      for (const item of testimonialsList) {
        if (matchesReference(item.imageUrl)) {
          await storage.updateTestimonial(item.id, { imageUrl: toReference });
          replacements.push({
            module: "testimonials",
            id: item.id,
            title: item.authorName || `Testimonial ${item.id}`,
            field: "imageUrl",
          });
        }
      }

      for (const item of eventsList) {
        if (matchesReference(item.coverImage)) {
          await storage.updateEvent(item.id, { coverImage: toReference });
          replacements.push({ module: "events", id: item.id, title: item.title, field: "coverImage" });
        }
      }

      await storage.logAnalytics({
        event: "media_references_replaced",
        userId: getAuthenticatedUser(req).id,
        metadata: {
          from: fromReference,
          to: toReference,
          count: replacements.length,
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json({ from: fromReference, to: toReference, replacedCount: replacements.length, replacements });
    } catch (error) {
      console.error("Admin media replacement error:", getErrorLogMessage(error));
      res.status(400).json({ message: "Failed to replace media references", error: getErrorMessage(error) });
    }
  });

  app.get("/api/admin/seo/audit", authenticateToken, requireEditor, async (req, res) => {
    try {
      const baseUrl = getPublicBaseUrl(req);
      const [scholarshipsList, jobsList, partnersList, blogList, eventsList, teamList] = await Promise.all([
        storage.getAllScholarships(),
        storage.getAllJobs(),
        storage.getAllPartners(),
        storage.getAllBlogPosts(),
        storage.getAllEvents(),
        storage.getAllTeamMembers(),
      ]);

      const normalizeText = (value: unknown) => String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const trimDescription = (value: unknown, fallback: string) => {
        const text = normalizeText(value) || normalizeText(fallback);
        return text.length <= 158 ? text : `${text.slice(0, 157).replace(/\s+\S*$/, "")}.`;
      };
      const pageRecords = [
        ...staticSitemapPages.map((page) => ({
          module: "page",
          id: page.path,
          title: page.title,
          description: `${page.title} from Mtendere Education Consult`,
          canonical: absoluteSitemapUrl(page.path, baseUrl),
          image: page.image,
          structuredData: ["Organization", "WebSite", "BreadcrumbList", "CollectionPage"],
          status: "public",
        })),
        ...scholarshipsList.map((item) => {
          const publicItem = toPublicScholarship(item);
          return {
            module: "scholarship",
            id: item.id,
            title: String(publicItem.seoMeta?.title ?? publicItem.title),
            description: trimDescription(publicItem.seoMeta?.description, publicItem.shortDescription || publicItem.description),
            canonical: absoluteSitemapUrl(`/scholarships/${publicItem.slug || publicItem.id}`, baseUrl),
            image: publicItem.bannerImage || publicItem.imageUrl,
            structuredData: ["EducationalOccupationalProgram", "Offer", "FAQPage", "BreadcrumbList"],
            status: item.isActive === false ? "inactive" : "public",
          };
        }),
        ...jobsList.map((item) => {
          const publicItem = toPublicJob(item);
          return {
            module: "job",
            id: item.id,
            title: String(publicItem.seoMeta?.title ?? `${publicItem.title} at ${publicItem.company}`),
            description: trimDescription(publicItem.seoMeta?.description, publicItem.description),
            canonical: absoluteSitemapUrl(`/jobs/${publicItem.slug || publicItem.id}`, baseUrl),
            image: publicItem.imageUrl || publicItem.companyLogo,
            structuredData: ["JobPosting", "FAQPage", "BreadcrumbList"],
            status: item.isActive === false ? "inactive" : "public",
          };
        }),
        ...partnersList.map((item) => {
          const publicItem = toPublicPartner(item);
          return {
            module: "partner",
            id: item.id,
            title: `${publicItem.name} Partner Profile`,
            description: trimDescription(publicItem.description, `${publicItem.name} partner institution profile.`),
            canonical: absoluteSitemapUrl(`/partners/${publicItem.id}`, baseUrl),
            image: publicItem.logoUrl || publicItem.coverImage,
            structuredData: ["EducationalOrganization", "BreadcrumbList"],
            status: item.isActive === false ? "inactive" : "public",
          };
        }),
        ...blogList.map((item) => {
          const publicItem = toPublicBlogPost(item);
          return {
            module: "blog",
            id: item.id,
            title: String(publicItem.seoMeta?.title ?? publicItem.title),
            description: trimDescription(publicItem.seoMeta?.description, publicItem.excerpt || publicItem.content),
            canonical: absoluteSitemapUrl(`/blog/${publicItem.slug || publicItem.id}`, baseUrl),
            image: publicItem.imageUrl,
            structuredData: ["BlogPosting", "FAQPage", "BreadcrumbList"],
            status: item.isPublished === false ? "draft" : "public",
          };
        }),
        ...eventsList.map((item) => ({
          module: "event",
          id: item.id,
          title: String(item.seoMeta?.title ?? item.title),
          description: trimDescription(item.seoMeta?.description, item.summary || item.description),
          canonical: absoluteSitemapUrl(`/events/${item.slug || item.id}`, baseUrl),
          image: item.coverImage,
          structuredData: ["Event", "FAQPage", "BreadcrumbList"],
          status: item.status,
        })),
        ...teamList.map((item) => {
          const publicItem = toPublicTeamMember(item);
          return {
            module: "team",
            id: item.id,
            title: `${publicItem.name} - ${publicItem.title || publicItem.position}`,
            description: trimDescription(publicItem.biography || publicItem.bio, `${publicItem.name} profile at Mtendere Education Consult.`),
            canonical: absoluteSitemapUrl(`/team/${publicItem.slug || item.id}`, baseUrl),
            image: publicItem.imageUrl || publicItem.profileImage,
            structuredData: ["Person", "BreadcrumbList"],
            status: item.isActive === false ? "inactive" : "public",
          };
        }),
      ];

      const issues: Array<Record<string, unknown>> = [];
      const duplicateBuckets = (field: "title" | "description") =>
        Object.values(
          pageRecords.reduce<Record<string, typeof pageRecords>>((groups, page) => {
            const key = String(page[field]).toLowerCase();
            if (!key) return groups;
            groups[key] = groups[key] || [];
            groups[key].push(page);
            return groups;
          }, {}),
        ).filter((group) => group.length > 1);

      pageRecords.forEach((page) => {
        if (!page.title || String(page.title).length < 12) {
          issues.push({ severity: "error", module: page.module, id: page.id, issue: "Missing or weak SEO title", autoRemediation: "Generated a contextual title from content fields." });
        }
        if (!page.description || String(page.description).length < 50) {
          issues.push({ severity: "error", module: page.module, id: page.id, issue: "Missing or weak meta description", autoRemediation: "Generated a concise description from content summary fields." });
        }
        if (!page.image) {
          issues.push({ severity: "warning", module: page.module, id: page.id, issue: "Missing share/image-search image", autoRemediation: "Governed image fallbacks will assign category-specific imagery in the UI." });
        } else if (!/^https?:\/\//i.test(String(page.image)) && !isValidMediaReference(String(page.image)) && !String(page.image).startsWith("/src/assets/")) {
          issues.push({ severity: "info", module: page.module, id: page.id, issue: "Image is not in the approved media library", image: page.image, autoRemediation: "Use the media audit to replace this with a governed local asset or verified official logo." });
        }
      });

      duplicateBuckets("title").forEach((group) => {
        issues.push({
          severity: "warning",
          issue: "Duplicate meta title",
          pages: group.map((page) => ({ module: page.module, id: page.id, canonical: page.canonical })),
        });
      });
      duplicateBuckets("description").forEach((group) => {
        issues.push({
          severity: "warning",
          issue: "Duplicate meta description",
          pages: group.map((page) => ({ module: page.module, id: page.id, canonical: page.canonical })),
        });
      });

      const repeatedImages = Object.values(
        pageRecords.reduce<Record<string, typeof pageRecords>>((groups, page) => {
          const key = String(page.image || "");
          if (!key) return groups;
          groups[key] = groups[key] || [];
          groups[key].push(page);
          return groups;
        }, {}),
      ).filter((group) => group.length > 3);

      repeatedImages.forEach((group) => {
        issues.push({
          severity: "info",
          issue: "Repeated image assignment",
          image: group[0].image,
          usageCount: group.length,
          recommendation: "Use more category-specific images for image search diversity where the repeated asset is not an official logo.",
        });
      });

      await storage.logAnalytics({
        event: "seo_audit_run",
        userId: getAuthenticatedUser(req).id,
        metadata: {
          checked: pageRecords.length,
          issues: issues.length,
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json({
        generatedAt: new Date().toISOString(),
        checked: pageRecords.length,
        summary: {
          pages: pageRecords.filter((page) => page.module === "page").length,
          scholarships: pageRecords.filter((page) => page.module === "scholarship").length,
          jobs: pageRecords.filter((page) => page.module === "job").length,
          blogPosts: pageRecords.filter((page) => page.module === "blog").length,
          events: pageRecords.filter((page) => page.module === "event").length,
          partners: pageRecords.filter((page) => page.module === "partner").length,
          teamProfiles: pageRecords.filter((page) => page.module === "team").length,
          issues: issues.length,
          duplicateTitles: duplicateBuckets("title").length,
          duplicateDescriptions: duplicateBuckets("description").length,
          repeatedImages: repeatedImages.length,
        },
        sitemaps: ["/sitemap.xml", ...sitemapPaths].map((path) => absoluteSitemapUrl(path, baseUrl)),
        pages: pageRecords,
        issues,
        governance: {
          canonicalPolicy: "All public pages receive query-free canonical URLs. Admin, dashboard, auth, and tokenized routes are excluded through robots and client noindex metadata.",
          imagePolicy: ["approved local media", "verified official external source", "governed category fallback", "global branded fallback"],
          structuredDataPolicy: ["Organization", "WebSite", "BreadcrumbList", "JobPosting", "Event", "BlogPosting", "EducationalOrganization", "EducationalOccupationalProgram", "Person", "FAQPage"],
        },
      });
    } catch (error) {
      console.error("Admin SEO audit error:", error);
      res.status(500).json({ message: "Failed to audit SEO governance" });
    }
  });

  app.get("/api/admin/seo/analytics", authenticateToken, requireEditor, async (_req, res) => {
    try {
      const end = new Date();
      const start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
      const [analytics, sitemapData] = await Promise.all([
        storage.getAnalytics(start, end),
        buildPublicSitemapData(env.PUBLIC_APP_URL || "https://mtendereeducationconsult.com"),
      ]);
      const searchEvents = analytics.filter((item) => item.event === "site_search");
      const queryCounts = searchEvents.reduce<Record<string, number>>((counts, item) => {
        const query = typeof item.metadata === "object" && item.metadata && "query" in item.metadata ? String(item.metadata.query) : "";
        if (!query) return counts;
        counts[query] = (counts[query] || 0) + 1;
        return counts;
      }, {});
      const publicUrlCount = [
        ...sitemapData.pages,
        ...sitemapData.scholarships,
        ...sitemapData.jobs,
        ...sitemapData.blog,
        ...sitemapData.events,
        ...sitemapData.partners,
        ...sitemapData.team,
      ].length;

      res.json({
        window: { start: start.toISOString(), end: end.toISOString() },
        organicTrafficProxy: {
          siteSearches: searchEvents.length,
          topSearchQueries: Object.entries(queryCounts)
            .sort((left, right) => right[1] - left[1])
            .slice(0, 20)
            .map(([query, count]) => ({ query, count })),
          publicIndexableUrls: publicUrlCount,
          imageSitemapUrls: [
            ...sitemapData.pages,
            ...sitemapData.scholarships,
            ...sitemapData.jobs,
            ...sitemapData.blog,
            ...sitemapData.events,
            ...sitemapData.partners,
            ...sitemapData.team,
          ].filter((item) => (item.images ?? []).length > 0).length,
        },
        integrations: {
          googleAnalytics4: Boolean(process.env.GA4_MEASUREMENT_ID || process.env.VITE_GA4_MEASUREMENT_ID),
          googleSearchConsole: Boolean(process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL || process.env.GOOGLE_SITE_VERIFICATION),
          bingWebmasterTools: Boolean(process.env.BING_WEBMASTER_SITE_URL || process.env.BING_SITE_VERIFICATION),
          vercelAnalytics: true,
        },
        dashboards: [
          "Organic traffic",
          "Indexed pages",
          "Search queries",
          "Click-through rate",
          "Top content",
          "Image search traffic",
          "Sitemap coverage",
        ],
      });
    } catch (error) {
      console.error("Admin SEO analytics error:", error);
      res.status(500).json({ message: "Failed to load SEO analytics" });
    }
  });

  app.get("/api/admin/media/audit", authenticateToken, requireEditor, async (_req, res) => {
    try {
      const [blogs, team, scholarshipsList, jobsList, partnersList, testimonialsList, eventsList] = await Promise.all([
        storage.getAllBlogPosts(),
        storage.getAllTeamMembers(),
        storage.getAllScholarships(),
        storage.getAllJobs(),
        storage.getAllPartners(),
        storage.getAllTestimonials(),
        storage.getAllEvents(),
      ]);

      const references = [
        ...blogs.map((item) => ({ module: "blogs", id: item.id, title: item.title, field: "imageUrl", value: item.imageUrl })),
        ...team.map((item) => ({ module: "teams", id: item.id, title: item.name, field: "imageUrl", value: item.imageUrl })),
        ...scholarshipsList.map((item) => ({
          module: "scholarships",
          id: item.id,
          title: item.title,
          field: "imageUrl",
          value: item.imageUrl,
        })),
        ...jobsList.map((item) => ({
          module: "jobs",
          id: item.id,
          title: item.title,
          field: "featuredImage",
          value: getJobMeta(item.id).featuredImage ?? null,
        })),
        ...partnersList.map((item) => ({ module: "partners", id: item.id, title: item.name, field: "logoUrl", value: item.logoUrl })),
        ...testimonialsList.map((item) => ({
          module: "testimonials",
          id: item.id,
          title: item.authorName || `Testimonial ${item.id}`,
          field: "imageUrl",
          value: item.imageUrl,
        })),
        ...eventsList.map((item) => ({
          module: "events",
          id: item.id,
          title: item.title,
          field: "coverImage",
          value: item.coverImage,
        })),
      ];

      const externalReferences = references
        .filter((reference) => typeof reference.value === "string" && /^https?:\/\//i.test(reference.value))
        .map((reference) => ({
          ...reference,
          reason: "external-url",
          recommendation: "Verify this is an official institution, employer, event, or profile asset before publishing.",
        }));
      const invalidReferences = references
        .filter((reference) => {
          if (typeof reference.value === "string" && /^https?:\/\//i.test(reference.value)) return false;
          return !isValidMediaReference(reference.value);
        })
        .map((reference) => ({
          ...reference,
          reason: reference.value
            ? String(reference.value).startsWith("/uploads/")
                ? "upload-folder"
                : "missing-local-asset"
            : "missing",
        }));
      const assets = listMediaAssets();
      const duplicateGroups = Object.values(
        assets.reduce<Record<string, { hash: string; references: string[]; totalBytes: number }>>((groups, asset) => {
          if (!asset.hash) return groups;
          const current = groups[asset.hash] || { hash: asset.hash, references: [], totalBytes: 0 };
          current.references.push(asset.reference);
          current.totalBytes += asset.size;
          groups[asset.hash] = current;
          return groups;
        }, {}),
      )
        .filter((group) => group.references.length > 1)
        .sort((left, right) => right.references.length - left.references.length);

      const qualityFindings = assets.flatMap((asset) =>
        asset.qualityFlags.map((flag) => ({
          reference: asset.reference,
          severity: flag === "large-source-file" || flag === "generic-or-placeholder" ? "warning" : "info",
          issue:
            flag === "large-source-file"
              ? "Large source image"
              : flag === "generic-or-placeholder"
                ? "Generic or placeholder-style asset"
                : "Non-WebP image",
          recommendation:
            flag === "large-source-file"
              ? "Replace with a compressed responsive source under 2 MB before assigning to public pages."
              : flag === "generic-or-placeholder"
                ? "Use a content-specific image or official institution logo instead of a default visual."
                : "Prefer WebP for new uploads where visual quality allows.",
        })),
      );

      await storage.logAnalytics({
        event: "media_audit_run",
        userId: null,
        metadata: {
          checked: references.length,
          invalid: invalidReferences.length,
        },
        ipAddress: null,
        userAgent: null,
      });

      res.json({
        checked: references.length,
        invalidCount: invalidReferences.length,
        invalidReferences,
        externalReviewCount: externalReferences.length,
        externalReferences,
        fallbackPolicy: ["assigned asset", "category default", "global default", "styled initials placeholder"],
        duplicateGroups,
        qualityFindings,
        assets,
      });
    } catch (error) {
      console.error("Admin media audit error:", error);
      res.status(500).json({ message: "Failed to audit media assets" });
    }
  });

  // Analytics routes
  app.get('/api/analytics/summary', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const summary = await storage.getAnalyticsSummary();
      res.json(summary);
    } catch (error) {
      console.error('Analytics summary error:', error);
      res.status(500).json({ message: 'Failed to fetch analytics summary' });
    }
  });

  app.get('/api/analytics', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const analytics = await storage.getAnalytics(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(analytics);
    } catch (error) {
      console.error('Analytics fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch analytics' });
    }
  });

  app.post('/api/analytics/track', async (req, res) => {
    try {
      if (!guardPublicFlowRateLimit(req, res, "analytics_track", 60, 60_000)) return;
      const payload = publicAnalyticsTrackSchema.parse(req.body);
      const user = getOptionalAuthenticatedUser(req);
      await storage.logAnalytics({
        event: payload.event,
        userId: user?.id ?? null,
        metadata: {
          ...payload.metadata,
          source: payload.source ?? payload.metadata?.source,
          landingPage: req.get("referer") || payload.metadata?.landingPage,
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      res.status(202).json({ message: "Event tracked" });
    } catch (error) {
      console.error("Public analytics tracking error:", getErrorLogMessage(error));
      res.status(400).json({ message: "Failed to track event", error: getErrorMessage(error) });
    }
  });

  // Saved Items routes
  app.get('/api/saved-items', authenticateToken, async (req, res) => {
    try {
      const userId = getAuthenticatedUser(req).id;
      const items = await storage.getUserSavedItems(userId);
      res.json(items);
    } catch (error) {
      console.error('Saved items fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch saved items' });
    }
  });

  app.post('/api/saved-items', authenticateToken, async (req, res) => {
    try {
      const userId = getAuthenticatedUser(req).id;
      const existing = await storage.isItemSaved(userId, String(req.body.type), Number(req.body.referenceId));
      if (existing) {
        return res.status(409).json({ message: "Item is already saved" });
      }
      const savedItemData = insertSavedItemSchema.parse({
        ...req.body,
        userId,
      });
      const item = await storage.createSavedItem(savedItemData);
      res.status(201).json(item);
    } catch (error) {
      console.error('Saved item creation error:', error);
      res.status(400).json({ message: 'Failed to save item', error: getErrorMessage(error) });
    }
  });

  app.delete('/api/saved-items/:id', authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });
      const success = await storage.deleteSavedItem(id);
      if (success) {
        res.json({ message: 'Saved item removed' });
      } else {
        res.status(404).json({ message: 'Saved item not found' });
      }
    } catch (error) {
      console.error('Saved item deletion error:', error);
      res.status(500).json({ message: 'Failed to remove saved item' });
    }
  });

  app.get('/api/saved-items/check', authenticateToken, async (req, res) => {
    try {
      const userId = getAuthenticatedUser(req).id;
      const { type, referenceId } = req.query;
      if (!type || !referenceId) {
        return res.status(400).json({ message: 'Type and referenceId required' });
      }
      const isSaved = await storage.isItemSaved(userId, String(type), Number(referenceId));
      res.json({ isSaved });
    } catch (error) {
      console.error('Saved item check error:', error);
      res.status(500).json({ message: 'Failed to check saved status' });
    }
  });

  // Newsletter / subscription routes
  app.post('/api/subscribers', async (req, res) => {
    try {
      if (!guardPublicFlowRateLimit(req, res, "newsletter", 10, 10 * 60 * 1000)) return;
      const payload = subscriberRequestSchema.parse(req.body);

      // Honeypot spam trap. Return success without storing so bots get no signal.
      if (payload.website) {
        void logAnalyticsBestEffort({
          event: "subscriber_spam_trapped",
          metadata: { source: payload.source },
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        });
        return res.status(201).json({
          message: "Please check your inbox to confirm your subscription.",
        });
      }

      const recaptcha = await verifyRecaptcha(payload.recaptchaToken, req, "newsletter");
      if (!recaptcha.ok) {
        return res.status(400).json({ message: recaptcha.reason || "reCAPTCHA verification failed" });
      }

      const verificationToken = randomBytes(32).toString("hex");
      const unsubscribeToken = randomBytes(32).toString("hex");
      const existing = await storage.getSubscriberByEmail(payload.email);
      const subscriberPayload = insertSubscriberSchema.parse({
        email: payload.email,
        name: payload.name ?? existing?.name ?? null,
        preferences: payload.preferences ?? existing?.preferences ?? ["scholarships", "jobs", "news"],
        source: payload.source,
        status: "pending",
        verificationToken,
        unsubscribeToken,
        verifiedAt: null,
        unsubscribedAt: null,
      });

      const subscriber = existing
        ? await storage.updateSubscriber(existing.id, subscriberPayload)
        : await storage.createSubscriber(subscriberPayload);

      const emailPreferenceToken = createEmailPreferenceToken(subscriber.email);
      try {
        await storage.upsertEmailPreference({
          userId: null,
          email: subscriber.email,
          categories: Object.fromEntries(
            subscriptionPreferenceCategories.map((category) => [
              category,
              (subscriber.preferences || []).includes(category),
            ]),
          ),
          consentStatus: payload.consentAccepted ? "pending_double_opt_in" : "pending",
          consentSource: payload.source,
          consentAt: payload.consentAccepted ? new Date() : null,
          unsubscribedAt: null,
          unsubscribeTokenHash: createEmailPreferenceTokenHash(emailPreferenceToken),
          auditTrail: [
            {
              action: "newsletter_signup",
              preferences: subscriber.preferences,
              consentAccepted: payload.consentAccepted,
              at: new Date().toISOString(),
            },
          ],
        });
      } catch (preferenceError) {
        console.warn("Email preference sync skipped:", getErrorMessage(preferenceError));
      }

      const baseUrl = getApiRequestBaseUrl(req);
      const verificationUrl = `${baseUrl}/api/subscribers/verify/${verificationToken}`;
      const unsubscribeUrl = `${baseUrl}/api/subscribers/unsubscribe/${unsubscribeToken}`;

      void sendSubscriptionConfirmation({
        email: subscriber.email,
        name: subscriber.name,
        verificationUrl,
        unsubscribeUrl,
      });

      void logAnalyticsBestEffort({
        event: "subscriber_created",
        metadata: {
          email: subscriber.email,
          source: payload.source,
          preferences: subscriber.preferences,
          consentAccepted: payload.consentAccepted,
          recaptchaSkipped: "skipped" in recaptcha ? recaptcha.skipped : false,
          recaptchaScore: "score" in recaptcha ? recaptcha.score : undefined,
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.status(201).json({
        message: "Please check your inbox to confirm your subscription.",
        subscriber: {
          id: subscriber.id,
          email: subscriber.email,
          status: subscriber.status,
          preferences: subscriber.preferences,
        },
      });
    } catch (error) {
      console.error('Subscriber creation error:', getErrorLogMessage(error));
      res.status(400).json({
        message: getPublicErrorMessage(error, "Failed to subscribe"),
        error: getErrorMessage(error),
      });
    }
  });

  app.get('/api/subscribers/verify/:token', async (req, res) => {
    try {
      const subscriber = await storage.getSubscriberByVerificationToken(req.params.token);
      if (!subscriber) return res.status(404).json({ message: "Verification link not found" });

      await storage.updateSubscriber(subscriber.id, {
        status: "active",
        verifiedAt: new Date(),
        verificationToken: null,
      });
      try {
        const preference = await storage.getEmailPreferenceByEmail(subscriber.email);
        if (preference) {
          await storage.updateEmailPreference(preference.id, {
            consentStatus: "active",
            consentAt: preference.consentAt || new Date(),
            categories: Object.fromEntries(
              subscriptionPreferenceCategories.map((category) => [
                category,
                (subscriber.preferences || []).includes(category),
              ]),
            ),
            auditTrail: [
              ...(preference.auditTrail || []),
              { action: "double_opt_in_verified", at: new Date().toISOString() },
            ],
          });
        }
      } catch (preferenceError) {
        console.warn("Email preference verification sync skipped:", getErrorMessage(preferenceError));
      }

      const redirectUrl = `${env.PUBLIC_APP_URL || "/"}${env.PUBLIC_APP_URL ? "" : ""}`;
      res.redirect(302, `${redirectUrl}?subscription=verified`);
    } catch (error) {
      console.error('Subscriber verification error:', error);
      res.status(500).json({ message: "Failed to verify subscription" });
    }
  });

  app.get('/api/subscribers/unsubscribe/:token', async (req, res) => {
    try {
      const subscriber = await storage.getSubscriberByUnsubscribeToken(req.params.token);
      if (!subscriber) return res.status(404).json({ message: "Unsubscribe link not found" });

      await storage.updateSubscriber(subscriber.id, {
        status: "unsubscribed",
        unsubscribedAt: new Date(),
      });
      try {
        const preference = await storage.getEmailPreferenceByEmail(subscriber.email);
        if (preference) {
          await storage.updateEmailPreference(preference.id, {
            categories: Object.fromEntries(subscriptionPreferenceCategories.map((category) => [category, false])),
            consentStatus: "unsubscribed",
            unsubscribedAt: new Date(),
            auditTrail: [
              ...(preference.auditTrail || []),
              { action: "subscriber_token_unsubscribe", at: new Date().toISOString() },
            ],
          });
        }
      } catch (preferenceError) {
        console.warn("Email preference unsubscribe sync skipped:", getErrorMessage(preferenceError));
      }

      const redirectUrl = env.PUBLIC_APP_URL || "/";
      res.redirect(302, `${redirectUrl}?subscription=unsubscribed`);
    } catch (error) {
      console.error('Subscriber unsubscribe error:', error);
      res.status(500).json({ message: "Failed to unsubscribe" });
    }
  });

  app.post('/api/subscribers/unsubscribe', async (req, res) => {
    try {
      const email = z.string().trim().email().transform((value) => value.toLowerCase()).parse(req.body.email);
      const subscriber = await storage.getSubscriberByEmail(email);
      if (subscriber) {
        await storage.updateSubscriber(subscriber.id, {
          status: "unsubscribed",
          unsubscribedAt: new Date(),
        });
        try {
          const preference = await storage.getEmailPreferenceByEmail(subscriber.email);
          if (preference) {
            await storage.updateEmailPreference(preference.id, {
              categories: Object.fromEntries(subscriptionPreferenceCategories.map((category) => [category, false])),
              consentStatus: "unsubscribed",
              unsubscribedAt: new Date(),
              auditTrail: [
                ...(preference.auditTrail || []),
                { action: "email_unsubscribe_request", at: new Date().toISOString() },
              ],
            });
          }
        } catch (preferenceError) {
          console.warn("Email preference unsubscribe request sync skipped:", getErrorMessage(preferenceError));
        }
      }

      res.json({ message: "Subscription preferences updated." });
    } catch (error) {
      res.status(400).json({ message: "Valid email required", error: getErrorMessage(error) });
    }
  });

  app.get('/api/admin/subscribers', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 50);
      const status = String(req.query.status ?? "").toLowerCase();
      const search = normalizeSearchQuery(req.query.search);

      const allSubscribers = await storage.getAllSubscribers();
      const filtered = searchAndRank(allSubscribers, search, (subscriber) => [
        subscriber.email,
        subscriber.name,
        subscriber.preferences,
        subscriber.source,
        subscriber.status,
      ]).filter((subscriber) => {
        const matchesStatus = !status || subscriber.status === status;
        return matchesStatus;
      });
      const safePage = Number.isFinite(page) && page > 0 ? page : 1;
      const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 50;
      const start = (safePage - 1) * safeLimit;

      res.json({ subscribers: filtered.slice(start, start + safeLimit), total: filtered.length });
    } catch (error) {
      console.error('Admin subscribers error:', error);
      res.status(500).json({ message: "Failed to fetch subscribers" });
    }
  });

  app.get('/api/admin/subscribers/export', authenticateToken, requireAdmin, async (_req, res) => {
    try {
      const subscribers = await storage.getAllSubscribers();
      const rows = [
        ["id", "email", "name", "status", "preferences", "source", "verifiedAt", "unsubscribedAt", "createdAt"],
        ...subscribers.map((subscriber) => [
          subscriber.id,
          subscriber.email,
          subscriber.name ?? "",
          subscriber.status,
          Array.isArray(subscriber.preferences) ? subscriber.preferences.join(";") : "",
          subscriber.source ?? "",
          subscriber.verifiedAt?.toISOString?.() ?? "",
          subscriber.unsubscribedAt?.toISOString?.() ?? "",
          subscriber.createdAt?.toISOString?.() ?? "",
        ]),
      ];
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=\"mtendere-subscribers.csv\"");
      res.send(rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n"));
    } catch (error) {
      console.error("Subscriber export error:", error);
      res.status(500).json({ message: "Failed to export subscribers" });
    }
  });

  // Messages / Contact routes
  app.post('/api/messages', async (req, res) => {
    try {
      if (!guardPublicFlowRateLimit(req, res, "contact", 6, 10 * 60 * 1000)) return;
      const payload = contactMessageRequestSchema.parse(req.body);

      // Honeypot spam trap. Return success without storing so automated spam gets no signal.
      if (payload.website) {
        await storage.logAnalytics({
          event: "contact_spam_trapped",
          metadata: { category: payload.inquiryCategory, source: payload.source },
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        });
        return res.status(201).json({
          message: "Message sent successfully",
          ticketCode: "MEC-RECEIVED",
        });
      }

      const recaptcha = await verifyRecaptcha(payload.recaptchaToken, req, "contact");
      if (!recaptcha.ok) {
        return res.status(400).json({ message: recaptcha.reason || "reCAPTCHA verification failed" });
      }

      const messageData = insertMessageSchema.parse({
        name: payload.name,
        email: payload.email,
        phone: payload.phone || null,
        subject: `[${payload.inquiryCategory}] ${payload.subject}`,
        message: payload.message,
      });
      const message = await storage.createMessage(messageData);
      const ticketCode = `MEC-CONTACT-${String(message.id).padStart(6, "0")}`;
      void sendContactAcknowledgement({
        email: message.email,
        name: message.name,
        subject: `${message.subject} (${ticketCode})`,
      });
      void sendAdminNotification({
        subject: `New Mtendere contact message ${ticketCode}`,
        message: `${message.name} (${message.email}) submitted ${message.subject || "General inquiry"}. Phone: ${message.phone || "not provided"}.`,
        metadata: { messageId: message.id, ticketCode, category: payload.inquiryCategory },
      });
      await storage.logAnalytics({
        event: "contact_message_submitted",
        metadata: {
          messageId: message.id,
          ticketCode,
          subject: message.subject,
          category: payload.inquiryCategory,
          source: payload.source,
          landingPage: payload.landingPage,
          referrer: payload.referrer,
          campaign: payload.campaign,
          utmSource: payload.utmSource,
          utmMedium: payload.utmMedium,
          utmCampaign: payload.utmCampaign,
          utmTerm: payload.utmTerm,
          utmContent: payload.utmContent,
          consentAccepted: payload.consentAccepted,
          recaptchaSkipped: "skipped" in recaptcha ? recaptcha.skipped : false,
          recaptchaScore: "score" in recaptcha ? recaptcha.score : undefined,
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      res.status(201).json({ message: 'Message sent successfully', ticketCode, data: message });
    } catch (error) {
      console.error('Message creation error:', error);
      res.status(400).json({ message: 'Failed to send message', error: getErrorMessage(error) });
    }
  });

  app.get('/api/messages', authenticateToken, requireAdmin, async (_req, res) => {
    try {
      const messages = await storage.getAllMessages();
      res.json(messages);
    } catch (error) {
      console.error('Messages fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  app.get('/api/admin/messages', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { page, limit, offset } = parsePagination(req.query.page, req.query.limit, 100);
      const search = normalizeSearchQuery(req.query.search);
      const status = normalizeSearchQuery(req.query.status);
      const allMessages = await storage.getAllMessages();
      const filtered = searchAndRank(allMessages, search, (message) => [
        message.name,
        message.email,
        message.phone,
        message.subject,
        message.message,
      ]).filter((message) => {
        if (status === "unread") return !message.isRead;
        if (status === "read") return Boolean(message.isRead);
        return true;
      });

      res.json({
        messages: filtered.slice(offset, offset + limit),
        total: filtered.length,
        unread: allMessages.filter((message) => !message.isRead).length,
        page,
        limit,
      });
    } catch (error) {
      console.error("Admin messages fetch error:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.get('/api/admin/messages/export', authenticateToken, requireAdmin, async (_req, res) => {
    try {
      const messages = await storage.getAllMessages();
      const rows = [
        ["id", "name", "email", "phone", "subject", "message", "isRead", "createdAt"],
        ...messages.map((message) => [
          message.id,
          message.name,
          message.email,
          message.phone ?? "",
          message.subject ?? "",
          message.message,
          message.isRead ? "yes" : "no",
          message.createdAt?.toISOString?.() ?? "",
        ]),
      ];
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=\"mtendere-contact-messages.csv\"");
      res.send(rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n"));
    } catch (error) {
      console.error("Messages export error:", error);
      res.status(500).json({ message: "Failed to export messages" });
    }
  });

  app.put('/api/admin/messages/:id/read', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const message = await storage.markMessageRead(id);
      res.json(message);
    } catch (error) {
      console.error("Admin message read error:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  app.put('/api/messages/:id/read', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });
      const message = await storage.markMessageRead(id);
      res.json(message);
    } catch (error) {
      console.error('Message read error:', error);
      res.status(500).json({ message: 'Failed to mark message as read' });
    }
  });

  // AI Chat route
  app.post('/api/chat', async (req, res) => {
    try {
      const payload = chatRequestSchema.parse(req.body);
      const requester = getOptionalAuthenticatedUser(req);
      const existing = payload.conversationId ? getAiChatConversation(payload.conversationId) : undefined;
      const response = await getChatResponse(payload.message, {
        channel: "public",
        platformContext: await buildAiPlatformContext(),
        history: existing?.messages.map((item) => ({
          role: item.role === "system" ? "assistant" : item.role,
          content: item.content,
        })),
      });
      const conversation = appendAiConversationTurn({
        conversationId: payload.conversationId,
        userId: requester ? String(requester.id) : null,
        userEmail: requester?.email ?? null,
        channel: "public",
        message: payload.message,
        response,
      });

      await storage.logAnalytics({
        event: "public_ai_chat_message",
        userId: requester?.id ?? null,
        metadata: {
          conversationId: conversation.id,
          flags: conversation.moderationFlags,
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      broadcast("ai-chat", { type: "ai_chat_updated", conversation });
      res.json({ response, conversationId: conversation.id });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(400).json({ message: 'Failed to get chat response', error: getErrorMessage(error) });
    }
  });

  return httpServer;
}
