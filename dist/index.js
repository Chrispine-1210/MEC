var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import fs5 from "fs";
import path6 from "path";
import { randomUUID as randomUUID3 } from "crypto";

// server/env.ts
import "dotenv/config";
import { z } from "zod";
var optionalEnvString = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? void 0 : value,
  z.string().optional()
);
var optionalEnvBoolean = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return void 0;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return value;
}, z.boolean().optional());
var envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5e3),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(6e4),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  PUBLIC_APP_URL: optionalEnvString,
  FRONTEND_URL: optionalEnvString,
  ADMIN_APP_URL: optionalEnvString,
  CORS_ORIGIN: optionalEnvString,
  CORS_ORIGINS: optionalEnvString,
  VITE_SITE_URL: optionalEnvString,
  VITE_API_URL: optionalEnvString,
  EMAIL_FROM: optionalEnvString,
  EMAIL_API_URL: optionalEnvString,
  EMAIL_API_KEY: optionalEnvString,
  ADMIN_NOTIFICATION_EMAIL: optionalEnvString,
  REDIS_URL: optionalEnvString,
  SENTRY_DSN: optionalEnvString,
  SENTRY_ENVIRONMENT: optionalEnvString,
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional(),
  STRIPE_SECRET_KEY: optionalEnvString,
  STRIPE_WEBHOOK_SECRET: optionalEnvString,
  STRIPE_DEFAULT_CURRENCY: z.string().length(3).default("USD"),
  REFERRAL_PAYOUT_MIN_AMOUNT: z.coerce.number().int().positive().default(2500),
  REFERRAL_RELEASE_WORKER_ENABLED: optionalEnvBoolean,
  REFERRAL_RELEASE_WORKER_MS: z.coerce.number().int().positive().default(9e5)
});
var env = envSchema.parse(process.env);

// server/index.ts
import helmet from "helmet";
import express3 from "express";

// server/routes.ts
import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  analytics: () => analytics,
  analyticsRelations: () => analyticsRelations,
  applications: () => applications,
  applicationsRelations: () => applicationsRelations,
  blogComments: () => blogComments,
  blogCommentsRelations: () => blogCommentsRelations,
  blogPosts: () => blogPosts,
  blogPostsRelations: () => blogPostsRelations,
  commissionRules: () => commissionRules,
  commissionRulesRelations: () => commissionRulesRelations,
  commissions: () => commissions,
  commissionsRelations: () => commissionsRelations,
  eventComments: () => eventComments,
  eventCommentsRelations: () => eventCommentsRelations,
  eventReactions: () => eventReactions,
  eventReactionsRelations: () => eventReactionsRelations,
  eventRegistrations: () => eventRegistrations,
  eventRegistrationsRelations: () => eventRegistrationsRelations,
  events: () => events,
  eventsRelations: () => eventsRelations,
  fraudSignals: () => fraudSignals,
  insertAnalyticsSchema: () => insertAnalyticsSchema,
  insertApplicationSchema: () => insertApplicationSchema,
  insertBlogCommentSchema: () => insertBlogCommentSchema,
  insertBlogPostSchema: () => insertBlogPostSchema,
  insertCommissionRuleSchema: () => insertCommissionRuleSchema,
  insertCommissionSchema: () => insertCommissionSchema,
  insertEventCommentSchema: () => insertEventCommentSchema,
  insertEventReactionSchema: () => insertEventReactionSchema,
  insertEventRegistrationSchema: () => insertEventRegistrationSchema,
  insertEventSchema: () => insertEventSchema,
  insertFraudSignalSchema: () => insertFraudSignalSchema,
  insertJobSchema: () => insertJobSchema,
  insertLedgerEntrySchema: () => insertLedgerEntrySchema,
  insertMessageSchema: () => insertMessageSchema,
  insertPartnerSchema: () => insertPartnerSchema,
  insertPaymentSchema: () => insertPaymentSchema,
  insertPayoutRequestSchema: () => insertPayoutRequestSchema,
  insertReferralCampaignSchema: () => insertReferralCampaignSchema,
  insertReferralClickSchema: () => insertReferralClickSchema,
  insertReferralCodeSchema: () => insertReferralCodeSchema,
  insertReferralDisputeSchema: () => insertReferralDisputeSchema,
  insertReferralRelationshipSchema: () => insertReferralRelationshipSchema,
  insertReferralSchema: () => insertReferralSchema,
  insertSavedItemSchema: () => insertSavedItemSchema,
  insertScholarshipSchema: () => insertScholarshipSchema,
  insertStripeEventSchema: () => insertStripeEventSchema,
  insertSubscriberSchema: () => insertSubscriberSchema,
  insertTeamMemberSchema: () => insertTeamMemberSchema,
  insertTestimonialSchema: () => insertTestimonialSchema,
  insertUserSchema: () => insertUserSchema,
  insertWalletAccountSchema: () => insertWalletAccountSchema,
  jobs: () => jobs,
  jobsRelations: () => jobsRelations,
  ledgerEntries: () => ledgerEntries,
  ledgerEntriesRelations: () => ledgerEntriesRelations,
  messages: () => messages,
  partners: () => partners,
  payments: () => payments,
  paymentsRelations: () => paymentsRelations,
  payoutRequests: () => payoutRequests,
  payoutRequestsRelations: () => payoutRequestsRelations,
  referralCampaigns: () => referralCampaigns,
  referralCampaignsRelations: () => referralCampaignsRelations,
  referralClicks: () => referralClicks,
  referralClicksRelations: () => referralClicksRelations,
  referralCodes: () => referralCodes,
  referralCodesRelations: () => referralCodesRelations,
  referralDisputes: () => referralDisputes,
  referralRelationships: () => referralRelationships,
  referralRelationshipsRelations: () => referralRelationshipsRelations,
  referrals: () => referrals,
  referralsRelations: () => referralsRelations,
  savedItems: () => savedItems,
  savedItemsRelations: () => savedItemsRelations,
  scholarships: () => scholarships,
  scholarshipsRelations: () => scholarshipsRelations,
  stripeEvents: () => stripeEvents,
  subscribers: () => subscribers,
  teamMembers: () => teamMembers,
  testimonials: () => testimonials,
  testimonialsRelations: () => testimonialsRelations,
  users: () => users,
  usersRelations: () => usersRelations,
  walletAccounts: () => walletAccounts,
  walletAccountsRelations: () => walletAccountsRelations
});
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z as z2 } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("user"),
  profilePicture: text("profile_picture"),
  phone: varchar("phone", { length: 20 }),
  dateOfBirth: timestamp("date_of_birth"),
  referralCode: varchar("referral_code", { length: 24 }).unique(),
  stripeCustomerId: text("stripe_customer_id").unique(),
  defaultCurrency: varchar("default_currency", { length: 3 }).default("USD"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var scholarships = pgTable("scholarships", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  institution: text("institution").notNull(),
  country: text("country").notNull(),
  amount: integer("amount"),
  currency: varchar("currency", { length: 10 }).default("USD"),
  deadline: timestamp("deadline").notNull(),
  requirements: jsonb("requirements"),
  category: varchar("category", { length: 100 }).notNull(),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull(),
  salary: integer("salary"),
  currency: varchar("currency", { length: 10 }).default("USD"),
  jobType: varchar("job_type", { length: 50 }).notNull(),
  requirements: jsonb("requirements"),
  benefits: jsonb("benefits"),
  isRemote: boolean("is_remote").default(false),
  deadline: timestamp("deadline"),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  referenceId: integer("reference_id").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  documents: jsonb("documents"),
  notes: text("notes"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  logoUrl: text("logo_url"),
  website: text("website"),
  country: text("country"),
  studentCount: integer("student_count"),
  ranking: text("ranking"),
  programs: jsonb("programs"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  authorName: text("author_name"),
  credential: text("credential"),
  content: text("content").notNull(),
  rating: integer("rating").notNull(),
  imageUrl: text("image_url"),
  isApproved: boolean("is_approved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  imageUrl: text("image_url"),
  category: varchar("category", { length: 100 }).notNull(),
  tags: text("tags").array(),
  isPublished: boolean("is_published").default(false),
  authorId: integer("author_id").notNull(),
  likes: integer("likes").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var blogComments = pgTable("blog_comments", {
  id: serial("id").primaryKey(),
  blogPostId: integer("blog_post_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  position: text("position").notNull(),
  bio: text("bio"),
  imageUrl: text("image_url"),
  email: varchar("email", { length: 255 }),
  linkedin: text("linkedin"),
  twitter: text("twitter"),
  order: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    slug: varchar("slug", { length: 180 }).notNull().unique(),
    summary: text("summary"),
    description: text("description").notNull(),
    category: varchar("category", { length: 100 }).notNull().default("General"),
    eventType: varchar("event_type", { length: 80 }).notNull().default("Information Session"),
    location: text("location").notNull().default("Lilongwe, Malawi"),
    venueName: text("venue_name"),
    address: text("address"),
    mapUrl: text("map_url"),
    isVirtual: boolean("is_virtual").default(false),
    virtualUrl: text("virtual_url"),
    livestreamUrl: text("livestream_url"),
    isPaid: boolean("is_paid").default(false),
    priceAmount: integer("price_amount").default(0),
    currency: varchar("currency", { length: 10 }).default("MWK"),
    capacity: integer("capacity"),
    startAt: timestamp("start_at").notNull(),
    endAt: timestamp("end_at").notNull(),
    registrationDeadline: timestamp("registration_deadline"),
    coverImage: text("cover_image"),
    videoUrl: text("video_url"),
    tags: text("tags").array(),
    agenda: jsonb("agenda").$type(),
    speakers: jsonb("speakers").$type(),
    sponsors: jsonb("sponsors").$type(),
    faqs: jsonb("faqs").$type(),
    resources: jsonb("resources").$type(),
    gallery: jsonb("gallery").$type(),
    status: varchar("status", { length: 40 }).notNull().default("draft"),
    isFeatured: boolean("is_featured").default(false),
    isRecommended: boolean("is_recommended").default(false),
    isTrending: boolean("is_trending").default(false),
    allowComments: boolean("allow_comments").default(true),
    requiresApproval: boolean("requires_approval").default(false),
    viewCount: integer("view_count").default(0),
    shareCount: integer("share_count").default(0),
    likeCount: integer("like_count").default(0),
    createdBy: integer("created_by").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => ({
    slugIdx: uniqueIndex("events_slug_idx").on(table.slug),
    statusIdx: index("events_status_idx").on(table.status),
    startIdx: index("events_start_at_idx").on(table.startAt),
    categoryIdx: index("events_category_idx").on(table.category)
  })
);
var eventRegistrations = pgTable(
  "event_registrations",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull(),
    userId: integer("user_id"),
    fullName: text("full_name").notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 40 }),
    organization: text("organization"),
    status: varchar("status", { length: 40 }).notNull().default("pending"),
    ticketCode: varchar("ticket_code", { length: 80 }).notNull().unique(),
    attendanceStatus: varchar("attendance_status", { length: 40 }).notNull().default("registered"),
    answers: jsonb("answers").$type(),
    reminderOptIn: boolean("reminder_opt_in").default(true),
    checkedInAt: timestamp("checked_in_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => ({
    eventIdx: index("event_registrations_event_idx").on(table.eventId),
    emailIdx: index("event_registrations_email_idx").on(table.email),
    statusIdx: index("event_registrations_status_idx").on(table.status)
  })
);
var eventComments = pgTable(
  "event_comments",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull(),
    userId: integer("user_id"),
    parentId: integer("parent_id"),
    authorName: text("author_name").notNull(),
    authorEmail: varchar("author_email", { length: 255 }),
    content: text("content").notNull(),
    status: varchar("status", { length: 40 }).notNull().default("approved"),
    reportCount: integer("report_count").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => ({
    eventIdx: index("event_comments_event_idx").on(table.eventId),
    statusIdx: index("event_comments_status_idx").on(table.status)
  })
);
var eventReactions = pgTable(
  "event_reactions",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull(),
    userId: integer("user_id"),
    visitorId: varchar("visitor_id", { length: 120 }),
    reaction: varchar("reaction", { length: 40 }).notNull().default("like"),
    createdAt: timestamp("created_at").defaultNow()
  },
  (table) => ({
    eventIdx: index("event_reactions_event_idx").on(table.eventId)
  })
);
var referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull(),
  referredUserId: integer("referred_user_id"),
  referredEmail: varchar("referred_email", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  rewardAmount: integer("reward_amount").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at")
});
var referralCampaigns = pgTable("referral_campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  codePrefix: varchar("code_prefix", { length: 20 }),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at"),
  status: varchar("status", { length: 30 }).notNull().default("draft"),
  boostBps: integer("boost_bps").notNull().default(1e4),
  maxRewardsPerReferrer: integer("max_rewards_per_referrer"),
  attributionModel: varchar("attribution_model", { length: 30 }).notNull().default("last_click"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var referralCodes = pgTable("referral_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  campaignId: integer("campaign_id"),
  code: varchar("code", { length: 32 }).notNull().unique(),
  expiresAt: timestamp("expires_at"),
  maxUses: integer("max_uses"),
  useCount: integer("use_count").notNull().default(0),
  status: varchar("status", { length: 30 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow()
});
var referralClicks = pgTable("referral_clicks", {
  id: serial("id").primaryKey(),
  referralCodeId: integer("referral_code_id"),
  campaignId: integer("campaign_id"),
  referrerId: integer("referrer_id"),
  visitorId: varchar("visitor_id", { length: 64 }).notNull(),
  ipHash: text("ip_hash"),
  userAgentHash: text("user_agent_hash"),
  deviceFingerprintHash: text("device_fingerprint_hash"),
  landingUrl: text("landing_url"),
  utm: jsonb("utm").$type(),
  riskScore: integer("risk_score").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow()
});
var referralRelationships = pgTable("referral_relationships", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull(),
  referredUserId: integer("referred_user_id").notNull().unique(),
  referralCodeId: integer("referral_code_id"),
  campaignId: integer("campaign_id"),
  level: integer("level").notNull().default(1),
  attributionModel: varchar("attribution_model", { length: 30 }).notNull().default("last_click"),
  status: varchar("status", { length: 40 }).notNull().default("signup_pending"),
  fraudStatus: varchar("fraud_status", { length: 40 }).notNull().default("clear"),
  firstPaymentId: integer("first_payment_id"),
  activatedAt: timestamp("activated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
  stripeInvoiceId: text("stripe_invoice_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  amountTotal: integer("amount_total").notNull(),
  amountNet: integer("amount_net"),
  currency: varchar("currency", { length: 3 }).notNull(),
  status: varchar("status", { length: 40 }).notNull(),
  productType: varchar("product_type", { length: 60 }).notNull(),
  metadata: jsonb("metadata").$type(),
  paidAt: timestamp("paid_at"),
  refundedAt: timestamp("refunded_at"),
  createdAt: timestamp("created_at").defaultNow()
});
var commissionRules = pgTable("commission_rules", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id"),
  productType: varchar("product_type", { length: 60 }),
  level: integer("level").notNull().default(1),
  calculationType: varchar("calculation_type", { length: 30 }).notNull(),
  percentBps: integer("percent_bps").notNull().default(0),
  flatAmount: integer("flat_amount").notNull().default(0),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  releaseDelayDays: integer("release_delay_days").notNull().default(14),
  minPaymentAmount: integer("min_payment_amount").default(0),
  maxCommissionAmount: integer("max_commission_amount"),
  status: varchar("status", { length: 30 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow()
});
var commissions = pgTable("commissions", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").notNull(),
  referralRelationshipId: integer("referral_relationship_id").notNull(),
  beneficiaryUserId: integer("beneficiary_user_id").notNull(),
  ruleId: integer("rule_id"),
  level: integer("level").notNull(),
  grossPaymentAmount: integer("gross_payment_amount").notNull(),
  commissionAmount: integer("commission_amount").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  status: varchar("status", { length: 40 }).notNull().default("pending_release"),
  releaseAt: timestamp("release_at").notNull(),
  releasedAt: timestamp("released_at"),
  reversedAt: timestamp("reversed_at"),
  riskScore: integer("risk_score").notNull().default(0),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow()
});
var walletAccounts = pgTable("wallet_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  availableBalance: integer("available_balance").notNull().default(0),
  pendingBalance: integer("pending_balance").notNull().default(0),
  lifetimeEarned: integer("lifetime_earned").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow()
});
var ledgerEntries = pgTable("ledger_entries", {
  id: serial("id").primaryKey(),
  walletAccountId: integer("wallet_account_id"),
  userId: integer("user_id"),
  commissionId: integer("commission_id"),
  payoutRequestId: integer("payout_request_id"),
  direction: varchar("direction", { length: 10 }).notNull(),
  balanceType: varchar("balance_type", { length: 20 }).notNull(),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  entryType: varchar("entry_type", { length: 60 }).notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow()
});
var stripeEvents = pgTable("stripe_events", {
  id: serial("id").primaryKey(),
  stripeEventId: text("stripe_event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  objectId: text("object_id").notNull(),
  payload: jsonb("payload").$type().notNull(),
  processingStatus: varchar("processing_status", { length: 30 }).notNull().default("received"),
  processedAt: timestamp("processed_at"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow()
});
var payoutRequests = pgTable("payout_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  method: varchar("method", { length: 40 }).notNull(),
  destination: jsonb("destination").$type(),
  status: varchar("status", { length: 40 }).notNull().default("requested"),
  requestedAt: timestamp("requested_at").defaultNow(),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
  failureReason: text("failure_reason")
});
var fraudSignals = pgTable("fraud_signals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  referralRelationshipId: integer("referral_relationship_id"),
  paymentId: integer("payment_id"),
  signalType: varchar("signal_type", { length: 80 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  score: integer("score").notNull(),
  metadata: jsonb("metadata").$type(),
  createdAt: timestamp("created_at").defaultNow()
});
var referralDisputes = pgTable("referral_disputes", {
  id: serial("id").primaryKey(),
  referralRelationshipId: integer("referral_relationship_id"),
  openedBy: integer("opened_by").notNull(),
  assignedTo: integer("assigned_to"),
  status: varchar("status", { length: 40 }).notNull().default("open"),
  reason: text("reason").notNull(),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at")
});
var analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  event: varchar("event", { length: 100 }).notNull(),
  userId: integer("user_id"),
  metadata: jsonb("metadata").$type(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow()
});
var savedItems = pgTable("saved_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  referenceId: integer("reference_id").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow()
});
var messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  subject: text("subject"),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: text("name"),
  status: varchar("status", { length: 40 }).notNull().default("pending"),
  preferences: jsonb("preferences").$type(),
  source: varchar("source", { length: 80 }).default("website"),
  verificationToken: text("verification_token"),
  unsubscribeToken: text("unsubscribe_token"),
  verifiedAt: timestamp("verified_at"),
  unsubscribedAt: timestamp("unsubscribed_at"),
  lastEmailAt: timestamp("last_email_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var usersRelations = relations(users, ({ many }) => ({
  applications: many(applications),
  testimonials: many(testimonials),
  blogPosts: many(blogPosts),
  blogComments: many(blogComments),
  events: many(events),
  eventRegistrations: many(eventRegistrations),
  eventComments: many(eventComments),
  eventReactions: many(eventReactions),
  referrals: many(referrals),
  referralCodes: many(referralCodes),
  referralRelationships: many(referralRelationships),
  payments: many(payments),
  commissions: many(commissions),
  ledgerEntries: many(ledgerEntries),
  payoutRequests: many(payoutRequests),
  analytics: many(analytics),
  savedItems: many(savedItems)
}));
var scholarshipsRelations = relations(scholarships, ({ one }) => ({
  createdBy: one(users, {
    fields: [scholarships.createdBy],
    references: [users.id]
  })
}));
var jobsRelations = relations(jobs, ({ one }) => ({
  createdBy: one(users, {
    fields: [jobs.createdBy],
    references: [users.id]
  })
}));
var applicationsRelations = relations(applications, ({ one }) => ({
  user: one(users, {
    fields: [applications.userId],
    references: [users.id]
  })
}));
var testimonialsRelations = relations(testimonials, ({ one }) => ({
  user: one(users, {
    fields: [testimonials.userId],
    references: [users.id]
  })
}));
var blogPostsRelations = relations(blogPosts, ({ one, many }) => ({
  author: one(users, {
    fields: [blogPosts.authorId],
    references: [users.id]
  }),
  comments: many(blogComments)
}));
var blogCommentsRelations = relations(blogComments, ({ one }) => ({
  post: one(blogPosts, {
    fields: [blogComments.blogPostId],
    references: [blogPosts.id]
  }),
  user: one(users, {
    fields: [blogComments.userId],
    references: [users.id]
  })
}));
var eventsRelations = relations(events, ({ one, many }) => ({
  creator: one(users, {
    fields: [events.createdBy],
    references: [users.id]
  }),
  registrations: many(eventRegistrations),
  comments: many(eventComments),
  reactions: many(eventReactions)
}));
var eventRegistrationsRelations = relations(eventRegistrations, ({ one }) => ({
  event: one(events, {
    fields: [eventRegistrations.eventId],
    references: [events.id]
  }),
  user: one(users, {
    fields: [eventRegistrations.userId],
    references: [users.id]
  })
}));
var eventCommentsRelations = relations(eventComments, ({ one }) => ({
  event: one(events, {
    fields: [eventComments.eventId],
    references: [events.id]
  }),
  user: one(users, {
    fields: [eventComments.userId],
    references: [users.id]
  })
}));
var eventReactionsRelations = relations(eventReactions, ({ one }) => ({
  event: one(events, {
    fields: [eventReactions.eventId],
    references: [events.id]
  }),
  user: one(users, {
    fields: [eventReactions.userId],
    references: [users.id]
  })
}));
var referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(users, {
    fields: [referrals.referrerId],
    references: [users.id]
  }),
  referredUser: one(users, {
    fields: [referrals.referredUserId],
    references: [users.id]
  })
}));
var referralCampaignsRelations = relations(referralCampaigns, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [referralCampaigns.createdBy],
    references: [users.id]
  }),
  codes: many(referralCodes),
  clicks: many(referralClicks),
  relationships: many(referralRelationships),
  commissionRules: many(commissionRules)
}));
var referralCodesRelations = relations(referralCodes, ({ one, many }) => ({
  user: one(users, {
    fields: [referralCodes.userId],
    references: [users.id]
  }),
  campaign: one(referralCampaigns, {
    fields: [referralCodes.campaignId],
    references: [referralCampaigns.id]
  }),
  clicks: many(referralClicks),
  relationships: many(referralRelationships)
}));
var referralClicksRelations = relations(referralClicks, ({ one }) => ({
  referralCode: one(referralCodes, {
    fields: [referralClicks.referralCodeId],
    references: [referralCodes.id]
  }),
  campaign: one(referralCampaigns, {
    fields: [referralClicks.campaignId],
    references: [referralCampaigns.id]
  }),
  referrer: one(users, {
    fields: [referralClicks.referrerId],
    references: [users.id]
  })
}));
var referralRelationshipsRelations = relations(referralRelationships, ({ one, many }) => ({
  referrer: one(users, {
    fields: [referralRelationships.referrerId],
    references: [users.id]
  }),
  referredUser: one(users, {
    fields: [referralRelationships.referredUserId],
    references: [users.id]
  }),
  referralCode: one(referralCodes, {
    fields: [referralRelationships.referralCodeId],
    references: [referralCodes.id]
  }),
  campaign: one(referralCampaigns, {
    fields: [referralRelationships.campaignId],
    references: [referralCampaigns.id]
  }),
  commissions: many(commissions)
}));
var paymentsRelations = relations(payments, ({ one, many }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id]
  }),
  commissions: many(commissions)
}));
var commissionRulesRelations = relations(commissionRules, ({ one, many }) => ({
  campaign: one(referralCampaigns, {
    fields: [commissionRules.campaignId],
    references: [referralCampaigns.id]
  }),
  commissions: many(commissions)
}));
var commissionsRelations = relations(commissions, ({ one, many }) => ({
  payment: one(payments, {
    fields: [commissions.paymentId],
    references: [payments.id]
  }),
  relationship: one(referralRelationships, {
    fields: [commissions.referralRelationshipId],
    references: [referralRelationships.id]
  }),
  beneficiary: one(users, {
    fields: [commissions.beneficiaryUserId],
    references: [users.id]
  }),
  rule: one(commissionRules, {
    fields: [commissions.ruleId],
    references: [commissionRules.id]
  }),
  ledgerEntries: many(ledgerEntries)
}));
var walletAccountsRelations = relations(walletAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [walletAccounts.userId],
    references: [users.id]
  }),
  ledgerEntries: many(ledgerEntries)
}));
var ledgerEntriesRelations = relations(ledgerEntries, ({ one }) => ({
  walletAccount: one(walletAccounts, {
    fields: [ledgerEntries.walletAccountId],
    references: [walletAccounts.id]
  }),
  user: one(users, {
    fields: [ledgerEntries.userId],
    references: [users.id]
  }),
  commission: one(commissions, {
    fields: [ledgerEntries.commissionId],
    references: [commissions.id]
  })
}));
var payoutRequestsRelations = relations(payoutRequests, ({ one }) => ({
  user: one(users, {
    fields: [payoutRequests.userId],
    references: [users.id]
  }),
  approver: one(users, {
    fields: [payoutRequests.approvedBy],
    references: [users.id]
  })
}));
var analyticsRelations = relations(analytics, ({ one }) => ({
  user: one(users, {
    fields: [analytics.userId],
    references: [users.id]
  })
}));
var savedItemsRelations = relations(savedItems, ({ one }) => ({
  user: one(users, {
    fields: [savedItems.userId],
    references: [users.id]
  })
}));
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertScholarshipSchema = createInsertSchema(scholarships).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  submittedAt: true,
  updatedAt: true
});
var insertPartnerSchema = createInsertSchema(partners).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertTestimonialSchema = createInsertSchema(testimonials).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  likes: true
});
var insertBlogCommentSchema = createInsertSchema(blogComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  viewCount: true,
  shareCount: true,
  likeCount: true
});
var insertEventRegistrationSchema = createInsertSchema(eventRegistrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  checkedInAt: true
});
var insertEventCommentSchema = createInsertSchema(eventComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reportCount: true
});
var insertEventReactionSchema = createInsertSchema(eventReactions).omit({
  id: true,
  createdAt: true
});
var insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
  completedAt: true
});
var insertReferralCampaignSchema = createInsertSchema(referralCampaigns).omit({
  id: true,
  createdAt: true
});
var insertReferralCodeSchema = createInsertSchema(referralCodes).omit({
  id: true,
  createdAt: true
});
var insertReferralClickSchema = createInsertSchema(referralClicks).omit({
  id: true,
  createdAt: true
});
var insertReferralRelationshipSchema = createInsertSchema(referralRelationships).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true
});
var insertCommissionRuleSchema = createInsertSchema(commissionRules).omit({
  id: true,
  createdAt: true
});
var insertCommissionSchema = createInsertSchema(commissions).omit({
  id: true,
  createdAt: true
});
var insertWalletAccountSchema = createInsertSchema(walletAccounts).omit({
  id: true,
  createdAt: true
});
var insertLedgerEntrySchema = createInsertSchema(ledgerEntries).omit({
  id: true,
  createdAt: true
});
var insertStripeEventSchema = createInsertSchema(stripeEvents).omit({
  createdAt: true
});
var insertPayoutRequestSchema = createInsertSchema(payoutRequests).omit({
  id: true,
  requestedAt: true,
  approvedAt: true,
  paidAt: true
});
var insertFraudSignalSchema = createInsertSchema(fraudSignals).omit({
  id: true,
  createdAt: true
});
var insertReferralDisputeSchema = createInsertSchema(referralDisputes).omit({
  id: true,
  createdAt: true,
  resolvedAt: true
});
var insertAnalyticsSchema = createInsertSchema(analytics).omit({
  id: true,
  timestamp: true
});
var insertSavedItemSchema = createInsertSchema(savedItems).omit({
  id: true,
  createdAt: true
});
var insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  isRead: true
});
var insertSubscriberSchema = createInsertSchema(subscribers, {
  preferences: z2.array(z2.string()).nullable().optional()
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// server/db.ts
import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
var isDevelopment = process.env.NODE_ENV !== "production";
var connectionString = (isDevelopment ? process.env.DATABASE_URL_UNPOOLED : void 0) || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to start the server.");
}
var pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 1e4,
  idleTimeoutMillis: 3e4,
  max: isDevelopment ? 5 : 10
});
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, desc, asc, and, or, ilike, count, sql } from "drizzle-orm";
var DatabaseStorage = class {
  // Users
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || void 0;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || void 0;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async updateUser(id, updateUser) {
    const [user] = await db.update(users).set({ ...updateUser, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id)).returning();
    return user;
  }
  async deleteUser(id) {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }
  async getAllUsers() {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }
  // Scholarships
  async getScholarship(id) {
    const [scholarship] = await db.select().from(scholarships).where(eq(scholarships.id, id));
    return scholarship || void 0;
  }
  async getAllScholarships() {
    return await db.select().from(scholarships).orderBy(desc(scholarships.createdAt));
  }
  async getActiveScholarships() {
    return await db.select().from(scholarships).where(and(eq(scholarships.isActive, true), sql`${scholarships.deadline} > NOW()`)).orderBy(desc(scholarships.createdAt));
  }
  async createScholarship(insertScholarship) {
    const [scholarship] = await db.insert(scholarships).values(insertScholarship).returning();
    return scholarship;
  }
  async updateScholarship(id, updateScholarship) {
    const [scholarship] = await db.update(scholarships).set({ ...updateScholarship, updatedAt: /* @__PURE__ */ new Date() }).where(eq(scholarships.id, id)).returning();
    return scholarship;
  }
  async deleteScholarship(id) {
    const result = await db.delete(scholarships).where(eq(scholarships.id, id));
    return result.rowCount > 0;
  }
  async searchScholarships(query) {
    return await db.select().from(scholarships).where(
      and(
        eq(scholarships.isActive, true),
        or(
          ilike(scholarships.title, `%${query}%`),
          ilike(scholarships.description, `%${query}%`),
          ilike(scholarships.institution, `%${query}%`),
          ilike(scholarships.country, `%${query}%`)
        )
      )
    ).orderBy(desc(scholarships.createdAt));
  }
  // Jobs
  async getJob(id) {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job || void 0;
  }
  async getAllJobs() {
    return await db.select().from(jobs).orderBy(desc(jobs.createdAt));
  }
  async getActiveJobs() {
    return await db.select().from(jobs).where(eq(jobs.isActive, true)).orderBy(desc(jobs.createdAt));
  }
  async createJob(insertJob) {
    const [job] = await db.insert(jobs).values(insertJob).returning();
    return job;
  }
  async updateJob(id, updateJob) {
    const [job] = await db.update(jobs).set({ ...updateJob, updatedAt: /* @__PURE__ */ new Date() }).where(eq(jobs.id, id)).returning();
    return job;
  }
  async deleteJob(id) {
    const result = await db.delete(jobs).where(eq(jobs.id, id));
    return result.rowCount > 0;
  }
  async searchJobs(query) {
    return await db.select().from(jobs).where(
      and(
        eq(jobs.isActive, true),
        or(
          ilike(jobs.title, `%${query}%`),
          ilike(jobs.description, `%${query}%`),
          ilike(jobs.company, `%${query}%`),
          ilike(jobs.location, `%${query}%`)
        )
      )
    ).orderBy(desc(jobs.createdAt));
  }
  // Applications
  async getApplication(id) {
    const [application] = await db.select().from(applications).where(eq(applications.id, id));
    return application || void 0;
  }
  async getUserApplications(userId) {
    return await db.select().from(applications).where(eq(applications.userId, userId)).orderBy(desc(applications.submittedAt));
  }
  async getAllApplications() {
    return await db.select().from(applications).orderBy(desc(applications.submittedAt));
  }
  async createApplication(insertApplication) {
    const [application] = await db.insert(applications).values(insertApplication).returning();
    return application;
  }
  async updateApplication(id, updateApplication) {
    const [application] = await db.update(applications).set({ ...updateApplication, updatedAt: /* @__PURE__ */ new Date() }).where(eq(applications.id, id)).returning();
    return application;
  }
  async deleteApplication(id) {
    const result = await db.delete(applications).where(eq(applications.id, id));
    return result.rowCount > 0;
  }
  // Partners
  async getPartner(id) {
    const [partner] = await db.select().from(partners).where(eq(partners.id, id));
    return partner || void 0;
  }
  async getAllPartners() {
    return await db.select().from(partners).orderBy(desc(partners.createdAt));
  }
  async getActivePartners() {
    return await db.select().from(partners).where(eq(partners.isActive, true)).orderBy(desc(partners.createdAt));
  }
  async createPartner(insertPartner) {
    const [partner] = await db.insert(partners).values(insertPartner).returning();
    return partner;
  }
  async updatePartner(id, updatePartner) {
    const [partner] = await db.update(partners).set({ ...updatePartner, updatedAt: /* @__PURE__ */ new Date() }).where(eq(partners.id, id)).returning();
    return partner;
  }
  async deletePartner(id) {
    const result = await db.delete(partners).where(eq(partners.id, id));
    return result.rowCount > 0;
  }
  // Testimonials
  async getTestimonial(id) {
    const [testimonial] = await db.select().from(testimonials).where(eq(testimonials.id, id));
    return testimonial || void 0;
  }
  async getAllTestimonials() {
    return await db.select().from(testimonials).orderBy(desc(testimonials.createdAt));
  }
  async getApprovedTestimonials() {
    return await db.select().from(testimonials).where(eq(testimonials.isApproved, true)).orderBy(desc(testimonials.createdAt));
  }
  async createTestimonial(insertTestimonial) {
    const [testimonial] = await db.insert(testimonials).values(insertTestimonial).returning();
    return testimonial;
  }
  async updateTestimonial(id, updateTestimonial) {
    const [testimonial] = await db.update(testimonials).set({ ...updateTestimonial, updatedAt: /* @__PURE__ */ new Date() }).where(eq(testimonials.id, id)).returning();
    return testimonial;
  }
  async deleteTestimonial(id) {
    const result = await db.delete(testimonials).where(eq(testimonials.id, id));
    return result.rowCount > 0;
  }
  // Blog Posts
  async getBlogPost(id) {
    const [blogPost] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    return blogPost || void 0;
  }
  async getAllBlogPosts() {
    return await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
  }
  async getPublishedBlogPosts() {
    return await db.select().from(blogPosts).where(eq(blogPosts.isPublished, true)).orderBy(desc(blogPosts.createdAt));
  }
  async createBlogPost(insertBlogPost) {
    const [blogPost] = await db.insert(blogPosts).values(insertBlogPost).returning();
    return blogPost;
  }
  async updateBlogPost(id, updateBlogPost) {
    const [blogPost] = await db.update(blogPosts).set({ ...updateBlogPost, updatedAt: /* @__PURE__ */ new Date() }).where(eq(blogPosts.id, id)).returning();
    return blogPost;
  }
  async deleteBlogPost(id) {
    const result = await db.delete(blogPosts).where(eq(blogPosts.id, id));
    return result.rowCount > 0;
  }
  async searchBlogPosts(query) {
    return await db.select().from(blogPosts).where(
      or(
        ilike(blogPosts.title, `%${query}%`),
        ilike(blogPosts.content, `%${query}%`),
        ilike(blogPosts.category, `%${query}%`)
      )
    ).orderBy(desc(blogPosts.createdAt));
  }
  async incrementBlogLikes(id) {
    const [blogPost] = await db.update(blogPosts).set({ likes: sql`${blogPosts.likes} + 1` }).where(eq(blogPosts.id, id)).returning();
    return blogPost;
  }
  async getBlogComments(blogPostId) {
    return await db.select().from(blogComments).where(eq(blogComments.blogPostId, blogPostId)).orderBy(blogComments.createdAt);
  }
  async createBlogComment(insertComment) {
    const [comment] = await db.insert(blogComments).values(insertComment).returning();
    return comment;
  }
  // Team Members
  async getTeamMember(id) {
    const [teamMember] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
    return teamMember || void 0;
  }
  async getAllTeamMembers() {
    return await db.select().from(teamMembers).orderBy(asc(teamMembers.order), desc(teamMembers.createdAt));
  }
  async getActiveTeamMembers() {
    return await db.select().from(teamMembers).where(eq(teamMembers.isActive, true)).orderBy(asc(teamMembers.order), desc(teamMembers.createdAt));
  }
  async createTeamMember(insertTeamMember) {
    const [teamMember] = await db.insert(teamMembers).values(insertTeamMember).returning();
    return teamMember;
  }
  async updateTeamMember(id, updateTeamMember) {
    const [teamMember] = await db.update(teamMembers).set({ ...updateTeamMember, updatedAt: /* @__PURE__ */ new Date() }).where(eq(teamMembers.id, id)).returning();
    return teamMember;
  }
  async deleteTeamMember(id) {
    const result = await db.delete(teamMembers).where(eq(teamMembers.id, id));
    return result.rowCount > 0;
  }
  // Events
  async getEvent(id) {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || void 0;
  }
  async getEventBySlug(slug) {
    const [event] = await db.select().from(events).where(eq(events.slug, slug));
    return event || void 0;
  }
  async getAllEvents() {
    return await db.select().from(events).orderBy(desc(events.startAt), desc(events.createdAt));
  }
  async getPublishedEvents() {
    return await db.select().from(events).where(eq(events.status, "published")).orderBy(asc(events.startAt), desc(events.createdAt));
  }
  async createEvent(insertEvent) {
    const [event] = await db.insert(events).values(insertEvent).returning();
    return event;
  }
  async updateEvent(id, updateEvent) {
    const [event] = await db.update(events).set({ ...updateEvent, updatedAt: /* @__PURE__ */ new Date() }).where(eq(events.id, id)).returning();
    return event;
  }
  async deleteEvent(id) {
    await db.delete(eventReactions).where(eq(eventReactions.eventId, id));
    await db.delete(eventComments).where(eq(eventComments.eventId, id));
    await db.delete(eventRegistrations).where(eq(eventRegistrations.eventId, id));
    const result = await db.delete(events).where(eq(events.id, id));
    return result.rowCount > 0;
  }
  async searchEvents(query) {
    return await db.select().from(events).where(
      and(
        eq(events.status, "published"),
        or(
          ilike(events.title, `%${query}%`),
          ilike(events.description, `%${query}%`),
          ilike(events.category, `%${query}%`),
          ilike(events.location, `%${query}%`)
        )
      )
    ).orderBy(asc(events.startAt));
  }
  async incrementEventView(id) {
    const [event] = await db.update(events).set({ viewCount: sql`${events.viewCount} + 1` }).where(eq(events.id, id)).returning();
    return event;
  }
  async incrementEventShare(id) {
    const [event] = await db.update(events).set({ shareCount: sql`${events.shareCount} + 1` }).where(eq(events.id, id)).returning();
    return event;
  }
  async incrementEventLike(id) {
    const [event] = await db.update(events).set({ likeCount: sql`${events.likeCount} + 1` }).where(eq(events.id, id)).returning();
    return event;
  }
  async getEventRegistrations(eventId) {
    return await db.select().from(eventRegistrations).where(eq(eventRegistrations.eventId, eventId)).orderBy(desc(eventRegistrations.createdAt));
  }
  async getAllEventRegistrations() {
    return await db.select().from(eventRegistrations).orderBy(desc(eventRegistrations.createdAt));
  }
  async createEventRegistration(insertRegistration) {
    const [registration] = await db.insert(eventRegistrations).values(insertRegistration).returning();
    return registration;
  }
  async updateEventRegistration(id, updateRegistration) {
    const [registration] = await db.update(eventRegistrations).set({ ...updateRegistration, updatedAt: /* @__PURE__ */ new Date() }).where(eq(eventRegistrations.id, id)).returning();
    return registration;
  }
  async getEventComments(eventId, includeModerated = false) {
    return await db.select().from(eventComments).where(
      includeModerated ? eq(eventComments.eventId, eventId) : and(eq(eventComments.eventId, eventId), eq(eventComments.status, "approved"))
    ).orderBy(asc(eventComments.createdAt));
  }
  async createEventComment(insertComment) {
    const [comment] = await db.insert(eventComments).values(insertComment).returning();
    return comment;
  }
  async updateEventComment(id, updateComment) {
    const [comment] = await db.update(eventComments).set({ ...updateComment, updatedAt: /* @__PURE__ */ new Date() }).where(eq(eventComments.id, id)).returning();
    return comment;
  }
  async createEventReaction(insertReaction) {
    const [reaction] = await db.insert(eventReactions).values(insertReaction).returning();
    return reaction;
  }
  // Referrals
  async getReferral(id) {
    const [referral] = await db.select().from(referrals).where(eq(referrals.id, id));
    return referral || void 0;
  }
  async getUserReferrals(userId) {
    return await db.select().from(referrals).where(eq(referrals.referrerId, userId)).orderBy(desc(referrals.createdAt));
  }
  async getAllReferrals() {
    return await db.select().from(referrals).orderBy(desc(referrals.createdAt));
  }
  async createReferral(insertReferral) {
    const [referral] = await db.insert(referrals).values(insertReferral).returning();
    return referral;
  }
  async updateReferral(id, updateReferral) {
    const [referral] = await db.update(referrals).set(updateReferral).where(eq(referrals.id, id)).returning();
    return referral;
  }
  async deleteReferral(id) {
    const result = await db.delete(referrals).where(eq(referrals.id, id));
    return result.rowCount > 0;
  }
  // Analytics
  async logAnalytics(insertAnalytics) {
    const metadata = insertAnalytics.metadata;
    const safeMetadata = metadata === void 0 ? void 0 : metadata === null ? null : typeof metadata === "object" && !Array.isArray(metadata) ? metadata : null;
    const [log2] = await db.insert(analytics).values({ ...insertAnalytics, metadata: safeMetadata }).returning();
    return log2;
  }
  async getAnalytics(startDate, endDate) {
    if (startDate && endDate) {
      return await db.select().from(analytics).where(and(
        sql`${analytics.timestamp} >= ${startDate}`,
        sql`${analytics.timestamp} <= ${endDate}`
      )).orderBy(desc(analytics.timestamp));
    }
    return await db.select().from(analytics).orderBy(desc(analytics.timestamp));
  }
  async getAnalyticsSummary() {
    const totalUsers = await db.select({ count: count() }).from(users);
    const totalScholarships = await db.select({ count: count() }).from(scholarships);
    const totalJobs = await db.select({ count: count() }).from(jobs);
    const totalApplications = await db.select({ count: count() }).from(applications);
    const activeTestimonials = await db.select({ count: count() }).from(testimonials).where(eq(testimonials.isApproved, true));
    const publishedBlogPosts = await db.select({ count: count() }).from(blogPosts).where(eq(blogPosts.isPublished, true));
    const totalSubscribers = await db.select({ count: count() }).from(subscribers);
    const totalEvents = await db.select({ count: count() }).from(events);
    const publishedEvents = await db.select({ count: count() }).from(events).where(eq(events.status, "published"));
    const eventRegistrationsCount = await db.select({ count: count() }).from(eventRegistrations);
    return {
      totalUsers: totalUsers[0].count,
      totalScholarships: totalScholarships[0].count,
      totalJobs: totalJobs[0].count,
      totalApplications: totalApplications[0].count,
      activeTestimonials: activeTestimonials[0].count,
      publishedBlogPosts: publishedBlogPosts[0].count,
      totalSubscribers: totalSubscribers[0].count,
      totalEvents: totalEvents[0].count,
      publishedEvents: publishedEvents[0].count,
      eventRegistrations: eventRegistrationsCount[0].count
    };
  }
  // Saved Items
  async getSavedItem(id) {
    const [item] = await db.select().from(savedItems).where(eq(savedItems.id, id));
    return item || void 0;
  }
  async getUserSavedItems(userId) {
    return await db.select().from(savedItems).where(eq(savedItems.userId, userId)).orderBy(desc(savedItems.createdAt));
  }
  async createSavedItem(insertSavedItem) {
    const [item] = await db.insert(savedItems).values(insertSavedItem).returning();
    return item;
  }
  async deleteSavedItem(id) {
    const result = await db.delete(savedItems).where(eq(savedItems.id, id));
    return result.rowCount > 0;
  }
  async isItemSaved(userId, type, referenceId) {
    const [item] = await db.select().from(savedItems).where(and(
      eq(savedItems.userId, userId),
      eq(savedItems.type, type),
      eq(savedItems.referenceId, referenceId)
    ));
    return !!item;
  }
  // Messages
  async createMessage(insertMessage) {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }
  async getAllMessages() {
    return await db.select().from(messages).orderBy(desc(messages.createdAt));
  }
  async markMessageRead(id) {
    const [message] = await db.update(messages).set({ isRead: true }).where(eq(messages.id, id)).returning();
    return message;
  }
  async getSubscriberByEmail(email) {
    const [subscriber] = await db.select().from(subscribers).where(eq(subscribers.email, email.toLowerCase()));
    return subscriber || void 0;
  }
  async getSubscriberByVerificationToken(token) {
    const [subscriber] = await db.select().from(subscribers).where(eq(subscribers.verificationToken, token));
    return subscriber || void 0;
  }
  async getSubscriberByUnsubscribeToken(token) {
    const [subscriber] = await db.select().from(subscribers).where(eq(subscribers.unsubscribeToken, token));
    return subscriber || void 0;
  }
  async getAllSubscribers() {
    return await db.select().from(subscribers).orderBy(desc(subscribers.createdAt));
  }
  async createSubscriber(insertSubscriber) {
    const [subscriber] = await db.insert(subscribers).values(insertSubscriber).returning();
    return subscriber;
  }
  async updateSubscriber(id, updateSubscriber) {
    const [subscriber] = await db.update(subscribers).set({ ...updateSubscriber, updatedAt: /* @__PURE__ */ new Date() }).where(eq(subscribers.id, id)).returning();
    return subscriber;
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import bcrypt from "bcryptjs";
import { randomBytes, randomUUID as randomUUID2 } from "crypto";
import fs3 from "fs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path3 from "path";
import QRCode from "qrcode";
import { z as z3 } from "zod";

// server/ai.ts
import OpenAI from "openai";

// server/search.ts
var MAX_QUERY_LENGTH = 120;
var normalizeSearchQuery = (value) => String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH).toLowerCase();
var getSearchTokens = (value) => {
  const normalized = normalizeSearchQuery(value);
  if (!normalized) return [];
  return Array.from(
    new Set(
      normalized.split(" ").map((token) => token.trim()).filter((token) => token.length >= 2)
    )
  );
};
var stringifySearchValue = (value) => {
  if (value === null || value === void 0) return "";
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => stringifySearchValue(item)).join(" ");
  if (typeof value === "object") {
    return Object.values(value).map((item) => stringifySearchValue(item)).join(" ");
  }
  return String(value);
};
var buildSearchHaystack = (values) => normalizeSearchQuery(values.map((value) => stringifySearchValue(value)).join(" "));
var matchesSearchTokens = (haystack, tokens) => tokens.length === 0 || tokens.every((token) => haystack.includes(token));
var scoreSearchHit = (haystack, query, tokens) => {
  if (!query) return 0;
  let score = haystack.includes(query) ? query.length * 4 : 0;
  for (const token of tokens) {
    const index2 = haystack.indexOf(token);
    if (index2 === -1) continue;
    score += Math.max(4, 40 - index2);
  }
  return score;
};
var searchAndRank = (items, query, getFields) => {
  const normalizedQuery = normalizeSearchQuery(query);
  const tokens = getSearchTokens(normalizedQuery);
  if (!normalizedQuery) {
    return items;
  }
  return items.map((item, index2) => {
    const haystack = buildSearchHaystack(getFields(item));
    return {
      item,
      index: index2,
      score: matchesSearchTokens(haystack, tokens) ? scoreSearchHit(haystack, normalizedQuery, tokens) : -1
    };
  }).filter((result) => result.score >= 0).sort((a, b) => b.score - a.score || a.index - b.index).map((result) => result.item);
};
var parsePagination = (pageValue, limitValue, maxLimit = 100) => {
  const page = Number(pageValue ?? 1);
  const limit = Number(limitValue ?? 50);
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), maxLimit) : 50;
  return {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit
  };
};

// server/ai.ts
var apiKey = process.env.OPENAI_API_KEY ?? process.env.API_KEY;
var model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
var openai = apiKey ? new OpenAI({ apiKey }) : null;
var getRelevantContextLines = (message, platformContext) => {
  if (!platformContext) return [];
  const tokens = getSearchTokens(message).filter((token) => token.length > 2);
  const lines = platformContext.split("\n").map((line) => line.trim()).filter(Boolean);
  if (tokens.length === 0) return lines.slice(0, 4);
  return lines.map((line, index2) => {
    const normalized = normalizeSearchQuery(line);
    const score = tokens.reduce((total, token) => total + (normalized.includes(token) ? 1 : 0), 0);
    return { line, index: index2, score };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 5).map((item) => item.line);
};
var buildLocalChatResponse = (message, options) => {
  const normalized = normalizeSearchQuery(message);
  const contextLines = getRelevantContextLines(message, options.platformContext);
  const lines = [];
  if (/(scholarship|grant|funding|study|university|college|apply)/.test(normalized)) {
    lines.push("I can help you narrow scholarship and study options. Start from the Scholarships page, compare deadline, country, institution, eligibility, and required documents, then submit the matching application form.");
  }
  if (/(job|career|work|employment|resume|cv|interview)/.test(normalized)) {
    lines.push("For jobs, use the Job Portal to compare role type, location, requirements, salary information where listed, and deadline before applying or saving a listing.");
  }
  if (/(partner|video|chandigarh|perul|gedu|gbs)/.test(normalized)) {
    lines.push("Partner information and university videos are managed through Admin, so the homepage and partner pages should reflect the latest Chandigarh, Perul, GEDU, GBS, and other partner updates after publishing.");
  }
  if (/(application|documents?|transcript|passport|cover letter|resume)/.test(normalized)) {
    lines.push("For applications, prepare accurate personal details, academic documents, resume or CV where required, and any cover letter or supporting files requested by the opportunity.");
  }
  if (/(contact|phone|email|support|help|urgent|emergency)/.test(normalized)) {
    lines.push("For urgent or account-specific help, contact the Mtendere team directly through the Contact page, phone, or email so staff can verify details safely.");
  }
  if (contextLines.length > 0) {
    lines.push(`Relevant current platform data: ${contextLines.join(" | ")}`);
  }
  if (lines.length === 0) {
    lines.push("I can help with scholarships, jobs, study abroad, partner universities, application documents, and career preparation. Tell me your preferred country, program area, qualification level, or deadline and I will guide the next step.");
  }
  if (options.channel === "admin") {
    lines.push("Admin note: review the matching content record, message, or application in Admin Management before making final operational decisions.");
  }
  return lines.join("\n\n");
};
async function getChatResponse(message, options = {}) {
  if (!openai) {
    return buildLocalChatResponse(message, options);
  }
  try {
    const history = (options.history ?? []).filter((item) => item.role === "user" || item.role === "assistant").slice(-10);
    const platformContext = options.platformContext ? `

Current Mtendere platform data snapshot:
${options.platformContext}` : "";
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `You are a helpful AI assistant for Mtendere Education Consultants. You help students with:
          - Finding scholarships and educational opportunities
          - Career guidance and job search assistance
          - Study abroad information
          - University application processes
          - Professional development advice
          
          Our partners include GBS (Global Business School), Chandigarh University, Perul University/institutional partners, GEDU, and other international institutions.
          
          Be professional, helpful, and encouraging. Provide specific, actionable advice when possible.
          Prioritize current platform content when it is available in the context.
          If you don't know something specific about our services, direct users to contact our team directly.
          Keep responses concise, practical, and safe for an education consultancy.${platformContext}`
        },
        ...history,
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    });
    return response.choices[0].message.content || "I'm sorry, I couldn't process your request right now. Please try again or contact our support team.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    return buildLocalChatResponse(message, options);
  }
}

// server/email.ts
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
var dataDir = path.resolve(import.meta.dirname, "..", "data");
var emailLogPath = path.join(dataDir, "email-events.jsonl");
var queue = [];
var sentTimestamps = [];
var isProcessing = false;
fs.mkdirSync(dataDir, { recursive: true });
var fromAddress = env.EMAIL_FROM || "Mtendere Education Consult <no-reply@mtendere.local>";
var maxAttempts = 3;
var maxEmailsPerMinute = 60;
var escapeHtml = (value) => String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
var appendEmailEvent = (event) => {
  fs.appendFileSync(emailLogPath, `${JSON.stringify({ ...event, at: (/* @__PURE__ */ new Date()).toISOString() })}
`);
};
var canSendNow = () => {
  const now = Date.now();
  while (sentTimestamps.length > 0 && now - sentTimestamps[0] > 6e4) {
    sentTimestamps.shift();
  }
  return sentTimestamps.length < maxEmailsPerMinute;
};
var deliverEmail = async (job) => {
  if (env.EMAIL_API_URL) {
    const response = await fetch(env.EMAIL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...env.EMAIL_API_KEY ? { Authorization: `Bearer ${env.EMAIL_API_KEY}` } : {}
      },
      body: JSON.stringify({
        from: fromAddress,
        to: job.to,
        subject: job.subject,
        html: job.html,
        text: job.text,
        category: job.category,
        metadata: job.metadata
      })
    });
    if (!response.ok) {
      throw new Error(`Email API returned ${response.status}`);
    }
  } else {
    console.info(`[email:${job.category}] ${job.subject} -> ${job.to}`);
  }
  sentTimestamps.push(Date.now());
};
var processEmailQueue = async () => {
  if (isProcessing) return;
  isProcessing = true;
  try {
    while (queue.length > 0) {
      if (!canSendNow()) {
        setTimeout(() => void processEmailQueue(), 5e3);
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
          error: job.lastError
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
var enqueueEmail = (payload) => {
  const job = {
    ...payload,
    id: randomUUID(),
    status: "queued",
    attempts: 0,
    queuedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  queue.push(job);
  appendEmailEvent({ id: job.id, status: "queued", category: job.category, to: job.to });
  void processEmailQueue();
  return { id: job.id, status: job.status };
};
var ctaButton = (href, label) => `
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
var renderMtendereEmail = ({
  title,
  preheader,
  body,
  cta
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
var sendSubscriptionConfirmation = (input) => enqueueEmail({
  to: input.email,
  subject: "Confirm your Mtendere updates subscription",
  category: "subscription_confirmation",
  text: `Confirm your subscription: ${input.verificationUrl}
Unsubscribe: ${input.unsubscribeUrl}`,
  html: renderMtendereEmail({
    title: "Confirm your subscription",
    preheader: "Please confirm that you want to receive Mtendere opportunities and updates.",
    body: `
        <p>Hello ${escapeHtml(input.name || "there")},</p>
        <p>Thanks for subscribing to Mtendere updates. Please confirm your email so we can send scholarship, career, study abroad, and education opportunity alerts to the right inbox.</p>
        <p>If you did not request this, you can ignore this email or use the unsubscribe link below.</p>
        <p style="font-size:13px; color:#6b7280;">Unsubscribe link: <a href="${input.unsubscribeUrl}" style="color:#0f4c81;">${input.unsubscribeUrl}</a></p>
      `,
    cta: { href: input.verificationUrl, label: "Confirm subscription" }
  }),
  metadata: { flow: "double_opt_in" }
});
var sendApplicationConfirmation = (input) => enqueueEmail({
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
    cta: { href: input.dashboardUrl, label: "View application status" }
  }),
  metadata: { opportunityType: input.opportunityType, opportunityTitle: input.opportunityTitle }
});
var sendApplicationStatusUpdate = (input) => {
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
        ${input.reviewNotes ? `<p><strong>Review note:</strong> ${escapeHtml(input.reviewNotes)}</p>` : "<p>The Mtendere team will keep your dashboard updated as the next step becomes available.</p>"}
      `,
      cta: { href: input.dashboardUrl, label: "View application status" }
    }),
    metadata: {
      opportunityType: input.opportunityType,
      opportunityTitle: input.opportunityTitle,
      status: input.status
    }
  });
};
var sendContactAcknowledgement = (input) => enqueueEmail({
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
    cta: { href: `${env.PUBLIC_APP_URL || ""}/contact`, label: "Visit contact page" }
  }),
  metadata: { subject: input.subject }
});
var sendAdminNotification = (input) => {
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
      body: `<p>${escapeHtml(input.message)}</p>`
    }),
    metadata: input.metadata
  });
};

// server/admin-state.ts
import fs2 from "fs";
import path2 from "path";
var nowIso = () => (/* @__PURE__ */ new Date()).toISOString();
var CORE_ADMIN_ROLE_IDS = ["viewer", "editor", "admin", "super_admin"];
var coreAdminRoleSet = new Set(CORE_ADMIN_ROLE_IDS);
var isCoreAdminRole = (id) => coreAdminRoleSet.has(id);
var DEFAULT_ROLES = [
  {
    id: "viewer",
    name: "Viewer",
    description: "Read-only access to platform content.",
    permissions: ["view_dashboard"],
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso()
  },
  {
    id: "editor",
    name: "Editor",
    description: "Can create and update platform content.",
    permissions: [
      "view_dashboard",
      "manage_events",
      "manage_scholarships",
      "manage_jobs",
      "manage_partners",
      "manage_blog",
      "manage_team",
      "manage_media"
    ],
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso()
  },
  {
    id: "admin",
    name: "Administrator",
    description: "Can manage content, users, and applications.",
    permissions: [
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
      "view_analytics"
    ],
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso()
  },
  {
    id: "super_admin",
    name: "Super Administrator",
    description: "Full system access including settings and roles.",
    permissions: [
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
      "view_analytics",
      "manage_roles",
      "manage_settings"
    ],
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso()
  }
];
var normalizeAdminRoles = (roles) => {
  if (!roles?.length) return DEFAULT_ROLES;
  const provided = new Map(roles.map((role) => [role.id, role]));
  const normalizedCoreRoles = DEFAULT_ROLES.map((defaultRole) => {
    const existing = provided.get(defaultRole.id);
    if (!existing) return defaultRole;
    return {
      ...defaultRole,
      ...existing,
      permissions: Array.from(
        /* @__PURE__ */ new Set([...existing.permissions ?? [], ...defaultRole.permissions])
      ),
      isActive: true,
      createdAt: existing.createdAt ?? defaultRole.createdAt,
      updatedAt: existing.updatedAt ?? defaultRole.updatedAt
    };
  });
  const customRoles = roles.filter((role) => !isCoreAdminRole(role.id));
  return [...normalizedCoreRoles, ...customRoles];
};
var createDefaultState = () => ({
  users: {},
  scholarships: {},
  jobs: {},
  partners: {},
  blogPosts: {},
  teamMembers: {},
  aiConversations: {},
  roles: DEFAULT_ROLES,
  settings: {
    platformName: "Mtendere Education Platform",
    supportEmail: "mtendereeducation@gmail.com",
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    maintenanceMode: false,
    emailNotifications: true,
    twoFactorRequired: false,
    weeklySummary: false,
    contentPublishedNotifications: true,
    authTokenInvalidBefore: null,
    cacheVersion: 1,
    updatedAt: nowIso()
  },
  readNotificationIds: []
});
var stateFilePath = path2.resolve(
  import.meta.dirname,
  "..",
  "data",
  "admin-state.json"
);
var ensureStateDirectory = () => {
  fs2.mkdirSync(path2.dirname(stateFilePath), { recursive: true });
};
var getStateFileMtime = () => {
  try {
    return fs2.statSync(stateFilePath).mtimeMs;
  } catch {
    return 0;
  }
};
var loadState = () => {
  ensureStateDirectory();
  if (!fs2.existsSync(stateFilePath)) {
    const initialState = createDefaultState();
    fs2.writeFileSync(stateFilePath, JSON.stringify(initialState, null, 2), "utf-8");
    return initialState;
  }
  try {
    const raw = fs2.readFileSync(stateFilePath, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      ...createDefaultState(),
      ...parsed,
      users: parsed.users ?? {},
      scholarships: parsed.scholarships ?? {},
      jobs: parsed.jobs ?? {},
      partners: parsed.partners ?? {},
      blogPosts: parsed.blogPosts ?? {},
      teamMembers: parsed.teamMembers ?? {},
      aiConversations: parsed.aiConversations ?? {},
      roles: normalizeAdminRoles(parsed.roles),
      settings: {
        ...createDefaultState().settings,
        ...parsed.settings ?? {}
      },
      readNotificationIds: parsed.readNotificationIds ?? []
    };
  } catch {
    return createDefaultState();
  }
};
var cachedState = loadState();
var cachedStateMtime = getStateFileMtime();
var refreshStateFromDiskIfChanged = () => {
  const nextMtime = getStateFileMtime();
  if (nextMtime > 0 && nextMtime !== cachedStateMtime) {
    cachedState = loadState();
    cachedStateMtime = nextMtime;
  }
};
var saveState = () => {
  ensureStateDirectory();
  fs2.writeFileSync(stateFilePath, JSON.stringify(cachedState, null, 2), "utf-8");
  cachedStateMtime = getStateFileMtime();
};
var updateCollectionItem = (collection, id, value) => {
  refreshStateFromDiskIfChanged();
  cachedState = {
    ...cachedState,
    [collection]: {
      ...cachedState[collection],
      [String(id)]: {
        ...cachedState[collection][String(id)],
        ...value
      }
    }
  };
  saveState();
};
var deleteCollectionItem = (collection, id) => {
  refreshStateFromDiskIfChanged();
  const nextCollection = { ...cachedState[collection] };
  delete nextCollection[String(id)];
  cachedState = {
    ...cachedState,
    [collection]: nextCollection
  };
  saveState();
};
var getUserMeta = (id) => {
  refreshStateFromDiskIfChanged();
  return cachedState.users[String(id)] ?? {};
};
var setUserMeta = (id, value) => updateCollectionItem("users", id, value);
var deleteUserMeta = (id) => deleteCollectionItem("users", id);
var getScholarshipMeta = (id) => {
  refreshStateFromDiskIfChanged();
  return cachedState.scholarships[String(id)] ?? {};
};
var setScholarshipMeta = (id, value) => updateCollectionItem("scholarships", id, value);
var deleteScholarshipMeta = (id) => deleteCollectionItem("scholarships", id);
var getJobMeta = (id) => {
  refreshStateFromDiskIfChanged();
  return cachedState.jobs[String(id)] ?? {};
};
var setJobMeta = (id, value) => updateCollectionItem("jobs", id, value);
var deleteJobMeta = (id) => deleteCollectionItem("jobs", id);
var getPartnerMeta = (id) => {
  refreshStateFromDiskIfChanged();
  return cachedState.partners[String(id)] ?? {};
};
var setPartnerMeta = (id, value) => updateCollectionItem("partners", id, value);
var deletePartnerMeta = (id) => deleteCollectionItem("partners", id);
var getBlogMeta = (id) => {
  refreshStateFromDiskIfChanged();
  return cachedState.blogPosts[String(id)] ?? {};
};
var setBlogMeta = (id, value) => updateCollectionItem("blogPosts", id, value);
var deleteBlogMeta = (id) => deleteCollectionItem("blogPosts", id);
var getTeamMeta = (id) => {
  refreshStateFromDiskIfChanged();
  return cachedState.teamMembers[String(id)] ?? {};
};
var setTeamMeta = (id, value) => updateCollectionItem("teamMembers", id, value);
var deleteTeamMeta = (id) => deleteCollectionItem("teamMembers", id);
var getAiChatConversation = (id) => {
  refreshStateFromDiskIfChanged();
  return cachedState.aiConversations[id];
};
var listAiChatConversations = () => {
  refreshStateFromDiskIfChanged();
  return Object.values(cachedState.aiConversations).sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );
};
var upsertAiChatConversation = (conversation) => {
  const now = nowIso();
  const previous = getAiChatConversation(conversation.id);
  const nextConversation = {
    ...previous,
    ...conversation,
    messages: conversation.messages.slice(-40),
    moderationFlags: Array.from(new Set(conversation.moderationFlags ?? [])),
    createdAt: previous?.createdAt ?? conversation.createdAt ?? now,
    updatedAt: now,
    lastMessageAt: conversation.lastMessageAt ?? now
  };
  updateCollectionItem("aiConversations", conversation.id, nextConversation);
  return nextConversation;
};
var closeAiChatConversation = (id) => {
  const conversation = getAiChatConversation(id);
  if (!conversation) return null;
  return upsertAiChatConversation({
    ...conversation,
    isActive: false,
    lastMessageAt: nowIso()
  });
};
var getAdminRoles = () => {
  refreshStateFromDiskIfChanged();
  return [...cachedState.roles];
};
var upsertAdminRole = (role) => {
  refreshStateFromDiskIfChanged();
  const existing = cachedState.roles.find((item) => item.id === role.id);
  const nextRole = {
    ...existing,
    ...role,
    createdAt: existing?.createdAt ?? role.createdAt ?? nowIso(),
    updatedAt: nowIso()
  };
  cachedState = {
    ...cachedState,
    roles: existing ? cachedState.roles.map((item) => item.id === nextRole.id ? nextRole : item) : [...cachedState.roles, nextRole]
  };
  saveState();
  return nextRole;
};
var deleteAdminRole = (id) => {
  refreshStateFromDiskIfChanged();
  if (isCoreAdminRole(id)) {
    return false;
  }
  const existed = cachedState.roles.some((role) => role.id === id);
  if (!existed) {
    return false;
  }
  cachedState = {
    ...cachedState,
    roles: cachedState.roles.filter((role) => role.id !== id)
  };
  saveState();
  return true;
};
var getAdminSettings = () => {
  refreshStateFromDiskIfChanged();
  return { ...cachedState.settings };
};
var updateAdminSettings = (updates) => {
  refreshStateFromDiskIfChanged();
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== void 0)
  );
  cachedState = {
    ...cachedState,
    settings: {
      ...cachedState.settings,
      ...cleanUpdates,
      updatedAt: nowIso()
    }
  };
  saveState();
  return cachedState.settings;
};
var isNotificationRead = (id) => {
  refreshStateFromDiskIfChanged();
  return cachedState.readNotificationIds.includes(id);
};
var markNotificationRead = (id) => {
  refreshStateFromDiskIfChanged();
  if (cachedState.readNotificationIds.includes(id)) {
    return;
  }
  cachedState = {
    ...cachedState,
    readNotificationIds: [...cachedState.readNotificationIds, id]
  };
  saveState();
};
var markNotificationsRead = (ids) => {
  refreshStateFromDiskIfChanged();
  const uniqueIds = Array.from(/* @__PURE__ */ new Set([...cachedState.readNotificationIds, ...ids]));
  cachedState = {
    ...cachedState,
    readNotificationIds: uniqueIds
  };
  saveState();
};

// server/referral-payments.ts
import crypto from "crypto";
import Stripe from "stripe";
import { and as and2, desc as desc2, eq as eq2, inArray, isNull, lte, or as or2, sql as sql2 } from "drizzle-orm";
var REFERRAL_COOKIE = "mec_referral";
var VISITOR_COOKIE = "mec_visitor";
var ATTRIBUTION_DAYS = 30;
var stripeApiVersion = "2025-10-29.clover";
var getOrigin = (req) => {
  if (env.PUBLIC_APP_URL) return env.PUBLIC_APP_URL.replace(/\/$/, "");
  const protocol = req.get("x-forwarded-proto") || req.protocol || "http";
  return `${protocol}://${req.get("host")}`;
};
var normalizeCode = (code) => code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
var randomCodeSuffix = () => crypto.randomBytes(3).toString("hex").toUpperCase();
var hashValue = (value) => {
  if (!value) return null;
  return crypto.createHmac("sha256", env.JWT_SECRET).update(value).digest("hex");
};
var parseCookies = (cookieHeader) => {
  const cookies = /* @__PURE__ */ new Map();
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach((part) => {
    const [name, ...rest] = part.trim().split("=");
    if (!name || rest.length === 0) return;
    cookies.set(name, decodeURIComponent(rest.join("=")));
  });
  return cookies;
};
var setTrackingCookie = (res, name, value, maxAgeDays) => {
  const maxAge = maxAgeDays * 24 * 60 * 60;
  const encoded = encodeURIComponent(value);
  res.append(
    "Set-Cookie",
    `${name}=${encoded}; Path=/; Max-Age=${maxAge}; SameSite=Lax; HttpOnly`
  );
};
var getVisitorId = (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const existing = cookies.get(VISITOR_COOKIE);
  if (existing) return existing;
  const visitorId = crypto.randomUUID();
  setTrackingCookie(res, VISITOR_COOKIE, visitorId, 365);
  return visitorId;
};
var getStripe = () => {
  if (!env.STRIPE_SECRET_KEY) return null;
  return new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: stripeApiVersion });
};
var toStripeId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "id" in value && typeof value.id === "string") {
    return value.id;
  }
  return null;
};
var getReferralCookieCode = (req) => {
  const cookies = parseCookies(req.headers.cookie);
  const code = cookies.get(REFERRAL_COOKIE);
  return code ? normalizeCode(code) : null;
};
var ensureUserGrowthRecords = async (userId, requestedCurrency = "USD") => {
  const [user] = await db.select().from(users).where(eq2(users.id, userId)).limit(1);
  if (!user) throw new Error("User not found");
  let code = user.referralCode ? normalizeCode(user.referralCode) : "";
  if (!code) {
    code = `MEC${userId}${randomCodeSuffix()}`;
    await db.update(users).set({ referralCode: code, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(users.id, userId));
  }
  await db.insert(referralCodes).values({ userId, code, status: "active" }).onConflictDoNothing({ target: referralCodes.code });
  await db.insert(walletAccounts).values({
    userId,
    currency: (requestedCurrency || user.defaultCurrency || env.STRIPE_DEFAULT_CURRENCY).toUpperCase()
  }).onConflictDoNothing({ target: walletAccounts.userId });
  return code;
};
var trackReferralClick = async (req, res, codeParam) => {
  const code = normalizeCode(codeParam);
  if (!code) return null;
  const [record] = await db.select().from(referralCodes).where(eq2(referralCodes.code, code)).limit(1);
  if (!record || record.status !== "active") return null;
  const now = /* @__PURE__ */ new Date();
  if (record.expiresAt && record.expiresAt <= now) return null;
  if (record.maxUses !== null && record.useCount >= record.maxUses) return null;
  const visitorId = getVisitorId(req, res);
  const utm = Object.fromEntries(
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].map((key) => [key, req.query[key]]).filter(([, value]) => typeof value === "string" && value.length > 0)
  );
  await db.insert(referralClicks).values({
    referralCodeId: record.id,
    campaignId: record.campaignId,
    referrerId: record.userId,
    visitorId,
    ipHash: hashValue(req.ip || req.socket.remoteAddress),
    userAgentHash: hashValue(req.get("user-agent")),
    deviceFingerprintHash: hashValue(req.get("x-device-fingerprint")),
    landingUrl: req.originalUrl,
    utm: Object.keys(utm).length ? utm : null,
    riskScore: 0
  });
  setTrackingCookie(res, REFERRAL_COOKIE, code, ATTRIBUTION_DAYS);
  return record;
};
var createFraudSignal = async (relationshipId, userId, signalType, score, metadata) => {
  await db.insert(fraudSignals).values({
    userId,
    referralRelationshipId: relationshipId,
    signalType,
    severity: score >= 70 ? "high" : score >= 40 ? "medium" : "low",
    score,
    metadata: metadata ?? null
  });
};
var attachReferralToNewUser = async (user, req, explicitCode) => {
  const code = explicitCode ? normalizeCode(explicitCode) : getReferralCookieCode(req);
  if (!code) return null;
  const [record] = await db.select().from(referralCodes).where(eq2(referralCodes.code, code)).limit(1);
  if (!record || record.status !== "active" || record.userId === user.id) return null;
  const now = /* @__PURE__ */ new Date();
  if (record.expiresAt && record.expiresAt <= now) return null;
  if (record.maxUses !== null && record.useCount >= record.maxUses) return null;
  let fraudScore = 0;
  const emailDomain = user.email.split("@")[1]?.toLowerCase() || "";
  const disposableDomains = /* @__PURE__ */ new Set(["mailinator.com", "10minutemail.com", "tempmail.com", "guerrillamail.com"]);
  if (disposableDomains.has(emailDomain)) fraudScore += 25;
  const [{ count: pendingCount }] = await db.select({ count: sql2`count(*)::int` }).from(referralRelationships).where(and2(eq2(referralRelationships.referrerId, record.userId), eq2(referralRelationships.status, "signup_pending")));
  if ((pendingCount ?? 0) >= 10) fraudScore += 20;
  const fraudStatus = fraudScore >= 70 ? "review" : fraudScore >= 40 ? "hold" : "clear";
  const [relationship] = await db.insert(referralRelationships).values({
    referrerId: record.userId,
    referredUserId: user.id,
    referralCodeId: record.id,
    campaignId: record.campaignId,
    attributionModel: "last_click",
    status: "signup_pending",
    fraudStatus
  }).onConflictDoNothing({ target: referralRelationships.referredUserId }).returning();
  if (!relationship) return null;
  await db.update(referralCodes).set({ useCount: sql2`${referralCodes.useCount} + 1` }).where(eq2(referralCodes.id, record.id));
  if (fraudScore > 0) {
    await createFraudSignal(relationship.id, user.id, "signup_risk_score", fraudScore, { emailDomain });
  }
  await db.update(referrals).set({
    referredUserId: user.id,
    status: "signup_pending",
    completedAt: /* @__PURE__ */ new Date()
  }).where(and2(eq2(referrals.referrerId, record.userId), eq2(referrals.referredEmail, user.email)));
  return relationship;
};
var ensureWallet = async (userId, currency) => {
  await db.insert(walletAccounts).values({ userId, currency: currency.toUpperCase() }).onConflictDoNothing({ target: walletAccounts.userId });
  const [wallet] = await db.select().from(walletAccounts).where(eq2(walletAccounts.userId, userId)).limit(1);
  if (!wallet) throw new Error("Wallet account could not be created");
  return wallet;
};
var getRuleForPayment = async (relationship, payment) => {
  const rules = await db.select().from(commissionRules).where(and2(eq2(commissionRules.status, "active"), eq2(commissionRules.level, relationship.level))).orderBy(desc2(commissionRules.createdAt));
  return rules.find((rule) => rule.campaignId === relationship.campaignId && rule.productType === payment.productType) ?? rules.find((rule) => rule.productType === payment.productType && rule.campaignId === null) ?? rules.find((rule) => rule.campaignId === relationship.campaignId && rule.productType === null) ?? rules.find((rule) => rule.productType === null && rule.campaignId === null) ?? null;
};
var calculateCommissionAmount = async (relationship, payment) => {
  const rule = await getRuleForPayment(relationship, payment);
  if (!rule) return null;
  const baseAmount = payment.amountNet ?? payment.amountTotal;
  if (rule.minPaymentAmount !== null && baseAmount < rule.minPaymentAmount) return null;
  let amount = 0;
  if (rule.calculationType === "percent" || rule.calculationType === "hybrid") {
    amount += Math.floor(baseAmount * rule.percentBps / 1e4);
  }
  if (rule.calculationType === "flat" || rule.calculationType === "hybrid") {
    amount += rule.flatAmount;
  }
  if (relationship.campaignId) {
    const [campaign] = await db.select().from(referralCampaigns).where(eq2(referralCampaigns.id, relationship.campaignId)).limit(1);
    if (campaign) {
      amount = Math.floor(amount * campaign.boostBps / 1e4);
    }
  }
  if (rule.maxCommissionAmount !== null) {
    amount = Math.min(amount, rule.maxCommissionAmount);
  }
  return amount > 0 ? {
    amount,
    ruleId: rule.id,
    releaseDelayDays: rule.releaseDelayDays
  } : null;
};
var recordPendingCommission = async (payment, relationship, riskScore) => {
  const calculated = await calculateCommissionAmount(relationship, payment);
  if (!calculated) return null;
  if (relationship.fraudStatus === "review" || riskScore >= 70) {
    await createFraudSignal(relationship.id, payment.userId, "commission_manual_review", riskScore || 70, {
      paymentId: payment.id
    });
    return null;
  }
  const releaseAt = new Date(Date.now() + calculated.releaseDelayDays * 24 * 60 * 60 * 1e3);
  const idempotencyKey = `commission:${payment.id}:${relationship.id}:${relationship.level}:${calculated.ruleId}`;
  const [commission] = await db.insert(commissions).values({
    paymentId: payment.id,
    referralRelationshipId: relationship.id,
    beneficiaryUserId: relationship.referrerId,
    ruleId: calculated.ruleId,
    level: relationship.level,
    grossPaymentAmount: payment.amountTotal,
    commissionAmount: calculated.amount,
    currency: payment.currency,
    status: relationship.fraudStatus === "hold" || riskScore >= 40 ? "pending_review" : "pending_release",
    releaseAt,
    riskScore,
    idempotencyKey
  }).onConflictDoNothing({ target: commissions.idempotencyKey }).returning();
  if (!commission || commission.status !== "pending_release") return commission ?? null;
  const wallet = await ensureWallet(relationship.referrerId, payment.currency);
  const ledgerKey = `ledger:pending-credit:${commission.id}`;
  await db.transaction(async (tx) => {
    await tx.insert(ledgerEntries).values({
      walletAccountId: wallet.id,
      userId: relationship.referrerId,
      commissionId: commission.id,
      direction: "credit",
      balanceType: "pending",
      amount: commission.commissionAmount,
      currency: commission.currency,
      entryType: "commission_pending",
      idempotencyKey: ledgerKey
    }).onConflictDoNothing({ target: ledgerEntries.idempotencyKey });
    await tx.update(walletAccounts).set({ pendingBalance: sql2`${walletAccounts.pendingBalance} + ${commission.commissionAmount}` }).where(eq2(walletAccounts.id, wallet.id));
  });
  return commission;
};
var findPaymentByStripeIdentifiers = async (identifiers) => {
  if (identifiers.checkoutSessionId) {
    const [payment] = await db.select().from(payments).where(eq2(payments.stripeCheckoutSessionId, identifiers.checkoutSessionId)).limit(1);
    if (payment) return payment;
  }
  if (identifiers.paymentIntentId) {
    const [payment] = await db.select().from(payments).where(eq2(payments.stripePaymentIntentId, identifiers.paymentIntentId)).limit(1);
    if (payment) return payment;
  }
  if (identifiers.invoiceId) {
    const [payment] = await db.select().from(payments).where(eq2(payments.stripeInvoiceId, identifiers.invoiceId)).limit(1);
    if (payment) return payment;
  }
  return null;
};
var upsertPaidPayment = async (data) => {
  const existing = await findPaymentByStripeIdentifiers({
    checkoutSessionId: data.stripeCheckoutSessionId,
    paymentIntentId: data.stripePaymentIntentId,
    invoiceId: data.stripeInvoiceId
  });
  if (existing) {
    const [updated] = await db.update(payments).set({
      stripeCustomerId: data.stripeCustomerId ?? existing.stripeCustomerId,
      stripePaymentIntentId: data.stripePaymentIntentId ?? existing.stripePaymentIntentId,
      stripeInvoiceId: data.stripeInvoiceId ?? existing.stripeInvoiceId,
      stripeSubscriptionId: data.stripeSubscriptionId ?? existing.stripeSubscriptionId,
      amountTotal: data.amountTotal || existing.amountTotal,
      amountNet: data.amountNet ?? existing.amountNet,
      currency: data.currency || existing.currency,
      status: data.status,
      productType: data.productType || existing.productType,
      metadata: { ...existing.metadata ?? {}, ...data.metadata ?? {} },
      paidAt: data.paidAt ?? existing.paidAt ?? /* @__PURE__ */ new Date()
    }).where(eq2(payments.id, existing.id)).returning();
    return updated;
  }
  const [payment] = await db.insert(payments).values({
    userId: data.userId,
    stripeCustomerId: data.stripeCustomerId,
    stripeCheckoutSessionId: data.stripeCheckoutSessionId,
    stripePaymentIntentId: data.stripePaymentIntentId,
    stripeInvoiceId: data.stripeInvoiceId,
    stripeSubscriptionId: data.stripeSubscriptionId,
    amountTotal: data.amountTotal,
    amountNet: data.amountNet ?? data.amountTotal,
    currency: data.currency.toUpperCase(),
    status: data.status,
    productType: data.productType,
    metadata: data.metadata ?? null,
    paidAt: data.paidAt ?? /* @__PURE__ */ new Date()
  }).returning();
  return payment;
};
var finalizePaymentCommission = async (payment) => {
  const [relationship] = await db.select().from(referralRelationships).where(eq2(referralRelationships.referredUserId, payment.userId)).limit(1);
  if (!relationship || relationship.status === "blocked") return null;
  const riskScore = relationship.fraudStatus === "hold" ? 45 : relationship.fraudStatus === "review" ? 75 : 0;
  await db.update(referralRelationships).set({
    firstPaymentId: relationship.firstPaymentId ?? payment.id,
    status: "activated",
    activatedAt: relationship.activatedAt ?? /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq2(referralRelationships.id, relationship.id));
  await db.update(referrals).set({
    status: "completed",
    completedAt: /* @__PURE__ */ new Date()
  }).where(and2(eq2(referrals.referrerId, relationship.referrerId), eq2(referrals.referredUserId, payment.userId)));
  return recordPendingCommission(payment, relationship, riskScore);
};
var createCheckoutSession = async (userId, params, req) => {
  const stripe = getStripe();
  if (!stripe) {
    const error = new Error("Stripe is not configured. Set STRIPE_SECRET_KEY to enable checkout.");
    error.status = 503;
    throw error;
  }
  const [user] = await db.select().from(users).where(eq2(users.id, userId)).limit(1);
  if (!user) throw new Error("User not found");
  let stripeCustomerId = user.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create(
      {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        metadata: { user_id: String(user.id) }
      },
      { idempotencyKey: `customer:user:${user.id}` }
    );
    stripeCustomerId = customer.id;
    await db.update(users).set({ stripeCustomerId, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(users.id, user.id));
  }
  const currency = (params.currency || user.defaultCurrency || env.STRIPE_DEFAULT_CURRENCY).toLowerCase();
  const quantity = params.quantity && params.quantity > 0 ? params.quantity : 1;
  const productType = params.productType || (params.mode === "subscription" ? "subscription" : "application");
  const origin = getOrigin(req);
  const [relationship] = await db.select().from(referralRelationships).where(eq2(referralRelationships.referredUserId, user.id)).limit(1);
  if (!params.priceId && (!params.amount || params.amount < 50)) {
    const error = new Error("Checkout amount must be at least 50 minor currency units.");
    error.status = 400;
    throw error;
  }
  const lineItem = params.priceId ? { price: params.priceId, quantity } : {
    price_data: {
      currency,
      unit_amount: params.amount,
      product_data: {
        name: params.productName || "Mtendere service"
      }
    },
    quantity
  };
  const clientReferenceId = params.clientReferenceId || crypto.randomUUID();
  const session = await stripe.checkout.sessions.create(
    {
      mode: params.mode || "payment",
      customer: stripeCustomerId,
      client_reference_id: String(user.id),
      line_items: [lineItem],
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      phone_number_collection: { enabled: true },
      success_url: params.successUrl || `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: params.cancelUrl || `${origin}/payment/cancelled`,
      metadata: {
        user_id: String(user.id),
        product_type: productType,
        referral_relationship_id: relationship ? String(relationship.id) : "",
        client_reference_id: clientReferenceId
      },
      payment_intent_data: (params.mode || "payment") === "payment" ? {
        metadata: {
          user_id: String(user.id),
          product_type: productType,
          referral_relationship_id: relationship ? String(relationship.id) : ""
        }
      } : void 0,
      subscription_data: params.mode === "subscription" ? {
        metadata: {
          user_id: String(user.id),
          product_type: productType,
          referral_relationship_id: relationship ? String(relationship.id) : ""
        }
      } : void 0
    },
    { idempotencyKey: `checkout:${user.id}:${productType}:${clientReferenceId}` }
  );
  return { id: session.id, url: session.url };
};
var processCheckoutCompleted = async (session) => {
  const userId = Number(session.metadata?.user_id ?? session.client_reference_id);
  if (!Number.isFinite(userId) || userId <= 0) return;
  if (session.payment_status !== "paid" && session.mode !== "subscription") return;
  const payment = await upsertPaidPayment({
    userId,
    stripeCustomerId: toStripeId(session.customer),
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: toStripeId(session.payment_intent),
    stripeSubscriptionId: toStripeId(session.subscription),
    amountTotal: session.amount_total ?? 0,
    amountNet: session.amount_total ?? 0,
    currency: (session.currency || env.STRIPE_DEFAULT_CURRENCY).toUpperCase(),
    status: session.payment_status === "paid" ? "paid" : "open",
    productType: session.metadata?.product_type || (session.mode === "subscription" ? "subscription" : "application"),
    metadata: session.metadata ?? null,
    paidAt: /* @__PURE__ */ new Date()
  });
  if (payment.status === "paid") {
    await finalizePaymentCommission(payment);
  }
};
var processInvoicePaid = async (invoice) => {
  const userId = Number(invoice.metadata?.user_id);
  if (!Number.isFinite(userId) || userId <= 0) return;
  const legacyInvoiceFields = invoice;
  const paymentIntentId = typeof legacyInvoiceFields.payment_intent === "string" ? legacyInvoiceFields.payment_intent : toStripeId(legacyInvoiceFields.payment_intent);
  const subscriptionId = typeof legacyInvoiceFields.subscription === "string" ? legacyInvoiceFields.subscription : toStripeId(legacyInvoiceFields.subscription);
  const payment = await upsertPaidPayment({
    userId,
    stripeCustomerId: toStripeId(invoice.customer),
    stripePaymentIntentId: paymentIntentId ?? null,
    stripeInvoiceId: invoice.id,
    stripeSubscriptionId: subscriptionId ?? null,
    amountTotal: invoice.amount_paid,
    amountNet: invoice.amount_paid,
    currency: invoice.currency.toUpperCase(),
    status: "paid",
    productType: invoice.metadata?.product_type || "subscription",
    metadata: invoice.metadata ?? null,
    paidAt: invoice.status_transitions.paid_at ? new Date(invoice.status_transitions.paid_at * 1e3) : /* @__PURE__ */ new Date()
  });
  await finalizePaymentCommission(payment);
};
var reversePaymentCommissions = async (payment, reason) => {
  const paymentCommissions = await db.select().from(commissions).where(and2(eq2(commissions.paymentId, payment.id), or2(isNull(commissions.reversedAt), eq2(commissions.status, "released"))));
  for (const commission of paymentCommissions) {
    if (commission.reversedAt) continue;
    const wallet = await ensureWallet(commission.beneficiaryUserId, commission.currency);
    const wasReleased = commission.status === "released";
    const keyBase = `ledger:reverse:${commission.id}`;
    await db.transaction(async (tx) => {
      await tx.update(commissions).set({ status: "reversed", reversedAt: /* @__PURE__ */ new Date() }).where(eq2(commissions.id, commission.id));
      await tx.insert(ledgerEntries).values({
        walletAccountId: wallet.id,
        userId: commission.beneficiaryUserId,
        commissionId: commission.id,
        direction: "debit",
        balanceType: wasReleased ? "available" : "pending",
        amount: commission.commissionAmount,
        currency: commission.currency,
        entryType: reason,
        idempotencyKey: keyBase
      }).onConflictDoNothing({ target: ledgerEntries.idempotencyKey });
      await tx.update(walletAccounts).set(
        wasReleased ? { availableBalance: sql2`greatest(${walletAccounts.availableBalance} - ${commission.commissionAmount}, 0)` } : { pendingBalance: sql2`greatest(${walletAccounts.pendingBalance} - ${commission.commissionAmount}, 0)` }
      ).where(eq2(walletAccounts.id, wallet.id));
    });
  }
};
var processRefundOrDispute = async (object, reason) => {
  const chargeCandidate = "charge" in object && typeof object.charge !== "undefined" ? object.charge : object;
  if (typeof chargeCandidate === "string") return;
  const charge = chargeCandidate;
  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) return;
  const payment = await findPaymentByStripeIdentifiers({ paymentIntentId });
  if (!payment) return;
  const [updated] = await db.update(payments).set({ status: reason, refundedAt: /* @__PURE__ */ new Date() }).where(eq2(payments.id, payment.id)).returning();
  await reversePaymentCommissions(updated, reason);
};
var persistStripeEvent = async (event) => {
  const object = event.data.object;
  const [saved] = await db.insert(stripeEvents).values({
    stripeEventId: event.id,
    eventType: event.type,
    objectId: object.id || "unknown",
    payload: event,
    processingStatus: "received"
  }).onConflictDoNothing({ target: stripeEvents.stripeEventId }).returning();
  return saved ?? null;
};
var verifyStripeWebhookEvent = (req) => {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured");
  if (!env.STRIPE_WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  const rawBody = req.rawBody;
  if (!rawBody) throw new Error("Raw webhook body was not captured");
  const signature = req.headers["stripe-signature"];
  if (!signature || Array.isArray(signature)) throw new Error("Missing Stripe signature");
  return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
};
var processStripeEvent = async (event) => {
  try {
    await db.update(stripeEvents).set({ processingStatus: "processing", error: null }).where(eq2(stripeEvents.stripeEventId, event.id));
    switch (event.type) {
      case "checkout.session.completed":
        await processCheckoutCompleted(event.data.object);
        break;
      case "invoice.paid":
      case "invoice.payment_succeeded":
        await processInvoicePaid(event.data.object);
        break;
      case "charge.refunded":
        await processRefundOrDispute(event.data.object, "refunded");
        break;
      case "charge.dispute.created":
        await processRefundOrDispute(event.data.object, "disputed");
        break;
      default:
        break;
    }
    await db.update(stripeEvents).set({ processingStatus: "processed", processedAt: /* @__PURE__ */ new Date(), error: null }).where(eq2(stripeEvents.stripeEventId, event.id));
  } catch (error) {
    await db.update(stripeEvents).set({
      processingStatus: "failed",
      error: error instanceof Error ? error.message : String(error)
    }).where(eq2(stripeEvents.stripeEventId, event.id));
    throw error;
  }
};
var releaseEligibleCommissions = async () => {
  const eligible = await db.select().from(commissions).where(and2(eq2(commissions.status, "pending_release"), lte(commissions.releaseAt, /* @__PURE__ */ new Date()))).limit(100);
  let released = 0;
  for (const commission of eligible) {
    const wallet = await ensureWallet(commission.beneficiaryUserId, commission.currency);
    await db.transaction(async (tx) => {
      const [updated] = await tx.update(commissions).set({ status: "released", releasedAt: /* @__PURE__ */ new Date() }).where(and2(eq2(commissions.id, commission.id), eq2(commissions.status, "pending_release"))).returning();
      if (!updated) return;
      await tx.insert(ledgerEntries).values([
        {
          walletAccountId: wallet.id,
          userId: commission.beneficiaryUserId,
          commissionId: commission.id,
          direction: "debit",
          balanceType: "pending",
          amount: commission.commissionAmount,
          currency: commission.currency,
          entryType: "commission_released_pending_debit",
          idempotencyKey: `ledger:release-pending:${commission.id}`
        },
        {
          walletAccountId: wallet.id,
          userId: commission.beneficiaryUserId,
          commissionId: commission.id,
          direction: "credit",
          balanceType: "available",
          amount: commission.commissionAmount,
          currency: commission.currency,
          entryType: "commission_released_available_credit",
          idempotencyKey: `ledger:release-available:${commission.id}`
        }
      ]).onConflictDoNothing({ target: ledgerEntries.idempotencyKey });
      await tx.update(walletAccounts).set({
        pendingBalance: sql2`greatest(${walletAccounts.pendingBalance} - ${commission.commissionAmount}, 0)`,
        availableBalance: sql2`${walletAccounts.availableBalance} + ${commission.commissionAmount}`,
        lifetimeEarned: sql2`${walletAccounts.lifetimeEarned} + ${commission.commissionAmount}`
      }).where(eq2(walletAccounts.id, wallet.id));
      released += 1;
    });
  }
  return released;
};
var getReferralDashboard = async (userId, origin) => {
  const code = await ensureUserGrowthRecords(userId);
  const [codeRecord] = await db.select().from(referralCodes).where(eq2(referralCodes.code, code)).limit(1);
  const [wallet] = await db.select().from(walletAccounts).where(eq2(walletAccounts.userId, userId)).limit(1);
  const userClicks = await db.select().from(referralClicks).where(eq2(referralClicks.referrerId, userId));
  const relationships = await db.select().from(referralRelationships).where(eq2(referralRelationships.referrerId, userId)).orderBy(desc2(referralRelationships.createdAt));
  const beneficiaryCommissions = await db.select().from(commissions).where(eq2(commissions.beneficiaryUserId, userId)).orderBy(desc2(commissions.createdAt));
  const ledger = await db.select().from(ledgerEntries).where(eq2(ledgerEntries.userId, userId)).orderBy(desc2(ledgerEntries.createdAt)).limit(50);
  const referredUsers = relationships.length ? await db.select({
    id: users.id,
    email: users.email
  }).from(users).where(inArray(users.id, relationships.map((relationship) => relationship.referredUserId))) : [];
  const emailByUserId = new Map(referredUsers.map((item) => [item.id, item.email]));
  const commissionsByRelationshipId = /* @__PURE__ */ new Map();
  beneficiaryCommissions.forEach((commission) => {
    const list = commissionsByRelationshipId.get(commission.referralRelationshipId) ?? [];
    list.push(commission);
    commissionsByRelationshipId.set(commission.referralRelationshipId, list);
  });
  const referralsList = relationships.map((relationship) => {
    const relationshipCommissions = commissionsByRelationshipId.get(relationship.id) ?? [];
    const total = relationshipCommissions.reduce((sum, item) => sum + item.commissionAmount, 0);
    const latest = relationshipCommissions[0];
    return {
      id: relationship.id,
      referredUserId: relationship.referredUserId,
      referredEmail: emailByUserId.get(relationship.referredUserId) ?? "Unknown user",
      status: relationship.status,
      fraudStatus: relationship.fraudStatus,
      createdAt: relationship.createdAt,
      activatedAt: relationship.activatedAt,
      commissionAmount: total,
      commissionStatus: latest?.status ?? null,
      releaseAt: latest?.releaseAt ?? null
    };
  });
  const paidConversions = relationships.filter((relationship) => relationship.status === "activated").length;
  const signups = relationships.length;
  return {
    referralCode: code,
    referralLink: codeRecord ? `${origin}/r/${codeRecord.code}` : null,
    stats: {
      clicks: userClicks.length,
      signups,
      paidConversions,
      conversionRate: userClicks.length > 0 ? Math.round(paidConversions / userClicks.length * 1e3) / 10 : 0,
      pendingEarnings: wallet?.pendingBalance ?? 0,
      availableEarnings: wallet?.availableBalance ?? 0,
      lifetimeEarned: wallet?.lifetimeEarned ?? 0
    },
    wallet: wallet ?? null,
    referrals: referralsList,
    ledger
  };
};
var requestPayout = async (userId, amount, method, destination) => {
  const [wallet] = await db.select().from(walletAccounts).where(eq2(walletAccounts.userId, userId)).limit(1);
  if (!wallet) throw new Error("Wallet account not found");
  if (amount < env.REFERRAL_PAYOUT_MIN_AMOUNT) {
    const error = new Error(`Minimum payout is ${env.REFERRAL_PAYOUT_MIN_AMOUNT} minor currency units.`);
    error.status = 400;
    throw error;
  }
  if (wallet.availableBalance < amount) {
    const error = new Error("Insufficient available balance.");
    error.status = 400;
    throw error;
  }
  return db.transaction(async (tx) => {
    const [request] = await tx.insert(payoutRequests).values({
      userId,
      amount,
      currency: wallet.currency,
      method,
      destination: destination ?? null,
      status: "requested"
    }).returning();
    await tx.insert(ledgerEntries).values({
      walletAccountId: wallet.id,
      userId,
      payoutRequestId: request.id,
      direction: "debit",
      balanceType: "available",
      amount,
      currency: wallet.currency,
      entryType: "payout_requested",
      idempotencyKey: `ledger:payout-request:${request.id}`
    });
    await tx.update(walletAccounts).set({ availableBalance: sql2`${walletAccounts.availableBalance} - ${amount}` }).where(eq2(walletAccounts.id, wallet.id));
    return request;
  });
};
var getUserPayouts = async (userId) => db.select().from(payoutRequests).where(eq2(payoutRequests.userId, userId)).orderBy(desc2(payoutRequests.requestedAt));
var listAdminReferralAnalytics = async () => {
  const [{ totalRevenue }] = await db.select({ totalRevenue: sql2`coalesce(sum(${payments.amountTotal}), 0)::int` }).from(payments).where(eq2(payments.status, "paid"));
  const [{ totalCommission }] = await db.select({ totalCommission: sql2`coalesce(sum(${commissions.commissionAmount}), 0)::int` }).from(commissions).where(or2(eq2(commissions.status, "pending_release"), eq2(commissions.status, "released")));
  const [{ totalRelationships }] = await db.select({ totalRelationships: sql2`count(*)::int` }).from(referralRelationships);
  const [{ paidRelationships }] = await db.select({ paidRelationships: sql2`count(*)::int` }).from(referralRelationships).where(eq2(referralRelationships.status, "activated"));
  return {
    totalRevenue: totalRevenue ?? 0,
    totalCommission: totalCommission ?? 0,
    totalRelationships: totalRelationships ?? 0,
    paidRelationships: paidRelationships ?? 0,
    referralConversionRate: totalRelationships > 0 ? Math.round((paidRelationships ?? 0) / totalRelationships * 1e3) / 10 : 0
  };
};
var listPayoutRequests = async () => db.select().from(payoutRequests).orderBy(desc2(payoutRequests.requestedAt)).limit(200);
var listReferralCampaigns = async () => db.select().from(referralCampaigns).orderBy(desc2(referralCampaigns.createdAt));
var createReferralCampaign = async (payload) => {
  const [campaign] = await db.insert(referralCampaigns).values(payload).returning();
  return campaign;
};
var updateReferralCampaign = async (campaignId, payload) => {
  const [campaign] = await db.update(referralCampaigns).set(payload).where(eq2(referralCampaigns.id, campaignId)).returning();
  if (!campaign) throw new Error("Referral campaign not found");
  return campaign;
};
var listCommissionRules = async () => db.select().from(commissionRules).orderBy(desc2(commissionRules.createdAt));
var createCommissionRule = async (payload) => {
  const [rule] = await db.insert(commissionRules).values(payload).returning();
  return rule;
};
var updateCommissionRule = async (ruleId, payload) => {
  const [rule] = await db.update(commissionRules).set(payload).where(eq2(commissionRules.id, ruleId)).returning();
  if (!rule) throw new Error("Commission rule not found");
  return rule;
};
var approvePayoutRequest = async (payoutId, approverId) => {
  const [request] = await db.update(payoutRequests).set({ status: "approved", approvedBy: approverId, approvedAt: /* @__PURE__ */ new Date() }).where(eq2(payoutRequests.id, payoutId)).returning();
  if (!request) throw new Error("Payout request not found");
  return request;
};
var rejectPayoutRequest = async (payoutId, reason) => {
  const [request] = await db.select().from(payoutRequests).where(eq2(payoutRequests.id, payoutId)).limit(1);
  if (!request) throw new Error("Payout request not found");
  if (request.status !== "requested") {
    const error = new Error("Only requested payouts can be rejected.");
    error.status = 400;
    throw error;
  }
  const [wallet] = await db.select().from(walletAccounts).where(eq2(walletAccounts.userId, request.userId)).limit(1);
  if (!wallet) throw new Error("Wallet account not found");
  return db.transaction(async (tx) => {
    const [updated] = await tx.update(payoutRequests).set({ status: "rejected", failureReason: reason }).where(eq2(payoutRequests.id, payoutId)).returning();
    await tx.insert(ledgerEntries).values({
      walletAccountId: wallet.id,
      userId: request.userId,
      payoutRequestId: request.id,
      direction: "credit",
      balanceType: "available",
      amount: request.amount,
      currency: request.currency,
      entryType: "payout_rejected_return",
      idempotencyKey: `ledger:payout-reject:${request.id}`
    }).onConflictDoNothing({ target: ledgerEntries.idempotencyKey });
    await tx.update(walletAccounts).set({ availableBalance: sql2`${walletAccounts.availableBalance} + ${request.amount}` }).where(eq2(walletAccounts.id, wallet.id));
    return updated;
  });
};
var logReferralAnalytics = async (event, userId, req, metadata) => {
  await db.insert(analytics).values({
    event,
    userId,
    metadata: metadata ?? null,
    ipAddress: req.ip,
    userAgent: req.get("user-agent")
  });
};

// server/routes.ts
var JWT_SECRET = env.JWT_SECRET;
var checkoutRequestSchema = z3.object({
  mode: z3.enum(["payment", "subscription"]).optional(),
  priceId: z3.string().min(1).optional(),
  amount: z3.coerce.number().int().positive().optional(),
  currency: z3.string().length(3).optional(),
  productName: z3.string().min(1).max(120).optional(),
  productType: z3.string().min(1).max(60).optional(),
  quantity: z3.coerce.number().int().positive().max(99).optional(),
  successUrl: z3.string().url().optional(),
  cancelUrl: z3.string().url().optional(),
  clientReferenceId: z3.string().min(1).max(120).optional()
});
var payoutRequestSchema = z3.object({
  amount: z3.coerce.number().int().positive(),
  method: z3.enum(["stripe_connect", "bank", "mobile_money", "manual"]),
  destination: z3.record(z3.unknown()).optional()
});
var referralCampaignRequestSchema = z3.object({
  name: z3.string().min(2).max(160),
  codePrefix: z3.string().max(20).nullable().optional(),
  startsAt: z3.coerce.date(),
  endsAt: z3.coerce.date().nullable().optional(),
  status: z3.enum(["draft", "active", "paused", "ended"]).default("draft"),
  boostBps: z3.coerce.number().int().positive().default(1e4),
  maxRewardsPerReferrer: z3.coerce.number().int().positive().nullable().optional(),
  attributionModel: z3.enum(["last_click", "multi_touch"]).default("last_click")
});
var commissionRuleRequestSchema = z3.object({
  campaignId: z3.coerce.number().int().positive().nullable().optional(),
  productType: z3.string().max(60).nullable().optional(),
  level: z3.coerce.number().int().positive().default(1),
  calculationType: z3.enum(["percent", "flat", "hybrid"]),
  percentBps: z3.coerce.number().int().min(0).max(1e4).default(0),
  flatAmount: z3.coerce.number().int().min(0).default(0),
  currency: z3.string().length(3).default("USD"),
  releaseDelayDays: z3.coerce.number().int().min(0).max(365).default(14),
  minPaymentAmount: z3.coerce.number().int().min(0).nullable().optional(),
  maxCommissionAmount: z3.coerce.number().int().positive().nullable().optional(),
  status: z3.enum(["active", "paused", "archived"]).default("active")
});
var subscriberRequestSchema = z3.object({
  email: z3.string().trim().email().transform((value) => value.toLowerCase()),
  name: z3.string().trim().max(160).optional(),
  preferences: z3.array(z3.string().trim().min(1).max(80)).max(12).optional(),
  source: z3.string().trim().max(80).default("website"),
  website: z3.string().optional()
});
var publicApplicationRequestSchema = z3.object({
  type: z3.enum(["job", "scholarship"]),
  referenceId: z3.coerce.number().int().positive(),
  status: z3.enum(["pending", "submitted", "in_review"]).default("pending"),
  documents: z3.record(z3.unknown()).optional(),
  notes: z3.string().trim().max(4e3).optional()
});
var chatRequestSchema = z3.object({
  message: z3.string().trim().min(1).max(2e3),
  conversationId: z3.string().trim().min(8).max(120).optional()
});
var eventPayloadSchema = z3.object({
  title: z3.string().trim().min(3).max(220),
  slug: z3.string().trim().max(180).optional(),
  summary: z3.string().trim().max(500).optional().nullable(),
  description: z3.string().trim().min(10),
  category: z3.string().trim().min(1).max(100).default("General"),
  eventType: z3.string().trim().min(1).max(80).default("Information Session"),
  location: z3.string().trim().min(1).max(220).default("Lilongwe, Malawi"),
  venueName: z3.string().trim().max(220).optional().nullable(),
  address: z3.string().trim().max(400).optional().nullable(),
  mapUrl: z3.string().trim().max(1e3).optional().nullable(),
  isVirtual: z3.boolean().optional().default(false),
  virtualUrl: z3.string().trim().max(1e3).optional().nullable(),
  livestreamUrl: z3.string().trim().max(1e3).optional().nullable(),
  isPaid: z3.boolean().optional().default(false),
  priceAmount: z3.coerce.number().int().min(0).optional().default(0),
  currency: z3.string().trim().min(3).max(10).optional().default("MWK"),
  capacity: z3.coerce.number().int().positive().nullable().optional(),
  startAt: z3.coerce.date(),
  endAt: z3.coerce.date(),
  registrationDeadline: z3.coerce.date().nullable().optional(),
  coverImage: z3.string().trim().max(1e3).optional().nullable(),
  videoUrl: z3.string().trim().max(1e3).optional().nullable(),
  tags: z3.union([z3.array(z3.string()), z3.string()]).optional(),
  agenda: z3.array(z3.record(z3.unknown())).optional().nullable(),
  speakers: z3.array(z3.record(z3.unknown())).optional().nullable(),
  sponsors: z3.array(z3.record(z3.unknown())).optional().nullable(),
  faqs: z3.array(z3.record(z3.unknown())).optional().nullable(),
  resources: z3.array(z3.record(z3.unknown())).optional().nullable(),
  gallery: z3.array(z3.record(z3.unknown())).optional().nullable(),
  status: z3.enum(["draft", "published", "archived", "cancelled"]).default("draft"),
  isFeatured: z3.boolean().optional().default(false),
  isRecommended: z3.boolean().optional().default(false),
  isTrending: z3.boolean().optional().default(false),
  allowComments: z3.boolean().optional().default(true),
  requiresApproval: z3.boolean().optional().default(false)
});
var eventRegistrationRequestSchema = z3.object({
  fullName: z3.string().trim().min(2).max(180),
  email: z3.string().trim().email().max(255).transform((value) => value.toLowerCase()),
  phone: z3.string().trim().max(40).optional().nullable(),
  organization: z3.string().trim().max(180).optional().nullable(),
  answers: z3.record(z3.unknown()).optional().nullable(),
  reminderOptIn: z3.boolean().optional().default(true)
});
var eventCommentRequestSchema = z3.object({
  authorName: z3.string().trim().min(2).max(180),
  authorEmail: z3.string().trim().email().max(255).optional().nullable(),
  content: z3.string().trim().min(2).max(2e3),
  parentId: z3.coerce.number().int().positive().optional().nullable()
});
var eventRegistrationReviewSchema = z3.object({
  status: z3.enum(["pending", "approved", "rejected", "waitlisted", "checked_in", "cancelled"]).optional(),
  attendanceStatus: z3.enum(["registered", "attended", "no_show", "checked_in", "cancelled"]).optional()
});
var adminApplicationReviewSchema = z3.object({
  status: z3.enum(["pending", "under_review", "approved", "rejected", "waitlisted"]).optional(),
  reviewNotes: z3.string().trim().max(4e3).optional()
});
var adminSettingsUpdateSchema = z3.object({
  platformName: z3.string().trim().min(2).max(160).optional(),
  supportEmail: z3.string().trim().email().optional(),
  sessionTimeout: z3.coerce.number().int().min(5).max(480).optional(),
  maxLoginAttempts: z3.coerce.number().int().min(3).max(20).optional(),
  maintenanceMode: z3.boolean().optional(),
  emailNotifications: z3.boolean().optional(),
  twoFactorRequired: z3.boolean().optional(),
  weeklySummary: z3.boolean().optional(),
  contentPublishedNotifications: z3.boolean().optional()
});
var adminRoleInputSchema = z3.object({
  name: z3.string().trim().min(2).max(80),
  description: z3.string().trim().max(500).optional().default(""),
  permissions: z3.array(z3.string().trim().min(1).max(80)).max(40).optional().default([]),
  isActive: z3.boolean().optional().default(true)
});
var adminPermissionIds = /* @__PURE__ */ new Set([
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
  "manage_settings"
]);
var normalizeRoleId = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
var escapeCsvValue = (value) => {
  const text2 = value instanceof Date ? value.toISOString() : String(value ?? "");
  return /[",\n\r]/.test(text2) ? `"${text2.replace(/"/g, '""')}"` : text2;
};
var getErrorMessage = (error) => {
  if (error instanceof z3.ZodError) {
    return error.flatten();
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
};
var isTransientDbConnectivityError = (error) => {
  const message = JSON.stringify(getErrorMessage(error)).toLowerCase();
  return message.includes("fetch failed") || message.includes("connecttimeout") || message.includes("error connecting to database") || message.includes("connection terminated") || message.includes("network");
};
var buildPublicUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
  profilePicture: user.profilePicture,
  phone: user.phone,
  dateOfBirth: user.dateOfBirth,
  referralCode: user.referralCode
});
var toAdminUser = (user) => {
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
    updatedAt: user.updatedAt ?? null
  };
};
var normalizeAdminStatus = (status, fallbackIsActive) => {
  if (status === "published" || status === "draft" || status === "archived") {
    return status;
  }
  if (typeof fallbackIsActive === "boolean") {
    return fallbackIsActive ? "published" : "draft";
  }
  return "draft";
};
var parseNumber = (value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value.replace(/[^\d.-]/g, ""));
    if (!Number.isNaN(numeric)) return numeric;
  }
  return void 0;
};
var parseStringArray = (value) => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return void 0;
};
var parseOptionalBoolean = (value) => {
  if (value === void 0 || value === null) return void 0;
  return Boolean(value);
};
var parseOptionalUrl = (value) => {
  if (value === void 0 || value === null) return void 0;
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
var parseAnalyticsMeta = (metadata) => {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }
  const record = metadata;
  const type = typeof record.type === "string" ? record.type : void 0;
  const referenceId = typeof record.referenceId === "string" || typeof record.referenceId === "number" ? record.referenceId : void 0;
  return { type, referenceId };
};
var toAdminScholarship = (scholarship) => {
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
    updatedAt: scholarship.updatedAt ?? null
  };
};
var toAdminJob = (job) => {
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
    updatedAt: job.updatedAt ?? null
  };
};
var toPublicJob = (job) => {
  const meta = getJobMeta(job.id);
  return {
    ...job,
    imageUrl: meta.featuredImage ?? job.imageUrl ?? null,
    salaryRange: meta.salaryRange ?? null,
    applicationUrl: meta.applicationUrl ?? null,
    region: meta.region ?? null
  };
};
var toAdminPartner = (partner) => {
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
    updatedAt: partner.updatedAt ?? null
  };
};
var toAdminBlogPost = (post) => {
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
    updatedAt: post.updatedAt ?? null
  };
};
var toAdminTeamMember = (member) => {
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
    updatedAt: member.updatedAt ?? null
  };
};
var toPublicPartner = (partner) => {
  const meta = getPartnerMeta(partner.id);
  return {
    ...partner,
    logoUrl: meta.logo ?? partner.logoUrl ?? null,
    country: meta.region ?? partner.country ?? null,
    partnershipType: meta.partnershipType ?? "partner",
    videoUrl: meta.videoUrl ?? null,
    videoTitle: meta.videoTitle ?? null,
    videoDescription: meta.videoDescription ?? null,
    isFeatured: meta.isFeatured ?? false
  };
};
var slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 160) || `event-${Date.now()}`;
var normalizeEventTags = (value) => parseStringArray(value) ?? [];
var deriveEventRuntimeStatus = (event) => {
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
var getEventStats = async (eventId) => {
  const [registrations, comments] = await Promise.all([
    storage.getEventRegistrations(eventId),
    storage.getEventComments(eventId, true)
  ]);
  const approved = registrations.filter((item) => item.status === "approved" || item.status === "checked_in").length;
  const attended = registrations.filter(
    (item) => item.attendanceStatus === "attended" || item.attendanceStatus === "checked_in"
  ).length;
  return {
    registrations: registrations.length,
    approvedRegistrations: approved,
    attended,
    comments: comments.length,
    pendingRegistrations: registrations.filter((item) => item.status === "pending").length
  };
};
var toPublicEvent = async (event) => {
  const stats = await getEventStats(event.id);
  const capacity = typeof event.capacity === "number" ? event.capacity : null;
  return {
    ...event,
    runtimeStatus: deriveEventRuntimeStatus(event),
    registrationCount: stats.registrations,
    approvedRegistrationCount: stats.approvedRegistrations,
    commentCount: stats.comments,
    remainingSeats: capacity === null ? null : Math.max(0, capacity - stats.approvedRegistrations)
  };
};
var toAdminEvent = async (event) => {
  const publicEvent = await toPublicEvent(event);
  return {
    ...publicEvent,
    status: event.status,
    conversionRate: Number(event.viewCount || 0) > 0 ? Math.round(publicEvent.registrationCount / Number(event.viewCount || 1) * 100) : 0
  };
};
var createTicketCode = (eventId) => `MEC-${eventId}-${randomBytes(4).toString("hex").toUpperCase()}`;
var signToken = (user) => {
  const timeoutMinutes = Math.max(5, Math.min(480, getAdminSettings().sessionTimeout || 30));
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: `${timeoutMinutes}m`
  });
};
var refreshTokenCookieName = "mec_refresh_token";
var refreshTokenMaxAgeMs = 7 * 24 * 60 * 60 * 1e3;
var refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: refreshTokenMaxAgeMs,
  path: "/"
};
var signRefreshToken = (user) => jwt.sign({ id: user.id, email: user.email, role: user.role, type: "refresh" }, JWT_SECRET, {
  expiresIn: "7d"
});
var getCookieValue = (req, name) => {
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
var setRefreshCookie = (res, user) => {
  res.cookie(refreshTokenCookieName, signRefreshToken(user), refreshCookieOptions);
};
var clearRefreshCookie = (res) => {
  res.clearCookie(refreshTokenCookieName, {
    httpOnly: refreshCookieOptions.httpOnly,
    secure: refreshCookieOptions.secure,
    sameSite: refreshCookieOptions.sameSite,
    path: refreshCookieOptions.path
  });
};
var getAuthenticatedUser = (req) => req.user;
var isJwtUserInvalidated = (jwtUser) => {
  const invalidBefore = getAdminSettings().authTokenInvalidBefore;
  if (!invalidBefore) return false;
  const invalidBeforeMs = Date.parse(invalidBefore);
  const invalidBeforeSeconds = Math.floor(invalidBeforeMs / 1e3);
  const issuedAtSeconds = typeof jwtUser.iat === "number" ? jwtUser.iat : 0;
  return !Number.isNaN(invalidBeforeMs) && issuedAtSeconds < invalidBeforeSeconds;
};
var getOptionalAuthenticatedUser = (req) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!token) {
    return null;
  }
  try {
    const jwtUser = jwt.verify(token, JWT_SECRET);
    return isJwtUserInvalidated(jwtUser) ? null : jwtUser;
  } catch {
    return null;
  }
};
var isAdmin = (user) => user?.role === "admin" || user?.role === "super_admin";
var isAdminPortalUser = (user) => user?.role === "viewer" || user?.role === "editor" || user?.role === "admin" || user?.role === "super_admin";
var authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }
  jwt.verify(token, JWT_SECRET, (error, user) => {
    if (error || !user) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    const jwtUser = user;
    if (isJwtUserInvalidated(jwtUser)) {
      return res.status(401).json({ message: "Session was invalidated by an administrator" });
    }
    req.user = jwtUser;
    next();
  });
};
var requireAdmin = (req, res, next) => {
  if (!isAdmin(getAuthenticatedUser(req))) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};
var requireAdminPortal = (req, res, next) => {
  if (!isAdminPortalUser(getAuthenticatedUser(req))) {
    return res.status(403).json({ message: "Admin portal access required" });
  }
  next();
};
var requireSuperAdmin = (req, res, next) => {
  if (getAuthenticatedUser(req)?.role !== "super_admin") {
    return res.status(403).json({ message: "Super administrator access required" });
  }
  next();
};
var isEditor = (user) => user?.role === "editor" || user?.role === "admin" || user?.role === "super_admin";
var requireEditor = (req, res, next) => {
  if (!isEditor(getAuthenticatedUser(req))) {
    return res.status(403).json({ message: "Editor access required" });
  }
  next();
};
var loginFailures = /* @__PURE__ */ new Map();
var loginLockoutMs = 15 * 60 * 1e3;
var getLoginFailure = (identifier) => {
  const key = identifier.toLowerCase();
  const record = loginFailures.get(key);
  if (!record) return null;
  if (record.lockedUntil && record.lockedUntil <= Date.now()) {
    loginFailures.delete(key);
    return null;
  }
  return record;
};
var registerLoginFailure = (identifier) => {
  const key = identifier.toLowerCase();
  const settings = getAdminSettings();
  const maxAttempts2 = Math.max(3, Math.min(20, settings.maxLoginAttempts || 5));
  const current = getLoginFailure(key) ?? { count: 0 };
  const nextCount = current.count + 1;
  const next = {
    count: nextCount,
    lockedUntil: nextCount >= maxAttempts2 ? Date.now() + loginLockoutMs : void 0
  };
  loginFailures.set(key, next);
  return next;
};
var clearLoginFailure = (identifier) => {
  loginFailures.delete(identifier.toLowerCase());
};
async function registerRoutes(app2) {
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  wss.on("connection", (ws2) => {
    ws2.subscriptions = [];
    ws2.on("message", (rawMessage) => {
      try {
        const payload = JSON.parse(rawMessage.toString());
        const channels = Array.isArray(payload.channels) ? payload.channels : Array.isArray(payload.data?.channels) ? payload.data.channels : [];
        if (payload.type === "subscribe") {
          ws2.subscriptions = Array.from(/* @__PURE__ */ new Set([...ws2.subscriptions ?? [], ...channels]));
        }
        if (payload.type === "unsubscribe") {
          ws2.subscriptions = (ws2.subscriptions ?? []).filter(
            (channel) => !channels.includes(channel)
          );
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });
  });
  app2.use((req, res, next) => {
    const settings = getAdminSettings();
    if (!settings.maintenanceMode) {
      return next();
    }
    const requestPath = req.path;
    const isAdminOrSystemPath = requestPath.startsWith("/admin") || requestPath.startsWith("/api/admin") || requestPath.startsWith("/api/auth") || requestPath.startsWith("/auth") || requestPath.startsWith("/media-assets") || requestPath.startsWith("/uploads") || requestPath.startsWith("/assets") || requestPath.startsWith("/src") || requestPath.startsWith("/@vite") || requestPath.startsWith("/@react-refresh") || requestPath.startsWith("/node_modules") || requestPath === "/api/health" || /\.[a-z0-9]+$/i.test(requestPath) || requestPath === "/ws";
    if (isAdminOrSystemPath) {
      return next();
    }
    if (requestPath.startsWith("/api")) {
      return res.status(503).json({
        message: "The public platform is temporarily in maintenance mode."
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
    "/api/team-members"
  ];
  app2.use((req, res, next) => {
    if (req.method === "GET" && realtimePublicApiPrefixes.some((prefix) => req.path.startsWith(prefix))) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Surrogate-Control", "no-store");
    }
    next();
  });
  const broadcast = (channel, data) => {
    wss.clients.forEach((client) => {
      const socket = client;
      if (socket.readyState === WebSocket.OPEN) {
        const subscriptions = socket.subscriptions || [];
        if (subscriptions.includes(channel)) {
          socket.send(JSON.stringify({ channel, data }));
        }
      }
    });
  };
  app2.get("/r/:code", async (req, res) => {
    try {
      const referralCode = await trackReferralClick(req, res, req.params.code);
      if (!referralCode) {
        return res.redirect(302, "/register");
      }
      await logReferralAnalytics("referral_click", referralCode.userId, req, {
        referralCode: referralCode.code,
        campaignId: referralCode.campaignId
      });
      res.redirect(302, `/register?ref=${encodeURIComponent(referralCode.code)}`);
    } catch (error) {
      console.error("Referral redirect error:", error);
      res.redirect(302, "/register");
    }
  });
  const emitAdminRealtimeEvent = async (req, {
    event,
    channel,
    entityType,
    referenceId,
    payload
  }) => {
    try {
      const user = getAuthenticatedUser(req);
      await storage.logAnalytics({
        event,
        userId: user.id,
        metadata: {
          type: entityType,
          referenceId,
          channel,
          ...payload ?? {}
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      });
      broadcast(channel, { type: event, ...payload ?? {} });
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
      storage.getPublishedBlogPosts()
    ]);
    const scholarshipsContext = scholarshipsList.slice(0, 8).map((item) => `Scholarship: ${item.title} at ${item.institution}, ${item.country}; category ${item.category}; deadline ${item.deadline}`).join("\n");
    const jobsContext = jobsList.slice(0, 8).map((item) => `Job: ${item.title} at ${item.company}, ${item.location}; type ${item.jobType}; deadline ${item.deadline ?? "open"}`).join("\n");
    const partnersContext = partnersList.map(toPublicPartner).slice(0, 8).map((item) => `Partner: ${item.name}; ${item.country ?? "Global"}; ${item.partnershipType ?? "partner"}; video ${item.videoUrl ? "available" : "not listed"}`).join("\n");
    const blogContext = blogList.slice(0, 5).map((item) => `Blog: ${item.title}; category ${item.category}`).join("\n");
    return [scholarshipsContext, jobsContext, partnersContext, blogContext].filter(Boolean).join("\n");
  };
  const detectChatFlags = (message) => {
    const normalized = normalizeSearchQuery(message);
    const flags = [];
    if (/(urgent|emergency|asap|immediately|deadline today)/.test(normalized)) flags.push("urgent");
    if (/(visa|passport|immigration|payment|refund|fees?|bank|money)/.test(normalized)) flags.push("sensitive");
    if (/(angry|complaint|scam|fraud|lawsuit|legal|police)/.test(normalized)) flags.push("escalation");
    return flags;
  };
  const buildConversationSummary = (messages2) => {
    const lastUserMessage = [...messages2].reverse().find((item) => item.role === "user");
    return lastUserMessage?.content.slice(0, 180) ?? "AI chat conversation";
  };
  const appendAiConversationTurn = ({
    conversationId,
    userId,
    userEmail,
    channel,
    message,
    response
  }) => {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const id = conversationId || randomUUID2();
    const existing = getAiChatConversation(id);
    const messages2 = [
      ...existing?.messages ?? [],
      { role: "user", content: message, createdAt: now },
      { role: "assistant", content: response, createdAt: (/* @__PURE__ */ new Date()).toISOString() }
    ];
    const flags = Array.from(/* @__PURE__ */ new Set([...existing?.moderationFlags ?? [], ...detectChatFlags(message)]));
    return upsertAiChatConversation({
      id,
      userId,
      userEmail,
      channel,
      messages: messages2,
      summary: buildConversationSummary(messages2),
      isActive: true,
      moderationFlags: flags,
      createdAt: existing?.createdAt ?? now,
      lastMessageAt: now
    });
  };
  const uploadsDir = path3.resolve(import.meta.dirname, "..", "uploads");
  fs3.mkdirSync(uploadsDir, { recursive: true });
  app2.use("/uploads", express.static(uploadsDir));
  const allowedUploadMimeTypes = /* @__PURE__ */ new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "image/webp"
  ]);
  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadsDir,
      filename: (_req, file, cb) => {
        const ext = path3.extname(file.originalname);
        const base = path3.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, "") || "upload";
        cb(null, `${base}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
      }
    }),
    fileFilter: (_req, file, cb) => {
      if (!allowedUploadMimeTypes.has(file.mimetype)) {
        cb(new Error("Unsupported file type. Upload PDF, DOC, DOCX, JPG, PNG, or WEBP files."));
        return;
      }
      cb(null, true);
    },
    limits: { fileSize: 10 * 1024 * 1024, files: 10 }
  });
  const mediaAssetRoot = path3.resolve(import.meta.dirname, "..", "client", "src", "assets", "imgs");
  const mediaAssetModules = /* @__PURE__ */ new Set([
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
    "defaults"
  ]);
  const mediaImageMimeTypes = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp"]);
  const mediaDefaultReferences = {
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
    defaults: "defaults/mtendere-default.png"
  };
  for (const moduleName of mediaAssetModules) {
    fs3.mkdirSync(path3.join(mediaAssetRoot, moduleName), { recursive: true });
  }
  const mediaAssetUpload = multer({
    storage: multer.diskStorage({
      destination: (req, _file, cb) => {
        const moduleName = String(req.params.module || "").toLowerCase();
        if (!mediaAssetModules.has(moduleName)) {
          cb(new Error("Unsupported media module."), mediaAssetRoot);
          return;
        }
        const destination = path3.join(mediaAssetRoot, moduleName);
        fs3.mkdirSync(destination, { recursive: true });
        cb(null, destination);
      },
      filename: (_req, file, cb) => {
        const ext = path3.extname(file.originalname).toLowerCase();
        const base = path3.basename(file.originalname, ext).toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "") || "image";
        cb(null, `${base}-${Date.now()}${ext}`);
      }
    }),
    fileFilter: (_req, file, cb) => {
      const ext = path3.extname(file.originalname).toLowerCase();
      if (!mediaImageMimeTypes.has(file.mimetype) || ![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
        cb(new Error("Unsupported image type. Upload JPG, PNG, or WEBP files."));
        return;
      }
      cb(null, true);
    },
    limits: { fileSize: 8 * 1024 * 1024, files: 10 }
  });
  const isValidImageFile = (filePath) => {
    try {
      const descriptor = fs3.openSync(filePath, "r");
      try {
        const header = Buffer.alloc(12);
        const bytesRead = fs3.readSync(descriptor, header, 0, header.length, 0);
        const ext = path3.extname(filePath).toLowerCase();
        if ((ext === ".jpg" || ext === ".jpeg") && bytesRead >= 3) {
          return header[0] === 255 && header[1] === 216;
        }
        if (ext === ".png" && bytesRead >= 8) {
          return header[0] === 137 && header[1] === 80 && header[2] === 78 && header[3] === 71;
        }
        if (ext === ".webp" && bytesRead >= 12) {
          return header.toString("ascii", 0, 4) === "RIFF" && header.toString("ascii", 8, 12) === "WEBP";
        }
        return false;
      } finally {
        fs3.closeSync(descriptor);
      }
    } catch {
      return false;
    }
  };
  const toMediaAssetUrl = (relative) => `/media-assets/${relative.split("/").map((segment) => encodeURIComponent(segment)).join("/")}`;
  const normalizeMediaAssetReference = (value) => {
    if (!value || /^https?:\/\//i.test(value) || value.startsWith("/uploads/")) return "";
    const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "").replace(/^assets\/imgs\//i, "").replace(/^media-assets\//i, "").trim();
    if (!normalized || normalized.includes("..") || !/\.(jpe?g|png|webp)$/i.test(normalized)) return "";
    const moduleName = (normalized.split("/")[0] || "").toLowerCase();
    if (!mediaAssetModules.has(moduleName)) return "";
    return normalized;
  };
  const listMediaAssets = () => {
    const files = [];
    const walk = (directory) => {
      if (!fs3.existsSync(directory)) return;
      for (const entry of fs3.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path3.join(directory, entry.name);
        if (entry.isDirectory()) {
          if (directory === mediaAssetRoot && !mediaAssetModules.has(entry.name.toLowerCase())) continue;
          walk(fullPath);
          continue;
        }
        if (entry.name.startsWith(".") || !/\.(jpe?g|png|webp)$/i.test(entry.name)) continue;
        const stat = fs3.statSync(fullPath);
        const relative = path3.relative(mediaAssetRoot, fullPath).replace(/\\/g, "/");
        const moduleName = (relative.split("/")[0] || "misc").toLowerCase();
        if (!mediaAssetModules.has(moduleName)) continue;
        files.push({
          module: moduleName,
          path: `assets/imgs/${relative}`,
          reference: relative,
          previewUrl: toMediaAssetUrl(relative),
          size: stat.size,
          updatedAt: stat.mtime,
          valid: isValidImageFile(fullPath)
        });
      }
    };
    walk(mediaAssetRoot);
    return files.sort((left, right) => left.path.localeCompare(right.path));
  };
  const isValidMediaReference = (value) => {
    const normalized = normalizeMediaAssetReference(value);
    if (!normalized) return false;
    const normalizedPath = normalized.toLowerCase();
    return listMediaAssets().some((asset) => {
      const assetPath = asset.reference.toLowerCase();
      return asset.valid && assetPath === normalizedPath;
    });
  };
  const resolveMediaAssetFullPath = (reference) => {
    const segments = reference.split("/").filter(Boolean);
    let current = mediaAssetRoot;
    for (const segment of segments) {
      if (!fs3.existsSync(current)) return null;
      const match = fs3.readdirSync(current, { withFileTypes: true }).find((entry) => entry.name.toLowerCase() === segment.toLowerCase());
      if (!match) return null;
      current = path3.join(current, match.name);
    }
    const resolved = path3.resolve(current);
    return resolved.startsWith(mediaAssetRoot) ? resolved : null;
  };
  const ensureMediaReference = (value, moduleName) => {
    const candidate = typeof value === "string" ? normalizeMediaAssetReference(value) : "";
    if (candidate && isValidMediaReference(candidate)) return candidate;
    return mediaDefaultReferences[moduleName] || mediaDefaultReferences.defaults;
  };
  app2.get("/media-assets/*", (req, res) => {
    try {
      const requestedPath = normalizeMediaAssetReference(req.params["0"]);
      if (!requestedPath) return res.status(404).send("Not found");
      const fullPath = resolveMediaAssetFullPath(requestedPath);
      if (!fullPath || !fullPath.startsWith(mediaAssetRoot) || !fs3.existsSync(fullPath) || !isValidImageFile(fullPath)) {
        return res.status(404).send("Not found");
      }
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.sendFile(fullPath);
    } catch (error) {
      console.error("Media asset delivery error:", error);
      res.status(404).send("Not found");
    }
  });
  app2.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  const registerHandler = async (req, res) => {
    try {
      const { referralCode: bodyReferralCode, ...registrationBody } = req.body && typeof req.body === "object" ? req.body : {};
      const referralCode = typeof bodyReferralCode === "string" ? bodyReferralCode : typeof req.query.ref === "string" ? req.query.ref : null;
      const userData = insertUserSchema.parse(registrationBody);
      const isAdminRegistration = req.path === "/auth/register";
      const adminPortalRoles = /* @__PURE__ */ new Set(["viewer", "editor", "admin"]);
      if (isAdminRegistration) {
        const requestedRole = userData.role && adminPortalRoles.has(userData.role) ? userData.role : "viewer";
        if (env.NODE_ENV === "production" && requestedRole !== "viewer") {
          return res.status(403).json({
            message: "Editor and admin accounts must be provisioned by an existing administrator."
          });
        }
        userData.role = requestedRole;
      } else {
        userData.role = "user";
      }
      const existingUser = await storage.getUserByEmail(userData.email) || await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "A user with that email or username already exists" });
      }
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const createdUser = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      const generatedReferralCode = await ensureUserGrowthRecords(
        createdUser.id,
        createdUser.defaultCurrency || env.STRIPE_DEFAULT_CURRENCY
      );
      const user = { ...createdUser, referralCode: generatedReferralCode };
      await attachReferralToNewUser(user, req, referralCode);
      await storage.logAnalytics({
        event: "user_registered",
        userId: user.id,
        metadata: { email: user.email, role: user.role },
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      });
      broadcast("user_activity", { type: "user_registered", user: buildPublicUser(user) });
      setRefreshCookie(res, user);
      res.status(201).json({
        message: "User created successfully",
        token: signToken(user),
        user: buildPublicUser(user)
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Registration failed", error: getErrorMessage(error) });
    }
  };
  const loginHandler = async (req, res) => {
    try {
      const identifier = req.body.email ?? req.body.username ?? req.body.identifier;
      const { password } = req.body;
      if (!identifier || !password) {
        return res.status(400).json({ message: "Email or username and password are required" });
      }
      const normalizedIdentifier = String(identifier).trim();
      const looksLikeEmail = normalizedIdentifier.includes("@");
      const existingFailure = getLoginFailure(normalizedIdentifier);
      if (existingFailure?.lockedUntil && existingFailure.lockedUntil > Date.now()) {
        const retryAfterSeconds = Math.ceil((existingFailure.lockedUntil - Date.now()) / 1e3);
        res.setHeader("Retry-After", String(retryAfterSeconds));
        return res.status(429).json({
          message: "Too many failed login attempts. Please try again later.",
          retryAfterSeconds
        });
      }
      const user = looksLikeEmail ? await storage.getUserByEmail(normalizedIdentifier) : await storage.getUserByUsername(normalizedIdentifier);
      if (!user) {
        registerLoginFailure(normalizedIdentifier);
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        registerLoginFailure(normalizedIdentifier);
        return res.status(401).json({ message: "Invalid credentials" });
      }
      clearLoginFailure(normalizedIdentifier);
      await storage.logAnalytics({
        event: "user_logged_in",
        userId: user.id,
        metadata: { email: user.email },
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      });
      broadcast("user_activity", { type: "user_logged_in", user: buildPublicUser(user) });
      setRefreshCookie(res, user);
      res.json({
        message: "Login successful",
        token: signToken(user),
        user: buildPublicUser(user)
      });
    } catch (error) {
      console.error("Login error:", error);
      if (isTransientDbConnectivityError(error)) {
        return res.status(503).json({
          message: "Login temporarily unavailable",
          error: "Database connection timed out. Please try again in a moment."
        });
      }
      res.status(500).json({ message: "Login failed", error: getErrorMessage(error) });
    }
  };
  app2.post("/api/auth/register", registerHandler);
  app2.post("/api/auth/login", loginHandler);
  app2.post("/auth/register", registerHandler);
  app2.post("/auth/login", loginHandler);
  const logoutHandler = (_req, res) => {
    clearRefreshCookie(res);
    res.json({ message: "Logged out successfully" });
  };
  const refreshHandler = async (req, res) => {
    try {
      const refreshToken = getCookieValue(req, refreshTokenCookieName);
      if (!refreshToken) {
        return res.status(401).json({ message: "Refresh token missing" });
      }
      const decoded = jwt.verify(refreshToken, JWT_SECRET);
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
        user: buildPublicUser(user)
      });
    } catch (error) {
      clearRefreshCookie(res);
      res.status(401).json({ message: "Invalid refresh token" });
    }
  };
  app2.post("/api/auth/logout", logoutHandler);
  app2.post("/auth/logout", logoutHandler);
  app2.post("/api/auth/refresh", refreshHandler);
  app2.post("/auth/refresh", refreshHandler);
  const mfaStatusHandler = (req, res) => {
    const user = getAuthenticatedUser(req);
    res.json({
      mfaSupported: false,
      mfaEnabled: false,
      mfaRequiredForRole: false,
      role: user.role,
      message: "MFA enforcement is not enabled for this backend."
    });
  };
  app2.get("/api/auth/mfa/status", authenticateToken, mfaStatusHandler);
  app2.get("/auth/mfa/status", authenticateToken, mfaStatusHandler);
  const sendUserProfile = async (req, res) => {
    try {
      const user = await storage.getUser(getAuthenticatedUser(req).id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(buildPublicUser(user));
    } catch (error) {
      console.error("Profile fetch error:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  };
  app2.get("/api/user", authenticateToken, sendUserProfile);
  app2.get("/api/user/profile", authenticateToken, sendUserProfile);
  app2.get("/api/users", authenticateToken, requireAdmin, async (_req, res) => {
    try {
      const users2 = await storage.getAllUsers();
      res.json(users2.map(buildPublicUser));
    } catch (error) {
      console.error("Users fetch error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  app2.post("/api/users", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(userData.email) || await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "A user with that email or username already exists" });
      }
      const user = await storage.createUser({
        ...userData,
        password: await bcrypt.hash(userData.password, 10)
      });
      res.status(201).json(buildPublicUser(user));
    } catch (error) {
      console.error("User creation error:", error);
      res.status(400).json({ message: "Failed to create user", error: getErrorMessage(error) });
    }
  });
  app2.put("/api/users/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const updateData = insertUserSchema.partial().parse(req.body);
      const nextUser = updateData.password ? { ...updateData, password: await bcrypt.hash(updateData.password, 10) } : updateData;
      const user = await storage.updateUser(id, nextUser);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(buildPublicUser(user));
    } catch (error) {
      console.error("User update error:", error);
      res.status(400).json({ message: "Failed to update user", error: getErrorMessage(error) });
    }
  });
  app2.delete("/api/users/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const authUser = getAuthenticatedUser(req);
      if (authUser.id === id) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }
      const success = await storage.deleteUser(id);
      if (!success) return res.status(404).json({ message: "User not found" });
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("User deletion error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });
  app2.get("/api/search", async (req, res) => {
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
        storage.getActiveTeamMembers()
      ]);
      const results = [
        ...searchAndRank(scholarshipsList, query, (item) => [
          item.title,
          item.description,
          item.institution,
          item.country,
          item.category,
          item.requirements
        ]).slice(0, 8).map((item) => ({
          id: item.id,
          type: "scholarship",
          title: item.title,
          description: item.description,
          href: `/scholarships/${item.id}`,
          category: item.category,
          imageUrl: item.imageUrl
        })),
        ...searchAndRank(jobsList, query, (item) => [
          item.title,
          item.description,
          item.company,
          item.location,
          item.jobType,
          item.requirements
        ]).slice(0, 8).map((item) => ({
          id: item.id,
          type: "job",
          title: item.title,
          description: item.description,
          href: `/jobs/${item.id}`,
          category: item.jobType,
          imageUrl: getJobMeta(item.id).featuredImage ?? null
        })),
        ...searchAndRank(partnersList.map(toPublicPartner), query, (item) => [
          item.name,
          item.description,
          item.country,
          item.partnershipType,
          item.ranking
        ]).slice(0, 8).map((item) => ({
          id: item.id,
          type: "partner",
          title: item.name,
          description: item.description,
          href: `/partners/${item.id}`,
          category: item.partnershipType ?? item.country,
          imageUrl: item.logoUrl
        })),
        ...searchAndRank(blogList, query, (item) => [
          item.title,
          item.excerpt,
          item.content,
          item.category,
          item.tags
        ]).slice(0, 8).map((item) => ({
          id: item.id,
          type: "blog",
          title: item.title,
          description: item.excerpt ?? item.content,
          href: `/blog/${item.id}`,
          category: item.category,
          imageUrl: item.imageUrl
        })),
        ...searchAndRank(eventsList, query, (item) => [
          item.title,
          item.summary,
          item.description,
          item.category,
          item.location,
          item.tags
        ]).slice(0, 6).map((item) => ({
          id: item.id,
          type: "event",
          title: item.title,
          description: item.summary ?? item.description,
          href: `/events/${item.slug || item.id}`,
          category: item.category,
          imageUrl: item.coverImage
        })),
        ...searchAndRank(teamList, query, (item) => [
          item.name,
          item.position,
          item.bio,
          item.email
        ]).slice(0, 6).map((item) => ({
          id: item.id,
          type: "team",
          title: item.name,
          description: item.position,
          href: "/team",
          category: "Team",
          imageUrl: item.imageUrl
        }))
      ].slice(0, 30);
      await storage.logAnalytics({
        event: "site_search",
        userId: getOptionalAuthenticatedUser(req)?.id ?? null,
        metadata: { query, total: results.length },
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      });
      res.json({ query, results, total: results.length });
    } catch (error) {
      console.error("Site search error:", error);
      res.status(500).json({ message: "Failed to search content" });
    }
  });
  app2.get("/api/scholarships", async (req, res) => {
    try {
      const requester = getOptionalAuthenticatedUser(req);
      const scholarships2 = isAdmin(requester) ? await storage.getAllScholarships() : await storage.getActiveScholarships();
      res.json(scholarships2);
    } catch (error) {
      console.error("Scholarships fetch error:", error);
      res.status(500).json({ message: "Failed to fetch scholarships" });
    }
  });
  app2.get("/api/scholarships/search", async (req, res) => {
    try {
      const q = normalizeSearchQuery(req.query.q ?? req.query.p0);
      if (q.length < 2) {
        return res.status(400).json({ message: "Search query is required" });
      }
      const scholarships2 = await storage.searchScholarships(q);
      res.json(scholarships2);
    } catch (error) {
      console.error("Scholarship search error:", error);
      res.status(500).json({ message: "Failed to search scholarships" });
    }
  });
  app2.get("/api/scholarships/:id", async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const scholarship = await storage.getScholarship(id);
      const requester = getOptionalAuthenticatedUser(req);
      const isVisible = scholarship && (isAdmin(requester) || scholarship.isActive !== false && new Date(scholarship.deadline).getTime() > Date.now());
      if (!isVisible) return res.status(404).json({ message: "Scholarship not found" });
      res.json(scholarship);
    } catch (error) {
      console.error("Scholarship detail fetch error:", error);
      res.status(500).json({ message: "Failed to fetch scholarship" });
    }
  });
  app2.post("/api/scholarships", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const scholarshipData = insertScholarshipSchema.parse({
        ...req.body,
        createdBy: getAuthenticatedUser(req).id
      });
      const scholarship = await storage.createScholarship(scholarshipData);
      broadcast("scholarships", { type: "scholarship_created", scholarship });
      res.status(201).json(scholarship);
    } catch (error) {
      console.error("Scholarship creation error:", error);
      res.status(400).json({ message: "Failed to create scholarship", error: getErrorMessage(error) });
    }
  });
  app2.put("/api/scholarships/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const updateData = insertScholarshipSchema.partial().parse(req.body);
      const scholarship = await storage.updateScholarship(id, updateData);
      if (!scholarship) return res.status(404).json({ message: "Scholarship not found" });
      broadcast("scholarships", { type: "scholarship_updated", scholarship });
      res.json(scholarship);
    } catch (error) {
      console.error("Scholarship update error:", error);
      res.status(400).json({ message: "Failed to update scholarship", error: getErrorMessage(error) });
    }
  });
  app2.delete("/api/scholarships/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteScholarship(id);
      if (success) {
        broadcast("scholarships", { type: "scholarship_deleted", id });
        res.json({ message: "Scholarship deleted successfully" });
      } else {
        res.status(404).json({ message: "Scholarship not found" });
      }
    } catch (error) {
      console.error("Scholarship deletion error:", error);
      res.status(500).json({ message: "Failed to delete scholarship" });
    }
  });
  app2.get("/api/jobs", async (req, res) => {
    try {
      const requester = getOptionalAuthenticatedUser(req);
      const jobs2 = isAdmin(requester) ? await storage.getAllJobs() : await storage.getActiveJobs();
      res.json(jobs2.map(toPublicJob));
    } catch (error) {
      console.error("Jobs fetch error:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });
  app2.get("/api/jobs/search", async (req, res) => {
    try {
      const q = normalizeSearchQuery(req.query.q ?? req.query.p0);
      if (q.length < 2) {
        return res.status(400).json({ message: "Search query is required" });
      }
      const jobs2 = await storage.searchJobs(q);
      res.json(jobs2.map(toPublicJob));
    } catch (error) {
      console.error("Job search error:", error);
      res.status(500).json({ message: "Failed to search jobs" });
    }
  });
  app2.get("/api/jobs/:id", async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const job = await storage.getJob(id);
      const requester = getOptionalAuthenticatedUser(req);
      const isVisible = job && (isAdmin(requester) || job.isActive !== false);
      if (!isVisible) return res.status(404).json({ message: "Job not found" });
      res.json(toPublicJob(job));
    } catch (error) {
      console.error("Job detail fetch error:", error);
      res.status(500).json({ message: "Failed to fetch job" });
    }
  });
  app2.post("/api/jobs", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const jobData = insertJobSchema.parse({
        ...req.body,
        createdBy: getAuthenticatedUser(req).id
      });
      const job = await storage.createJob(jobData);
      broadcast("jobs", { type: "job_created", job });
      res.status(201).json(job);
    } catch (error) {
      console.error("Job creation error:", error);
      res.status(400).json({ message: "Failed to create job", error: getErrorMessage(error) });
    }
  });
  app2.put("/api/jobs/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const updateData = insertJobSchema.partial().parse(req.body);
      const job = await storage.updateJob(id, updateData);
      if (!job) return res.status(404).json({ message: "Job not found" });
      broadcast("jobs", { type: "job_updated", job });
      res.json(job);
    } catch (error) {
      console.error("Job update error:", error);
      res.status(400).json({ message: "Failed to update job", error: getErrorMessage(error) });
    }
  });
  app2.delete("/api/jobs/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteJob(id);
      if (success) {
        broadcast("jobs", { type: "job_deleted", id });
        res.json({ message: "Job deleted successfully" });
      } else {
        res.status(404).json({ message: "Job not found" });
      }
    } catch (error) {
      console.error("Job deletion error:", error);
      res.status(500).json({ message: "Failed to delete job" });
    }
  });
  app2.get("/api/applications", authenticateToken, async (req, res) => {
    try {
      const authUser = getAuthenticatedUser(req);
      const applications2 = isAdmin(authUser) ? await storage.getAllApplications() : await storage.getUserApplications(authUser.id);
      res.json(applications2);
    } catch (error) {
      console.error("Applications fetch error:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });
  app2.post(
    "/api/application-assets",
    authenticateToken,
    upload.fields([
      { name: "cv", maxCount: 1 },
      { name: "coverLetter", maxCount: 1 },
      { name: "portfolio", maxCount: 1 }
    ]),
    (req, res) => {
      const filesPayload = req.files;
      const fileGroups = !Array.isArray(filesPayload) && filesPayload ? filesPayload : {};
      const documents = Object.entries(fileGroups).reduce((acc, [field, files]) => {
        const [file] = files;
        if (!file) return acc;
        acc[field] = {
          url: `/uploads/${file.filename}`,
          originalName: file.originalname,
          size: file.size,
          type: file.mimetype
        };
        return acc;
      }, {});
      res.status(201).json({ documents });
    }
  );
  app2.post("/api/applications", authenticateToken, async (req, res) => {
    try {
      const authUser = getAuthenticatedUser(req);
      const payload = publicApplicationRequestSchema.parse(req.body);
      const userApplications = await storage.getUserApplications(authUser.id);
      const duplicate = userApplications.find(
        (application2) => application2.type === payload.type && application2.referenceId === payload.referenceId
      );
      if (duplicate) {
        return res.status(409).json({
          message: "You have already applied for this opportunity",
          application: duplicate
        });
      }
      const target = payload.type === "job" ? await storage.getJob(payload.referenceId) : await storage.getScholarship(payload.referenceId);
      if (!target || target.isActive === false) {
        return res.status(404).json({ message: "Opportunity not found" });
      }
      const applicationData = insertApplicationSchema.parse({
        ...payload,
        userId: authUser.id
      });
      const application = await storage.createApplication(applicationData);
      broadcast("applications", { type: "application_created", application });
      const opportunityTitle = "title" in target ? target.title : "Opportunity";
      const dashboardUrl = `${env.PUBLIC_APP_URL || `${req.protocol}://${req.get("host")}`}/dashboard`;
      const applicant = await storage.getUser(authUser.id);
      void sendApplicationConfirmation({
        email: authUser.email,
        name: applicant ? `${applicant.firstName} ${applicant.lastName}`.trim() : void 0,
        opportunityTitle,
        opportunityType: payload.type,
        dashboardUrl
      });
      if (getAdminSettings().emailNotifications) {
        void sendAdminNotification({
          subject: "New Mtendere application submitted",
          message: `${applicant ? `${applicant.firstName} ${applicant.lastName}`.trim() : authUser.email} submitted a ${payload.type} application for ${opportunityTitle}.`,
          metadata: {
            applicationId: application.id,
            opportunityType: payload.type,
            referenceId: payload.referenceId
          }
        });
      }
      await storage.logAnalytics({
        event: "application_submitted",
        userId: authUser.id,
        metadata: {
          type: applicationData.type,
          referenceId: applicationData.referenceId
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      });
      res.status(201).json(application);
    } catch (error) {
      console.error("Application creation error:", error);
      res.status(400).json({ message: "Failed to create application", error: getErrorMessage(error) });
    }
  });
  app2.put("/api/applications/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const updateData = insertApplicationSchema.partial().parse(req.body);
      const existingApplication = await storage.getApplication(id);
      if (!existingApplication) {
        return res.status(404).json({ message: "Application not found" });
      }
      const user = getAuthenticatedUser(req);
      if (existingApplication.userId !== user.id && user.role !== "admin" && user.role !== "super_admin") {
        return res.status(403).json({ message: "Not authorized to update this application" });
      }
      const application = await storage.updateApplication(id, updateData);
      broadcast("applications", { type: "application_updated", application });
      res.json(application);
    } catch (error) {
      console.error("Application update error:", error);
      res.status(400).json({ message: "Failed to update application", error: getErrorMessage(error) });
    }
  });
  app2.get("/api/partners", async (req, res) => {
    try {
      const requester = getOptionalAuthenticatedUser(req);
      const partners2 = isAdmin(requester) ? await storage.getAllPartners() : await storage.getActivePartners();
      res.json(partners2.map(toPublicPartner));
    } catch (error) {
      console.error("Partners fetch error:", error);
      res.status(500).json({ message: "Failed to fetch partners" });
    }
  });
  app2.get("/api/partners/:id", async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const partner = await storage.getPartner(id);
      const requester = getOptionalAuthenticatedUser(req);
      const isVisible = partner && (isAdmin(requester) || partner.isActive !== false);
      if (!isVisible) return res.status(404).json({ message: "Partner not found" });
      res.json(toPublicPartner(partner));
    } catch (error) {
      console.error("Partner detail fetch error:", error);
      res.status(500).json({ message: "Failed to fetch partner" });
    }
  });
  app2.get("/api/partner-videos", async (_req, res) => {
    try {
      const partners2 = await storage.getActivePartners();
      const videos = partners2.map(toPublicPartner).filter((partner) => typeof partner.videoUrl === "string" && partner.videoUrl.trim().length > 0).sort((a, b) => Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured))).map((partner) => ({
        id: partner.id,
        partnerId: partner.id,
        partnerName: partner.name,
        title: partner.videoTitle || partner.name,
        description: partner.videoDescription || partner.description,
        videoUrl: partner.videoUrl,
        logoUrl: partner.logoUrl,
        website: partner.website,
        country: partner.country,
        isFeatured: partner.isFeatured
      }));
      res.json(videos);
    } catch (error) {
      console.error("Partner videos fetch error:", error);
      res.status(500).json({ message: "Failed to fetch partner videos" });
    }
  });
  app2.post("/api/partners", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const partnerData = insertPartnerSchema.parse(req.body);
      const partner = await storage.createPartner(partnerData);
      broadcast("partners", { type: "partner_created", partner });
      res.status(201).json(partner);
    } catch (error) {
      console.error("Partner creation error:", error);
      res.status(400).json({ message: "Failed to create partner", error: getErrorMessage(error) });
    }
  });
  app2.get("/api/testimonials", async (req, res) => {
    try {
      const requester = getOptionalAuthenticatedUser(req);
      const testimonials2 = isAdmin(requester) ? await storage.getAllTestimonials() : await storage.getApprovedTestimonials();
      res.json(testimonials2);
    } catch (error) {
      console.error("Testimonials fetch error:", error);
      res.status(500).json({ message: "Failed to fetch testimonials" });
    }
  });
  app2.post("/api/testimonials", authenticateToken, async (req, res) => {
    try {
      const authUser = getAuthenticatedUser(req);
      const testimonialData = insertTestimonialSchema.parse({
        ...req.body,
        userId: authUser.id,
        isApproved: isAdmin(authUser) ? req.body.isApproved ?? false : false
      });
      const testimonial = await storage.createTestimonial(testimonialData);
      broadcast("testimonials", { type: "testimonial_created", testimonial });
      res.status(201).json(testimonial);
    } catch (error) {
      console.error("Testimonial creation error:", error);
      res.status(400).json({ message: "Failed to create testimonial", error: getErrorMessage(error) });
    }
  });
  app2.put("/api/testimonials/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ message: "Invalid testimonial id" });
      }
      const existing = await storage.getTestimonial(id);
      if (!existing) {
        return res.status(404).json({ message: "Testimonial not found" });
      }
      const testimonialData = insertTestimonialSchema.partial().parse(req.body);
      const testimonial = await storage.updateTestimonial(id, testimonialData);
      broadcast("testimonials", { type: "testimonial_updated", testimonial });
      res.json(testimonial);
    } catch (error) {
      console.error("Testimonial update error:", error);
      res.status(400).json({ message: "Failed to update testimonial", error: getErrorMessage(error) });
    }
  });
  app2.delete("/api/testimonials/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ message: "Invalid testimonial id" });
      }
      const deleted = await storage.deleteTestimonial(id);
      if (!deleted) {
        return res.status(404).json({ message: "Testimonial not found" });
      }
      broadcast("testimonials", { type: "testimonial_deleted", id });
      res.json({ message: "Testimonial deleted successfully" });
    } catch (error) {
      console.error("Testimonial deletion error:", error);
      res.status(500).json({ message: "Failed to delete testimonial", error: getErrorMessage(error) });
    }
  });
  app2.get("/api/blog-posts", async (req, res) => {
    try {
      const requester = getOptionalAuthenticatedUser(req);
      const blogPosts2 = isAdmin(requester) ? await storage.getAllBlogPosts() : await storage.getPublishedBlogPosts();
      res.json(blogPosts2);
    } catch (error) {
      console.error("Blog posts fetch error:", error);
      res.status(500).json({ message: "Failed to fetch blog posts" });
    }
  });
  app2.get("/api/blog-posts/search", async (req, res) => {
    try {
      const q = normalizeSearchQuery(req.query.q ?? req.query.p0);
      if (q.length < 2) {
        return res.status(400).json({ message: "Search query is required" });
      }
      const requester = getOptionalAuthenticatedUser(req);
      const blogPosts2 = await storage.searchBlogPosts(q);
      res.json(isAdmin(requester) ? blogPosts2 : blogPosts2.filter((post) => post.isPublished));
    } catch (error) {
      console.error("Blog search error:", error);
      res.status(500).json({ message: "Failed to search blog posts" });
    }
  });
  app2.get("/api/blog-posts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.getBlogPost(id);
      const requester = getOptionalAuthenticatedUser(req);
      if (!post || !isAdmin(requester) && !post.isPublished) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Blog post fetch error:", error);
      res.status(500).json({ message: "Failed to fetch blog post" });
    }
  });
  app2.post("/api/blog-posts/:id/like", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const post = await storage.incrementBlogLikes(id);
      broadcast("blog-posts", { type: "blog_post_liked", blogPost: post });
      res.json(post);
    } catch (error) {
      console.error("Blog like error:", error);
      res.status(500).json({ message: "Failed to like blog post" });
    }
  });
  app2.get("/api/blog-posts/:id/comments", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const comments = await storage.getBlogComments(id);
      res.json(comments);
    } catch (error) {
      console.error("Blog comments fetch error:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });
  app2.post("/api/blog-posts/:id/comments", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const commentData = insertBlogCommentSchema.parse({
        ...req.body,
        blogPostId: id,
        userId: getAuthenticatedUser(req).id
      });
      const comment = await storage.createBlogComment(commentData);
      broadcast("blog-posts", { type: "comment_created", comment });
      res.status(201).json(comment);
    } catch (error) {
      console.error("Comment creation error:", error);
      res.status(400).json({
        message: "Failed to create comment",
        error: getErrorMessage(error)
      });
    }
  });
  app2.post("/api/blog-posts", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const blogPostData = insertBlogPostSchema.parse({
        ...req.body,
        authorId: getAuthenticatedUser(req).id
      });
      const blogPost = await storage.createBlogPost(blogPostData);
      broadcast("blog-posts", { type: "blog_post_created", blogPost });
      res.status(201).json(blogPost);
    } catch (error) {
      console.error("Blog post creation error:", error);
      res.status(400).json({
        message: "Failed to create blog post",
        error: getErrorMessage(error)
      });
    }
  });
  app2.put("/api/blog-posts/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const updateData = insertBlogPostSchema.partial().parse(req.body);
      const blogPost = await storage.updateBlogPost(id, updateData);
      if (!blogPost) return res.status(404).json({ message: "Blog post not found" });
      broadcast("blog-posts", { type: "blog_post_updated", blogPost });
      res.json(blogPost);
    } catch (error) {
      console.error("Blog post update error:", error);
      res.status(400).json({
        message: "Failed to update blog post",
        error: getErrorMessage(error)
      });
    }
  });
  app2.delete("/api/blog-posts/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const success = await storage.deleteBlogPost(id);
      if (success) {
        broadcast("blog-posts", { type: "blog_post_deleted", id });
        res.json({ message: "Blog post deleted successfully" });
      } else {
        res.status(404).json({ message: "Blog post not found" });
      }
    } catch (error) {
      console.error("Blog post deletion error:", error);
      res.status(500).json({ message: "Failed to delete blog post" });
    }
  });
  app2.get("/api/team-members", async (req, res) => {
    try {
      const requester = getOptionalAuthenticatedUser(req);
      const teamMembers2 = isAdmin(requester) ? await storage.getAllTeamMembers() : await storage.getActiveTeamMembers();
      res.json(teamMembers2);
    } catch (error) {
      console.error("Team members fetch error:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });
  app2.get("/api/team-members/:id", async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const teamMember = await storage.getTeamMember(id);
      const requester = getOptionalAuthenticatedUser(req);
      const isVisible = teamMember && (isAdmin(requester) || teamMember.isActive !== false);
      if (!isVisible) return res.status(404).json({ message: "Team member not found" });
      res.json(teamMember);
    } catch (error) {
      console.error("Team member detail fetch error:", error);
      res.status(500).json({ message: "Failed to fetch team member" });
    }
  });
  app2.post("/api/team-members", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const teamMemberData = insertTeamMemberSchema.parse(req.body);
      const teamMember = await storage.createTeamMember(teamMemberData);
      broadcast("team-members", { type: "team_member_created", teamMember });
      res.status(201).json(teamMember);
    } catch (error) {
      console.error("Team member creation error:", error);
      res.status(400).json({
        message: "Failed to create team member",
        error: getErrorMessage(error)
      });
    }
  });
  app2.put("/api/team-members/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const updateData = insertTeamMemberSchema.partial().parse(req.body);
      const teamMember = await storage.updateTeamMember(id, updateData);
      if (!teamMember) return res.status(404).json({ message: "Team member not found" });
      broadcast("team-members", { type: "team_member_updated", teamMember });
      res.json(teamMember);
    } catch (error) {
      console.error("Team member update error:", error);
      res.status(400).json({
        message: "Failed to update team member",
        error: getErrorMessage(error)
      });
    }
  });
  app2.delete("/api/team-members/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const success = await storage.deleteTeamMember(id);
      if (success) {
        broadcast("team-members", { type: "team_member_deleted", id });
        res.json({ message: "Team member deleted successfully" });
      } else {
        res.status(404).json({ message: "Team member not found" });
      }
    } catch (error) {
      console.error("Team member deletion error:", error);
      res.status(500).json({ message: "Failed to delete team member" });
    }
  });
  app2.get("/api/events", async (req, res) => {
    try {
      const requester = getOptionalAuthenticatedUser(req);
      const allEvents = isAdmin(requester) ? await storage.getAllEvents() : await storage.getPublishedEvents();
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
        event.tags
      ]);
      const filtered = searchMatched.filter((event) => {
        const runtimeStatus = String(event.runtimeStatus ?? "").toLowerCase();
        const startsAt = new Date(event.startAt).getTime();
        const matchesCategory = !category || event.category.toLowerCase() === category;
        const matchesLocation = !location || event.location.toLowerCase().includes(location);
        const matchesType = !type || event.eventType.toLowerCase().includes(type);
        const matchesFormat = !format || format === "virtual" && event.isVirtual || format === "physical" && !event.isVirtual || format === "hybrid" && event.isVirtual && event.location;
        const matchesPrice = !price || price === "free" && !event.isPaid || price === "paid" && event.isPaid;
        const matchesStatus = !status || runtimeStatus === status || status === "featured" && event.isFeatured || status === "recommended" && event.isRecommended || status === "trending" && event.isTrending;
        const matchesDate = !date || date === "today" && new Date(event.startAt).toDateString() === (/* @__PURE__ */ new Date()).toDateString() || date === "week" && startsAt <= Date.now() + 7 * 24 * 60 * 60 * 1e3 || date === "month" && startsAt <= Date.now() + 30 * 24 * 60 * 60 * 1e3;
        return matchesCategory && matchesLocation && matchesType && matchesFormat && matchesPrice && matchesStatus && matchesDate;
      });
      res.json(filtered);
    } catch (error) {
      console.error("Events fetch error:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });
  app2.get("/api/events/search", async (req, res) => {
    try {
      const q = normalizeSearchQuery(req.query.q ?? req.query.p0);
      if (q.length < 2) {
        return res.status(400).json({ message: "Search query is required" });
      }
      const events2 = await storage.searchEvents(q);
      res.json(await Promise.all(events2.map(toPublicEvent)));
    } catch (error) {
      console.error("Event search error:", error);
      res.status(500).json({ message: "Failed to search events" });
    }
  });
  app2.get("/api/events/registrations/:ticketCode/ticket", async (req, res) => {
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
        status: registration.status
      };
      const qrCode = await QRCode.toDataURL(JSON.stringify(ticketPayload), {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 220
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
      console.error("Event ticket error:", error);
      res.status(500).send("Failed to generate ticket");
    }
  });
  app2.get("/api/events/:identifier", async (req, res) => {
    try {
      const identifier = req.params.identifier;
      const event = /^\d+$/.test(identifier) ? await storage.getEvent(Number(identifier)) : await storage.getEventBySlug(identifier);
      const requester = getOptionalAuthenticatedUser(req);
      const isVisible = event && (isAdmin(requester) || event.status === "published");
      if (!isVisible) return res.status(404).json({ message: "Event not found" });
      const [comments, registrations] = await Promise.all([
        storage.getEventComments(event.id, isAdmin(requester)),
        storage.getEventRegistrations(event.id)
      ]);
      res.json({
        ...await toPublicEvent(event),
        comments,
        registrations: isAdmin(requester) ? registrations : void 0
      });
    } catch (error) {
      console.error("Event detail fetch error:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });
  app2.post("/api/events/:id/view", async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const event = await storage.incrementEventView(id);
      await storage.logAnalytics({
        event: "event_viewed",
        userId: getOptionalAuthenticatedUser(req)?.id ?? null,
        metadata: { type: "event", referenceId: id },
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      });
      res.json(await toPublicEvent(event));
    } catch (error) {
      console.error("Event view tracking error:", error);
      res.status(400).json({ message: "Failed to track event view" });
    }
  });
  app2.post("/api/events/:id/share", async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const event = await storage.incrementEventShare(id);
      await storage.logAnalytics({
        event: "event_shared",
        userId: getOptionalAuthenticatedUser(req)?.id ?? null,
        metadata: { type: "event", referenceId: id, channel: req.body?.channel ?? "native" },
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      });
      broadcast("events", { type: "event_shared", eventId: id, shareCount: event.shareCount });
      res.json(await toPublicEvent(event));
    } catch (error) {
      console.error("Event share tracking error:", error);
      res.status(400).json({ message: "Failed to track event share" });
    }
  });
  app2.post("/api/events/:id/like", async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const user = getOptionalAuthenticatedUser(req);
      await storage.createEventReaction(insertEventReactionSchema.parse({
        eventId: id,
        userId: user?.id ?? null,
        visitorId: user ? null : String(req.body?.visitorId ?? req.ip ?? "anonymous").slice(0, 120),
        reaction: String(req.body?.reaction ?? "like").slice(0, 40)
      }));
      const event = await storage.incrementEventLike(id);
      broadcast("events", { type: "event_liked", eventId: id, likeCount: event.likeCount });
      res.json(await toPublicEvent(event));
    } catch (error) {
      console.error("Event like error:", error);
      res.status(400).json({ message: "Failed to like event", error: getErrorMessage(error) });
    }
  });
  app2.get("/api/events/:id/comments", async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const requester = getOptionalAuthenticatedUser(req);
      const comments = await storage.getEventComments(id, isAdmin(requester));
      res.json(comments);
    } catch (error) {
      console.error("Event comments fetch error:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });
  app2.post("/api/events/:id/comments", async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const event = await storage.getEvent(id);
      if (!event || event.status !== "published" || event.allowComments === false) {
        return res.status(404).json({ message: "Event discussion is not available" });
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
        status: "approved"
      }));
      broadcast("events", { type: "event_comment_created", eventId: id, comment });
      res.status(201).json(comment);
    } catch (error) {
      console.error("Event comment creation error:", error);
      res.status(400).json({ message: "Failed to comment on event", error: getErrorMessage(error) });
    }
  });
  app2.post("/api/events/:id/registrations", async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const event = await storage.getEvent(id);
      if (!event || event.status !== "published") {
        return res.status(404).json({ message: "Event not found" });
      }
      const now = Date.now();
      if (event.registrationDeadline && new Date(event.registrationDeadline).getTime() < now) {
        return res.status(400).json({ message: "Registration is closed for this event" });
      }
      if (new Date(event.endAt).getTime() < now) {
        return res.status(400).json({ message: "This event has already ended" });
      }
      const payload = eventRegistrationRequestSchema.parse(req.body);
      const existing = (await storage.getEventRegistrations(id)).find(
        (registration2) => registration2.email.toLowerCase() === payload.email
      );
      if (existing) {
        return res.status(409).json({ message: "This email is already registered for the event", registration: existing });
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
        reminderOptIn: payload.reminderOptIn
      }));
      await storage.logAnalytics({
        event: "event_registered",
        userId: user?.id ?? null,
        metadata: { type: "event", referenceId: id, status },
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      });
      broadcast("events", { type: "event_registration_created", eventId: id, registration });
      res.status(201).json({ registration, ticketUrl: `/api/events/registrations/${registration.ticketCode}/ticket` });
    } catch (error) {
      console.error("Event registration error:", error);
      res.status(400).json({ message: "Failed to register for event", error: getErrorMessage(error) });
    }
  });
  app2.post("/api/events", authenticateToken, requireEditor, async (req, res) => {
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
        createdBy: getAuthenticatedUser(req).id
      });
      const event = await storage.createEvent(eventData);
      await emitAdminRealtimeEvent(req, {
        event: "event_created",
        channel: "events",
        entityType: "event",
        referenceId: event.id,
        payload: { event: await toAdminEvent(event) }
      });
      res.status(201).json(await toAdminEvent(event));
    } catch (error) {
      console.error("Event creation error:", error);
      res.status(400).json({ message: "Failed to create event", error: getErrorMessage(error) });
    }
  });
  app2.put("/api/events/:id", authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const payload = eventPayloadSchema.partial().parse(req.body);
      if (payload.startAt && payload.endAt && payload.endAt <= payload.startAt) {
        return res.status(400).json({ message: "Event end date must be after start date" });
      }
      const updatePayload = { ...payload };
      if (payload.slug) updatePayload.slug = slugify(payload.slug);
      if (payload.coverImage !== void 0) updatePayload.coverImage = ensureMediaReference(payload.coverImage, "events");
      if (payload.tags !== void 0) updatePayload.tags = normalizeEventTags(payload.tags);
      const updateData = insertEventSchema.partial().parse(updatePayload);
      const event = await storage.updateEvent(id, updateData);
      if (!event) return res.status(404).json({ message: "Event not found" });
      await emitAdminRealtimeEvent(req, {
        event: "event_updated",
        channel: "events",
        entityType: "event",
        referenceId: event.id,
        payload: { event: await toAdminEvent(event) }
      });
      res.json(await toAdminEvent(event));
    } catch (error) {
      console.error("Event update error:", error);
      res.status(400).json({ message: "Failed to update event", error: getErrorMessage(error) });
    }
  });
  app2.delete("/api/events/:id", authenticateToken, requireEditor, async (req, res) => {
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
        payload: { id: String(id) }
      });
      res.status(204).send();
    } catch (error) {
      console.error("Event deletion error:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });
  app2.get("/api/referrals/me", authenticateToken, async (req, res) => {
    try {
      const protocol = req.get("x-forwarded-proto") || req.protocol || "http";
      const origin = env.PUBLIC_APP_URL || `${protocol}://${req.get("host")}`;
      const dashboard = await getReferralDashboard(getAuthenticatedUser(req).id, origin.replace(/\/$/, ""));
      res.json(dashboard);
    } catch (error) {
      console.error("Referral dashboard fetch error:", error);
      res.status(500).json({ message: "Failed to fetch referral dashboard" });
    }
  });
  app2.get("/api/referrals", authenticateToken, async (req, res) => {
    try {
      const protocol = req.get("x-forwarded-proto") || req.protocol || "http";
      const origin = env.PUBLIC_APP_URL || `${protocol}://${req.get("host")}`;
      const dashboard = await getReferralDashboard(getAuthenticatedUser(req).id, origin.replace(/\/$/, ""));
      res.json(dashboard.referrals);
    } catch (error) {
      console.error("Referrals fetch error:", error);
      res.status(500).json({ message: "Failed to fetch referrals" });
    }
  });
  app2.get("/api/referrals/ledger", authenticateToken, async (req, res) => {
    try {
      const protocol = req.get("x-forwarded-proto") || req.protocol || "http";
      const origin = env.PUBLIC_APP_URL || `${protocol}://${req.get("host")}`;
      const dashboard = await getReferralDashboard(getAuthenticatedUser(req).id, origin.replace(/\/$/, ""));
      res.json(dashboard.ledger);
    } catch (error) {
      console.error("Referral ledger fetch error:", error);
      res.status(500).json({ message: "Failed to fetch referral ledger" });
    }
  });
  app2.post("/api/referrals/invites", authenticateToken, async (req, res) => {
    try {
      const referralData = insertReferralSchema.parse({
        referrerId: getAuthenticatedUser(req).id,
        referredEmail: req.body.referredEmail,
        status: "pending",
        rewardAmount: 0
      });
      const referral = await storage.createReferral(referralData);
      broadcast("referrals", { type: "referral_created", referral });
      res.status(201).json(referral);
    } catch (error) {
      console.error("Referral invite creation error:", error);
      res.status(400).json({
        message: "Failed to create referral invite",
        error: getErrorMessage(error)
      });
    }
  });
  app2.post("/api/referrals", authenticateToken, async (req, res) => {
    try {
      const referralData = insertReferralSchema.parse({
        ...req.body,
        referrerId: getAuthenticatedUser(req).id,
        rewardAmount: 0
      });
      const referral = await storage.createReferral(referralData);
      broadcast("referrals", { type: "referral_created", referral });
      res.status(201).json(referral);
    } catch (error) {
      console.error("Referral creation error:", error);
      res.status(400).json({
        message: "Failed to create referral",
        error: getErrorMessage(error)
      });
    }
  });
  app2.post("/api/payments/checkout", authenticateToken, async (req, res) => {
    try {
      const payload = checkoutRequestSchema.parse(req.body);
      const session = await createCheckoutSession(getAuthenticatedUser(req).id, payload, req);
      res.status(201).json(session);
    } catch (error) {
      console.error("Checkout session error:", error);
      const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) || 500 : 500;
      res.status(status).json({ message: "Failed to create checkout session", error: getErrorMessage(error) });
    }
  });
  app2.post("/api/stripe/webhook", async (req, res) => {
    let event;
    try {
      event = verifyStripeWebhookEvent(req);
    } catch (error) {
      console.error("Stripe webhook verification error:", error);
      return res.status(400).json({ message: "Invalid Stripe webhook signature" });
    }
    try {
      const saved = await persistStripeEvent(event);
      res.json({ received: true, duplicate: !saved });
      if (saved) {
        setImmediate(() => {
          processStripeEvent(event).catch((error) => {
            console.error("Stripe event processing error:", error);
          });
        });
      }
    } catch (error) {
      console.error("Stripe webhook persistence error:", error);
      res.status(500).json({ message: "Failed to persist Stripe event" });
    }
  });
  app2.get("/api/payouts", authenticateToken, async (req, res) => {
    try {
      const payouts = await getUserPayouts(getAuthenticatedUser(req).id);
      res.json(payouts);
    } catch (error) {
      console.error("Payout fetch error:", error);
      res.status(500).json({ message: "Failed to fetch payouts" });
    }
  });
  app2.post("/api/payouts", authenticateToken, async (req, res) => {
    try {
      const payload = payoutRequestSchema.parse(req.body);
      const payout = await requestPayout(
        getAuthenticatedUser(req).id,
        payload.amount,
        payload.method,
        payload.destination
      );
      res.status(201).json(payout);
    } catch (error) {
      console.error("Payout request error:", error);
      const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) || 500 : 400;
      res.status(status).json({ message: "Failed to request payout", error: getErrorMessage(error) });
    }
  });
  app2.post("/api/admin/commissions/release", authenticateToken, requireAdmin, async (_req, res) => {
    try {
      const released = await releaseEligibleCommissions();
      res.json({ released });
    } catch (error) {
      console.error("Commission release error:", error);
      res.status(500).json({ message: "Failed to release commissions", error: getErrorMessage(error) });
    }
  });
  app2.get("/api/admin/revenue/referrals", authenticateToken, requireAdmin, async (_req, res) => {
    try {
      const analytics2 = await listAdminReferralAnalytics();
      res.json(analytics2);
    } catch (error) {
      console.error("Referral revenue analytics error:", error);
      res.status(500).json({ message: "Failed to fetch referral revenue analytics" });
    }
  });
  app2.get("/api/admin/referral-campaigns", authenticateToken, requireAdmin, async (_req, res) => {
    try {
      const campaigns = await listReferralCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error("Referral campaign fetch error:", error);
      res.status(500).json({ message: "Failed to fetch referral campaigns" });
    }
  });
  app2.post("/api/admin/referral-campaigns", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const payload = referralCampaignRequestSchema.parse(req.body);
      const campaign = await createReferralCampaign({
        ...payload,
        createdBy: getAuthenticatedUser(req).id
      });
      res.status(201).json(campaign);
    } catch (error) {
      console.error("Referral campaign creation error:", error);
      res.status(400).json({ message: "Failed to create referral campaign", error: getErrorMessage(error) });
    }
  });
  app2.put("/api/admin/referral-campaigns/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const payload = referralCampaignRequestSchema.partial().parse(req.body);
      const campaign = await updateReferralCampaign(Number(req.params.id), payload);
      res.json(campaign);
    } catch (error) {
      console.error("Referral campaign update error:", error);
      res.status(400).json({ message: "Failed to update referral campaign", error: getErrorMessage(error) });
    }
  });
  app2.get("/api/admin/commission-rules", authenticateToken, requireAdmin, async (_req, res) => {
    try {
      const rules = await listCommissionRules();
      res.json(rules);
    } catch (error) {
      console.error("Commission rule fetch error:", error);
      res.status(500).json({ message: "Failed to fetch commission rules" });
    }
  });
  app2.post("/api/admin/commission-rules", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const payload = commissionRuleRequestSchema.parse(req.body);
      const rule = await createCommissionRule({
        ...payload,
        currency: payload.currency.toUpperCase()
      });
      res.status(201).json(rule);
    } catch (error) {
      console.error("Commission rule creation error:", error);
      res.status(400).json({ message: "Failed to create commission rule", error: getErrorMessage(error) });
    }
  });
  app2.put("/api/admin/commission-rules/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const payload = commissionRuleRequestSchema.partial().parse(req.body);
      const rule = await updateCommissionRule(Number(req.params.id), {
        ...payload,
        currency: payload.currency?.toUpperCase()
      });
      res.json(rule);
    } catch (error) {
      console.error("Commission rule update error:", error);
      res.status(400).json({ message: "Failed to update commission rule", error: getErrorMessage(error) });
    }
  });
  app2.get("/api/admin/payouts", authenticateToken, requireAdmin, async (_req, res) => {
    try {
      const payouts = await listPayoutRequests();
      res.json(payouts);
    } catch (error) {
      console.error("Admin payout fetch error:", error);
      res.status(500).json({ message: "Failed to fetch payouts" });
    }
  });
  app2.post("/api/admin/payouts/:id/approve", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const payout = await approvePayoutRequest(Number(req.params.id), getAuthenticatedUser(req).id);
      res.json(payout);
    } catch (error) {
      console.error("Payout approval error:", error);
      res.status(400).json({ message: "Failed to approve payout", error: getErrorMessage(error) });
    }
  });
  app2.post("/api/admin/payouts/:id/reject", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const payout = await rejectPayoutRequest(Number(req.params.id), String(req.body.reason || "Rejected by admin"));
      res.json(payout);
    } catch (error) {
      console.error("Payout rejection error:", error);
      res.status(400).json({ message: "Failed to reject payout", error: getErrorMessage(error) });
    }
  });
  const shouldRunReferralReleaseWorker = env.REFERRAL_RELEASE_WORKER_ENABLED ?? env.NODE_ENV === "production";
  if (shouldRunReferralReleaseWorker) {
    const releaseWorker = setInterval(() => {
      releaseEligibleCommissions().catch((error) => {
        if (isTransientDbConnectivityError(error)) {
          console.warn(
            `[referrals] Scheduled commission release skipped after a transient database connection issue: ${getErrorMessage(error)}`
          );
          return;
        }
        console.error("Scheduled commission release error:", error);
      });
    }, env.REFERRAL_RELEASE_WORKER_MS);
    releaseWorker.unref?.();
  } else {
    console.info(
      `[referrals] Scheduled commission release worker disabled in ${env.NODE_ENV}. Set REFERRAL_RELEASE_WORKER_ENABLED=true to run it locally.`
    );
  }
  const paginate = (items, page, limit) => {
    const total = items.length;
    const start = (page - 1) * limit;
    return { items: items.slice(start, start + limit), total };
  };
  const compactText = (value, fallback = "") => {
    const text2 = typeof value === "string" ? value : value === null || value === void 0 ? fallback : JSON.stringify(value);
    return text2.replace(/\s+/g, " ").trim().slice(0, 180);
  };
  app2.get("/api/admin/search", authenticateToken, requireAdminPortal, async (req, res) => {
    try {
      const query = normalizeSearchQuery(req.query.q ?? req.query.search);
      const requester = getAuthenticatedUser(req);
      const canSearchSensitive = isAdmin(requester);
      if (query.length < 2) {
        return res.json({ query, results: [], total: 0 });
      }
      const [
        scholarships2,
        jobs2,
        partners2,
        blogPosts2,
        teamMembers2,
        events2,
        users2,
        applications2,
        messages2
      ] = await Promise.all([
        storage.getAllScholarships(),
        storage.getAllJobs(),
        storage.getAllPartners(),
        storage.getAllBlogPosts(),
        storage.getAllTeamMembers(),
        storage.getAllEvents(),
        canSearchSensitive ? storage.getAllUsers() : Promise.resolve([]),
        canSearchSensitive ? storage.getAllApplications() : Promise.resolve([]),
        canSearchSensitive ? storage.getAllMessages() : Promise.resolve([])
      ]);
      const usersById = new Map(users2.map((user) => [user.id, user]));
      const results = [
        ...searchAndRank(scholarships2.map(toAdminScholarship), query, (item) => [
          item.title,
          item.description,
          item.institution,
          item.region,
          item.category,
          item.status,
          item.requirements
        ]).slice(0, 8).map((item) => ({
          id: item.id,
          type: "scholarship",
          title: item.title,
          description: `${item.institution || "Scholarship"} \u2022 ${item.region || "Global"} \u2022 ${item.status}`,
          href: `/admin/scholarships?search=${encodeURIComponent(item.title)}`,
          category: item.category,
          status: item.status
        })),
        ...searchAndRank(jobs2.map(toAdminJob), query, (item) => [
          item.title,
          item.description,
          item.company,
          item.location,
          item.region,
          item.jobType,
          item.status,
          item.requirements
        ]).slice(0, 8).map((item) => ({
          id: item.id,
          type: "job",
          title: item.title,
          description: `${item.company || "Job"} \u2022 ${item.location || item.region || "Global"} \u2022 ${item.status}`,
          href: `/admin/jobs?search=${encodeURIComponent(item.title)}`,
          category: item.jobType,
          status: item.status
        })),
        ...searchAndRank(partners2.map(toAdminPartner), query, (item) => [
          item.name,
          item.description,
          item.website,
          item.region,
          item.partnershipType,
          item.videoTitle,
          item.videoDescription
        ]).slice(0, 8).map((item) => ({
          id: item.id,
          type: "partner",
          title: item.name,
          description: `${item.partnershipType || "Partner"} \u2022 ${item.region || "Global"}`,
          href: `/admin/partners?search=${encodeURIComponent(item.name)}`,
          category: item.partnershipType,
          status: item.isActive ? "active" : "inactive"
        })),
        ...searchAndRank(blogPosts2.map(toAdminBlogPost), query, (item) => [
          item.title,
          item.excerpt,
          item.content,
          item.category,
          item.tags,
          item.status
        ]).slice(0, 8).map((item) => ({
          id: item.id,
          type: "blog",
          title: item.title,
          description: `${item.category || "Blog"} \u2022 ${item.status}`,
          href: `/admin/blog?search=${encodeURIComponent(item.title)}`,
          category: item.category,
          status: item.status
        })),
        ...searchAndRank(teamMembers2.map(toAdminTeamMember), query, (item) => [
          item.name,
          item.position,
          item.bio,
          item.email,
          item.department,
          item.linkedIn,
          item.twitter
        ]).slice(0, 6).map((item) => ({
          id: item.id,
          type: "team",
          title: item.name,
          description: `${item.position || "Team member"}${item.department ? ` \u2022 ${item.department}` : ""}`,
          href: `/admin/team?search=${encodeURIComponent(item.name)}`,
          category: item.department || "Team",
          status: item.isActive ? "active" : "inactive"
        })),
        ...searchAndRank(await Promise.all(events2.map(toAdminEvent)), query, (item) => [
          item.title,
          item.summary,
          item.description,
          item.location,
          item.category,
          item.status,
          item.tags
        ]).slice(0, 6).map((item) => ({
          id: item.id,
          type: "event",
          title: item.title,
          description: `${item.category || "Event"} \u2022 ${item.location || "Location TBA"} \u2022 ${item.status}`,
          href: `/admin/activity?search=${encodeURIComponent(item.title)}`,
          category: item.category,
          status: item.status
        })),
        ...searchAndRank(users2.map(toAdminUser), query, (item) => [
          item.username,
          item.email,
          item.firstName,
          item.lastName,
          item.role,
          item.region
        ]).slice(0, 6).map((item) => ({
          id: item.id,
          type: "user",
          title: `${item.firstName} ${item.lastName}`.trim() || item.username,
          description: `${item.email} \u2022 ${item.role}`,
          href: `/admin/users?search=${encodeURIComponent(item.email || item.username)}`,
          category: item.role,
          status: item.isActive ? "active" : "inactive"
        })),
        ...searchAndRank(applications2, query, (item) => [
          item.id,
          item.type,
          item.status,
          usersById.get(item.userId)?.firstName,
          usersById.get(item.userId)?.lastName,
          usersById.get(item.userId)?.email,
          item.documents,
          item.referenceId
        ]).slice(0, 6).map((item) => {
          const applicantName = compactText(`${usersById.get(item.userId)?.firstName ?? ""} ${usersById.get(item.userId)?.lastName ?? ""}`) || compactText(usersById.get(item.userId)?.email) || `Application ${item.id}`;
          return {
            id: String(item.id),
            type: "application",
            title: applicantName,
            description: `${item.type || "Application"} \u2022 ${item.status || "pending"}`,
            href: `/admin/applications?search=${encodeURIComponent(applicantName)}`,
            category: item.type,
            status: item.status
          };
        }),
        ...searchAndRank(messages2, query, (item) => [
          item.name,
          item.email,
          item.phone,
          item.subject,
          item.message,
          item.isRead ? "read" : "unread"
        ]).slice(0, 6).map((item) => ({
          id: String(item.id),
          type: "message",
          title: item.subject || `Message from ${item.name}`,
          description: `${item.name} \u2022 ${item.email} \u2022 ${compactText(item.message)}`,
          href: `/admin/messages?search=${encodeURIComponent(item.email || item.name)}`,
          category: "Message",
          status: item.isRead ? "read" : "unread"
        })),
        ...searchAndRank(listAiChatConversations(), query, (item) => [
          item.id,
          item.userEmail,
          item.channel,
          item.summary,
          item.moderationFlags,
          item.messages.map((message) => message.content)
        ]).slice(0, 6).map((item) => ({
          id: item.id,
          type: "ai",
          title: item.summary || "AI conversation",
          description: `${item.channel} chat \u2022 ${item.messages.length} messages`,
          href: `/admin/ai-chat?search=${encodeURIComponent(item.summary || item.id)}`,
          category: item.channel,
          status: item.isActive ? "active" : "closed"
        }))
      ].slice(0, 40);
      await storage.logAnalytics({
        event: "admin_global_search",
        userId: requester.id,
        metadata: { query, total: results.length },
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      });
      res.json({ query, results, total: results.length });
    } catch (error) {
      console.error("Admin global search error:", error);
      res.status(500).json({ message: "Failed to search admin content" });
    }
  });
  app2.get("/api/admin/dashboard/stats", authenticateToken, requireAdminPortal, async (_req, res) => {
    try {
      const [
        users2,
        scholarships2,
        jobs2,
        partners2,
        blogPosts2,
        applications2,
        publishedBlogPosts,
        activeScholarships,
        activeJobs
      ] = await Promise.all([
        storage.getAllUsers(),
        storage.getAllScholarships(),
        storage.getAllJobs(),
        storage.getAllPartners(),
        storage.getAllBlogPosts(),
        storage.getAllApplications(),
        storage.getPublishedBlogPosts(),
        storage.getActiveScholarships(),
        storage.getActiveJobs()
      ]);
      const pendingApplications = applications2.filter((app3) => app3.status === "pending").length;
      const applicationStats = applications2.reduce((acc, app3) => {
        acc[app3.status] = (acc[app3.status] ?? 0) + 1;
        return acc;
      }, {});
      const recentActivity = (await storage.getAnalytics()).slice(0, 10).map((item) => {
        const meta = parseAnalyticsMeta(item.metadata);
        return {
          id: String(item.id),
          action: item.event,
          entityType: meta.type ?? "activity",
          details: meta.referenceId !== void 0 && meta.referenceId !== null ? String(meta.referenceId) : "",
          createdAt: item.timestamp
        };
      });
      res.json({
        totalUsers: users2.length,
        totalScholarships: scholarships2.length,
        totalJobs: jobs2.length,
        totalPartners: partners2.length,
        totalBlogPosts: blogPosts2.length,
        totalApplications: applications2.length,
        totalActiveChats: listAiChatConversations().filter((conversation) => conversation.isActive).length,
        activeScholarships: activeScholarships.length,
        activeJobs: activeJobs.length,
        pendingApplications,
        publishedPosts: publishedBlogPosts.length,
        applicationStats,
        applicationStatusStats: applicationStats,
        contentModerationStats: { flaggedCount: 0, approvedCount: scholarships2.length + jobs2.length },
        userGrowth: [],
        regionalStats: [],
        recentActivity
      });
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });
  app2.get("/api/admin/dashboard/recent-activity", authenticateToken, requireAdminPortal, async (_req, res) => {
    try {
      const recentActivity = (await storage.getAnalytics()).slice(0, 20).map((item) => {
        const meta = parseAnalyticsMeta(item.metadata);
        return {
          id: String(item.id),
          action: item.event,
          entityType: meta.type ?? "activity",
          details: meta.referenceId !== void 0 && meta.referenceId !== null ? String(meta.referenceId) : "",
          createdAt: item.timestamp
        };
      });
      res.json({ activity: recentActivity, total: recentActivity.length });
    } catch (error) {
      console.error("Admin activity error:", error);
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });
  app2.get("/api/admin/users", authenticateToken, requireAdmin, async (req, res) => {
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
        getUserMeta(user.id).region
      ]);
      const { items, total } = paginate(filtered, page, limit);
      res.json({ users: items.map(toAdminUser), total });
    } catch (error) {
      console.error("Admin users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  app2.get("/api/admin/users/:id", authenticateToken, requireAdmin, async (req, res) => {
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
  app2.post("/api/admin/users", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const requester = getAuthenticatedUser(req);
      const userData = insertUserSchema.parse(req.body);
      if (userData.role === "super_admin" && requester.role !== "super_admin") {
        return res.status(403).json({ message: "Only a super administrator can create super admin users" });
      }
      const existing = await storage.getUserByEmail(userData.email) || await storage.getUserByUsername(userData.username);
      if (existing) {
        return res.status(400).json({ message: "User already exists" });
      }
      const user = await storage.createUser({
        ...userData,
        password: await bcrypt.hash(userData.password, 10)
      });
      if (req.body.region) {
        setUserMeta(user.id, { region: String(req.body.region) });
      }
      await emitAdminRealtimeEvent(req, {
        event: "user_created",
        channel: "user_activity",
        entityType: "user",
        referenceId: user.id,
        payload: { user: toAdminUser(user) }
      });
      res.status(201).json(toAdminUser(user));
    } catch (error) {
      console.error("Admin user create error:", error);
      res.status(400).json({ message: "Failed to create user", error: getErrorMessage(error) });
    }
  });
  app2.put("/api/admin/users/:id", authenticateToken, requireAdmin, async (req, res) => {
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
      const nextUser = updateData.password ? { ...updateData, password: await bcrypt.hash(updateData.password, 10) } : updateData;
      const user = await storage.updateUser(id, nextUser);
      if (req.body.region !== void 0) {
        setUserMeta(id, { region: String(req.body.region) });
      }
      await emitAdminRealtimeEvent(req, {
        event: "user_updated",
        channel: "user_activity",
        entityType: "user",
        referenceId: id,
        payload: { user: toAdminUser(user) }
      });
      res.json(toAdminUser(user));
    } catch (error) {
      console.error("Admin user update error:", error);
      res.status(400).json({ message: "Failed to update user", error: getErrorMessage(error) });
    }
  });
  app2.delete("/api/admin/users/:id", authenticateToken, requireAdmin, async (req, res) => {
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
        payload: { id: String(id) }
      });
      res.status(204).send();
    } catch (error) {
      console.error("Admin user delete error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });
  app2.get("/api/admin/scholarships", authenticateToken, requireEditor, async (req, res) => {
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
        item.eligibility
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
  app2.post("/api/admin/scholarships", authenticateToken, requireEditor, async (req, res) => {
    try {
      const createdBy = getAuthenticatedUser(req).id;
      const amount = parseNumber(req.body.amount);
      const deadline = req.body.deadline ? new Date(req.body.deadline) : /* @__PURE__ */ new Date();
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
        createdBy
      });
      const scholarship = await storage.createScholarship(scholarshipData);
      setScholarshipMeta(scholarship.id, {
        eligibility: req.body.eligibility ?? "",
        status: normalizeAdminStatus(req.body.status, scholarship.isActive),
        isPremium: Boolean(req.body.isPremium),
        paymentStatus: req.body.paymentStatus ?? "unpaid",
        featuredImage,
        region: req.body.region ?? "Global"
      });
      await emitAdminRealtimeEvent(req, {
        event: "scholarship_created",
        channel: "scholarships",
        entityType: "scholarship",
        referenceId: scholarship.id,
        payload: { scholarship: toAdminScholarship(scholarship) }
      });
      res.status(201).json(toAdminScholarship(scholarship));
    } catch (error) {
      console.error("Admin scholarship create error:", error);
      res.status(400).json({ message: "Failed to create scholarship", error: getErrorMessage(error) });
    }
  });
  app2.put("/api/admin/scholarships/:id", authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const payload = {};
      if (req.body.title !== void 0) payload.title = req.body.title;
      if (req.body.description !== void 0) payload.description = req.body.description;
      if (req.body.institution !== void 0) payload.institution = req.body.institution;
      if (req.body.region !== void 0) payload.country = req.body.region;
      if (req.body.amount !== void 0) payload.amount = parseNumber(req.body.amount);
      if (req.body.currency !== void 0) payload.currency = req.body.currency;
      if (req.body.deadline !== void 0) payload.deadline = new Date(req.body.deadline);
      if (req.body.requirements !== void 0) payload.requirements = req.body.requirements;
      if (req.body.category !== void 0) payload.category = req.body.category;
      const featuredImage = req.body.featuredImage !== void 0 ? ensureMediaReference(req.body.featuredImage, "scholarships") : void 0;
      if (featuredImage !== void 0) payload.imageUrl = featuredImage;
      if (req.body.status !== void 0) payload.isActive = req.body.status === "published";
      const updateData = insertScholarshipSchema.partial().parse(payload);
      const scholarship = await storage.updateScholarship(id, updateData);
      if (!scholarship) return res.status(404).json({ message: "Scholarship not found" });
      setScholarshipMeta(id, {
        eligibility: req.body.eligibility,
        status: req.body.status,
        isPremium: parseOptionalBoolean(req.body.isPremium),
        paymentStatus: req.body.paymentStatus,
        featuredImage,
        region: req.body.region
      });
      await emitAdminRealtimeEvent(req, {
        event: "scholarship_updated",
        channel: "scholarships",
        entityType: "scholarship",
        referenceId: scholarship.id,
        payload: { scholarship: toAdminScholarship(scholarship) }
      });
      res.json(toAdminScholarship(scholarship));
    } catch (error) {
      console.error("Admin scholarship update error:", error);
      res.status(400).json({ message: "Failed to update scholarship", error: getErrorMessage(error) });
    }
  });
  app2.delete("/api/admin/scholarships/:id", authenticateToken, requireEditor, async (req, res) => {
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
        payload: { id: String(id) }
      });
      res.status(204).send();
    } catch (error) {
      console.error("Admin scholarship delete error:", error);
      res.status(500).json({ message: "Failed to delete scholarship" });
    }
  });
  app2.get("/api/admin/jobs", authenticateToken, requireEditor, async (req, res) => {
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
        item.benefits
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
  app2.post("/api/admin/jobs", authenticateToken, requireEditor, async (req, res) => {
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
        createdBy
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
        benefits: req.body.benefits ?? ""
      });
      await emitAdminRealtimeEvent(req, {
        event: "job_created",
        channel: "jobs",
        entityType: "job",
        referenceId: job.id,
        payload: { job: toAdminJob(job) }
      });
      res.status(201).json(toAdminJob(job));
    } catch (error) {
      console.error("Admin job create error:", error);
      res.status(400).json({ message: "Failed to create job", error: getErrorMessage(error) });
    }
  });
  app2.put("/api/admin/jobs/:id", authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const payload = {};
      if (req.body.title !== void 0) payload.title = req.body.title;
      if (req.body.description !== void 0) payload.description = req.body.description;
      if (req.body.company !== void 0) payload.company = req.body.company;
      if (req.body.location !== void 0) payload.location = req.body.location;
      if (req.body.jobType !== void 0) payload.jobType = req.body.jobType;
      if (req.body.deadline !== void 0) payload.deadline = req.body.deadline ? new Date(req.body.deadline) : null;
      const featuredImage = req.body.featuredImage !== void 0 ? ensureMediaReference(req.body.featuredImage, "jobs") : void 0;
      if (featuredImage !== void 0) payload.imageUrl = featuredImage;
      if (req.body.status !== void 0) payload.isActive = req.body.status === "published";
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
        benefits: req.body.benefits
      });
      await emitAdminRealtimeEvent(req, {
        event: "job_updated",
        channel: "jobs",
        entityType: "job",
        referenceId: job.id,
        payload: { job: toAdminJob(job) }
      });
      res.json(toAdminJob(job));
    } catch (error) {
      console.error("Admin job update error:", error);
      res.status(400).json({ message: "Failed to update job", error: getErrorMessage(error) });
    }
  });
  app2.delete("/api/admin/jobs/:id", authenticateToken, requireEditor, async (req, res) => {
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
        payload: { id: String(id) }
      });
      res.status(204).send();
    } catch (error) {
      console.error("Admin job delete error:", error);
      res.status(500).json({ message: "Failed to delete job" });
    }
  });
  app2.get("/api/admin/partners", authenticateToken, requireEditor, async (req, res) => {
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
        item.contactEmail
      ]);
      const { items, total } = paginate(filtered, page, limit);
      res.json({ partners: items, total });
    } catch (error) {
      console.error("Admin partners error:", error);
      res.status(500).json({ message: "Failed to fetch partners" });
    }
  });
  app2.post("/api/admin/partners", authenticateToken, requireEditor, async (req, res) => {
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
        isActive: req.body.isActive ?? true
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
        paymentStatus: req.body.paymentStatus ?? "unpaid"
      });
      await emitAdminRealtimeEvent(req, {
        event: "partner_created",
        channel: "partners",
        entityType: "partner",
        referenceId: partner.id,
        payload: { partner: toAdminPartner(partner) }
      });
      res.status(201).json(toAdminPartner(partner));
    } catch (error) {
      console.error("Admin partner create error:", error);
      res.status(400).json({ message: "Failed to create partner", error: getErrorMessage(error) });
    }
  });
  app2.put("/api/admin/partners/:id", authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const payload = {};
      if (req.body.name !== void 0) payload.name = req.body.name;
      if (req.body.description !== void 0) payload.description = req.body.description;
      const logo = req.body.logo !== void 0 ? ensureMediaReference(req.body.logo, "partners") : void 0;
      if (logo !== void 0) payload.logoUrl = logo;
      if (req.body.website !== void 0) payload.website = req.body.website;
      if (req.body.region !== void 0) payload.country = req.body.region;
      if (req.body.studentCount !== void 0) payload.studentCount = req.body.studentCount;
      if (req.body.ranking !== void 0) payload.ranking = req.body.ranking;
      if (req.body.isActive !== void 0) payload.isActive = req.body.isActive;
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
        paymentStatus: req.body.paymentStatus
      });
      await emitAdminRealtimeEvent(req, {
        event: "partner_updated",
        channel: "partners",
        entityType: "partner",
        referenceId: partner.id,
        payload: { partner: toAdminPartner(partner) }
      });
      res.json(toAdminPartner(partner));
    } catch (error) {
      console.error("Admin partner update error:", error);
      res.status(400).json({ message: "Failed to update partner", error: getErrorMessage(error) });
    }
  });
  app2.delete("/api/admin/partners/:id", authenticateToken, requireEditor, async (req, res) => {
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
        payload: { id: String(id) }
      });
      res.status(204).send();
    } catch (error) {
      console.error("Admin partner delete error:", error);
      res.status(500).json({ message: "Failed to delete partner" });
    }
  });
  app2.get("/api/admin/blog", authenticateToken, requireEditor, async (req, res) => {
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
        item.slug
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
  app2.post("/api/admin/blog", authenticateToken, requireEditor, async (req, res) => {
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
        authorId
      });
      const post = await storage.createBlogPost(postData);
      setBlogMeta(post.id, {
        slug: req.body.slug ?? `post-${post.id}`,
        status: normalizeAdminStatus(req.body.status, post.isPublished),
        featuredImage
      });
      await emitAdminRealtimeEvent(req, {
        event: "blog_post_created",
        channel: "blog-posts",
        entityType: "blog",
        referenceId: post.id,
        payload: { blogPost: toAdminBlogPost(post) }
      });
      res.status(201).json(toAdminBlogPost(post));
    } catch (error) {
      console.error("Admin blog create error:", error);
      res.status(400).json({ message: "Failed to create blog post", error: getErrorMessage(error) });
    }
  });
  app2.put("/api/admin/blog/:id", authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const payload = {};
      if (req.body.title !== void 0) payload.title = req.body.title;
      if (req.body.content !== void 0) payload.content = req.body.content;
      if (req.body.excerpt !== void 0) payload.excerpt = req.body.excerpt;
      const featuredImage = req.body.featuredImage !== void 0 ? ensureMediaReference(req.body.featuredImage, "blogs") : void 0;
      if (featuredImage !== void 0) payload.imageUrl = featuredImage;
      if (req.body.category !== void 0) payload.category = req.body.category;
      if (req.body.tags !== void 0) payload.tags = parseStringArray(req.body.tags) ?? [];
      if (req.body.status !== void 0) payload.isPublished = req.body.status === "published";
      const updateData = insertBlogPostSchema.partial().parse(payload);
      const post = await storage.updateBlogPost(id, updateData);
      if (!post) return res.status(404).json({ message: "Blog post not found" });
      setBlogMeta(id, {
        slug: req.body.slug,
        status: req.body.status,
        featuredImage
      });
      await emitAdminRealtimeEvent(req, {
        event: "blog_post_updated",
        channel: "blog-posts",
        entityType: "blog",
        referenceId: post.id,
        payload: { blogPost: toAdminBlogPost(post) }
      });
      res.json(toAdminBlogPost(post));
    } catch (error) {
      console.error("Admin blog update error:", error);
      res.status(400).json({ message: "Failed to update blog post", error: getErrorMessage(error) });
    }
  });
  app2.delete("/api/admin/blog/:id", authenticateToken, requireEditor, async (req, res) => {
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
        payload: { id: String(id) }
      });
      res.status(204).send();
    } catch (error) {
      console.error("Admin blog delete error:", error);
      res.status(500).json({ message: "Failed to delete blog post" });
    }
  });
  app2.get("/api/admin/team", authenticateToken, requireEditor, async (req, res) => {
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
        item.email
      ]);
      const { items, total } = paginate(filtered, page, limit);
      res.json({ members: items, total });
    } catch (error) {
      console.error("Admin team error:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });
  app2.post("/api/admin/team", authenticateToken, requireEditor, async (req, res) => {
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
        isActive: req.body.isActive ?? true
      });
      const member = await storage.createTeamMember(memberData);
      setTeamMeta(member.id, {
        department: req.body.department ?? "",
        profileImage
      });
      await emitAdminRealtimeEvent(req, {
        event: "team_member_created",
        channel: "team-members",
        entityType: "team",
        referenceId: member.id,
        payload: { teamMember: toAdminTeamMember(member) }
      });
      res.status(201).json(toAdminTeamMember(member));
    } catch (error) {
      console.error("Admin team create error:", error);
      res.status(400).json({ message: "Failed to create team member", error: getErrorMessage(error) });
    }
  });
  app2.put("/api/admin/team/:id", authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const payload = {};
      if (req.body.name !== void 0) payload.name = req.body.name;
      if (req.body.position !== void 0) payload.position = req.body.position;
      if (req.body.bio !== void 0) payload.bio = req.body.bio;
      const profileImage = req.body.profileImage !== void 0 ? ensureMediaReference(req.body.profileImage, "teams") : void 0;
      if (profileImage !== void 0) payload.imageUrl = profileImage;
      if (req.body.email !== void 0) payload.email = req.body.email;
      if (req.body.linkedIn !== void 0) payload.linkedin = req.body.linkedIn;
      if (req.body.twitter !== void 0) payload.twitter = req.body.twitter;
      if (req.body.order !== void 0) payload.order = req.body.order;
      if (req.body.isActive !== void 0) payload.isActive = req.body.isActive;
      const updateData = insertTeamMemberSchema.partial().parse(payload);
      const member = await storage.updateTeamMember(id, updateData);
      if (!member) return res.status(404).json({ message: "Team member not found" });
      setTeamMeta(id, {
        department: req.body.department,
        profileImage
      });
      await emitAdminRealtimeEvent(req, {
        event: "team_member_updated",
        channel: "team-members",
        entityType: "team",
        referenceId: member.id,
        payload: { teamMember: toAdminTeamMember(member) }
      });
      res.json(toAdminTeamMember(member));
    } catch (error) {
      console.error("Admin team update error:", error);
      res.status(400).json({ message: "Failed to update team member", error: getErrorMessage(error) });
    }
  });
  app2.delete("/api/admin/team/:id", authenticateToken, requireEditor, async (req, res) => {
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
        payload: { id: String(id) }
      });
      res.status(204).send();
    } catch (error) {
      console.error("Admin team delete error:", error);
      res.status(500).json({ message: "Failed to delete team member" });
    }
  });
  app2.get("/api/admin/events", authenticateToken, requireEditor, async (req, res) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 50);
      const search = normalizeSearchQuery(req.query.search);
      const statusFilter = String(req.query.status ?? "").toLowerCase();
      const allEvents = await storage.getAllEvents();
      const mapped = await Promise.all(allEvents.map(toAdminEvent));
      const filtered = mapped.filter((item) => {
        const matchesSearch = !search || item.title.toLowerCase().includes(search) || item.description.toLowerCase().includes(search) || item.category.toLowerCase().includes(search) || item.location.toLowerCase().includes(search);
        const matchesStatus = !statusFilter || item.status === statusFilter || String(item.runtimeStatus).toLowerCase() === statusFilter;
        return matchesSearch && matchesStatus;
      });
      const { items, total } = paginate(filtered, page, limit);
      res.json({ data: items, total });
    } catch (error) {
      console.error("Admin events error:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });
  app2.get("/api/admin/events/analytics", authenticateToken, requireEditor, async (_req, res) => {
    try {
      const [events2, registrations, analytics2] = await Promise.all([
        storage.getAllEvents(),
        storage.getAllEventRegistrations(),
        storage.getAnalytics()
      ]);
      const eventAnalytics = analytics2.filter((item) => {
        const meta = parseAnalyticsMeta(item.metadata);
        return meta.type === "event";
      });
      const views = eventAnalytics.filter((item) => item.event === "event_viewed").length;
      const shares = eventAnalytics.filter((item) => item.event === "event_shared").length;
      const published = events2.filter((event) => event.status === "published").length;
      const live = events2.filter((event) => deriveEventRuntimeStatus(event) === "live").length;
      const upcoming = events2.filter((event) => deriveEventRuntimeStatus(event) === "upcoming").length;
      const categoryStats = events2.reduce((acc, event) => {
        acc[event.category] = (acc[event.category] ?? 0) + 1;
        return acc;
      }, {});
      res.json({
        totalEvents: events2.length,
        publishedEvents: published,
        liveEvents: live,
        upcomingEvents: upcoming,
        registrations: registrations.length,
        approvedRegistrations: registrations.filter((item) => item.status === "approved" || item.status === "checked_in").length,
        views,
        shares,
        conversionRate: views > 0 ? Math.round(registrations.length / views * 100) : 0,
        categoryStats,
        topEvents: events2.slice().sort((left, right) => Number(right.viewCount ?? 0) - Number(left.viewCount ?? 0)).slice(0, 5)
      });
    } catch (error) {
      console.error("Admin events analytics error:", error);
      res.status(500).json({ message: "Failed to fetch event analytics" });
    }
  });
  app2.post("/api/admin/events", authenticateToken, requireEditor, async (req, res) => {
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
        createdBy: getAuthenticatedUser(req).id
      });
      const event = await storage.createEvent(eventData);
      await emitAdminRealtimeEvent(req, {
        event: "event_created",
        channel: "events",
        entityType: "event",
        referenceId: event.id,
        payload: { event: await toAdminEvent(event) }
      });
      res.status(201).json(await toAdminEvent(event));
    } catch (error) {
      console.error("Admin event create error:", error);
      res.status(400).json({ message: "Failed to create event", error: getErrorMessage(error) });
    }
  });
  app2.put("/api/admin/events/:id", authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const payload = eventPayloadSchema.partial().parse(req.body);
      if (payload.startAt && payload.endAt && payload.endAt <= payload.startAt) {
        return res.status(400).json({ message: "Event end date must be after start date" });
      }
      const updatePayload = { ...payload };
      if (payload.slug) updatePayload.slug = slugify(payload.slug);
      if (payload.coverImage !== void 0) updatePayload.coverImage = ensureMediaReference(payload.coverImage, "events");
      if (payload.tags !== void 0) updatePayload.tags = normalizeEventTags(payload.tags);
      const updateData = insertEventSchema.partial().parse(updatePayload);
      const event = await storage.updateEvent(id, updateData);
      if (!event) return res.status(404).json({ message: "Event not found" });
      await emitAdminRealtimeEvent(req, {
        event: "event_updated",
        channel: "events",
        entityType: "event",
        referenceId: event.id,
        payload: { event: await toAdminEvent(event) }
      });
      res.json(await toAdminEvent(event));
    } catch (error) {
      console.error("Admin event update error:", error);
      res.status(400).json({ message: "Failed to update event", error: getErrorMessage(error) });
    }
  });
  app2.delete("/api/admin/events/:id", authenticateToken, requireEditor, async (req, res) => {
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
        payload: { id: String(id) }
      });
      res.status(204).send();
    } catch (error) {
      console.error("Admin event delete error:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });
  app2.get("/api/admin/events/:id/registrations", authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      res.json(await storage.getEventRegistrations(id));
    } catch (error) {
      console.error("Admin event registration fetch error:", error);
      res.status(500).json({ message: "Failed to fetch event registrations" });
    }
  });
  app2.put("/api/admin/event-registrations/:id", authenticateToken, requireEditor, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const payload = eventRegistrationReviewSchema.parse(req.body);
      const registration = await storage.updateEventRegistration(id, {
        ...payload,
        checkedInAt: payload.status === "checked_in" ? /* @__PURE__ */ new Date() : void 0
      });
      await emitAdminRealtimeEvent(req, {
        event: "event_registration_updated",
        channel: "events",
        entityType: "event_registration",
        referenceId: registration.eventId,
        payload: { registration }
      });
      res.json(registration);
    } catch (error) {
      console.error("Admin event registration update error:", error);
      res.status(400).json({ message: "Failed to update registration", error: getErrorMessage(error) });
    }
  });
  app2.get("/api/admin/applications", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 50);
      const search = normalizeSearchQuery(req.query.search);
      const statusFilter = String(req.query.status ?? "").toLowerCase();
      const allApplications = await storage.getAllApplications();
      const filtered = statusFilter ? allApplications.filter((app3) => app3.status === statusFilter) : allApplications;
      const enriched = await Promise.all(
        filtered.map(async (app3) => {
          const user = await storage.getUser(app3.userId);
          const scholarship = app3.type === "scholarship" ? await storage.getScholarship(app3.referenceId) : null;
          const job = app3.type === "job" ? await storage.getJob(app3.referenceId) : null;
          return {
            ...app3,
            id: String(app3.id),
            applicantName: user ? `${user.firstName} ${user.lastName}`.trim() : "Applicant",
            applicantEmail: user?.email ?? "",
            opportunityTitle: scholarship?.title ?? job?.title ?? "Opportunity",
            opportunityType: app3.type ?? "application",
            coverLetter: app3.notes ?? ""
          };
        })
      );
      const searched = search ? searchAndRank(enriched, search, (app3) => [
        app3.applicantName,
        app3.applicantEmail,
        app3.opportunityTitle,
        app3.opportunityType,
        app3.status,
        app3.coverLetter
      ]) : enriched;
      const { items, total } = paginate(searched, page, limit);
      res.json({ applications: items, total });
    } catch (error) {
      console.error("Admin applications error:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });
  app2.get("/api/admin/applications/export", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const search = normalizeSearchQuery(req.query.search);
      const statusFilter = String(req.query.status ?? "").toLowerCase();
      const allApplications = await storage.getAllApplications();
      const filtered = statusFilter ? allApplications.filter((app3) => app3.status === statusFilter) : allApplications;
      const enriched = await Promise.all(
        filtered.map(async (app3) => {
          const user = await storage.getUser(app3.userId);
          const scholarship = app3.type === "scholarship" ? await storage.getScholarship(app3.referenceId) : null;
          const job = app3.type === "job" ? await storage.getJob(app3.referenceId) : null;
          return {
            id: app3.id,
            applicantName: user ? `${user.firstName} ${user.lastName}`.trim() : "Applicant",
            applicantEmail: user?.email ?? "",
            opportunityTitle: scholarship?.title ?? job?.title ?? "Opportunity",
            opportunityType: app3.type ?? "application",
            status: app3.status,
            submittedAt: app3.submittedAt,
            updatedAt: app3.updatedAt
          };
        })
      );
      const searched = search ? searchAndRank(enriched, search, (app3) => [
        app3.applicantName,
        app3.applicantEmail,
        app3.opportunityTitle,
        app3.opportunityType,
        app3.status
      ]) : enriched;
      const headers = [
        "Application ID",
        "Applicant Name",
        "Applicant Email",
        "Opportunity",
        "Type",
        "Status",
        "Submitted At",
        "Updated At"
      ];
      const rows = searched.map((app3) => [
        app3.id,
        app3.applicantName,
        app3.applicantEmail,
        app3.opportunityTitle,
        app3.opportunityType,
        app3.status,
        app3.submittedAt,
        app3.updatedAt
      ]);
      const csv = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\n");
      await storage.logAnalytics({
        event: "applications_exported",
        userId: getAuthenticatedUser(req).id,
        metadata: { total: searched.length, status: statusFilter || "all", search: search || null },
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="mtendere-applications-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Admin applications export error:", error);
      res.status(500).json({ message: "Failed to export applications" });
    }
  });
  app2.put("/api/admin/applications/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const payload = adminApplicationReviewSchema.parse(req.body);
      const existingApplication = await storage.getApplication(id);
      if (!existingApplication) {
        return res.status(404).json({ message: "Application not found" });
      }
      const updateData = {};
      if (payload.status) {
        updateData.status = payload.status;
      }
      if (payload.reviewNotes !== void 0) {
        const existingDocuments = existingApplication.documents && typeof existingApplication.documents === "object" ? existingApplication.documents : {};
        updateData.documents = {
          ...existingDocuments,
          adminReview: {
            notes: payload.reviewNotes,
            reviewedBy: getAuthenticatedUser(req).id,
            reviewedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        };
      }
      const application = Object.keys(updateData).length > 0 ? await storage.updateApplication(id, updateData) : existingApplication;
      const [user, scholarship, job] = await Promise.all([
        storage.getUser(application.userId),
        application.type === "scholarship" ? storage.getScholarship(application.referenceId) : Promise.resolve(null),
        application.type === "job" ? storage.getJob(application.referenceId) : Promise.resolve(null)
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
        coverLetter: application.notes ?? ""
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
            hasReviewNotes: Boolean(payload.reviewNotes)
          }
        }
      });
      await storage.logAnalytics({
        event: "application_reviewed",
        userId: getAuthenticatedUser(req).id,
        metadata: {
          applicationId: id,
          previousStatus: existingApplication.status,
          nextStatus: application.status,
          hasReviewNotes: Boolean(payload.reviewNotes)
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
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
          dashboardUrl
        });
      }
      res.json(enrichedApplication);
    } catch (error) {
      console.error("Admin applications update error:", error);
      res.status(400).json({ message: "Failed to update application", error: getErrorMessage(error) });
    }
  });
  app2.get("/api/admin/ai-chat/conversations", authenticateToken, requireAdmin, (req, res) => {
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
      conversation.messages.map((item) => item.content)
    ]).filter((conversation) => {
      const matchesChannel = !channel || conversation.channel === channel;
      const matchesFlag = !flag || (flag === "any" || flag === "flagged") && conversation.moderationFlags.length > 0 || conversation.moderationFlags.includes(flag);
      const matchesStatus = !status || status === "active" && conversation.isActive || status === "closed" && !conversation.isActive;
      return matchesChannel && matchesFlag && matchesStatus;
    });
    res.json({
      conversations: filtered.slice(offset, offset + limit),
      total: filtered.length,
      page,
      limit
    });
  });
  app2.get("/api/admin/ai-chat/conversations/:id", authenticateToken, requireAdmin, (req, res) => {
    const conversation = getAiChatConversation(req.params.id);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });
    res.json(conversation);
  });
  app2.put("/api/admin/ai-chat/conversations/:id/close", authenticateToken, requireAdmin, async (req, res) => {
    const conversation = closeAiChatConversation(req.params.id);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });
    await storage.logAnalytics({
      event: "admin_ai_chat_closed",
      userId: getAuthenticatedUser(req).id,
      metadata: { conversationId: conversation.id },
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });
    broadcast("ai-chat", { type: "ai_chat_updated", conversation });
    res.json(conversation);
  });
  app2.get("/api/admin/ai/conversations", authenticateToken, requireAdmin, (req, res) => {
    res.redirect(307, "/api/admin/ai-chat/conversations");
  });
  app2.post("/api/admin/ai/chat", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const payload = chatRequestSchema.parse(req.body);
      const user = getAuthenticatedUser(req);
      const existing = payload.conversationId ? getAiChatConversation(payload.conversationId) : void 0;
      const response = await getChatResponse(payload.message, {
        channel: "admin",
        platformContext: await buildAiPlatformContext(),
        history: existing?.messages.map((item) => ({
          role: item.role === "system" ? "assistant" : item.role,
          content: item.content
        }))
      });
      const conversation = appendAiConversationTurn({
        conversationId: payload.conversationId,
        userId: String(user.id),
        userEmail: user.email,
        channel: "admin",
        message: payload.message,
        response
      });
      await storage.logAnalytics({
        event: "admin_ai_chat_message",
        userId: user.id,
        metadata: {
          conversationId: conversation.id,
          flags: conversation.moderationFlags
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      });
      broadcast("ai-chat", { type: "ai_chat_updated", conversation });
      res.json({ response, conversationId: conversation.id, conversation });
    } catch (error) {
      console.error("Admin AI chat error:", error);
      res.status(400).json({ message: "Failed to get chat response", error: getErrorMessage(error) });
    }
  });
  app2.get("/api/admin/roles", authenticateToken, requireSuperAdmin, (req, res) => {
    const search = normalizeSearchQuery(req.query.search);
    const roles = searchAndRank(getAdminRoles(), search, (role) => [
      role.id,
      role.name,
      role.description,
      role.permissions
    ]).map((role) => ({
      ...role,
      isSystem: isCoreAdminRole(role.id)
    }));
    res.json({ roles, total: roles.length });
  });
  app2.post("/api/admin/roles", authenticateToken, requireSuperAdmin, async (req, res) => {
    const payload = adminRoleInputSchema.parse(req.body);
    const id = normalizeRoleId(payload.name) || String(Date.now());
    if (isCoreAdminRole(id) || getAdminRoles().some((role2) => role2.id === id)) {
      return res.status(409).json({ message: "A role with this name already exists" });
    }
    const role = upsertAdminRole({
      id,
      name: payload.name,
      description: payload.description,
      permissions: payload.permissions.filter((permission) => adminPermissionIds.has(permission)),
      isActive: payload.isActive
    });
    await emitAdminRealtimeEvent(req, {
      event: "role_created",
      channel: "admin-roles",
      entityType: "role",
      referenceId: role.id,
      payload: { role }
    });
    res.status(201).json(role);
  });
  app2.put("/api/admin/roles/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
    const existing = getAdminRoles().find((role2) => role2.id === req.params.id);
    if (!existing) return res.status(404).json({ message: "Role not found" });
    const payload = adminRoleInputSchema.parse(req.body);
    const role = upsertAdminRole({
      id: req.params.id,
      name: isCoreAdminRole(req.params.id) ? existing.name : payload.name,
      description: payload.description,
      permissions: payload.permissions.filter((permission) => adminPermissionIds.has(permission)),
      isActive: isCoreAdminRole(req.params.id) ? true : payload.isActive
    });
    await emitAdminRealtimeEvent(req, {
      event: "role_updated",
      channel: "admin-roles",
      entityType: "role",
      referenceId: role.id,
      payload: { role }
    });
    res.json(role);
  });
  app2.delete("/api/admin/roles/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
    const deleted = deleteAdminRole(req.params.id);
    if (!deleted) {
      return res.status(isCoreAdminRole(req.params.id) ? 409 : 404).json({
        message: isCoreAdminRole(req.params.id) ? "System roles are protected and cannot be deleted" : "Role not found"
      });
    }
    await emitAdminRealtimeEvent(req, {
      event: "role_deleted",
      channel: "admin-roles",
      entityType: "role",
      referenceId: req.params.id,
      payload: { id: req.params.id }
    });
    res.status(204).send();
  });
  app2.get("/api/admin/settings", authenticateToken, requireSuperAdmin, (_req, res) => {
    res.json(getAdminSettings());
  });
  app2.put("/api/admin/settings", authenticateToken, requireSuperAdmin, async (req, res) => {
    const payload = adminSettingsUpdateSchema.parse(req.body);
    const settings = updateAdminSettings(payload);
    await emitAdminRealtimeEvent(req, {
      event: "settings_updated",
      channel: "admin-settings",
      entityType: "settings",
      payload: { settings }
    });
    res.json(settings);
  });
  app2.post("/api/admin/settings/invalidate-sessions", authenticateToken, requireSuperAdmin, async (req, res) => {
    const invalidatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const settings = updateAdminSettings({ authTokenInvalidBefore: invalidatedAt });
    await storage.logAnalytics({
      event: "admin_sessions_invalidated",
      userId: getAuthenticatedUser(req).id,
      metadata: { invalidatedAt },
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });
    await emitAdminRealtimeEvent(req, {
      event: "sessions_invalidated",
      channel: "admin-settings",
      entityType: "settings",
      payload: { invalidatedAt }
    });
    res.json({ invalidatedAt, settings });
  });
  app2.post("/api/admin/settings/cache/clear", authenticateToken, requireSuperAdmin, async (req, res) => {
    const clearedAt = (/* @__PURE__ */ new Date()).toISOString();
    const currentSettings = getAdminSettings();
    const settings = updateAdminSettings({
      cacheVersion: (currentSettings.cacheVersion || 1) + 1
    });
    await storage.logAnalytics({
      event: "admin_cache_cleared",
      userId: getAuthenticatedUser(req).id,
      metadata: { clearedAt, cacheVersion: settings.cacheVersion },
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });
    await emitAdminRealtimeEvent(req, {
      event: "cache_cleared",
      channel: "admin-settings",
      entityType: "settings",
      payload: { clearedAt, cacheVersion: settings.cacheVersion }
    });
    res.json({ clearedAt, cacheVersion: settings.cacheVersion });
  });
  app2.get("/api/admin/notifications", authenticateToken, requireAdminPortal, async (req, res) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const items = (await storage.getAnalytics()).map((item) => ({
        id: `analytics-${item.id}`,
        title: item.event,
        message: item.metadata ? JSON.stringify(item.metadata) : "",
        type: "info",
        isRead: isNotificationRead(`analytics-${item.id}`),
        createdAt: item.timestamp
      }));
      const { items: paged, total } = paginate(items, page, limit);
      res.json({ notifications: paged, total });
    } catch (error) {
      console.error("Admin notifications error:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });
  app2.put("/api/admin/notifications/:id/read", authenticateToken, requireAdminPortal, (req, res) => {
    markNotificationRead(req.params.id);
    res.status(204).send();
  });
  app2.put("/api/admin/notifications/read-all", authenticateToken, requireAdminPortal, async (_req, res) => {
    const ids = (await storage.getAnalytics()).map((item) => `analytics-${item.id}`);
    markNotificationsRead(ids);
    res.status(204).send();
  });
  app2.get("/api/admin/audit-logs", authenticateToken, requireAdmin, async (req, res) => {
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
          entityId: meta.referenceId !== void 0 && meta.referenceId !== null ? String(meta.referenceId) : null,
          oldData: null,
          newData: item.metadata ?? null,
          ipAddress: item.ipAddress ?? null,
          userAgent: item.userAgent ?? null,
          createdAt: item.timestamp
        };
      });
      const { items, total } = paginate(logs, page, limit);
      res.json({ logs: items, total });
    } catch (error) {
      console.error("Admin audit logs error:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });
  app2.post("/api/admin/upload", authenticateToken, requireEditor, upload.single("file"), (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ message: "No file uploaded" });
    res.json({
      url: `/uploads/${file.filename}`,
      originalName: file.originalname,
      size: file.size,
      type: file.mimetype
    });
  });
  app2.post("/api/admin/upload/multiple", authenticateToken, requireEditor, upload.array("files", 10), (req, res) => {
    const filesPayload = req.files;
    const files = Array.isArray(filesPayload) ? filesPayload : [];
    res.json({
      files: files.map((file) => ({
        url: `/uploads/${file.filename}`,
        originalName: file.originalname,
        size: file.size,
        type: file.mimetype
      }))
    });
  });
  app2.get("/api/admin/media/assets", authenticateToken, requireEditor, (_req, res) => {
    res.json({
      root: "assets/imgs",
      modules: Array.from(mediaAssetModules).sort(),
      assets: listMediaAssets()
    });
  });
  app2.post(
    "/api/admin/media/assets/:module",
    authenticateToken,
    requireEditor,
    mediaAssetUpload.array("files", 10),
    (req, res) => {
      const moduleName = String(req.params.module || "").toLowerCase();
      const filesPayload = req.files;
      const files = Array.isArray(filesPayload) ? filesPayload : [];
      const rejected = [];
      const accepted = files.filter((file) => {
        if (isValidImageFile(file.path)) return true;
        rejected.push({ originalName: file.originalname, reason: "invalid-image-signature" });
        try {
          fs3.unlinkSync(file.path);
        } catch (error) {
          console.error("Failed to remove invalid media upload:", error);
        }
        return false;
      });
      if (!accepted.length && rejected.length) {
        return res.status(400).json({
          message: "No valid image files uploaded.",
          rejected
        });
      }
      res.json({
        module: moduleName,
        files: accepted.map((file) => {
          const relativePath = path3.relative(mediaAssetRoot, file.path).replace(/\\/g, "/");
          return {
            path: `assets/imgs/${relativePath}`,
            reference: relativePath,
            previewUrl: toMediaAssetUrl(relativePath),
            module: moduleName,
            originalName: file.originalname,
            size: file.size,
            type: file.mimetype,
            valid: true,
            note: "This source asset is governed and can be assigned immediately."
          };
        }),
        rejected
      });
    }
  );
  app2.get("/api/admin/media/audit", authenticateToken, requireEditor, async (_req, res) => {
    try {
      const [blogs, team, scholarshipsList, jobsList, partnersList, testimonialsList, eventsList] = await Promise.all([
        storage.getAllBlogPosts(),
        storage.getAllTeamMembers(),
        storage.getAllScholarships(),
        storage.getAllJobs(),
        storage.getAllPartners(),
        storage.getAllTestimonials(),
        storage.getAllEvents()
      ]);
      const references = [
        ...blogs.map((item) => ({ module: "blogs", id: item.id, title: item.title, field: "imageUrl", value: item.imageUrl })),
        ...team.map((item) => ({ module: "teams", id: item.id, title: item.name, field: "imageUrl", value: item.imageUrl })),
        ...scholarshipsList.map((item) => ({
          module: "scholarships",
          id: item.id,
          title: item.title,
          field: "imageUrl",
          value: item.imageUrl
        })),
        ...jobsList.map((item) => ({
          module: "jobs",
          id: item.id,
          title: item.title,
          field: "featuredImage",
          value: getJobMeta(item.id).featuredImage ?? null
        })),
        ...partnersList.map((item) => ({ module: "partners", id: item.id, title: item.name, field: "logoUrl", value: item.logoUrl })),
        ...testimonialsList.map((item) => ({
          module: "testimonials",
          id: item.id,
          title: item.authorName || `Testimonial ${item.id}`,
          field: "imageUrl",
          value: item.imageUrl
        })),
        ...eventsList.map((item) => ({
          module: "events",
          id: item.id,
          title: item.title,
          field: "coverImage",
          value: item.coverImage
        }))
      ];
      const invalidReferences = references.filter((reference) => !isValidMediaReference(reference.value)).map((reference) => ({
        ...reference,
        reason: reference.value ? /^https?:\/\//i.test(reference.value) ? "external-url" : reference.value.startsWith("/uploads/") ? "upload-folder" : "missing-local-asset" : "missing"
      }));
      await storage.logAnalytics({
        event: "media_audit_run",
        userId: null,
        metadata: {
          checked: references.length,
          invalid: invalidReferences.length
        },
        ipAddress: null,
        userAgent: null
      });
      res.json({
        checked: references.length,
        invalidCount: invalidReferences.length,
        invalidReferences,
        fallbackPolicy: ["assigned asset", "category default", "global default", "styled initials placeholder"],
        assets: listMediaAssets()
      });
    } catch (error) {
      console.error("Admin media audit error:", error);
      res.status(500).json({ message: "Failed to audit media assets" });
    }
  });
  app2.get("/api/analytics/summary", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const summary = await storage.getAnalyticsSummary();
      res.json(summary);
    } catch (error) {
      console.error("Analytics summary error:", error);
      res.status(500).json({ message: "Failed to fetch analytics summary" });
    }
  });
  app2.get("/api/analytics", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const analytics2 = await storage.getAnalytics(
        startDate ? new Date(startDate) : void 0,
        endDate ? new Date(endDate) : void 0
      );
      res.json(analytics2);
    } catch (error) {
      console.error("Analytics fetch error:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });
  app2.get("/api/saved-items", authenticateToken, async (req, res) => {
    try {
      const userId = getAuthenticatedUser(req).id;
      const items = await storage.getUserSavedItems(userId);
      res.json(items);
    } catch (error) {
      console.error("Saved items fetch error:", error);
      res.status(500).json({ message: "Failed to fetch saved items" });
    }
  });
  app2.post("/api/saved-items", authenticateToken, async (req, res) => {
    try {
      const userId = getAuthenticatedUser(req).id;
      const existing = await storage.isItemSaved(userId, String(req.body.type), Number(req.body.referenceId));
      if (existing) {
        return res.status(409).json({ message: "Item is already saved" });
      }
      const savedItemData = insertSavedItemSchema.parse({
        ...req.body,
        userId
      });
      const item = await storage.createSavedItem(savedItemData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Saved item creation error:", error);
      res.status(400).json({ message: "Failed to save item", error: getErrorMessage(error) });
    }
  });
  app2.delete("/api/saved-items/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const success = await storage.deleteSavedItem(id);
      if (success) {
        res.json({ message: "Saved item removed" });
      } else {
        res.status(404).json({ message: "Saved item not found" });
      }
    } catch (error) {
      console.error("Saved item deletion error:", error);
      res.status(500).json({ message: "Failed to remove saved item" });
    }
  });
  app2.get("/api/saved-items/check", authenticateToken, async (req, res) => {
    try {
      const userId = getAuthenticatedUser(req).id;
      const { type, referenceId } = req.query;
      if (!type || !referenceId) {
        return res.status(400).json({ message: "Type and referenceId required" });
      }
      const isSaved = await storage.isItemSaved(userId, String(type), Number(referenceId));
      res.json({ isSaved });
    } catch (error) {
      console.error("Saved item check error:", error);
      res.status(500).json({ message: "Failed to check saved status" });
    }
  });
  app2.post("/api/subscribers", async (req, res) => {
    try {
      const payload = subscriberRequestSchema.parse(req.body);
      if (payload.website) {
        return res.status(201).json({
          message: "Please check your inbox to confirm your subscription."
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
        unsubscribedAt: null
      });
      const subscriber = existing ? await storage.updateSubscriber(existing.id, subscriberPayload) : await storage.createSubscriber(subscriberPayload);
      const baseUrl = env.PUBLIC_APP_URL || `${req.protocol}://${req.get("host")}`;
      const verificationUrl = `${baseUrl}/api/subscribers/verify/${verificationToken}`;
      const unsubscribeUrl = `${baseUrl}/api/subscribers/unsubscribe/${unsubscribeToken}`;
      void sendSubscriptionConfirmation({
        email: subscriber.email,
        name: subscriber.name,
        verificationUrl,
        unsubscribeUrl
      });
      await storage.logAnalytics({
        event: "subscriber_created",
        metadata: { email: subscriber.email, source: payload.source },
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      });
      res.status(201).json({
        message: "Please check your inbox to confirm your subscription.",
        subscriber: {
          id: subscriber.id,
          email: subscriber.email,
          status: subscriber.status,
          preferences: subscriber.preferences
        }
      });
    } catch (error) {
      console.error("Subscriber creation error:", error);
      res.status(400).json({ message: "Failed to subscribe", error: getErrorMessage(error) });
    }
  });
  app2.get("/api/subscribers/verify/:token", async (req, res) => {
    try {
      const subscriber = await storage.getSubscriberByVerificationToken(req.params.token);
      if (!subscriber) return res.status(404).json({ message: "Verification link not found" });
      await storage.updateSubscriber(subscriber.id, {
        status: "active",
        verifiedAt: /* @__PURE__ */ new Date(),
        verificationToken: null
      });
      const redirectUrl = `${env.PUBLIC_APP_URL || "/"}${env.PUBLIC_APP_URL ? "" : ""}`;
      res.redirect(302, `${redirectUrl}?subscription=verified`);
    } catch (error) {
      console.error("Subscriber verification error:", error);
      res.status(500).json({ message: "Failed to verify subscription" });
    }
  });
  app2.get("/api/subscribers/unsubscribe/:token", async (req, res) => {
    try {
      const subscriber = await storage.getSubscriberByUnsubscribeToken(req.params.token);
      if (!subscriber) return res.status(404).json({ message: "Unsubscribe link not found" });
      await storage.updateSubscriber(subscriber.id, {
        status: "unsubscribed",
        unsubscribedAt: /* @__PURE__ */ new Date()
      });
      const redirectUrl = env.PUBLIC_APP_URL || "/";
      res.redirect(302, `${redirectUrl}?subscription=unsubscribed`);
    } catch (error) {
      console.error("Subscriber unsubscribe error:", error);
      res.status(500).json({ message: "Failed to unsubscribe" });
    }
  });
  app2.post("/api/subscribers/unsubscribe", async (req, res) => {
    try {
      const email = z3.string().trim().email().transform((value) => value.toLowerCase()).parse(req.body.email);
      const subscriber = await storage.getSubscriberByEmail(email);
      if (subscriber) {
        await storage.updateSubscriber(subscriber.id, {
          status: "unsubscribed",
          unsubscribedAt: /* @__PURE__ */ new Date()
        });
      }
      res.json({ message: "Subscription preferences updated." });
    } catch (error) {
      res.status(400).json({ message: "Valid email required", error: getErrorMessage(error) });
    }
  });
  app2.get("/api/admin/subscribers", authenticateToken, requireAdmin, async (req, res) => {
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
        subscriber.status
      ]).filter((subscriber) => {
        const matchesStatus = !status || subscriber.status === status;
        return matchesStatus;
      });
      const safePage = Number.isFinite(page) && page > 0 ? page : 1;
      const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 50;
      const start = (safePage - 1) * safeLimit;
      res.json({ subscribers: filtered.slice(start, start + safeLimit), total: filtered.length });
    } catch (error) {
      console.error("Admin subscribers error:", error);
      res.status(500).json({ message: "Failed to fetch subscribers" });
    }
  });
  app2.post("/api/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      void sendContactAcknowledgement({
        email: message.email,
        name: message.name,
        subject: message.subject
      });
      void sendAdminNotification({
        subject: "New Mtendere contact message",
        message: `${message.name} (${message.email}) sent: ${message.subject || "General inquiry"}`,
        metadata: { messageId: message.id }
      });
      await storage.logAnalytics({
        event: "contact_message_submitted",
        metadata: { messageId: message.id, subject: message.subject },
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      });
      res.status(201).json({ message: "Message sent successfully", data: message });
    } catch (error) {
      console.error("Message creation error:", error);
      res.status(400).json({ message: "Failed to send message", error: getErrorMessage(error) });
    }
  });
  app2.get("/api/messages", authenticateToken, requireAdmin, async (_req, res) => {
    try {
      const messages2 = await storage.getAllMessages();
      res.json(messages2);
    } catch (error) {
      console.error("Messages fetch error:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
  app2.get("/api/admin/messages", authenticateToken, requireAdmin, async (req, res) => {
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
        message.message
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
        limit
      });
    } catch (error) {
      console.error("Admin messages fetch error:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
  app2.put("/api/admin/messages/:id/read", authenticateToken, requireAdmin, async (req, res) => {
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
  app2.put("/api/messages/:id/read", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const message = await storage.markMessageRead(id);
      res.json(message);
    } catch (error) {
      console.error("Message read error:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });
  app2.post("/api/chat", async (req, res) => {
    try {
      const payload = chatRequestSchema.parse(req.body);
      const requester = getOptionalAuthenticatedUser(req);
      const existing = payload.conversationId ? getAiChatConversation(payload.conversationId) : void 0;
      const response = await getChatResponse(payload.message, {
        channel: "public",
        platformContext: await buildAiPlatformContext(),
        history: existing?.messages.map((item) => ({
          role: item.role === "system" ? "assistant" : item.role,
          content: item.content
        }))
      });
      const conversation = appendAiConversationTurn({
        conversationId: payload.conversationId,
        userId: requester ? String(requester.id) : null,
        userEmail: requester?.email ?? null,
        channel: "public",
        message: payload.message,
        response
      });
      await storage.logAnalytics({
        event: "public_ai_chat_message",
        userId: requester?.id ?? null,
        metadata: {
          conversationId: conversation.id,
          flags: conversation.moderationFlags
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      });
      broadcast("ai-chat", { type: "ai_chat_updated", conversation });
      res.json({ response, conversationId: conversation.id });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(400).json({ message: "Failed to get chat response", error: getErrorMessage(error) });
    }
  });
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs4 from "fs";
import path5 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path4 from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path4.dirname(__filename);
var vite_config_default = defineConfig({
  root: path4.resolve(__dirname, "client"),
  plugins: [react()],
  assetsInclude: ["**/*.JPG", "**/*.JPEG", "**/*.PNG", "**/*.WEBP"],
  resolve: {
    alias: {
      "@": path4.resolve(__dirname, "client/src"),
      "@assets": path4.resolve(__dirname, "client/src/assets"),
      "@shared": path4.resolve(__dirname, "shared")
    }
  },
  build: {
    outDir: path4.resolve(__dirname, "dist/client"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: false
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path5.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs4.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}

// server/index.ts
var app = express3();
var isProduction = env.NODE_ENV === "production";
var port = env.PORT;
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:", "ws:", "wss:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        mediaSrc: ["'self'", "https:"],
        frameSrc: [
          "'self'",
          "https://www.youtube.com",
          "https://www.youtube-nocookie.com"
        ],
        childSrc: [
          "'self'",
          "https://www.youtube.com",
          "https://www.youtube-nocookie.com"
        ],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"]
      }
    }
  })
);
app.set("trust proxy", true);
var splitOriginList = (value) => (value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
var normalizeOrigin = (value) => {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return value.replace(/\/+$/, "");
  }
};
var configuredOrigins = [
  env.PUBLIC_APP_URL,
  env.FRONTEND_URL,
  env.ADMIN_APP_URL,
  env.VITE_SITE_URL,
  env.VITE_API_URL,
  ...splitOriginList(env.CORS_ORIGIN),
  ...splitOriginList(env.CORS_ORIGINS)
];
var developmentOrigins = isProduction ? [] : [
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://0.0.0.0:5000",
  "http://0.0.0.0:5173",
  "http://0.0.0.0:5174"
];
var allowedOrigins = new Set(
  [
    ...configuredOrigins,
    ...developmentOrigins,
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
    `http://0.0.0.0:${port}`
  ].map(normalizeOrigin).filter(Boolean)
);
var isAllowedOrigin = (origin, req) => {
  if (!origin) return true;
  const normalizedOrigin = normalizeOrigin(origin);
  const hostOrigin = normalizeOrigin(`${req.protocol}://${req.get("host")}`);
  return Boolean(
    normalizedOrigin && (normalizedOrigin === hostOrigin || allowedOrigins.has(normalizedOrigin))
  );
};
app.use((req, res, next) => {
  const origin = req.get("origin");
  const originAllowed = isAllowedOrigin(origin, req);
  if (origin && originAllowed) {
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      req.get("access-control-request-headers") || "Content-Type,Authorization,X-CSRF-Token,X-Requested-With"
    );
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  if (req.method === "OPTIONS") {
    return originAllowed ? res.sendStatus(204) : res.status(403).json({ message: "Request origin is not allowed" });
  }
  if (["GET", "HEAD"].includes(req.method)) {
    return next();
  }
  if (!origin) {
    return next();
  }
  if (originAllowed) {
    return next();
  }
  return res.status(403).json({ message: "Request origin is not allowed" });
});
app.use(
  express3.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      if (req.originalUrl === "/api/stripe/webhook") {
        req.rawBody = Buffer.from(buf);
      }
    }
  })
);
app.use(express3.urlencoded({ extended: false }));
var rateLimitWindowMs = env.RATE_LIMIT_WINDOW_MS;
var rateLimitMax = env.RATE_LIMIT_MAX;
var rateLimitStore = /* @__PURE__ */ new Map();
var pruneRateLimitStore = () => {
  const now = Date.now();
  if (rateLimitStore.size < 1e3) return;
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
};
app.use((req, res, next) => {
  if (!req.path.startsWith("/api") && !req.path.startsWith("/auth")) {
    return next();
  }
  pruneRateLimitStore();
  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const scope = req.path.startsWith("/auth") ? "auth" : "api";
  const key = `${ip}:${scope}`;
  const entry = rateLimitStore.get(key);
  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + rateLimitWindowMs });
    return next();
  }
  entry.count += 1;
  if (entry.count > rateLimitMax) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1e3);
    res.setHeader("Retry-After", retryAfter.toString());
    return res.status(429).json({ message: "Too many requests. Please try again shortly." });
  }
  return next();
});
app.use((req, res, next) => {
  const startTime = Date.now();
  const requestPath = req.path;
  const requestId = randomUUID3();
  res.setHeader("X-Request-Id", requestId);
  let responseBody;
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    responseBody = body;
    return originalJson(body);
  };
  res.on("finish", () => {
    if (!requestPath.startsWith("/api")) {
      return;
    }
    const duration = Date.now() - startTime;
    let line = `[${requestId}] ${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`;
    if (responseBody !== void 0) {
      line += ` :: ${JSON.stringify(responseBody)}`;
    }
    if (line.length > 180) {
      line = `${line.slice(0, 177)}...`;
    }
    log(line);
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = typeof err === "object" && err !== null && "status" in err ? Number(err.status) || 500 : typeof err === "object" && err !== null && "statusCode" in err ? Number(err.statusCode) || 500 : 500;
    const message = typeof err === "object" && err !== null && "message" in err ? String(err.message || "Internal Server Error") : "Internal Server Error";
    if (!isProduction) {
      console.error(err);
    }
    res.status(status).json({ message });
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    const clientDistPath = path6.resolve(import.meta.dirname, "..", "dist", "client");
    const adminDistPath = path6.resolve(import.meta.dirname, "..", "dist", "admin");
    if (fs5.existsSync(adminDistPath)) {
      app.use("/admin", express3.static(adminDistPath));
      app.get("/admin/*", (_req, res) => {
        res.sendFile(path6.join(adminDistPath, "index.html"));
      });
    }
    app.use(express3.static(clientDistPath));
    app.get("*", (_req, res) => {
      res.sendFile(path6.join(clientDistPath, "index.html"));
    });
  }
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      log(`Port ${port} is already in use. Stop the other process or set PORT to a free value.`);
      process.exit(1);
    }
    throw error;
  });
  server.listen(port, "0.0.0.0", () => {
    log(`Server listening on port ${port}`);
  });
})();
