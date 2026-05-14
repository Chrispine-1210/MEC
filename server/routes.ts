import express, { type Express, NextFunction, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import {
  getActiveReferralPrograms,
  getReferralCodeByCode,
  createReferralClick,
  createOrUpdateAttribution,
} from "./referral-storage-v2";
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
  insertReferralSchema,
  insertSavedItemSchema,
  insertMessageSchema,
} from "@shared/schema";
import bcrypt from "bcryptjs";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "crypto";
import fs from "fs";
import jwt from "jsonwebtoken";
import multer from "multer";
import { generateSecret, generateURI, verify } from "otplib";
import path from "path";
import QRCode from "qrcode";
import { z } from "zod";
import { getCacheMode } from "./cache";
import { env } from "./env";
import { getChatResponse } from "./ai";
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
  isNotificationRead,
  markNotificationRead,
  markNotificationsRead,
  setBlogMeta,
  setJobMeta,
  setPartnerMeta,
  setScholarshipMeta,
  setTeamMeta,
  setUserMeta,
  updateAdminSettings,
  upsertAdminRole,
  deleteAdminRole,
} from "./admin-state";

const JWT_SECRET = env.JWT_SECRET;
const MFA_CHALLENGE_PURPOSE = "mfa_challenge";
const MFA_CHALLENGE_TTL_SECONDS = 5 * 60;
const MFA_ENCRYPTION_KEY = createHash("sha256")
  .update(env.MFA_ENCRYPTION_KEY || JWT_SECRET)
  .digest();
const mfaRequiredRoles = new Set(
  env.MFA_REQUIRED_ROLES.split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean),
);

type JwtUser = {
  id: number;
  email: string;
  role: string;
  mfaVerified?: boolean;
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
  user?: JwtUser;
};

const FALLBACK_ROLE_PERMISSIONS: Record<string, string[]> = {
  viewer: ["view_dashboard"],
  editor: [
    "view_dashboard",
    "manage_scholarships",
    "manage_jobs",
    "manage_blog",
    "manage_partners",
    "manage_team",
  ],
  admin: [
    "view_dashboard",
    "manage_scholarships",
    "manage_jobs",
    "manage_partners",
    "manage_blog",
    "manage_team",
    "manage_users",
    "review_applications",
    "manage_roles",
    "view_analytics",
  ],
  super_admin: [
    "view_dashboard",
    "manage_scholarships",
    "manage_jobs",
    "manage_partners",
    "manage_blog",
    "manage_team",
    "manage_users",
    "review_applications",
    "manage_roles",
    "view_analytics",
    "manage_settings",
  ],
};

const normalizeRoleId = (role: string) => role.trim().toLowerCase().replace(/\s+/g, "_");

const getPermissionsForRole = (role: string) => {
  const normalized = normalizeRoleId(role);
  const configuredRole = getAdminRoles().find((item) => normalizeRoleId(item.id) === normalized);
  if (configuredRole && Array.isArray(configuredRole.permissions)) {
    return configuredRole.permissions.map((item) => String(item));
  }
  return FALLBACK_ROLE_PERMISSIONS[normalized] ?? [];
};

const hasPermission = (user: JwtUser, permission: string) =>
  getPermissionsForRole(user.role).includes(permission);

const hasAnyPermission = (user: JwtUser, permissions: string[]) =>
  permissions.some((permission) => hasPermission(user, permission));

const roleRequiresMfa = (role: string) => mfaRequiredRoles.has(normalizeRoleId(role));

const encryptSecret = (plainText: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", MFA_ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${authTag.toString("base64url")}.${encrypted.toString("base64url")}`;
};

const decryptSecret = (cipherText: string) => {
  const parts = cipherText.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted payload");
  }
  const [ivB64, authTagB64, encryptedB64] = parts;
  const decipher = createDecipheriv(
    "aes-256-gcm",
    MFA_ENCRYPTION_KEY,
    Buffer.from(ivB64, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTagB64, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedB64, "base64url")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
};

const getTotpSecretForUser = (rawSecret: string | null | undefined) => {
  if (!rawSecret) return null;
  try {
    return decryptSecret(rawSecret);
  } catch {
    // Backward compatibility for previously unencrypted stored secrets.
    return rawSecret;
  }
};

const verifyTotpCode = async (secret: string, code: string) => {
  const sanitized = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(sanitized)) return false;
  const result = await verify({
    secret,
    token: sanitized,
    epochTolerance: 30,
  });
  return Boolean(result.valid);
};

const isMfaChallengePayload = (payload: unknown): payload is { id: number; email: string; role: string } => {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as Record<string, unknown>;
  const purpose = String(candidate.purpose ?? "");
  const expected = Buffer.from(MFA_CHALLENGE_PURPOSE, "utf8");
  const actual = Buffer.from(purpose, "utf8");
  if (actual.length !== expected.length) return false;
  if (!timingSafeEqual(actual, expected)) return false;
  return (
    typeof candidate.id === "number" &&
    typeof candidate.email === "string" &&
    typeof candidate.role === "string"
  );
};

const privilegedRealtimeChannels = new Set([
  "applications",
  "referrals",
  "user_activity",
  "admin-dashboard",
  "admin-notifications",
  "admin-roles",
  "admin-settings",
  "admin-audit-logs",
  "messages",
]);

const hasPrivilegedRealtimeAccess = (user: JwtUser) => {
  const privileged =
    hasAnyPermission(user, [
      "manage_scholarships",
      "manage_jobs",
      "manage_blog",
      "manage_partners",
      "manage_team",
      "manage_users",
      "manage_roles",
      "manage_settings",
      "review_applications",
      "view_analytics",
    ]) || normalizeRoleId(user.role) === "super_admin";

  if (!privileged) return false;
  if (!roleRequiresMfa(user.role)) return true;
  return Boolean(user.mfaVerified);
};

const canSubscribeToChannel = (user: JwtUser, channel: string) => {
  if (!channel) return false;

  if (channel.startsWith("applications:user:")) {
    const suffix = channel.slice("applications:user:".length);
    return suffix === String(user.id) || hasPrivilegedRealtimeAccess(user);
  }

  if (channel.startsWith("referrals:user:")) {
    const suffix = channel.slice("referrals:user:".length);
    return suffix === String(user.id) || hasPrivilegedRealtimeAccess(user);
  }

  if (privilegedRealtimeChannels.has(channel)) {
    return hasPrivilegedRealtimeAccess(user);
  }

  return true;
};

const applicationCreateSchema = insertApplicationSchema
  .pick({
    type: true,
    referenceId: true,
    documents: true,
    notes: true,
  })
  .strict();

const applicationUserUpdateSchema = z
  .object({
    documents: z.any().optional(),
    notes: z.string().max(5000).optional(),
  })
  .strict();


const applicationAdminUpdateSchema = insertApplicationSchema
  .pick({
    status: true,
    documents: true,
    notes: true,
  })
  .partial()
  .strict();

const referralCreateSchema = z
  .object({
    referredEmail: z.string().email().max(255),
  })
  .strict();

const publicRegisterSchema = z
  .object({
    username: z.string().trim().min(3).max(255),
    email: z.string().trim().toLowerCase().email().max(255),
    password: z.string().min(8).max(255),
    firstName: z.string().trim().min(1).max(255),
    lastName: z.string().trim().min(1).max(255),
  })
  .strict();

const adminRegisterSchema = z
  .object({
    username: z.string().trim().min(3).max(255),
    email: z.string().trim().toLowerCase().email().max(255),
    password: z.string().min(8).max(255),
    firstName: z.string().trim().min(1).max(255),
    lastName: z.string().trim().min(1).max(255),
    role: z.enum(["viewer", "editor", "admin"]).default("viewer"),
  })
  .strict();

const loginSchema = z
  .object({
    email: z.string().optional(),
    username: z.string().optional(),
    identifier: z.string().optional(),
    password: z.string().min(1),
    mfaCode: z.string().optional(),
  })
  .strict();

const mfaEnableSchema = z
  .object({
    code: z.string().min(6).max(12),
  })
  .strict();

const mfaVerifySchema = z
  .object({
    challengeToken: z.string().min(10),
    code: z.string().min(6).max(12),
  })
  .strict();

const mfaDisableSchema = z
  .object({
    code: z.string().min(6).max(12),
  })
  .strict();

const getErrorMessage = (error: unknown) => {
  if (error instanceof z.ZodError) {
    return error.flatten();
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
};

type RegistrationConflictFields = Partial<Record<"email" | "username", string>>;

const getRegistrationConflict = async (userData: { email: string; username: string }) => {
  const [existingEmailUser, existingUsernameUser] = await Promise.all([
    storage.getUserByEmail(userData.email),
    storage.getUserByUsername(userData.username),
  ]);

  const fields: RegistrationConflictFields = {};
  if (existingEmailUser) fields.email = "This email is already registered";
  if (existingUsernameUser) fields.username = "This username is already taken";

  if (Object.keys(fields).length === 0) return null;

  const message =
    fields.email && fields.username
      ? "Email and username are already in use"
      : fields.email
        ? fields.email
        : fields.username ?? "Account already exists";

  return {
    message,
    code: "REGISTRATION_CONFLICT",
    fields,
  };
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

const signToken = (
  user: { id: number; email: string; role: string },
  options?: { mfaVerified?: boolean },
) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      mfaVerified: Boolean(options?.mfaVerified),
    },
    JWT_SECRET,
    { expiresIn: "24h" },
  );

const signMfaChallengeToken = (user: { id: number; email: string; role: string }) =>
  jwt.sign(
    {
      purpose: MFA_CHALLENGE_PURPOSE,
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: MFA_CHALLENGE_TTL_SECONDS },
  );

const getAuthenticatedUser = (req: Request) => (req as AuthenticatedRequest).user;

const readBearerToken = (req: Request) => {
  const authHeader = req.headers.authorization;
  return authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
};

const parseAccessToken = (token: string): JwtUser | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtUser;
  } catch {
    return null;
  }
};

const getOptionalAuthenticatedUser = (req: Request): JwtUser | null => {
  const token = readBearerToken(req);
  if (!token) return null;
  return parseAccessToken(token);
};

const isAdmin = (user: JwtUser | null) =>
  Boolean(
    user &&
      (normalizeRoleId(user.role) === "super_admin" ||
        hasAnyPermission(user, ["manage_users", "manage_roles", "manage_settings"])),
  );

const isEditor = (user: JwtUser | null) =>
  Boolean(
    user &&
      (isAdmin(user) ||
        hasAnyPermission(user, [
          "manage_scholarships",
          "manage_jobs",
          "manage_blog",
          "manage_partners",
          "manage_team",
        ])),
  );

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const token = readBearerToken(req);

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  const user = parseAccessToken(token);
  if (!user) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }

  (req as AuthenticatedRequest).user = user;
  next();
};

const requirePrivilegedMfa = async (req: Request, res: Response, next: NextFunction) => {
  const user = getAuthenticatedUser(req);
  if (!roleRequiresMfa(user.role)) {
    return next();
  }

  const persistedUser = await storage.getUser(user.id);
  if (!persistedUser) {
    return res.status(401).json({ message: "User not found" });
  }

  const persistedSecret = getTotpSecretForUser(persistedUser.totpSecret);
  if (!persistedUser.mfaEnabled || !persistedSecret) {
    return res.status(403).json({
      message: "MFA setup required for privileged access",
      code: "MFA_SETUP_REQUIRED",
    });
  }

  if (!user.mfaVerified) {
    return res.status(403).json({
      message: "MFA verification required",
      code: "MFA_VERIFICATION_REQUIRED",
    });
  }

  return next();
};

const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!isAdmin(getAuthenticatedUser(req))) {
    return res.status(403).json({ message: "Admin access required" });
  }
  return requirePrivilegedMfa(req, res, next);
};

const requireEditor = async (req: Request, res: Response, next: NextFunction) => {
  if (!isEditor(getAuthenticatedUser(req))) {
    return res.status(403).json({ message: "Editor access required" });
  }
  return requirePrivilegedMfa(req, res, next);
};

const requirePermission =
  (...permissions: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const isSuperAdmin = normalizeRoleId(user.role) === "super_admin";
    if (isSuperAdmin || permissions.length === 0 || hasAnyPermission(user, permissions)) {
      return next();
    }

    return res.status(403).json({
      message: "Insufficient permissions",
      code: "INSUFFICIENT_PERMISSION",
      requiredAnyOf: permissions,
    });
  };

const requireDashboardPermission = requirePermission("view_dashboard");
const requireUserManagementPermission = requirePermission("manage_users");
const requireScholarshipManagementPermission = requirePermission("manage_scholarships");
const requireJobManagementPermission = requirePermission("manage_jobs");
const requirePartnerManagementPermission = requirePermission("manage_partners");
const requireBlogManagementPermission = requirePermission("manage_blog");
const requireTeamManagementPermission = requirePermission("manage_team");
const requireApplicationReviewPermission = requirePermission("review_applications");
const requireRoleManagementPermission = requirePermission("manage_roles");
const requireSettingsManagementPermission = requirePermission("manage_settings");
const requireAnalyticsPermission = requirePermission("view_analytics");
const requireAiManagementPermission = requirePermission("manage_users", "manage_settings");
const requireContentUploadPermission = requirePermission(
  "manage_scholarships",
  "manage_jobs",
  "manage_partners",
  "manage_blog",
  "manage_team",
);

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket setup for real-time updates
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req, socket, head) => {
    const requestUrl = new URL(req.url ?? "", `http://${req.headers.host ?? "localhost"}`);
    if (requestUrl.pathname !== "/ws") {
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws: SocketWithSubscriptions, req) => {
    const requestUrl = new URL(req.url ?? "", `http://${req.headers.host ?? "localhost"}`);
    const token = requestUrl.searchParams.get("token");

    if (!token) {
      ws.close(1008, "Authentication required");
      return;
    }

    try {
      ws.user = jwt.verify(token, JWT_SECRET) as JwtUser;
    } catch {
      ws.close(1008, "Invalid token");
      return;
    }

    ws.subscriptions = [];

    ws.on("message", (rawMessage: Buffer) => {
      try {
        const payload = JSON.parse(rawMessage.toString()) as {
          type?: string;
          channels?: string[];
          data?: { channels?: string[] };
        };
        const requestedChannels = Array.isArray(payload.channels)
          ? payload.channels
          : Array.isArray(payload.data?.channels)
            ? payload.data.channels
            : [];
        const allowedChannels = requestedChannels.filter((channel) =>
          canSubscribeToChannel(ws.user as JwtUser, String(channel)),
        );

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

  const uploadsDir = path.resolve(import.meta.dirname, "..", "uploads");
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.use(
    "/uploads",
    express.static(uploadsDir, {
      index: false,
      fallthrough: false,
      maxAge: "7d",
      setHeaders: (res) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cross-Origin-Resource-Policy", "same-site");
      },
    }),
  );

  const allowedUploadMimeTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
  ]);
  const allowedUploadExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]);

  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadsDir,
      filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, "");
        cb(null, `${base}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
      },
    }),
    fileFilter: (_req, file, cb) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const mimeTypeAllowed = allowedUploadMimeTypes.has(file.mimetype.toLowerCase());
      const extensionAllowed = allowedUploadExtensions.has(extension);

      if (!mimeTypeAllowed || !extensionAllowed) {
        cb(new Error("Only image uploads are allowed"));
        return;
      }

      cb(null, true);
    },
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        api: "up",
        cache: getCacheMode(),
      },
    });
  });

  // Authentication routes
  const registerHandler = async (req: Request, res: Response) => {
    try {
      const userData = publicRegisterSchema.parse(req.body);

      const conflict = await getRegistrationConflict(userData);
      if (conflict) {
        return res.status(409).json(conflict);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        role: "user",
        mfaEnabled: false,
        totpSecret: null,
        mfaConfirmedAt: null,
      });

      // Log analytics
      await storage.logAnalytics({
        event: 'user_registered',
        userId: user.id,
        metadata: { email: user.email, role: user.role },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      broadcast('user_activity', { type: 'user_registered', user: buildPublicUser(user) });

      res.status(201).json({
        message: 'User created successfully',
        token: signToken(user, { mfaVerified: false }),
        user: buildPublicUser(user),
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ message: 'Registration failed', error: getErrorMessage(error) });
    }
  };

  const registerAdminHandler = async (req: Request, res: Response) => {
    try {
      const userData = adminRegisterSchema.parse(req.body);

      const conflict = await getRegistrationConflict(userData);
      if (conflict) {
        return res.status(409).json(conflict);
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const role = normalizeRoleId(userData.role);

      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        role,
        mfaEnabled: false,
        totpSecret: null,
        mfaConfirmedAt: null,
      });

      await storage.logAnalytics({
        event: "admin_user_registered",
        userId: user.id,
        metadata: { email: user.email, role: user.role, origin: "admin_panel" },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      broadcast("user_activity", {
        type: "admin_user_registered",
        user: buildPublicUser(user),
      });

      res.status(201).json({
        message: "Admin user created successfully",
        token: signToken(user, { mfaVerified: false }),
        user: buildPublicUser(user),
      });
    } catch (error) {
      console.error("Admin registration error:", error);
      res.status(400).json({ message: "Registration failed", error: getErrorMessage(error) });
    }
  };

  const loginHandler = async (req: Request, res: Response) => {
    try {
      const payload = loginSchema.parse(req.body);
      const identifier = payload.email ?? payload.username ?? payload.identifier;
      const { password, mfaCode } = payload;

      if (!identifier || !password) {
        return res.status(400).json({ message: 'Email or username and password are required' });
      }

      const normalizedIdentifier = String(identifier).trim();
      const looksLikeEmail = normalizedIdentifier.includes("@");

      // Use a single targeted lookup to avoid unnecessary DB round-trips during login.
      const user = looksLikeEmail
        ? await storage.getUserByEmail(normalizedIdentifier)
        : await storage.getUserByUsername(normalizedIdentifier);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const totpSecret = getTotpSecretForUser(user.totpSecret);
      const mfaRequired = Boolean(user.mfaEnabled && totpSecret);

      if (mfaRequired) {
        if (!mfaCode) {
          return res.status(202).json({
            message: 'MFA verification required',
            mfaRequired: true,
            challengeToken: signMfaChallengeToken(user),
          });
        }

        const isValidMfaCode = await verifyTotpCode(totpSecret as string, mfaCode);
        if (!isValidMfaCode) {
          return res.status(401).json({ message: 'Invalid MFA code' });
        }
      }

      // Log analytics
      await storage.logAnalytics({
        event: 'user_logged_in',
        userId: user.id,
        metadata: { email: user.email, mfaVerified: mfaRequired },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      broadcast('user_activity', { type: 'user_logged_in', user: buildPublicUser(user) });

      res.json({
        message: 'Login successful',
        token: signToken(user, { mfaVerified: mfaRequired }),
        user: buildPublicUser(user),
        mfaVerified: mfaRequired,
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

  const verifyMfaChallengeHandler = async (req: Request, res: Response) => {
    try {
      const payload = mfaVerifySchema.parse(req.body);
      const decoded = jwt.verify(payload.challengeToken, JWT_SECRET);
      if (!isMfaChallengePayload(decoded)) {
        return res.status(401).json({ message: 'Invalid MFA challenge token' });
      }

      const user = await storage.getUser(decoded.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const totpSecret = getTotpSecretForUser(user.totpSecret);
      if (!user.mfaEnabled || !totpSecret) {
        return res.status(400).json({ message: 'MFA is not enabled for this user' });
      }

      const isValidMfaCode = await verifyTotpCode(totpSecret, payload.code);
      if (!isValidMfaCode) {
        return res.status(401).json({ message: 'Invalid MFA code' });
      }

      await storage.logAnalytics({
        event: "user_logged_in_mfa_verified",
        userId: user.id,
        metadata: { email: user.email },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json({
        message: "MFA verification successful",
        token: signToken(user, { mfaVerified: true }),
        user: buildPublicUser(user),
        mfaVerified: true,
      });
    } catch (error) {
      console.error("MFA verification error:", error);
      res.status(401).json({ message: "MFA verification failed" });
    }
  };

  const mfaStatusHandler = async (req: Request, res: Response) => {
    try {
      const sessionUser = getAuthenticatedUser(req);
      const user = await storage.getUser(sessionUser.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const totpSecret = getTotpSecretForUser(user.totpSecret);
      return res.json({
        mfaEnabled: Boolean(user.mfaEnabled),
        mfaEnrolled: Boolean(totpSecret),
        mfaRequiredForRole: roleRequiresMfa(user.role),
        role: user.role,
      });
    } catch (error) {
      console.error("MFA status error:", error);
      return res.status(500).json({ message: "Failed to fetch MFA status" });
    }
  };

  const mfaSetupHandler = async (req: Request, res: Response) => {
    try {
      const sessionUser = getAuthenticatedUser(req);
      const user = await storage.getUser(sessionUser.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const secret = generateSecret();
      const encryptedSecret = encryptSecret(secret);
      await storage.updateUser(user.id, {
        totpSecret: encryptedSecret,
        mfaEnabled: false,
        mfaConfirmedAt: null,
      });

      const issuer = "Mtendere Education Consult";
      const otpauthUrl = generateURI({
        issuer,
        label: user.email,
        secret,
      });
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 240,
      });

      return res.json({
        message: "MFA setup initialized",
        secret,
        otpauthUrl,
        qrCodeDataUrl,
        account: user.email,
        issuer,
        type: "totp",
        digits: 6,
        period: 30,
      });
    } catch (error) {
      console.error("MFA setup error:", error);
      return res.status(500).json({ message: "Failed to initialize MFA setup" });
    }
  };

  const mfaEnableHandler = async (req: Request, res: Response) => {
    try {
      const payload = mfaEnableSchema.parse(req.body);
      const sessionUser = getAuthenticatedUser(req);
      const user = await storage.getUser(sessionUser.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const totpSecret = getTotpSecretForUser(user.totpSecret);
      if (!totpSecret) {
        return res.status(400).json({ message: "MFA is not set up yet" });
      }

      const isValidCode = await verifyTotpCode(totpSecret, payload.code);
      if (!isValidCode) {
        return res.status(401).json({ message: "Invalid MFA code" });
      }

      await storage.updateUser(user.id, {
        mfaEnabled: true,
        mfaConfirmedAt: new Date(),
      });

      await storage.logAnalytics({
        event: "user_mfa_enabled",
        userId: user.id,
        metadata: { email: user.email, role: user.role },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      return res.json({ message: "MFA enabled successfully", mfaEnabled: true });
    } catch (error) {
      console.error("MFA enable error:", error);
      return res.status(400).json({ message: "Failed to enable MFA", error: getErrorMessage(error) });
    }
  };

  const mfaDisableHandler = async (req: Request, res: Response) => {
    try {
      const payload = mfaDisableSchema.parse(req.body);
      const sessionUser = getAuthenticatedUser(req);
      const user = await storage.getUser(sessionUser.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const totpSecret = getTotpSecretForUser(user.totpSecret);
      if (!user.mfaEnabled || !totpSecret) {
        return res.status(400).json({ message: "MFA is not enabled" });
      }

      const isValidCode = await verifyTotpCode(totpSecret, payload.code);
      if (!isValidCode) {
        return res.status(401).json({ message: "Invalid MFA code" });
      }

      await storage.updateUser(user.id, {
        mfaEnabled: false,
        totpSecret: null,
        mfaConfirmedAt: null,
      });

      await storage.logAnalytics({
        event: "user_mfa_disabled",
        userId: user.id,
        metadata: { email: user.email, role: user.role },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      return res.json({ message: "MFA disabled successfully", mfaEnabled: false });
    } catch (error) {
      console.error("MFA disable error:", error);
      return res.status(400).json({ message: "Failed to disable MFA", error: getErrorMessage(error) });
    }
  };

  app.post('/api/auth/register', registerHandler);
  app.post('/api/auth/login', loginHandler);
  app.post('/api/auth/mfa/verify', verifyMfaChallengeHandler);
  app.get('/api/auth/mfa/status', authenticateToken, mfaStatusHandler);
  app.post('/api/auth/mfa/setup', authenticateToken, mfaSetupHandler);
  app.post('/api/auth/mfa/enable', authenticateToken, mfaEnableHandler);
  app.post('/api/auth/mfa/disable', authenticateToken, mfaDisableHandler);

  // Admin client aliases
  app.post('/auth/register', registerAdminHandler);
  app.post('/auth/login', loginHandler);
  app.post('/auth/mfa/verify', verifyMfaChallengeHandler);
  app.get('/auth/mfa/status', authenticateToken, mfaStatusHandler);
  app.post('/auth/mfa/setup', authenticateToken, mfaSetupHandler);
  app.post('/auth/mfa/enable', authenticateToken, mfaEnableHandler);
  app.post('/auth/mfa/disable', authenticateToken, mfaDisableHandler);
  app.post('/auth/logout', (_req, res) => {
    res.json({ message: 'Logged out successfully' });
  });
  app.post('/auth/refresh', (_req, res) => {
    res.status(401).json({ message: 'Refresh token not available' });
  });

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

  app.get('/api/users', authenticateToken, requireAdmin, requireUserManagementPermission, async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map(buildPublicUser));
    } catch (error) {
      console.error('Users fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.post('/api/users', authenticateToken, requireAdmin, requireUserManagementPermission, async (req, res) => {
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

  app.put('/api/users/:id', authenticateToken, requireAdmin, requireUserManagementPermission, async (req, res) => {
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

  app.delete('/api/users/:id', authenticateToken, requireAdmin, requireUserManagementPermission, async (req, res) => {
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
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: 'Search query is required' });
      }
      
      const scholarships = await storage.searchScholarships(q);
      res.json(scholarships);
    } catch (error) {
      console.error('Scholarship search error:', error);
      res.status(500).json({ message: 'Failed to search scholarships' });
    }
  });

  app.post('/api/scholarships', authenticateToken, requireAdmin, requireScholarshipManagementPermission, async (req, res) => {
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

  app.put('/api/scholarships/:id', authenticateToken, requireAdmin, requireScholarshipManagementPermission, async (req, res) => {
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

  app.delete('/api/scholarships/:id', authenticateToken, requireAdmin, requireScholarshipManagementPermission, async (req, res) => {
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
      res.json(jobs);
    } catch (error) {
      console.error('Jobs fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch jobs' });
    }
  });

  app.get('/api/jobs/search', async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: 'Search query is required' });
      }
      
      const jobs = await storage.searchJobs(q);
      res.json(jobs);
    } catch (error) {
      console.error('Job search error:', error);
      res.status(500).json({ message: 'Failed to search jobs' });
    }
  });

  app.post('/api/jobs', authenticateToken, requireAdmin, requireJobManagementPermission, async (req, res) => {
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

  app.put('/api/jobs/:id', authenticateToken, requireAdmin, requireJobManagementPermission, async (req, res) => {
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

  app.delete('/api/jobs/:id', authenticateToken, requireAdmin, requireJobManagementPermission, async (req, res) => {
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

  app.post('/api/applications', authenticateToken, async (req, res) => {
    try {
      const authUser = getAuthenticatedUser(req);
      const payload = applicationCreateSchema.parse(req.body);
      const applicationData = insertApplicationSchema.parse({
        ...payload,
        userId: authUser.id,
        status: "pending",
      });
      
      const application = await storage.createApplication(applicationData);
      broadcast('applications', { type: 'application_created', application });
      broadcast(`applications:user:${authUser.id}`, { type: 'application_created', application });
      
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
      
      // Check if user owns the application or is admin
      const existingApplication = await storage.getApplication(id);
      if (!existingApplication) {
        return res.status(404).json({ message: 'Application not found' });
      }
      
      const user = getAuthenticatedUser(req);
      const isPrivilegedReviewer =
        normalizeRoleId(user.role) === "super_admin" || hasPermission(user, "review_applications");
      if (existingApplication.userId !== user.id && !isPrivilegedReviewer) {
        return res.status(403).json({ message: 'Not authorized to update this application' });
      }

      const updateData = isPrivilegedReviewer
        ? applicationAdminUpdateSchema.parse(req.body)
        : applicationUserUpdateSchema.parse(req.body);
      
      const application = await storage.updateApplication(id, updateData);
      broadcast('applications', { type: 'application_updated', application });
      broadcast(`applications:user:${existingApplication.userId}`, {
        type: 'application_updated',
        application,
      });
      
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
      res.json(partners);
    } catch (error) {
      console.error('Partners fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch partners' });
    }
  });

  app.post('/api/partners', authenticateToken, requireAdmin, requirePartnerManagementPermission, async (req, res) => {
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
      const testimonialData = insertTestimonialSchema.parse({
        ...req.body,
        userId: getAuthenticatedUser(req).id,
      });
      
      const testimonial = await storage.createTestimonial(testimonialData);
      broadcast('testimonials', { type: 'testimonial_created', testimonial });
      
      res.status(201).json(testimonial);
    } catch (error) {
      console.error('Testimonial creation error:', error);
      res.status(400).json({ message: 'Failed to create testimonial', error: getErrorMessage(error) });
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
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: 'Search query is required' });
      }
      
      const blogPosts = await storage.searchBlogPosts(q);
      res.json(blogPosts);
    } catch (error) {
      console.error('Blog search error:', error);
      res.status(500).json({ message: 'Failed to search blog posts' });
    }
  });

  app.get('/api/blog-posts/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.getBlogPost(id);
      if (!post) {
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

  app.post('/api/blog-posts', authenticateToken, requireAdmin, requireBlogManagementPermission, async (req, res) => {
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

  app.put('/api/blog-posts/:id', authenticateToken, requireAdmin, requireBlogManagementPermission, async (req, res) => {
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

  app.delete('/api/blog-posts/:id', authenticateToken, requireAdmin, requireBlogManagementPermission, async (req, res) => {
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

  app.post('/api/team-members', authenticateToken, requireAdmin, requireTeamManagementPermission, async (req, res) => {
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

  app.put('/api/team-members/:id', authenticateToken, requireAdmin, requireTeamManagementPermission, async (req, res) => {
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

  app.delete('/api/team-members/:id', authenticateToken, requireAdmin, requireTeamManagementPermission, async (req, res) => {
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

  // Referrals routes (legacy)
  // Note: Production referral engine endpoints are implemented below.
  app.get('/api/referrals', authenticateToken, async (req, res) => {
    try {
      const referrals = await storage.getUserReferrals(getAuthenticatedUser(req).id);
      res.json(referrals);
    } catch (error) {
      console.error('Referrals fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch referrals' });
    }
  });

  app.post('/api/referrals', authenticateToken, async (req, res) => {
    try {
      const payload = referralCreateSchema.parse(req.body);
      const referralData = insertReferralSchema.parse({
        referredEmail: payload.referredEmail,
        referrerId: getAuthenticatedUser(req).id,
        status: "pending",
        rewardAmount: 50,
      });
      
      const referral = await storage.createReferral(referralData);
      broadcast(`referrals:user:${referral.referrerId}`, { type: 'referral_created', referral });
      
      res.status(201).json(referral);
    } catch (error) {
      console.error('Referral creation error:', error);
      res.status(400).json({ 
        message: 'Failed to create referral', 
        error: getErrorMessage(error),
      });
    }
  });

  // ------------------------------
  // Production Referral Engine
  // ------------------------------

  // Public redirect: /r/:code
  // Captures click + creates attribution placeholder.
  app.get('/r/:code', async (req, res) => {
    try {
      const code = String(req.params.code ?? "").trim();
      if (!code) return res.status(400).send('Missing referral code');

      // Find active referral code
      const referralCode = await getReferralCodeByCode(code);
      if (!referralCode) {
        res.redirect('/register');
        return;
      }

      const programId = referralCode.programId;
      const codeId = referralCode.id;
      const referrerId = referralCode.referrerId;

      // Basic fingerprint: combine IP + UA (placeholder; production should use device fingerprint)
      const fingerprintHash = `${req.ip ?? 'na'}|${req.get('user-agent') ?? 'na'}`;

      const referralClick = await createReferralClick({
        programId,
        codeId,
        referrerId,
        fingerprintHash,
        referredEmail: null,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        utmSource: typeof req.query.utm_source === 'string' ? req.query.utm_source : null,
        utmMedium: typeof req.query.utm_medium === 'string' ? req.query.utm_medium : null,
        utmCampaign: typeof req.query.utm_campaign === 'string' ? req.query.utm_campaign : null,
      });

      // Create or update attribution placeholder (level 1)
      await createOrUpdateAttribution({
        clickId: referralClick.id,
        programId,
        codeId,
        referrerId,
        referredUserId: null,
        referredEmail: null,
        level: 1,
        attributionScore: 0,
        signupAt: null,
        activationAt: null,
      });

      // Redirect to register with code for tracking linkage
      // (In production, you should pass attributionId or store in a signed cookie.)
      const redirectUrl = `/register?ref=${encodeURIComponent(code)}`;
      res.redirect(302, redirectUrl);
    } catch (error) {
      console.error('Referral redirect error:', error);
      res.redirect('/register');
    }
  });

  // Auth endpoints: /api/referrals/my
  app.get('/api/referrals/my', authenticateToken, async (req, res) => {
    try {
      const userId = getAuthenticatedUser(req).id;
      const programs = await getActiveReferralPrograms();
      // Minimal shape for now (frontend can evolve)
      res.json({ programs, userId });
    } catch (error) {
      console.error('Referrals my error:', error);
      res.status(500).json({ message: 'Failed to fetch referral dashboard' });
    }
  });

  // Auth endpoints: /api/referrals/stats
  app.get('/api/referrals/stats', authenticateToken, async (req, res) => {
    try {
      // v2 currently has write helpers only; stats will be implemented after read helpers exist.
      // Return safe empty state matching existing UI expectations.
      res.json({
        balance: 0,
        pending: 0,
        recent: [],
      });
    } catch (error) {
      console.error('Referrals stats error:', error);
      res.status(500).json({ message: 'Failed to fetch referral stats' });
    }
  });

  app.get('/api/referrals/leaderboard', authenticateToken, async (req, res) => {
    try {
      res.json({ leaders: [], period: 'all_time' });
    } catch (error) {
      console.error('Referrals leaderboard error:', error);
      res.status(500).json({ message: 'Failed to fetch leaderboard' });
    }
  });

  // Admin routes (shared backend)
  const paginate = <T,>(items: T[], page: number, limit: number) => {
    const total = items.length;
    const start = (page - 1) * limit;
    return { items: items.slice(start, start + limit), total };
  };

  app.get('/api/admin/dashboard/stats', authenticateToken, requirePrivilegedMfa, requireDashboardPermission, async (_req, res) => {
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
        totalActiveChats: 0,
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

  app.get('/api/admin/dashboard/recent-activity', authenticateToken, requirePrivilegedMfa, requireDashboardPermission, async (_req, res) => {
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

  app.get('/api/admin/users', authenticateToken, requireAdmin, requireUserManagementPermission, async (req, res) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 50);
      const search = String(req.query.search ?? "").toLowerCase();

      const allUsers = await storage.getAllUsers();
      const filtered = search
        ? allUsers.filter((user) =>
            user.username.toLowerCase().includes(search) ||
            user.email.toLowerCase().includes(search),
          )
        : allUsers;

      const { items, total } = paginate(filtered, page, limit);
      res.json({ users: items.map(toAdminUser), total });
    } catch (error) {
      console.error("Admin users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/users/:id', authenticateToken, requireAdmin, requireUserManagementPermission, async (req, res) => {
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

  app.post('/api/admin/users', authenticateToken, requireAdmin, requireUserManagementPermission, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
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

  app.put('/api/admin/users/:id', authenticateToken, requireAdmin, requireUserManagementPermission, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const updateData = insertUserSchema.partial().parse(req.body);
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

  app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, requireUserManagementPermission, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
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

  app.get('/api/admin/scholarships', authenticateToken, requireEditor, requireScholarshipManagementPermission, async (req, res) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 50);
      const search = String(req.query.search ?? "").toLowerCase();
      const statusFilter = String(req.query.status ?? "").toLowerCase();

      const allScholarships = await storage.getAllScholarships();
      const mapped = allScholarships.map(toAdminScholarship);
      const filtered = mapped.filter((item) => {
        const matchesSearch =
          !search ||
          item.title.toLowerCase().includes(search) ||
          item.description.toLowerCase().includes(search) ||
          item.institution.toLowerCase().includes(search);
        const matchesStatus = !statusFilter || item.status === statusFilter;
        return matchesSearch && matchesStatus;
      });

      const { items, total } = paginate(filtered, page, limit);
      res.json({ data: items, total });
    } catch (error) {
      console.error("Admin scholarships error:", error);
      res.status(500).json({ message: "Failed to fetch scholarships" });
    }
  });

  app.post('/api/admin/scholarships', authenticateToken, requireEditor, requireScholarshipManagementPermission, async (req, res) => {
    try {
      const createdBy = getAuthenticatedUser(req).id;
      const amount = parseNumber(req.body.amount);
      const deadline = req.body.deadline ? new Date(req.body.deadline) : new Date();
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
        imageUrl: req.body.featuredImage ?? null,
        isActive: req.body.status === "published",
        createdBy,
      });

      const scholarship = await storage.createScholarship(scholarshipData);
      setScholarshipMeta(scholarship.id, {
        eligibility: req.body.eligibility ?? "",
        status: normalizeAdminStatus(req.body.status, scholarship.isActive),
        isPremium: Boolean(req.body.isPremium),
        paymentStatus: req.body.paymentStatus ?? "unpaid",
        featuredImage: req.body.featuredImage ?? "",
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

  app.put('/api/admin/scholarships/:id', authenticateToken, requireEditor, requireScholarshipManagementPermission, async (req, res) => {
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
      if (req.body.featuredImage !== undefined) payload.imageUrl = req.body.featuredImage;
      if (req.body.status !== undefined) payload.isActive = req.body.status === "published";

      const updateData = insertScholarshipSchema.partial().parse(payload);
      const scholarship = await storage.updateScholarship(id, updateData);
      if (!scholarship) return res.status(404).json({ message: "Scholarship not found" });

      setScholarshipMeta(id, {
        eligibility: req.body.eligibility,
        status: req.body.status,
        isPremium: parseOptionalBoolean(req.body.isPremium),
        paymentStatus: req.body.paymentStatus,
        featuredImage: req.body.featuredImage,
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

  app.delete('/api/admin/scholarships/:id', authenticateToken, requireEditor, requireScholarshipManagementPermission, async (req, res) => {
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

  app.get('/api/admin/jobs', authenticateToken, requireEditor, requireJobManagementPermission, async (req, res) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 50);
      const search = String(req.query.search ?? "").toLowerCase();
      const statusFilter = String(req.query.status ?? "").toLowerCase();

      const allJobs = await storage.getAllJobs();
      const mapped = allJobs.map(toAdminJob);
      const filtered = mapped.filter((item) => {
        const matchesSearch =
          !search ||
          item.title.toLowerCase().includes(search) ||
          item.company.toLowerCase().includes(search);
        const matchesStatus = !statusFilter || item.status === statusFilter;
        return matchesSearch && matchesStatus;
      });

      const { items, total } = paginate(filtered, page, limit);
      res.json({ data: items, total });
    } catch (error) {
      console.error("Admin jobs error:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.post('/api/admin/jobs', authenticateToken, requireEditor, requireJobManagementPermission, async (req, res) => {
    try {
      const createdBy = getAuthenticatedUser(req).id;
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
        imageUrl: req.body.featuredImage ?? null,
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
        featuredImage: req.body.featuredImage ?? "",
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

  app.put('/api/admin/jobs/:id', authenticateToken, requireEditor, requireJobManagementPermission, async (req, res) => {
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
      if (req.body.featuredImage !== undefined) payload.imageUrl = req.body.featuredImage;
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
        featuredImage: req.body.featuredImage,
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

  app.delete('/api/admin/jobs/:id', authenticateToken, requireEditor, requireJobManagementPermission, async (req, res) => {
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

  app.get('/api/admin/partners', authenticateToken, requireEditor, requirePartnerManagementPermission, async (req, res) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 50);
      const search = String(req.query.search ?? "").toLowerCase();

      const allPartners = await storage.getAllPartners();
      const mapped = allPartners.map(toAdminPartner);
      const filtered = mapped.filter((item) => {
        if (!search) return true;
        return item.name.toLowerCase().includes(search);
      });

      const { items, total } = paginate(filtered, page, limit);
      res.json({ partners: items, total });
    } catch (error) {
      console.error("Admin partners error:", error);
      res.status(500).json({ message: "Failed to fetch partners" });
    }
  });

  app.post('/api/admin/partners', authenticateToken, requireEditor, requirePartnerManagementPermission, async (req, res) => {
    try {
      const partnerData = insertPartnerSchema.parse({
        name: req.body.name ?? "",
        description: req.body.description ?? "",
        logoUrl: req.body.logo ?? null,
        website: req.body.website ?? null,
        country: req.body.region ?? "Global",
        studentCount: req.body.studentCount ?? null,
        ranking: req.body.ranking ?? null,
        isActive: req.body.isActive ?? true,
      });

      const partner = await storage.createPartner(partnerData);
      setPartnerMeta(partner.id, {
        partnershipType: req.body.partnershipType ?? "partner",
        logo: req.body.logo ?? "",
        contactEmail: req.body.contactEmail ?? "",
        contactPhone: req.body.contactPhone ?? "",
        address: req.body.address ?? "",
        region: req.body.region ?? "Global",
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

  app.put('/api/admin/partners/:id', authenticateToken, requireEditor, requirePartnerManagementPermission, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const payload: Record<string, unknown> = {};
      if (req.body.name !== undefined) payload.name = req.body.name;
      if (req.body.description !== undefined) payload.description = req.body.description;
      if (req.body.logo !== undefined) payload.logoUrl = req.body.logo;
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
        logo: req.body.logo,
        contactEmail: req.body.contactEmail,
        contactPhone: req.body.contactPhone,
        address: req.body.address,
        region: req.body.region,
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

  app.delete('/api/admin/partners/:id', authenticateToken, requireEditor, requirePartnerManagementPermission, async (req, res) => {
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

  app.get('/api/admin/blog', authenticateToken, requireEditor, requireBlogManagementPermission, async (req, res) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 50);
      const search = String(req.query.search ?? "").toLowerCase();
      const statusFilter = String(req.query.status ?? "").toLowerCase();

      const allPosts = await storage.getAllBlogPosts();
      const mapped = allPosts.map(toAdminBlogPost);
      const filtered = mapped.filter((item) => {
        const matchesSearch =
          !search ||
          item.title.toLowerCase().includes(search) ||
          item.content.toLowerCase().includes(search);
        const matchesStatus = !statusFilter || item.status === statusFilter;
        return matchesSearch && matchesStatus;
      });

      const { items, total } = paginate(filtered, page, limit);
      res.json({ posts: items, total });
    } catch (error) {
      console.error("Admin blog error:", error);
      res.status(500).json({ message: "Failed to fetch blog posts" });
    }
  });

  app.post('/api/admin/blog', authenticateToken, requireEditor, requireBlogManagementPermission, async (req, res) => {
    try {
      const authorId = getAuthenticatedUser(req).id;
      const postData = insertBlogPostSchema.parse({
        title: req.body.title ?? "",
        content: req.body.content ?? "",
        excerpt: req.body.excerpt ?? null,
        imageUrl: req.body.featuredImage ?? null,
        category: req.body.category ?? "General",
        tags: parseStringArray(req.body.tags) ?? [],
        isPublished: req.body.status === "published",
        authorId,
      });

      const post = await storage.createBlogPost(postData);
      setBlogMeta(post.id, {
        slug: req.body.slug ?? `post-${post.id}`,
        status: normalizeAdminStatus(req.body.status, post.isPublished),
        featuredImage: req.body.featuredImage ?? "",
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

  app.put('/api/admin/blog/:id', authenticateToken, requireEditor, requireBlogManagementPermission, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const payload: Record<string, unknown> = {};
      if (req.body.title !== undefined) payload.title = req.body.title;
      if (req.body.content !== undefined) payload.content = req.body.content;
      if (req.body.excerpt !== undefined) payload.excerpt = req.body.excerpt;
      if (req.body.featuredImage !== undefined) payload.imageUrl = req.body.featuredImage;
      if (req.body.category !== undefined) payload.category = req.body.category;
      if (req.body.tags !== undefined) payload.tags = parseStringArray(req.body.tags) ?? [];
      if (req.body.status !== undefined) payload.isPublished = req.body.status === "published";

      const updateData = insertBlogPostSchema.partial().parse(payload);
      const post = await storage.updateBlogPost(id, updateData);
      if (!post) return res.status(404).json({ message: "Blog post not found" });

      setBlogMeta(id, {
        slug: req.body.slug,
        status: req.body.status,
        featuredImage: req.body.featuredImage,
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

  app.delete('/api/admin/blog/:id', authenticateToken, requireEditor, requireBlogManagementPermission, async (req, res) => {
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

  app.get('/api/admin/team', authenticateToken, requireEditor, requireTeamManagementPermission, async (req, res) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 50);
      const search = String(req.query.search ?? "").toLowerCase();

      const allMembers = await storage.getAllTeamMembers();
      const mapped = allMembers.map(toAdminTeamMember);
      const filtered = mapped.filter((item) => !search || item.name.toLowerCase().includes(search));

      const { items, total } = paginate(filtered, page, limit);
      res.json({ members: items, total });
    } catch (error) {
      console.error("Admin team error:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  app.post('/api/admin/team', authenticateToken, requireEditor, requireTeamManagementPermission, async (req, res) => {
    try {
      const memberData = insertTeamMemberSchema.parse({
        name: req.body.name ?? "",
        position: req.body.position ?? "",
        bio: req.body.bio ?? null,
        imageUrl: req.body.profileImage ?? null,
        email: req.body.email ?? null,
        linkedin: req.body.linkedIn ?? null,
        twitter: req.body.twitter ?? null,
        order: req.body.order ?? 0,
        isActive: req.body.isActive ?? true,
      });

      const member = await storage.createTeamMember(memberData);
      setTeamMeta(member.id, {
        department: req.body.department ?? "",
        profileImage: req.body.profileImage ?? "",
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

  app.put('/api/admin/team/:id', authenticateToken, requireEditor, requireTeamManagementPermission, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const payload: Record<string, unknown> = {};
      if (req.body.name !== undefined) payload.name = req.body.name;
      if (req.body.position !== undefined) payload.position = req.body.position;
      if (req.body.bio !== undefined) payload.bio = req.body.bio;
      if (req.body.profileImage !== undefined) payload.imageUrl = req.body.profileImage;
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
        profileImage: req.body.profileImage,
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

  app.delete('/api/admin/team/:id', authenticateToken, requireEditor, requireTeamManagementPermission, async (req, res) => {
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

  app.get('/api/admin/applications', authenticateToken, requireAdmin, requireApplicationReviewPermission, async (req, res) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 50);
      const search = String(req.query.search ?? "").toLowerCase();
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
        ? enriched.filter((app) =>
            app.applicantName.toLowerCase().includes(search) ||
            app.applicantEmail.toLowerCase().includes(search) ||
            app.opportunityTitle.toLowerCase().includes(search) ||
            app.opportunityType.toLowerCase().includes(search),
          )
        : enriched;

      const { items, total } = paginate(searched, page, limit);
      res.json({ applications: items, total });
    } catch (error) {
      console.error("Admin applications error:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.put('/api/admin/applications/:id', authenticateToken, requireAdmin, requireApplicationReviewPermission, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const updateData = insertApplicationSchema.partial().parse({
        status: req.body.status,
        notes: req.body.reviewNotes,
      });

      const application = await storage.updateApplication(id, updateData);
      await emitAdminRealtimeEvent(req, {
        event: "application_updated",
        channel: "applications",
        entityType: "application",
        referenceId: id,
        payload: { application: { ...application, id: String(application.id) } },
      });
      res.json(application);
    } catch (error) {
      console.error("Admin applications update error:", error);
      res.status(400).json({ message: "Failed to update application", error: getErrorMessage(error) });
    }
  });

  app.get('/api/admin/ai-chat/conversations', authenticateToken, requireAdmin, requireAiManagementPermission, (_req, res) => {
    res.json({ conversations: [], total: 0 });
  });

  app.get('/api/admin/ai-chat/conversations/:id', authenticateToken, requireAdmin, requireAiManagementPermission, (_req, res) => {
    res.status(404).json({ message: "Conversation not found" });
  });

  app.get('/api/admin/ai/conversations', authenticateToken, requireAdmin, requireAiManagementPermission, (req, res) => {
    res.redirect(307, "/api/admin/ai-chat/conversations");
  });

  app.post('/api/admin/ai/chat', authenticateToken, requireAdmin, requireAiManagementPermission, async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) return res.status(400).json({ message: "Message is required" });
      const response = await getChatResponse(String(message));
      res.json({ response });
    } catch (error) {
      console.error("Admin AI chat error:", error);
      res.status(500).json({ message: "Failed to get chat response", error: getErrorMessage(error) });
    }
  });

  app.get('/api/admin/roles', authenticateToken, requireAdmin, requireRoleManagementPermission, (req, res) => {
    const search = String(req.query.search ?? "").toLowerCase();
    const roles = getAdminRoles().filter((role) => {
      if (!search) return true;
      return (
        role.name.toLowerCase().includes(search) ||
        role.description.toLowerCase().includes(search)
      );
    });
    res.json({ roles, total: roles.length });
  });

  app.post('/api/admin/roles', authenticateToken, requireAdmin, requireRoleManagementPermission, async (req, res) => {
    const role = upsertAdminRole({
      id: req.body.name?.toLowerCase().replace(/\s+/g, "-") || String(Date.now()),
      name: req.body.name ?? "Role",
      description: req.body.description ?? "",
      permissions: Array.isArray(req.body.permissions) ? req.body.permissions : [],
      isActive: true,
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

  app.put('/api/admin/roles/:id', authenticateToken, requireAdmin, requireRoleManagementPermission, async (req, res) => {
    const role = upsertAdminRole({
      id: req.params.id,
      name: req.body.name ?? req.params.id,
      description: req.body.description ?? "",
      permissions: Array.isArray(req.body.permissions) ? req.body.permissions : [],
      isActive: req.body.isActive ?? true,
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

  app.delete('/api/admin/roles/:id', authenticateToken, requireAdmin, requireRoleManagementPermission, async (req, res) => {
    deleteAdminRole(req.params.id);
    await emitAdminRealtimeEvent(req, {
      event: "role_deleted",
      channel: "admin-roles",
      entityType: "role",
      referenceId: req.params.id,
      payload: { id: req.params.id },
    });
    res.status(204).send();
  });

  app.get('/api/admin/settings', authenticateToken, requireAdmin, requireSettingsManagementPermission, (_req, res) => {
    res.json(getAdminSettings());
  });

  app.put('/api/admin/settings', authenticateToken, requireAdmin, requireSettingsManagementPermission, async (req, res) => {
    const settings = updateAdminSettings({
      platformName: req.body.platformName,
      supportEmail: req.body.supportEmail,
      sessionTimeout: req.body.sessionTimeout,
      maxLoginAttempts: req.body.maxLoginAttempts,
    });
    await emitAdminRealtimeEvent(req, {
      event: "settings_updated",
      channel: "admin-settings",
      entityType: "settings",
      payload: { settings },
    });
    res.json(settings);
  });

  app.get('/api/admin/notifications', authenticateToken, requirePrivilegedMfa, requireDashboardPermission, async (req, res) => {
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

  app.put('/api/admin/notifications/:id/read', authenticateToken, requirePrivilegedMfa, requireDashboardPermission, (req, res) => {
    markNotificationRead(req.params.id);
    res.status(204).send();
  });

  app.put('/api/admin/notifications/read-all', authenticateToken, requirePrivilegedMfa, requireDashboardPermission, async (_req, res) => {
    const ids = (await storage.getAnalytics()).map((item) => `analytics-${item.id}`);
    markNotificationsRead(ids);
    res.status(204).send();
  });

  app.get('/api/admin/audit-logs', authenticateToken, requireAdmin, requireSettingsManagementPermission, async (req, res) => {
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

  app.post('/api/admin/upload', authenticateToken, requireEditor, requireContentUploadPermission, upload.single("file"), (req, res) => {
    const file = (req as MulterRequest).file;
    if (!file) return res.status(400).json({ message: "No file uploaded" });
    res.json({
      url: `/uploads/${file.filename}`,
      originalName: file.originalname,
      size: file.size,
      type: file.mimetype,
    });
  });

  app.post('/api/admin/upload/multiple', authenticateToken, requireEditor, requireContentUploadPermission, upload.array("files", 10), (req, res) => {
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

  // Analytics routes
  app.get('/api/analytics/summary', authenticateToken, requireAdmin, requireAnalyticsPermission, async (req, res) => {
    try {
      const summary = await storage.getAnalyticsSummary();
      res.json(summary);
    } catch (error) {
      console.error('Analytics summary error:', error);
      res.status(500).json({ message: 'Failed to fetch analytics summary' });
    }
  });

  app.get('/api/analytics', authenticateToken, requireAdmin, requireAnalyticsPermission, async (req, res) => {
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
      const userId = getAuthenticatedUser(req).id;
      const success = await storage.deleteUserSavedItem(id, userId);
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

  // Messages / Contact routes
  app.post('/api/messages', async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      res.status(201).json({ message: 'Message sent successfully', data: message });
    } catch (error) {
      console.error('Message creation error:', error);
      res.status(400).json({ message: 'Failed to send message', error: getErrorMessage(error) });
    }
  });

  app.get('/api/messages', authenticateToken, requireAdmin, requireUserManagementPermission, async (_req, res) => {
    try {
      const messages = await storage.getAllMessages();
      res.json(messages);
    } catch (error) {
      console.error('Messages fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  app.put('/api/messages/:id/read', authenticateToken, requireAdmin, requireUserManagementPermission, async (req, res) => {
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
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ message: 'Message is required' });
      }

      const response = await getChatResponse(message);
      res.json({ response });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ message: 'Failed to get chat response', error: getErrorMessage(error) });
    }
  });

  return httpServer;
}
