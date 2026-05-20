import express, { type CookieOptions, type Express, NextFunction, Request, Response } from "express";
import { createServer, type Server } from "http";
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
import { randomBytes, randomUUID } from "crypto";
import fs from "fs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import QRCode from "qrcode";
import { z } from "zod";
import { env } from "./env";
import { getChatResponse } from "./ai";
import {
  sendAdminNotification,
  sendApplicationConfirmation,
  sendApplicationStatusUpdate,
  sendContactAcknowledgement,
  sendSubscriptionConfirmation,
} from "./email";
import {
  deleteBlogMeta,
  deleteJobMeta,
  deletePartnerMeta,
  deleteScholarshipMeta,
  deleteTeamMeta,
  deleteUserMeta,
  getAdminRoles,
  getAdminSettings,
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

const JWT_SECRET = env.JWT_SECRET;

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

const subscriberRequestSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  name: z.string().trim().max(160).optional(),
  preferences: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
  source: z.string().trim().max(80).default("website"),
  website: z.string().optional(),
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
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  registrationDeadline: z.coerce.date().nullable().optional(),
  coverImage: z.string().trim().max(1000).optional().nullable(),
  videoUrl: z.string().trim().max(1000).optional().nullable(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  agenda: z.array(z.record(z.unknown())).optional().nullable(),
  speakers: z.array(z.record(z.unknown())).optional().nullable(),
  sponsors: z.array(z.record(z.unknown())).optional().nullable(),
  faqs: z.array(z.record(z.unknown())).optional().nullable(),
  resources: z.array(z.record(z.unknown())).optional().nullable(),
  gallery: z.array(z.record(z.unknown())).optional().nullable(),
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
  answers: z.record(z.unknown()).optional().nullable(),
  reminderOptIn: z.boolean().optional().default(true),
});

const eventCommentRequestSchema = z.object({
  authorName: z.string().trim().min(2).max(180),
  authorEmail: z.string().trim().email().max(255).optional().nullable(),
  content: z.string().trim().min(2).max(2000),
  parentId: z.coerce.number().int().positive().optional().nullable(),
});

const eventRegistrationReviewSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "waitlisted", "checked_in", "cancelled"]).optional(),
  attendanceStatus: z.enum(["registered", "attended", "no_show", "checked_in", "cancelled"]).optional(),
});

const adminApplicationReviewSchema = z.object({
  status: z.enum(["pending", "under_review", "approved", "rejected", "waitlisted"]).optional(),
  reviewNotes: z.string().trim().max(4000).optional(),
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

const adminRoleInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().default(""),
  permissions: z.array(z.string().trim().min(1).max(80)).max(40).optional().default([]),
  isActive: z.boolean().optional().default(true),
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

type JwtUser = {
  id: number;
  email: string;
  role: string;
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
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return undefined;
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

const toAdminScholarship = (scholarship: any) => {
  const meta = getScholarshipMeta(scholarship.id);
  return {
    id: String(scholarship.id),
    title: scholarship.title,
    description: scholarship.description,
    eligibility: meta.eligibility ?? "",
    amount: scholarship.amount ? String(scholarship.amount) : "",
    deadline: scholarship.deadline,
    requirements: scholarship.requirements ?? [],
    category: scholarship.category,
    institution: scholarship.institution,
    region: meta.region ?? "Global",
    isPremium: meta.isPremium ?? false,
    paymentStatus: meta.paymentStatus ?? "unpaid",
    status: normalizeAdminStatus(meta.status, scholarship.isActive),
    featuredImage: meta.featuredImage ?? scholarship.imageUrl ?? "",
    createdBy: scholarship.createdBy ? String(scholarship.createdBy) : null,
    createdAt: scholarship.createdAt ?? null,
    updatedAt: scholarship.updatedAt ?? null,
  };
};

const toAdminJob = (job: any) => {
  const meta = getJobMeta(job.id);
  return {
    id: String(job.id),
    title: job.title,
    description: job.description,
    company: job.company,
    location: job.location,
    region: meta.region ?? "Global",
    salaryRange: meta.salaryRange ?? "",
    jobType: job.jobType,
    requirements: job.requirements ?? [],
    benefits: meta.benefits ?? "",
    applicationUrl: meta.applicationUrl ?? "",
    deadline: job.deadline ?? null,
    isPremium: meta.isPremium ?? false,
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
  return {
    ...job,
    imageUrl: meta.featuredImage ?? job.imageUrl ?? null,
    salaryRange: meta.salaryRange ?? null,
    applicationUrl: meta.applicationUrl ?? null,
    region: meta.region ?? null,
  };
};

const toAdminPartner = (partner: any) => {
  const meta = getPartnerMeta(partner.id);
  return {
    id: String(partner.id),
    name: partner.name,
    description: partner.description,
    logo: meta.logo ?? partner.logoUrl ?? "",
    website: partner.website ?? "",
    contactEmail: meta.contactEmail ?? "",
    contactPhone: meta.contactPhone ?? "",
    address: meta.address ?? "",
    region: meta.region ?? partner.country ?? "Global",
    partnershipType: meta.partnershipType ?? "partner",
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
    bio: member.bio ?? "",
    profileImage: meta.profileImage ?? member.imageUrl ?? "",
    email: member.email ?? "",
    linkedIn: member.linkedin ?? "",
    twitter: member.twitter ?? "",
    department: meta.department ?? "",
    isActive: member.isActive ?? true,
    order: member.order ?? 0,
    createdBy: null,
    createdAt: member.createdAt ?? null,
    updatedAt: member.updatedAt ?? null,
  };
};

const toPublicPartner = (partner: any) => {
  const meta = getPartnerMeta(partner.id);

  return {
    ...partner,
    logoUrl: meta.logo ?? partner.logoUrl ?? null,
    country: meta.region ?? partner.country ?? null,
    partnershipType: meta.partnershipType ?? "partner",
    videoUrl: meta.videoUrl ?? null,
    videoTitle: meta.videoTitle ?? null,
    videoDescription: meta.videoDescription ?? null,
    isFeatured: meta.isFeatured ?? false,
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

const signToken = (user: { id: number; email: string; role: string }) => {
  const timeoutMinutes = Math.max(5, Math.min(480, getAdminSettings().sessionTimeout || 30));
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: `${timeoutMinutes}m`,
  });
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

const signRefreshToken = (user: { id: number; email: string; role: string }) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role, type: "refresh" }, JWT_SECRET, {
    expiresIn: "7d",
  });

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

const setRefreshCookie = (res: Response, user: { id: number; email: string; role: string }) => {
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

const isAdmin = (user: JwtUser | null) =>
  user?.role === "admin" || user?.role === "super_admin";

const isAdminPortalUser = (user: JwtUser | null) =>
  user?.role === "viewer" ||
  user?.role === "editor" ||
  user?.role === "admin" ||
  user?.role === "super_admin";

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (error: unknown, user: unknown) => {
    if (error || !user) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    const jwtUser = user as JwtUser;
    if (isJwtUserInvalidated(jwtUser)) {
      return res.status(401).json({ message: "Session was invalidated by an administrator" });
    }

    (req as AuthenticatedRequest).user = jwtUser;
    next();
  });
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
  user?.role === "editor" || user?.role === "admin" || user?.role === "super_admin";

const requireEditor = (req: Request, res: Response, next: NextFunction) => {
  if (!isEditor(getAuthenticatedUser(req))) {
    return res.status(403).json({ message: "Editor access required" });
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

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket setup for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: SocketWithSubscriptions) => {
    ws.subscriptions = [];

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

        if (payload.type === "subscribe") {
          ws.subscriptions = Array.from(new Set([...(ws.subscriptions ?? []), ...channels]));
        }

        if (payload.type === "unsubscribe") {
          ws.subscriptions = (ws.subscriptions ?? []).filter(
            (channel) => !channels.includes(channel),
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

  const uploadsDir = path.resolve(import.meta.dirname, "..", "uploads");
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.use("/uploads", express.static(uploadsDir));

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

  const mediaAssetRoot = path.resolve(import.meta.dirname, "..", "client", "src", "assets", "imgs");
  const mediaAssetModules = new Set([
    "blogs",
    "team",
    "teams",
    "partners",
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
    partners: "partners/partners-default.jpg",
    scholarships: "scholarships/graduates-default.jpg",
    jobs: "jobs/jobs-default.jpg",
    events: "events/events-default.jpg",
    opportunities: "scholarships/application-guidance.jpg",
    projects: "projects/foundation.jpg",
    programs: "programs/international-studies.jpg",
    news: "events/events-default.jpg",
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

  const toMediaAssetUrl = (relative: string) =>
    `/media-assets/${relative
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/")}`;

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
    }> = [];

    const walk = (directory: string) => {
      if (!fs.existsSync(directory)) return;
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          if (directory === mediaAssetRoot && !mediaAssetModules.has(entry.name.toLowerCase())) continue;
          walk(fullPath);
          continue;
        }

        if (entry.name.startsWith(".") || !/\.(jpe?g|png|webp)$/i.test(entry.name)) continue;
        const stat = fs.statSync(fullPath);
        const relative = path.relative(mediaAssetRoot, fullPath).replace(/\\/g, "/");
        const moduleName = (relative.split("/")[0] || "misc").toLowerCase();
        if (!mediaAssetModules.has(moduleName)) continue;
        files.push({
          module: moduleName,
          path: `assets/imgs/${relative}`,
          reference: relative,
          previewUrl: toMediaAssetUrl(relative),
          size: stat.size,
          updatedAt: stat.mtime,
          valid: isValidImageFile(fullPath),
        });
      }
    };

    walk(mediaAssetRoot);
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
    let current = mediaAssetRoot;

    for (const segment of segments) {
      if (!fs.existsSync(current)) return null;
      const match = fs
        .readdirSync(current, { withFileTypes: true })
        .find((entry) => entry.name.toLowerCase() === segment.toLowerCase());

      if (!match) return null;
      current = path.join(current, match.name);
    }

    const resolved = path.resolve(current);
    return resolved.startsWith(mediaAssetRoot) ? resolved : null;
  };

  const ensureMediaReference = (value: unknown, moduleName: keyof typeof mediaDefaultReferences) => {
    const candidate = typeof value === "string" ? normalizeMediaAssetReference(value) : "";
    if (candidate && isValidMediaReference(candidate)) return candidate;
    return mediaDefaultReferences[moduleName] || mediaDefaultReferences.defaults;
  };

  app.get("/media-assets/*", (req, res) => {
    try {
      const requestedPath = normalizeMediaAssetReference((req.params as Record<string, string>)["0"]);
      if (!requestedPath) return res.status(404).send("Not found");

      const fullPath = resolveMediaAssetFullPath(requestedPath);
      if (!fullPath || !fullPath.startsWith(mediaAssetRoot) || !fs.existsSync(fullPath) || !isValidImageFile(fullPath)) {
        return res.status(404).send("Not found");
      }

      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.sendFile(fullPath);
    } catch (error) {
      console.error("Media asset delivery error:", error);
      res.status(404).send("Not found");
    }
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Authentication routes
  const registerHandler = async (req: Request, res: Response) => {
    try {
      const { referralCode: bodyReferralCode, ...registrationBody } =
        req.body && typeof req.body === "object" ? req.body : {};
      const referralCode =
        typeof bodyReferralCode === "string"
          ? bodyReferralCode
          : typeof req.query.ref === "string"
            ? req.query.ref
            : null;
      const userData = insertUserSchema.parse(registrationBody);

      const isAdminRegistration = req.path === "/auth/register";
      const adminPortalRoles = new Set(["viewer", "editor", "admin"]);

      if (isAdminRegistration) {
        const requestedRole = userData.role && adminPortalRoles.has(userData.role) ? userData.role : "viewer";

        if (env.NODE_ENV === "production" && requestedRole !== "viewer") {
          return res.status(403).json({
            message: "Editor and admin accounts must be provisioned by an existing administrator.",
          });
        }

        userData.role = requestedRole;
      } else {
        userData.role = "user";
      }
      
      // Check if user already exists
      const existingUser =
        (await storage.getUserByEmail(userData.email)) ||
        (await storage.getUserByUsername(userData.username));
      if (existingUser) {
        return res.status(400).json({ message: 'A user with that email or username already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user
      const createdUser = await storage.createUser({
        ...userData,
        password: hashedPassword,
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
        metadata: { email: user.email, role: user.role },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      broadcast('user_activity', { type: 'user_registered', user: buildPublicUser(user) });

      setRefreshCookie(res, user);

      res.status(201).json({
        message: 'User created successfully',
        token: signToken(user),
        user: buildPublicUser(user),
      });
    } catch (error) {
      console.error('Registration error:', error);
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
        ? await storage.getUserByEmail(normalizedIdentifier)
        : await storage.getUserByUsername(normalizedIdentifier);
      if (!user) {
        registerLoginFailure(normalizedIdentifier);
        return res.status(401).json({ message: 'Invalid credentials' });
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
  app.post('/api/auth/login', loginHandler);

  // Admin client aliases
  app.post('/auth/register', registerHandler);
  app.post('/auth/login', loginHandler);

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
      if (decoded.type !== "refresh" || !decoded.id) {
        clearRefreshCookie(res);
        return res.status(401).json({ message: "Invalid refresh token" });
      }

      const user = await storage.getUser(Number(decoded.id));
      if (!user || user.isActive === false) {
        clearRefreshCookie(res);
        return res.status(401).json({ message: "Invalid refresh token" });
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

  app.get('/api/users', authenticateToken, requireAdmin, async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map(buildPublicUser));
    } catch (error) {
      console.error('Users fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser =
        (await storage.getUserByEmail(userData.email)) ||
        (await storage.getUserByUsername(userData.username));

      if (existingUser) {
        return res.status(400).json({ message: 'A user with that email or username already exists' });
      }

      const user = await storage.createUser({
        ...userData,
        password: await bcrypt.hash(userData.password, 10),
      });

      res.status(201).json(buildPublicUser(user));
    } catch (error) {
      console.error('User creation error:', error);
      res.status(400).json({ message: 'Failed to create user', error: getErrorMessage(error) });
    }
  });

  app.put('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

      const updateData = insertUserSchema.partial().parse(req.body);
      const nextUser = updateData.password
        ? { ...updateData, password: await bcrypt.hash(updateData.password, 10) }
        : updateData;

      const user = await storage.updateUser(id, nextUser);
      if (!user) return res.status(404).json({ message: 'User not found' });

      res.json(buildPublicUser(user));
    } catch (error) {
      console.error('User update error:', error);
      res.status(400).json({ message: 'Failed to update user', error: getErrorMessage(error) });
    }
  });

  app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

      const authUser = getAuthenticatedUser(req);
      if (authUser.id === id) {
        return res.status(400).json({ message: 'You cannot delete your own account' });
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
        ...searchAndRank(scholarshipsList, query, (item) => [
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
          href: `/scholarships/${item.id}`,
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
          href: `/jobs/${item.id}`,
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
        ...searchAndRank(blogList, query, (item) => [
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
          href: `/blog/${item.id}`,
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
      res.json(scholarships);
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
      res.json(scholarships);
    } catch (error) {
      console.error('Scholarship search error:', error);
      res.status(500).json({ message: 'Failed to search scholarships' });
    }
  });

  app.get('/api/scholarships/:id', async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

      const scholarship = await storage.getScholarship(id);
      const requester = getOptionalAuthenticatedUser(req);
      const isVisible =
        scholarship &&
        (isAdmin(requester) ||
          (scholarship.isActive !== false && new Date(scholarship.deadline).getTime() > Date.now()));

      if (!isVisible) return res.status(404).json({ message: 'Scholarship not found' });
      res.json(scholarship);
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
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

      const job = await storage.getJob(id);
      const requester = getOptionalAuthenticatedUser(req);
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
      
      res.json(applications);
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
      
      res.status(201).json(application);
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
      if (existingApplication.userId !== user.id && user.role !== 'admin' && user.role !== 'super_admin') {
        return res.status(403).json({ message: 'Not authorized to update this application' });
      }
      
      const application = await storage.updateApplication(id, updateData);
      broadcast('applications', { type: 'application_updated', application });
      
      res.json(application);
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
      res.json(blogPosts);
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
      res.json(isAdmin(requester) ? blogPosts : blogPosts.filter((post) => post.isPublished));
    } catch (error) {
      console.error('Blog search error:', error);
      res.status(500).json({ message: 'Failed to search blog posts' });
    }
  });

  app.get('/api/blog-posts/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.getBlogPost(id);
      const requester = getOptionalAuthenticatedUser(req);
      if (!post || (!isAdmin(requester) && !post.isPublished)) {
        return res.status(404).json({ message: 'Blog post not found' });
      }
      res.json(post);
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
      res.json(teamMembers);
    } catch (error) {
      console.error('Team members fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch team members' });
    }
  });

  app.get('/api/team-members/:id', async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

      const teamMember = await storage.getTeamMember(id);
      const requester = getOptionalAuthenticatedUser(req);
      const isVisible = teamMember && (isAdmin(requester) || teamMember.isActive !== false);

      if (!isVisible) return res.status(404).json({ message: 'Team member not found' });
      res.json(teamMember);
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

      res.setHeader("Content-Type", "text/html");
      res.send(`
        <!doctype html>
        <html>
          <head><title>${event.title} Ticket</title></head>
          <body style="font-family: Arial, sans-serif; margin: 0; padding: 32px; background: #f5f7fb; color: #111827;">
            <main style="max-width: 720px; margin: 0 auto; background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 28px;">
              <p style="margin: 0 0 8px; color: #0f766e; font-weight: 700;">Mtendere Event Confirmation</p>
              <h1 style="margin: 0 0 16px; color: #0f4c81;">${event.title}</h1>
              <p><strong>Attendee:</strong> ${registration.fullName}</p>
              <p><strong>Date:</strong> ${new Date(event.startAt).toLocaleString()}</p>
              <p><strong>Location:</strong> ${event.isVirtual ? "Virtual event" : event.location}</p>
              <div style="margin-top: 24px; display: grid; gap: 16px; justify-items: center; padding: 18px; border: 2px dashed #f59e0b; text-align: center;">
                <img src="${qrCode}" alt="QR code for ${registration.ticketCode}" width="220" height="220" style="display:block;">
                <div style="font-size: 24px; font-weight: 800;">${registration.ticketCode}</div>
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
        status,
        ticketCode: createTicketCode(id),
        attendanceStatus: "registered",
        answers: payload.answers ?? null,
        reminderOptIn: payload.reminderOptIn,
      }));

      await storage.logAnalytics({
        event: "event_registered",
        userId: user?.id ?? null,
        metadata: { type: "event", referenceId: id, status },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      broadcast('events', { type: 'event_registration_created', eventId: id, registration });
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

  app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
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

  app.get('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
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

  app.post('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const requester = getAuthenticatedUser(req);
      const userData = insertUserSchema.parse(req.body);
      if (userData.role === "super_admin" && requester.role !== "super_admin") {
        return res.status(403).json({ message: "Only a super administrator can create super admin users" });
      }

      const existing =
        (await storage.getUserByEmail(userData.email)) ||
        (await storage.getUserByUsername(userData.username));
      if (existing) {
        return res.status(400).json({ message: "User already exists" });
      }

      const user = await storage.createUser({
        ...userData,
        password: await bcrypt.hash(userData.password, 10),
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
      console.error("Admin user create error:", error);
      res.status(400).json({ message: "Failed to create user", error: getErrorMessage(error) });
    }
  });

  app.put('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const requester = getAuthenticatedUser(req);
      const existingUser = await storage.getUser(id);
      if (!existingUser) return res.status(404).json({ message: "User not found" });

      const updateData = insertUserSchema.partial().parse(req.body);
      if (id === requester.id && updateData.isActive === false) {
        return res.status(400).json({ message: "You cannot deactivate your own account" });
      }
      if (id === requester.id && updateData.role && updateData.role !== requester.role) {
        return res.status(400).json({ message: "You cannot change your own role" });
      }
      if (updateData.role === "super_admin" && requester.role !== "super_admin") {
        return res.status(403).json({ message: "Only a super administrator can assign the super admin role" });
      }
      if (existingUser.role === "super_admin" && requester.role !== "super_admin") {
        return res.status(403).json({ message: "Only a super administrator can update super admin users" });
      }

      const nextUser = updateData.password
        ? { ...updateData, password: await bcrypt.hash(updateData.password, 10) }
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
      console.error("Admin user update error:", error);
      res.status(400).json({ message: "Failed to update user", error: getErrorMessage(error) });
    }
  });

  app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const requester = getAuthenticatedUser(req);
      if (id === requester.id) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }

      const targetUser = await storage.getUser(id);
      if (!targetUser) return res.status(404).json({ message: "User not found" });
      if (targetUser.role === "super_admin" && requester.role !== "super_admin") {
        return res.status(403).json({ message: "Only a super administrator can delete super admin users" });
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
      setScholarshipMeta(scholarship.id, {
        eligibility: req.body.eligibility ?? "",
        status: normalizeAdminStatus(req.body.status, scholarship.isActive),
        isPremium: Boolean(req.body.isPremium),
        paymentStatus: req.body.paymentStatus ?? "unpaid",
        featuredImage,
        region: req.body.region ?? "Global",
      });

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

      setScholarshipMeta(id, {
        eligibility: req.body.eligibility,
        status: req.body.status,
        isPremium: parseOptionalBoolean(req.body.isPremium),
        paymentStatus: req.body.paymentStatus,
        featuredImage,
        region: req.body.region,
      });

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
        item.company,
        item.location,
        item.region,
        item.jobType,
        item.requirements,
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
        salary: parseNumber(req.body.salary),
        currency: req.body.currency ?? "USD",
        jobType: req.body.jobType ?? "full-time",
        requirements: req.body.requirements ?? null,
        benefits: req.body.benefits ?? null,
        isRemote: Boolean(req.body.isRemote),
        deadline: req.body.deadline ? new Date(req.body.deadline) : null,
        imageUrl: featuredImage,
        isActive: req.body.status === "published",
        createdBy,
      });

      const job = await storage.createJob(jobData);
      setJobMeta(job.id, {
        salaryRange: req.body.salaryRange ?? "",
        applicationUrl: req.body.applicationUrl ?? "",
        status: normalizeAdminStatus(req.body.status, job.isActive),
        region: req.body.region ?? "Global",
        isPremium: Boolean(req.body.isPremium),
        price: req.body.price ?? "",
        paymentStatus: req.body.paymentStatus ?? "unpaid",
        featuredImage,
        benefits: req.body.benefits ?? "",
      });

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
      if (req.body.jobType !== undefined) payload.jobType = req.body.jobType;
      if (req.body.deadline !== undefined) payload.deadline = req.body.deadline ? new Date(req.body.deadline) : null;
      const featuredImage = req.body.featuredImage !== undefined ? ensureMediaReference(req.body.featuredImage, "jobs") : undefined;
      if (featuredImage !== undefined) payload.imageUrl = featuredImage;
      if (req.body.status !== undefined) payload.isActive = req.body.status === "published";

      const updateData = insertJobSchema.partial().parse(payload);
      const job = await storage.updateJob(id, updateData);
      if (!job) return res.status(404).json({ message: "Job not found" });

      setJobMeta(id, {
        salaryRange: req.body.salaryRange,
        applicationUrl: req.body.applicationUrl,
        status: req.body.status,
        region: req.body.region,
        isPremium: parseOptionalBoolean(req.body.isPremium),
        price: req.body.price,
        paymentStatus: req.body.paymentStatus,
        featuredImage,
        benefits: req.body.benefits,
      });

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
        website: req.body.website ?? null,
        country: req.body.region ?? "Global",
        studentCount: req.body.studentCount ?? null,
        ranking: req.body.ranking ?? null,
        isActive: req.body.isActive ?? true,
      });

      const partner = await storage.createPartner(partnerData);
      setPartnerMeta(partner.id, {
        partnershipType: req.body.partnershipType ?? "partner",
        logo,
        contactEmail: req.body.contactEmail ?? "",
        contactPhone: req.body.contactPhone ?? "",
        address: req.body.address ?? "",
        region: req.body.region ?? "Global",
        videoUrl: parseOptionalUrl(req.body.videoUrl) ?? "",
        videoTitle: req.body.videoTitle ?? "",
        videoDescription: req.body.videoDescription ?? "",
        isFeatured: Boolean(req.body.isFeatured),
        isPremium: Boolean(req.body.isPremium),
        paymentStatus: req.body.paymentStatus ?? "unpaid",
      });

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
      if (req.body.website !== undefined) payload.website = req.body.website;
      if (req.body.region !== undefined) payload.country = req.body.region;
      if (req.body.studentCount !== undefined) payload.studentCount = req.body.studentCount;
      if (req.body.ranking !== undefined) payload.ranking = req.body.ranking;
      if (req.body.isActive !== undefined) payload.isActive = req.body.isActive;

      const updateData = insertPartnerSchema.partial().parse(payload);
      const partner = await storage.updatePartner(id, updateData);
      if (!partner) return res.status(404).json({ message: "Partner not found" });

      setPartnerMeta(id, {
        partnershipType: req.body.partnershipType,
        logo,
        contactEmail: req.body.contactEmail,
        contactPhone: req.body.contactPhone,
        address: req.body.address,
        region: req.body.region,
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
      setBlogMeta(post.id, {
        slug: req.body.slug ?? `post-${post.id}`,
        status: normalizeAdminStatus(req.body.status, post.isPublished),
        featuredImage,
      });

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

      setBlogMeta(id, {
        slug: req.body.slug,
        status: req.body.status,
        featuredImage,
      });

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
      setTeamMeta(member.id, {
        department: req.body.department ?? "",
        profileImage,
      });
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

      setTeamMeta(id, {
        department: req.body.department,
        profileImage,
      });

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

  app.put('/api/admin/event-registrations/:id', authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const payload = eventRegistrationReviewSchema.parse(req.body);
      const registration = await storage.updateEventRegistration(id, {
        ...payload,
        checkedInAt: payload.status === "checked_in" ? new Date() : undefined,
      });
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
            note: "This source asset is governed and can be assigned immediately.",
          };
        }),
        rejected,
      });
    },
  );

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

      const invalidReferences = references
        .filter((reference) => !isValidMediaReference(reference.value))
        .map((reference) => ({
          ...reference,
          reason: reference.value
            ? /^https?:\/\//i.test(reference.value)
              ? "external-url"
              : reference.value.startsWith("/uploads/")
                ? "upload-folder"
                : "missing-local-asset"
            : "missing",
        }));

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
        fallbackPolicy: ["assigned asset", "category default", "global default", "styled initials placeholder"],
        assets: listMediaAssets(),
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
      const payload = subscriberRequestSchema.parse(req.body);

      // Honeypot spam trap. Return success without storing so bots get no signal.
      if (payload.website) {
        return res.status(201).json({
          message: "Please check your inbox to confirm your subscription.",
        });
      }

      const verificationToken = randomBytes(32).toString("hex");
      const unsubscribeToken = randomBytes(32).toString("hex");
      const existing = await storage.getSubscriberByEmail(payload.email);
      const subscriberPayload = insertSubscriberSchema.parse({
        email: payload.email,
        name: payload.name ?? existing?.name ?? null,
        preferences: payload.preferences ?? existing?.preferences ?? ["scholarships", "jobs", "study-abroad"],
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

      const baseUrl = env.PUBLIC_APP_URL || `${req.protocol}://${req.get("host")}`;
      const verificationUrl = `${baseUrl}/api/subscribers/verify/${verificationToken}`;
      const unsubscribeUrl = `${baseUrl}/api/subscribers/unsubscribe/${unsubscribeToken}`;

      void sendSubscriptionConfirmation({
        email: subscriber.email,
        name: subscriber.name,
        verificationUrl,
        unsubscribeUrl,
      });

      await storage.logAnalytics({
        event: "subscriber_created",
        metadata: { email: subscriber.email, source: payload.source },
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
      console.error('Subscriber creation error:', error);
      res.status(400).json({ message: 'Failed to subscribe', error: getErrorMessage(error) });
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

  // Messages / Contact routes
  app.post('/api/messages', async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      void sendContactAcknowledgement({
        email: message.email,
        name: message.name,
        subject: message.subject,
      });
      void sendAdminNotification({
        subject: "New Mtendere contact message",
        message: `${message.name} (${message.email}) sent: ${message.subject || "General inquiry"}`,
        metadata: { messageId: message.id },
      });
      await storage.logAnalytics({
        event: "contact_message_submitted",
        metadata: { messageId: message.id, subject: message.subject },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      res.status(201).json({ message: 'Message sent successfully', data: message });
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
