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
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
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
  mfaEnabled: boolean("mfa_enabled").default(false).notNull(),
  totpSecret: text("totp_secret"),
  mfaConfirmedAt: timestamp("mfa_confirmed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const scholarships = pgTable("scholarships", {
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
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const jobs = pgTable("jobs", {
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
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  referenceId: integer("reference_id").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  documents: jsonb("documents"),
  notes: text("notes"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  logoUrl: text("logo_url"),
  coverImage: text("cover_image"),
  website: text("website"),
  contactName: text("contact_name"),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 40 }),
  socialLinks: jsonb("social_links").$type<Record<string, string> | null>(),
  industryCategory: varchar("industry_category", { length: 120 }),
  partnershipLevel: varchar("partnership_level", { length: 120 }),
  sponsorshipTier: varchar("sponsorship_tier", { length: 120 }),
  status: varchar("status", { length: 40 }).default("active"),
  country: text("country"),
  region: text("region"),
  address: text("address"),
  documents: jsonb("documents").$type<Array<Record<string, unknown>> | null>(),
  agreements: jsonb("agreements").$type<Array<Record<string, unknown>> | null>(),
  notes: text("notes"),
  internalComments: text("internal_comments"),
  linkedEvents: jsonb("linked_events").$type<Array<Record<string, unknown>> | null>(),
  linkedSponsorships: jsonb("linked_sponsorships").$type<Array<Record<string, unknown>> | null>(),
  linkedOpportunities: jsonb("linked_opportunities").$type<Array<Record<string, unknown>> | null>(),
  partnershipHistory: jsonb("partnership_history").$type<Array<Record<string, unknown>> | null>(),
  studentCount: integer("student_count"),
  ranking: text("ranking"),
  programs: jsonb("programs"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  authorName: text("author_name"),
  credential: text("credential"),
  content: text("content").notNull(),
  rating: integer("rating").notNull(),
  imageUrl: text("image_url"),
  isApproved: boolean("is_approved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const blogPosts = pgTable("blog_posts", {
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
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const blogComments = pgTable("blog_comments", {
  id: serial("id").primaryKey(),
  blogPostId: integer("blog_post_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const teamMembers = pgTable("team_members", {
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
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    slug: varchar("slug", { length: 180 }).notNull().unique(),
    summary: text("summary"),
    description: text("description").notNull(),
    category: varchar("category", { length: 100 }).notNull().default("General"),
    eventType: varchar("event_type", { length: 80 }).notNull().default("Information Session"),
    organizer: text("organizer"),
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
    rsvpEnabled: boolean("rsvp_enabled").default(true),
    startAt: timestamp("start_at").notNull(),
    endAt: timestamp("end_at").notNull(),
    registrationDeadline: timestamp("registration_deadline"),
    coverImage: text("cover_image"),
    videoUrl: text("video_url"),
    tags: text("tags").array(),
    ticketTypes: jsonb("ticket_types").$type<Array<Record<string, unknown>> | null>(),
    customFields: jsonb("custom_fields").$type<Array<Record<string, unknown>> | null>(),
    agenda: jsonb("agenda").$type<Array<Record<string, unknown>> | null>(),
    speakers: jsonb("speakers").$type<Array<Record<string, unknown>> | null>(),
    sponsors: jsonb("sponsors").$type<Array<Record<string, unknown>> | null>(),
    partners: jsonb("partners").$type<Array<Record<string, unknown>> | null>(),
    faqs: jsonb("faqs").$type<Array<Record<string, unknown>> | null>(),
    resources: jsonb("resources").$type<Array<Record<string, unknown>> | null>(),
    attachments: jsonb("attachments").$type<Array<Record<string, unknown>> | null>(),
    gallery: jsonb("gallery").$type<Array<Record<string, unknown>> | null>(),
    seoMeta: jsonb("seo_meta").$type<Record<string, unknown> | null>(),
    socialMeta: jsonb("social_meta").$type<Record<string, unknown> | null>(),
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
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex("events_slug_idx").on(table.slug),
    statusIdx: index("events_status_idx").on(table.status),
    startIdx: index("events_start_at_idx").on(table.startAt),
    categoryIdx: index("events_category_idx").on(table.category),
  }),
);

export const eventRegistrations = pgTable(
  "event_registrations",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull(),
    userId: integer("user_id"),
    fullName: text("full_name").notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 40 }),
    organization: text("organization"),
    ticketType: varchar("ticket_type", { length: 120 }),
    status: varchar("status", { length: 40 }).notNull().default("pending"),
    ticketCode: varchar("ticket_code", { length: 80 }).notNull().unique(),
    attendanceStatus: varchar("attendance_status", { length: 40 }).notNull().default("registered"),
    answers: jsonb("answers").$type<Record<string, unknown> | null>(),
    reminderOptIn: boolean("reminder_opt_in").default(true),
    source: varchar("source", { length: 80 }).default("public"),
    qrPayload: jsonb("qr_payload").$type<Record<string, unknown> | null>(),
    approvalNotes: text("approval_notes"),
    checkedInAt: timestamp("checked_in_at"),
    checkedOutAt: timestamp("checked_out_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    eventIdx: index("event_registrations_event_idx").on(table.eventId),
    emailIdx: index("event_registrations_email_idx").on(table.email),
    statusIdx: index("event_registrations_status_idx").on(table.status),
  }),
);

export const eventTicketTypes = pgTable(
  "event_ticket_types",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),
    priceAmount: integer("price_amount").default(0),
    currency: varchar("currency", { length: 10 }).default("MWK"),
    capacity: integer("capacity"),
    salesStartAt: timestamp("sales_start_at"),
    salesEndAt: timestamp("sales_end_at"),
    isActive: boolean("is_active").default(true),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    eventIdx: index("event_ticket_types_event_idx").on(table.eventId),
  }),
);

export const eventMediaAssets = pgTable(
  "event_media_assets",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull(),
    assetType: varchar("asset_type", { length: 40 }).notNull().default("image"),
    url: text("url").notNull(),
    altText: text("alt_text"),
    caption: text("caption"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    sortOrder: integer("sort_order").default(0),
    isFeatured: boolean("is_featured").default(false),
    uploadedBy: integer("uploaded_by"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    eventIdx: index("event_media_assets_event_idx").on(table.eventId),
  }),
);

export const eventDocuments = pgTable(
  "event_documents",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull(),
    title: text("title").notNull(),
    documentType: varchar("document_type", { length: 80 }).default("attachment"),
    fileUrl: text("file_url").notNull(),
    version: integer("version").default(1),
    accessLevel: varchar("access_level", { length: 40 }).default("public"),
    uploadedBy: integer("uploaded_by"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    eventIdx: index("event_documents_event_idx").on(table.eventId),
  }),
);

export const eventNotificationPlans = pgTable(
  "event_notification_plans",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull(),
    channel: varchar("channel", { length: 40 }).notNull().default("email"),
    templateKey: varchar("template_key", { length: 120 }).notNull(),
    audience: varchar("audience", { length: 80 }).notNull().default("registrants"),
    scheduledFor: timestamp("scheduled_for"),
    status: varchar("status", { length: 40 }).notNull().default("draft"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    eventIdx: index("event_notification_plans_event_idx").on(table.eventId),
    statusIdx: index("event_notification_plans_status_idx").on(table.status),
  }),
);

export const eventComments = pgTable(
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
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    eventIdx: index("event_comments_event_idx").on(table.eventId),
    statusIdx: index("event_comments_status_idx").on(table.status),
  }),
);

export const eventReactions = pgTable(
  "event_reactions",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull(),
    userId: integer("user_id"),
    visitorId: varchar("visitor_id", { length: 120 }),
    reaction: varchar("reaction", { length: 40 }).notNull().default("like"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    eventIdx: index("event_reactions_event_idx").on(table.eventId),
  }),
);

export const partnerActivities = pgTable(
  "partner_activities",
  {
    id: serial("id").primaryKey(),
    partnerId: integer("partner_id").notNull(),
    activityType: varchar("activity_type", { length: 80 }).notNull().default("note"),
    subject: text("subject").notNull(),
    notes: text("notes"),
    outcome: text("outcome"),
    dueAt: timestamp("due_at"),
    completedAt: timestamp("completed_at"),
    ownerId: integer("owner_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    partnerIdx: index("partner_activities_partner_idx").on(table.partnerId),
    dueIdx: index("partner_activities_due_idx").on(table.dueAt),
  }),
);

export const partnerDocuments = pgTable(
  "partner_documents",
  {
    id: serial("id").primaryKey(),
    partnerId: integer("partner_id").notNull(),
    title: text("title").notNull(),
    documentType: varchar("document_type", { length: 80 }).default("agreement"),
    fileUrl: text("file_url").notNull(),
    version: integer("version").default(1),
    accessLevel: varchar("access_level", { length: 40 }).default("admin"),
    expiresAt: timestamp("expires_at"),
    uploadedBy: integer("uploaded_by"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    partnerIdx: index("partner_documents_partner_idx").on(table.partnerId),
    expiresIdx: index("partner_documents_expires_idx").on(table.expiresAt),
  }),
);

export const sponsorships = pgTable(
  "sponsorships",
  {
    id: serial("id").primaryKey(),
    partnerId: integer("partner_id").notNull(),
    eventId: integer("event_id"),
    title: text("title").notNull(),
    tier: varchar("tier", { length: 120 }),
    amount: integer("amount").default(0),
    currency: varchar("currency", { length: 10 }).default("MWK"),
    contributionType: varchar("contribution_type", { length: 80 }).default("financial"),
    status: varchar("status", { length: 40 }).default("prospect"),
    startsAt: timestamp("starts_at"),
    endsAt: timestamp("ends_at"),
    benefits: jsonb("benefits").$type<Array<Record<string, unknown>> | null>(),
    metrics: jsonb("metrics").$type<Record<string, unknown> | null>(),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    partnerIdx: index("sponsorships_partner_idx").on(table.partnerId),
    eventIdx: index("sponsorships_event_idx").on(table.eventId),
    statusIdx: index("sponsorships_status_idx").on(table.status),
  }),
);

export const partnerOpportunities = pgTable(
  "partner_opportunities",
  {
    id: serial("id").primaryKey(),
    partnerId: integer("partner_id").notNull(),
    title: text("title").notNull(),
    opportunityType: varchar("opportunity_type", { length: 80 }).default("collaboration"),
    stage: varchar("stage", { length: 80 }).default("discovery"),
    valueAmount: integer("value_amount").default(0),
    currency: varchar("currency", { length: 10 }).default("MWK"),
    probability: integer("probability").default(0),
    closeDate: timestamp("close_date"),
    ownerId: integer("owner_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    partnerIdx: index("partner_opportunities_partner_idx").on(table.partnerId),
    stageIdx: index("partner_opportunities_stage_idx").on(table.stage),
  }),
);

export const partnerFinancialRecords = pgTable(
  "partner_financial_records",
  {
    id: serial("id").primaryKey(),
    partnerId: integer("partner_id").notNull(),
    sponsorshipId: integer("sponsorship_id"),
    recordType: varchar("record_type", { length: 80 }).default("contribution"),
    amount: integer("amount").notNull().default(0),
    currency: varchar("currency", { length: 10 }).default("MWK"),
    status: varchar("status", { length: 40 }).default("pledged"),
    recordedAt: timestamp("recorded_at").defaultNow(),
    notes: text("notes"),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    partnerIdx: index("partner_financial_records_partner_idx").on(table.partnerId),
    sponsorshipIdx: index("partner_financial_records_sponsorship_idx").on(table.sponsorshipId),
  }),
);

export const permissions = pgTable(
  "permissions",
  {
    id: serial("id").primaryKey(),
    role: varchar("role", { length: 80 }).notNull(),
    permission: varchar("permission", { length: 120 }).notNull(),
    resource: varchar("resource", { length: 120 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    rolePermissionIdx: uniqueIndex("permissions_role_permission_idx").on(table.role, table.permission, table.resource),
  }),
);

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id"),
    channel: varchar("channel", { length: 40 }).default("in_app"),
    title: text("title").notNull(),
    message: text("message").notNull(),
    status: varchar("status", { length: 40 }).default("unread"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at").defaultNow(),
    readAt: timestamp("read_at"),
  },
  (table) => ({
    userIdx: index("notifications_user_idx").on(table.userId),
    statusIdx: index("notifications_status_idx").on(table.status),
  }),
);

export const webhookSubscriptions = pgTable(
  "webhook_subscriptions",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    targetUrl: text("target_url").notNull(),
    eventTypes: text("event_types").array(),
    secretHash: text("secret_hash"),
    status: varchar("status", { length: 40 }).default("active"),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    statusIdx: index("webhook_subscriptions_status_idx").on(table.status),
  }),
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: serial("id").primaryKey(),
    subscriptionId: integer("subscription_id").notNull(),
    eventType: varchar("event_type", { length: 120 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    responseStatus: integer("response_status"),
    responseBody: text("response_body"),
    attempts: integer("attempts").default(0),
    status: varchar("status", { length: 40 }).default("pending"),
    nextAttemptAt: timestamp("next_attempt_at"),
    createdAt: timestamp("created_at").defaultNow(),
    deliveredAt: timestamp("delivered_at"),
  },
  (table) => ({
    subscriptionIdx: index("webhook_deliveries_subscription_idx").on(table.subscriptionId),
    statusIdx: index("webhook_deliveries_status_idx").on(table.status),
  }),
);

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull(),
  referredUserId: integer("referred_user_id"),
  referredEmail: varchar("referred_email", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  rewardAmount: integer("reward_amount").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const referralCampaigns = pgTable("referral_campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  codePrefix: varchar("code_prefix", { length: 20 }),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at"),
  status: varchar("status", { length: 30 }).notNull().default("draft"),
  boostBps: integer("boost_bps").notNull().default(10000),
  maxRewardsPerReferrer: integer("max_rewards_per_referrer"),
  attributionModel: varchar("attribution_model", { length: 30 }).notNull().default("last_click"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const referralCodes = pgTable("referral_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  campaignId: integer("campaign_id"),
  code: varchar("code", { length: 32 }).notNull().unique(),
  expiresAt: timestamp("expires_at"),
  maxUses: integer("max_uses"),
  useCount: integer("use_count").notNull().default(0),
  status: varchar("status", { length: 30 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const referralClicks = pgTable("referral_clicks", {
  id: serial("id").primaryKey(),
  referralCodeId: integer("referral_code_id"),
  campaignId: integer("campaign_id"),
  referrerId: integer("referrer_id"),
  visitorId: varchar("visitor_id", { length: 64 }).notNull(),
  ipHash: text("ip_hash"),
  userAgentHash: text("user_agent_hash"),
  deviceFingerprintHash: text("device_fingerprint_hash"),
  landingUrl: text("landing_url"),
  utm: jsonb("utm").$type<Record<string, unknown> | null>(),
  riskScore: integer("risk_score").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const referralRelationships = pgTable("referral_relationships", {
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
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  provider: varchar("provider", { length: 30 }).notNull().default("stripe"),
  paymentMethod: varchar("payment_method", { length: 80 }),
  checkoutReference: varchar("checkout_reference", { length: 120 }).unique(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
  stripeInvoiceId: text("stripe_invoice_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  amountTotal: integer("amount_total").notNull(),
  amountNet: integer("amount_net"),
  amountRefunded: integer("amount_refunded").notNull().default(0),
  currency: varchar("currency", { length: 3 }).notNull(),
  status: varchar("status", { length: 40 }).notNull(),
  providerStatus: varchar("provider_status", { length: 60 }),
  productType: varchar("product_type", { length: 60 }).notNull(),
  productName: text("product_name"),
  quantity: integer("quantity").notNull().default(1),
  metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  failureCode: varchar("failure_code", { length: 120 }),
  failureReason: text("failure_reason"),
  receiptStatus: varchar("receipt_status", { length: 30 }).notNull().default("not_required"),
  receiptLastAttemptAt: timestamp("receipt_last_attempt_at"),
  receiptQueuedAt: timestamp("receipt_queued_at"),
  receiptError: text("receipt_error"),
  paidAt: timestamp("paid_at"),
  refundedAt: timestamp("refunded_at"),
  disputedAt: timestamp("disputed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const commissionRules = pgTable("commission_rules", {
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
  createdAt: timestamp("created_at").defaultNow(),
});

export const commissions = pgTable("commissions", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").notNull(),
  referralRelationshipId: integer("referral_relationship_id").notNull(),
  beneficiaryUserId: integer("beneficiary_user_id").notNull(),
  ruleId: integer("rule_id"),
  level: integer("level").notNull(),
  grossPaymentAmount: integer("gross_payment_amount").notNull(),
  commissionAmount: integer("commission_amount").notNull(),
  reversedAmount: integer("reversed_amount").notNull().default(0),
  currency: varchar("currency", { length: 3 }).notNull(),
  status: varchar("status", { length: 40 }).notNull().default("pending_release"),
  releaseAt: timestamp("release_at").notNull(),
  releasedAt: timestamp("released_at"),
  reversedAt: timestamp("reversed_at"),
  riskScore: integer("risk_score").notNull().default(0),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const walletAccounts = pgTable("wallet_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  availableBalance: integer("available_balance").notNull().default(0),
  pendingBalance: integer("pending_balance").notNull().default(0),
  lifetimeEarned: integer("lifetime_earned").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ledgerEntries = pgTable("ledger_entries", {
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
  createdAt: timestamp("created_at").defaultNow(),
});

export const stripeEvents = pgTable("stripe_events", {
  id: serial("id").primaryKey(),
  stripeEventId: text("stripe_event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  objectId: text("object_id").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  processingStatus: varchar("processing_status", { length: 30 }).notNull().default("received"),
  attemptCount: integer("attempt_count").notNull().default(0),
  processingStartedAt: timestamp("processing_started_at"),
  lastAttemptAt: timestamp("last_attempt_at"),
  processedAt: timestamp("processed_at"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const paymentStatusEvents = pgTable(
  "payment_status_events",
  {
    id: serial("id").primaryKey(),
    paymentId: integer("payment_id").notNull().references(() => payments.id, { onDelete: "cascade" }),
    stripeEventId: text("stripe_event_id"),
    status: varchar("status", { length: 40 }).notNull(),
    providerStatus: varchar("provider_status", { length: 60 }),
    details: jsonb("details").$type<Record<string, unknown> | null>(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    paymentCreatedIdx: index("payment_status_events_payment_created_idx").on(table.paymentId, table.createdAt),
    stripeEventIdx: index("payment_status_events_stripe_event_idx").on(table.stripeEventId),
  }),
);

export const payoutRequests = pgTable("payout_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  method: varchar("method", { length: 40 }).notNull(),
  destination: jsonb("destination").$type<Record<string, unknown> | null>(),
  status: varchar("status", { length: 40 }).notNull().default("requested"),
  requestedAt: timestamp("requested_at").defaultNow(),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
  failureReason: text("failure_reason"),
});

export const fraudSignals = pgTable("fraud_signals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  referralRelationshipId: integer("referral_relationship_id"),
  paymentId: integer("payment_id"),
  signalType: varchar("signal_type", { length: 80 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  score: integer("score").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const referralDisputes = pgTable("referral_disputes", {
  id: serial("id").primaryKey(),
  referralRelationshipId: integer("referral_relationship_id"),
  openedBy: integer("opened_by").notNull(),
  assignedTo: integer("assigned_to"),
  status: varchar("status", { length: 40 }).notNull().default("open"),
  reason: text("reason").notNull(),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  event: varchar("event", { length: 100 }).notNull(),
  userId: integer("user_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const aiChatConversations = pgTable(
  "ai_chat_conversations",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    userEmail: varchar("user_email", { length: 255 }),
    accessTokenHash: varchar("access_token_hash", { length: 128 }),
    channel: varchar("channel", { length: 20 }).notNull().default("public"),
    messages: jsonb("messages").$type<Array<Record<string, unknown>>>().notNull().default([]),
    summary: text("summary"),
    isActive: boolean("is_active").notNull().default(true),
    moderationFlags: jsonb("moderation_flags").$type<string[]>().notNull().default([]),
    memory: jsonb("memory").$type<Record<string, unknown> | null>(),
    intelligence: jsonb("intelligence").$type<Record<string, unknown> | null>(),
    auditTrail: jsonb("audit_trail").$type<Array<Record<string, unknown>>>().notNull().default([]),
    requestCount: integer("request_count").notNull().default(0),
    retentionUntil: timestamp("retention_until").notNull(),
    lastMessageAt: timestamp("last_message_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userCreatedIdx: index("ai_chat_conversations_user_created_idx").on(table.userId, table.createdAt),
    statusLastMessageIdx: index("ai_chat_conversations_status_last_message_idx").on(table.isActive, table.lastMessageAt),
    retentionIdx: index("ai_chat_conversations_retention_idx").on(table.retentionUntil),
  }),
);

export const aiChatUsage = pgTable(
  "ai_chat_usage",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    conversationId: varchar("conversation_id", { length: 36 }).references(() => aiChatConversations.id, { onDelete: "set null" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    actorHash: varchar("actor_hash", { length: 128 }).notNull(),
    provider: varchar("provider", { length: 30 }).notNull(),
    model: varchar("model", { length: 120 }).notNull(),
    providerRequestId: varchar("provider_request_id", { length: 160 }),
    requestStatus: varchar("request_status", { length: 30 }).notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    latencyMs: integer("latency_ms").notNull().default(0),
    errorCode: varchar("error_code", { length: 120 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    actorCreatedIdx: index("ai_chat_usage_actor_created_idx").on(table.actorHash, table.createdAt),
    conversationCreatedIdx: index("ai_chat_usage_conversation_created_idx").on(table.conversationId, table.createdAt),
    statusCreatedIdx: index("ai_chat_usage_status_created_idx").on(table.requestStatus, table.createdAt),
  }),
);

export const aiChatResponseCache = pgTable(
  "ai_chat_response_cache",
  {
    cacheKey: varchar("cache_key", { length: 64 }).primaryKey(),
    model: varchar("model", { length: 120 }).notNull(),
    response: jsonb("response").$type<Record<string, unknown>>().notNull(),
    hitCount: integer("hit_count").notNull().default(0),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    expiryIdx: index("ai_chat_response_cache_expiry_idx").on(table.expiresAt),
  }),
);

export const savedItems = pgTable("saved_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  referenceId: integer("reference_id").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const moduleWorkflows = pgTable(
  "module_workflows",
  {
    id: serial("id").primaryKey(),
    module: varchar("module", { length: 80 }).notNull(),
    referenceId: integer("reference_id"),
    workflowType: varchar("workflow_type", { length: 80 }).notNull().default("review"),
    status: varchar("status", { length: 50 }).notNull().default("open"),
    stage: varchar("stage", { length: 120 }),
    priority: varchar("priority", { length: 30 }).default("normal"),
    assignedTo: integer("assigned_to"),
    dueAt: timestamp("due_at"),
    payload: jsonb("payload").$type<Record<string, unknown> | null>(),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    moduleIdx: index("module_workflows_module_idx").on(table.module),
    statusIdx: index("module_workflows_status_idx").on(table.status),
    referenceIdx: index("module_workflows_reference_idx").on(table.module, table.referenceId),
  }),
);

export const applicationReviews = pgTable(
  "application_reviews",
  {
    id: serial("id").primaryKey(),
    applicationId: integer("application_id").notNull(),
    reviewerId: integer("reviewer_id"),
    stage: varchar("stage", { length: 120 }).notNull().default("review"),
    status: varchar("status", { length: 50 }).notNull().default("pending"),
    score: integer("score"),
    comments: text("comments"),
    criteria: jsonb("criteria").$type<Array<Record<string, unknown>> | null>(),
    interviewAt: timestamp("interview_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    applicationIdx: index("application_reviews_application_idx").on(table.applicationId),
    reviewerIdx: index("application_reviews_reviewer_idx").on(table.reviewerId),
  }),
);

export const applicationDocuments = pgTable(
  "application_documents",
  {
    id: serial("id").primaryKey(),
    applicationId: integer("application_id").notNull(),
    documentType: varchar("document_type", { length: 120 }).notNull(),
    fileUrl: text("file_url").notNull(),
    originalName: text("original_name"),
    status: varchar("status", { length: 50 }).notNull().default("received"),
    version: integer("version").notNull().default(1),
    accessLevel: varchar("access_level", { length: 40 }).notNull().default("admin"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    uploadedBy: integer("uploaded_by"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    applicationIdx: index("application_documents_application_idx").on(table.applicationId),
    statusIdx: index("application_documents_status_idx").on(table.status),
  }),
);

export const contentRevisions = pgTable(
  "content_revisions",
  {
    id: serial("id").primaryKey(),
    module: varchar("module", { length: 80 }).notNull(),
    referenceId: integer("reference_id").notNull(),
    version: integer("version").notNull().default(1),
    title: text("title"),
    snapshot: jsonb("snapshot").$type<Record<string, unknown> | null>(),
    changeSummary: text("change_summary"),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    contentIdx: index("content_revisions_content_idx").on(table.module, table.referenceId),
  }),
);

export const scheduledReports = pgTable(
  "scheduled_reports",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    module: varchar("module", { length: 80 }).notNull(),
    cadence: varchar("cadence", { length: 40 }).notNull().default("weekly"),
    recipients: jsonb("recipients").$type<string[] | null>(),
    format: varchar("format", { length: 20 }).notNull().default("pdf"),
    filters: jsonb("filters").$type<Record<string, unknown> | null>(),
    isActive: boolean("is_active").default(true),
    nextRunAt: timestamp("next_run_at"),
    lastRunAt: timestamp("last_run_at"),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    moduleIdx: index("scheduled_reports_module_idx").on(table.module),
    nextRunIdx: index("scheduled_reports_next_run_idx").on(table.nextRunAt),
  }),
);

export const userSessions = pgTable(
  "user_sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    sessionHash: varchar("session_hash", { length: 128 }).notNull(),
    device: text("device"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    status: varchar("status", { length: 40 }).notNull().default("active"),
    lastSeenAt: timestamp("last_seen_at").defaultNow(),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userIdx: index("user_sessions_user_idx").on(table.userId),
    hashIdx: uniqueIndex("user_sessions_hash_idx").on(table.sessionHash),
  }),
);

export const permissionAuditLogs = pgTable(
  "permission_audit_logs",
  {
    id: serial("id").primaryKey(),
    actorId: integer("actor_id"),
    targetUserId: integer("target_user_id"),
    roleId: varchar("role_id", { length: 120 }),
    permission: varchar("permission", { length: 120 }),
    action: varchar("action", { length: 80 }).notNull(),
    before: jsonb("before").$type<Record<string, unknown> | null>(),
    after: jsonb("after").$type<Record<string, unknown> | null>(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    actorIdx: index("permission_audit_actor_idx").on(table.actorId),
    targetIdx: index("permission_audit_target_idx").on(table.targetUserId),
  }),
);

export const moduleAnalyticsSnapshots = pgTable(
  "module_analytics_snapshots",
  {
    id: serial("id").primaryKey(),
    module: varchar("module", { length: 80 }).notNull(),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    metrics: jsonb("metrics").$type<Record<string, unknown>>().notNull(),
    generatedBy: integer("generated_by"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    modulePeriodIdx: index("module_analytics_module_period_idx").on(table.module, table.periodStart, table.periodEnd),
  }),
);

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  subject: text("subject"),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: text("name"),
  status: varchar("status", { length: 40 }).notNull().default("pending"),
  preferences: jsonb("preferences").$type<string[] | null>(),
  source: varchar("source", { length: 80 }).default("website"),
  verificationToken: text("verification_token"),
  unsubscribeToken: text("unsubscribe_token"),
  verifiedAt: timestamp("verified_at"),
  unsubscribedAt: timestamp("unsubscribed_at"),
  lastEmailAt: timestamp("last_email_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    tokenHash: varchar("token_hash", { length: 128 }).notNull(),
    jwtId: varchar("jwt_id", { length: 80 }).notNull(),
    status: varchar("status", { length: 40 }).notNull().default("pending"),
    requestIpAddress: varchar("request_ip_address", { length: 45 }),
    requestUserAgent: text("request_user_agent"),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    replacedAt: timestamp("replaced_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex("email_verification_tokens_hash_idx").on(table.tokenHash),
    jwtIdIdx: uniqueIndex("email_verification_tokens_jti_idx").on(table.jwtId),
    userStatusIdx: index("email_verification_tokens_user_status_idx").on(table.userId, table.status),
    emailCreatedIdx: index("email_verification_tokens_email_created_idx").on(table.email, table.createdAt),
    expiryIdx: index("email_verification_tokens_expiry_idx").on(table.expiresAt),
  }),
);

export const emailJobs = pgTable(
  "email_jobs",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    category: varchar("category", { length: 100 }).notNull(),
    recipient: varchar("recipient", { length: 255 }).notNull(),
    subject: text("subject").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    status: varchar("status", { length: 40 }).notNull().default("queued"),
    priority: integer("priority").notNull().default(100),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    provider: varchar("provider", { length: 40 }),
    providerMessageId: text("provider_message_id"),
    scheduledFor: timestamp("scheduled_for").notNull().defaultNow(),
    processingAt: timestamp("processing_at"),
    sentAt: timestamp("sent_at"),
    failedAt: timestamp("failed_at"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    statusScheduleIdx: index("email_jobs_status_schedule_idx").on(table.status, table.scheduledFor),
    categoryStatusIdx: index("email_jobs_category_status_idx").on(table.category, table.status),
    recipientIdx: index("email_jobs_recipient_idx").on(table.recipient),
    providerMessageIdx: index("email_jobs_provider_message_idx").on(table.providerMessageId),
  }),
);

export const emailDeliveryEvents = pgTable(
  "email_delivery_events",
  {
    id: serial("id").primaryKey(),
    jobId: varchar("job_id", { length: 36 }),
    provider: varchar("provider", { length: 40 }),
    eventType: varchar("event_type", { length: 80 }).notNull(),
    recipient: varchar("recipient", { length: 255 }),
    category: varchar("category", { length: 100 }),
    providerMessageId: text("provider_message_id"),
    providerEventId: text("provider_event_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    jobIdx: index("email_delivery_events_job_idx").on(table.jobId),
    typeCreatedIdx: index("email_delivery_events_type_created_idx").on(table.eventType, table.createdAt),
    categoryCreatedIdx: index("email_delivery_events_category_created_idx").on(table.category, table.createdAt),
    providerMessageIdx: index("email_delivery_events_provider_message_idx").on(table.providerMessageId),
    providerEventIdx: uniqueIndex("email_delivery_events_provider_event_unique_idx")
      .on(table.provider, table.providerEventId)
      .where(sql`${table.providerEventId} IS NOT NULL`),
  }),
);

export const communicationEvents = pgTable(
  "communication_events",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    eventType: varchar("event_type", { length: 120 }).notNull(),
    source: varchar("source", { length: 40 }).notNull(),
    userId: integer("user_id"),
    priority: varchar("priority", { length: 20 }).notNull().default("medium"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: varchar("status", { length: 40 }).notNull().default("received"),
    occurredAt: timestamp("occurred_at").notNull().defaultNow(),
    processedAt: timestamp("processed_at"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    typeCreatedIdx: index("communication_events_type_created_idx").on(table.eventType, table.createdAt),
    sourceCreatedIdx: index("communication_events_source_created_idx").on(table.source, table.createdAt),
    statusCreatedIdx: index("communication_events_status_created_idx").on(table.status, table.createdAt),
    userCreatedIdx: index("communication_events_user_created_idx").on(table.userId, table.createdAt),
  }),
);

export const communicationMessages = pgTable(
  "communication_messages",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    eventId: varchar("event_id", { length: 36 }),
    eventType: varchar("event_type", { length: 120 }).notNull(),
    channel: varchar("channel", { length: 30 }).notNull(),
    templateId: varchar("template_id", { length: 120 }),
    recipient: varchar("recipient", { length: 255 }),
    subject: text("subject"),
    status: varchar("status", { length: 60 }).notNull(),
    priority: varchar("priority", { length: 20 }).notNull().default("medium"),
    provider: varchar("provider", { length: 40 }),
    providerMessageId: text("provider_message_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    diagnostics: jsonb("diagnostics").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    eventIdx: index("communication_messages_event_idx").on(table.eventId),
    eventTypeCreatedIdx: index("communication_messages_type_created_idx").on(table.eventType, table.createdAt),
    statusChannelIdx: index("communication_messages_status_channel_idx").on(table.status, table.channel),
    recipientIdx: index("communication_messages_recipient_idx").on(table.recipient),
    providerMessageIdx: index("communication_messages_provider_message_idx").on(table.providerMessageId),
  }),
);

export const communicationTemplateVersions = pgTable(
  "communication_template_versions",
  {
    id: serial("id").primaryKey(),
    templateId: varchar("template_id", { length: 120 }).notNull(),
    type: varchar("type", { length: 30 }).notNull(),
    eventTrigger: varchar("event_trigger", { length: 120 }).notNull(),
    category: varchar("category", { length: 80 }).notNull().default("system"),
    language: varchar("language", { length: 12 }).notNull().default("en"),
    version: integer("version").notNull().default(1),
    status: varchar("status", { length: 40 }).notNull().default("draft"),
    subject: text("subject"),
    title: text("title"),
    preheader: text("preheader"),
    body: text("body").notNull(),
    variables: jsonb("variables").$type<string[] | null>(),
    defaults: jsonb("defaults").$type<Record<string, string> | null>(),
    quality: jsonb("quality").$type<Record<string, unknown> | null>(),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    templateVersionIdx: uniqueIndex("communication_template_versions_template_version_idx").on(table.templateId, table.version),
    templateStatusIdx: index("communication_template_versions_template_status_idx").on(table.templateId, table.status),
    typeEventIdx: index("communication_template_versions_type_event_idx").on(table.type, table.eventTrigger),
  }),
);

export const communicationDocuments = pgTable(
  "communication_documents",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    eventId: varchar("event_id", { length: 36 }),
    eventType: varchar("event_type", { length: 120 }).notNull(),
    templateId: varchar("template_id", { length: 120 }),
    documentType: varchar("document_type", { length: 80 }).notNull(),
    referenceId: varchar("reference_id", { length: 120 }),
    recipient: varchar("recipient", { length: 255 }),
    fileName: text("file_name").notNull(),
    downloadUrl: text("download_url").notNull(),
    mimeType: varchar("mime_type", { length: 120 }).notNull().default("application/pdf"),
    status: varchar("status", { length: 40 }).notNull().default("generated"),
    expiresAt: timestamp("expires_at"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    eventIdx: index("communication_documents_event_idx").on(table.eventId),
    typeCreatedIdx: index("communication_documents_type_created_idx").on(table.documentType, table.createdAt),
    referenceIdx: index("communication_documents_reference_idx").on(table.referenceId),
    statusIdx: index("communication_documents_status_idx").on(table.status),
  }),
);

export const communicationWorkflowTasks = pgTable(
  "communication_workflow_tasks",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    workflowId: varchar("workflow_id", { length: 120 }).notNull(),
    stepId: varchar("step_id", { length: 120 }).notNull(),
    eventId: varchar("event_id", { length: 36 }),
    eventType: varchar("event_type", { length: 120 }).notNull(),
    status: varchar("status", { length: 40 }).notNull().default("pending"),
    scheduledFor: timestamp("scheduled_for").notNull(),
    executedAt: timestamp("executed_at"),
    attempts: integer("attempts").notNull().default(0),
    payload: jsonb("payload").$type<Record<string, unknown> | null>(),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    workflowIdx: index("communication_workflow_tasks_workflow_idx").on(table.workflowId),
    statusScheduleIdx: index("communication_workflow_tasks_status_schedule_idx").on(table.status, table.scheduledFor),
    eventIdx: index("communication_workflow_tasks_event_idx").on(table.eventId),
  }),
);

export const emailPreferences = pgTable(
  "email_preferences",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id"),
    email: varchar("email", { length: 255 }).notNull(),
    categories: jsonb("categories").$type<Record<string, boolean>>().notNull(),
    consentStatus: varchar("consent_status", { length: 40 }).notNull().default("pending"),
    consentSource: varchar("consent_source", { length: 120 }),
    consentAt: timestamp("consent_at"),
    unsubscribedAt: timestamp("unsubscribed_at"),
    unsubscribeTokenHash: varchar("unsubscribe_token_hash", { length: 128 }).notNull(),
    auditTrail: jsonb("audit_trail").$type<Array<Record<string, unknown>> | null>(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex("email_preferences_email_idx").on(table.email),
    tokenIdx: uniqueIndex("email_preferences_token_hash_idx").on(table.unsubscribeTokenHash),
    userIdx: index("email_preferences_user_idx").on(table.userId),
    statusIdx: index("email_preferences_status_idx").on(table.consentStatus),
  }),
);

export const emailTemplateVersions = pgTable(
  "email_template_versions",
  {
    id: serial("id").primaryKey(),
    templateKey: varchar("template_key", { length: 120 }).notNull(),
    version: integer("version").notNull().default(1),
    status: varchar("status", { length: 40 }).notNull().default("draft"),
    subject: text("subject").notNull(),
    preheader: text("preheader"),
    html: text("html").notNull(),
    textBody: text("text_body").notNull(),
    variables: jsonb("variables").$type<string[] | null>(),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    keyVersionIdx: uniqueIndex("email_template_versions_key_version_idx").on(table.templateKey, table.version),
    keyStatusIdx: index("email_template_versions_key_status_idx").on(table.templateKey, table.status),
  }),
);

export const emailCampaigns = pgTable(
  "email_campaigns",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    status: varchar("status", { length: 40 }).notNull().default("draft"),
    subject: text("subject").notNull(),
    audienceSegment: jsonb("audience_segment").$type<Record<string, unknown> | null>(),
    templateKey: varchar("template_key", { length: 120 }),
    scheduledFor: timestamp("scheduled_for"),
    sentAt: timestamp("sent_at"),
    metrics: jsonb("metrics").$type<Record<string, unknown> | null>(),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    statusScheduleIdx: index("email_campaigns_status_schedule_idx").on(table.status, table.scheduledFor),
    categoryIdx: index("email_campaigns_category_idx").on(table.category),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
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
  savedItems: many(savedItems),
  moduleWorkflows: many(moduleWorkflows),
  applicationReviews: many(applicationReviews),
  applicationDocuments: many(applicationDocuments),
  contentRevisions: many(contentRevisions),
  scheduledReports: many(scheduledReports),
  userSessions: many(userSessions),
  permissionAuditLogs: many(permissionAuditLogs),
  moduleAnalyticsSnapshots: many(moduleAnalyticsSnapshots),
}));

export const scholarshipsRelations = relations(scholarships, ({ one }) => ({
  createdBy: one(users, {
    fields: [scholarships.createdBy],
    references: [users.id],
  }),
}));

export const jobsRelations = relations(jobs, ({ one }) => ({
  createdBy: one(users, {
    fields: [jobs.createdBy],
    references: [users.id],
  }),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  user: one(users, {
    fields: [applications.userId],
    references: [users.id],
  }),
  reviews: many(applicationReviews),
  documents: many(applicationDocuments),
}));

export const testimonialsRelations = relations(testimonials, ({ one }) => ({
  user: one(users, {
    fields: [testimonials.userId],
    references: [users.id],
  }),
}));

export const blogPostsRelations = relations(blogPosts, ({ one, many }) => ({
  author: one(users, {
    fields: [blogPosts.authorId],
    references: [users.id],
  }),
  comments: many(blogComments),
}));

export const blogCommentsRelations = relations(blogComments, ({ one }) => ({
  post: one(blogPosts, {
    fields: [blogComments.blogPostId],
    references: [blogPosts.id],
  }),
  user: one(users, {
    fields: [blogComments.userId],
    references: [users.id],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  creator: one(users, {
    fields: [events.createdBy],
    references: [users.id],
  }),
  registrations: many(eventRegistrations),
  ticketTypes: many(eventTicketTypes),
  mediaAssets: many(eventMediaAssets),
  documents: many(eventDocuments),
  notificationPlans: many(eventNotificationPlans),
  comments: many(eventComments),
  reactions: many(eventReactions),
}));

export const partnersRelations = relations(partners, ({ many }) => ({
  activities: many(partnerActivities),
  documents: many(partnerDocuments),
  sponsorships: many(sponsorships),
  opportunities: many(partnerOpportunities),
  financialRecords: many(partnerFinancialRecords),
}));

export const eventRegistrationsRelations = relations(eventRegistrations, ({ one }) => ({
  event: one(events, {
    fields: [eventRegistrations.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventRegistrations.userId],
    references: [users.id],
  }),
}));

export const eventTicketTypesRelations = relations(eventTicketTypes, ({ one }) => ({
  event: one(events, {
    fields: [eventTicketTypes.eventId],
    references: [events.id],
  }),
}));

export const eventMediaAssetsRelations = relations(eventMediaAssets, ({ one }) => ({
  event: one(events, {
    fields: [eventMediaAssets.eventId],
    references: [events.id],
  }),
  uploader: one(users, {
    fields: [eventMediaAssets.uploadedBy],
    references: [users.id],
  }),
}));

export const eventDocumentsRelations = relations(eventDocuments, ({ one }) => ({
  event: one(events, {
    fields: [eventDocuments.eventId],
    references: [events.id],
  }),
  uploader: one(users, {
    fields: [eventDocuments.uploadedBy],
    references: [users.id],
  }),
}));

export const eventNotificationPlansRelations = relations(eventNotificationPlans, ({ one }) => ({
  event: one(events, {
    fields: [eventNotificationPlans.eventId],
    references: [events.id],
  }),
  creator: one(users, {
    fields: [eventNotificationPlans.createdBy],
    references: [users.id],
  }),
}));

export const eventCommentsRelations = relations(eventComments, ({ one }) => ({
  event: one(events, {
    fields: [eventComments.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventComments.userId],
    references: [users.id],
  }),
}));

export const eventReactionsRelations = relations(eventReactions, ({ one }) => ({
  event: one(events, {
    fields: [eventReactions.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventReactions.userId],
    references: [users.id],
  }),
}));

export const partnerActivitiesRelations = relations(partnerActivities, ({ one }) => ({
  partner: one(partners, {
    fields: [partnerActivities.partnerId],
    references: [partners.id],
  }),
  owner: one(users, {
    fields: [partnerActivities.ownerId],
    references: [users.id],
  }),
}));

export const partnerDocumentsRelations = relations(partnerDocuments, ({ one }) => ({
  partner: one(partners, {
    fields: [partnerDocuments.partnerId],
    references: [partners.id],
  }),
  uploader: one(users, {
    fields: [partnerDocuments.uploadedBy],
    references: [users.id],
  }),
}));

export const sponsorshipsRelations = relations(sponsorships, ({ one, many }) => ({
  partner: one(partners, {
    fields: [sponsorships.partnerId],
    references: [partners.id],
  }),
  event: one(events, {
    fields: [sponsorships.eventId],
    references: [events.id],
  }),
  financialRecords: many(partnerFinancialRecords),
}));

export const partnerOpportunitiesRelations = relations(partnerOpportunities, ({ one }) => ({
  partner: one(partners, {
    fields: [partnerOpportunities.partnerId],
    references: [partners.id],
  }),
  owner: one(users, {
    fields: [partnerOpportunities.ownerId],
    references: [users.id],
  }),
}));

export const partnerFinancialRecordsRelations = relations(partnerFinancialRecords, ({ one }) => ({
  partner: one(partners, {
    fields: [partnerFinancialRecords.partnerId],
    references: [partners.id],
  }),
  sponsorship: one(sponsorships, {
    fields: [partnerFinancialRecords.sponsorshipId],
    references: [sponsorships.id],
  }),
  creator: one(users, {
    fields: [partnerFinancialRecords.createdBy],
    references: [users.id],
  }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(users, {
    fields: [referrals.referrerId],
    references: [users.id],
  }),
  referredUser: one(users, {
    fields: [referrals.referredUserId],
    references: [users.id],
  }),
}));

export const referralCampaignsRelations = relations(referralCampaigns, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [referralCampaigns.createdBy],
    references: [users.id],
  }),
  codes: many(referralCodes),
  clicks: many(referralClicks),
  relationships: many(referralRelationships),
  commissionRules: many(commissionRules),
}));

export const referralCodesRelations = relations(referralCodes, ({ one, many }) => ({
  user: one(users, {
    fields: [referralCodes.userId],
    references: [users.id],
  }),
  campaign: one(referralCampaigns, {
    fields: [referralCodes.campaignId],
    references: [referralCampaigns.id],
  }),
  clicks: many(referralClicks),
  relationships: many(referralRelationships),
}));

export const referralClicksRelations = relations(referralClicks, ({ one }) => ({
  referralCode: one(referralCodes, {
    fields: [referralClicks.referralCodeId],
    references: [referralCodes.id],
  }),
  campaign: one(referralCampaigns, {
    fields: [referralClicks.campaignId],
    references: [referralCampaigns.id],
  }),
  referrer: one(users, {
    fields: [referralClicks.referrerId],
    references: [users.id],
  }),
}));

export const referralRelationshipsRelations = relations(referralRelationships, ({ one, many }) => ({
  referrer: one(users, {
    fields: [referralRelationships.referrerId],
    references: [users.id],
  }),
  referredUser: one(users, {
    fields: [referralRelationships.referredUserId],
    references: [users.id],
  }),
  referralCode: one(referralCodes, {
    fields: [referralRelationships.referralCodeId],
    references: [referralCodes.id],
  }),
  campaign: one(referralCampaigns, {
    fields: [referralRelationships.campaignId],
    references: [referralCampaigns.id],
  }),
  commissions: many(commissions),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  commissions: many(commissions),
  statusEvents: many(paymentStatusEvents),
}));

export const paymentStatusEventsRelations = relations(paymentStatusEvents, ({ one }) => ({
  payment: one(payments, {
    fields: [paymentStatusEvents.paymentId],
    references: [payments.id],
  }),
}));

export const commissionRulesRelations = relations(commissionRules, ({ one, many }) => ({
  campaign: one(referralCampaigns, {
    fields: [commissionRules.campaignId],
    references: [referralCampaigns.id],
  }),
  commissions: many(commissions),
}));

export const commissionsRelations = relations(commissions, ({ one, many }) => ({
  payment: one(payments, {
    fields: [commissions.paymentId],
    references: [payments.id],
  }),
  relationship: one(referralRelationships, {
    fields: [commissions.referralRelationshipId],
    references: [referralRelationships.id],
  }),
  beneficiary: one(users, {
    fields: [commissions.beneficiaryUserId],
    references: [users.id],
  }),
  rule: one(commissionRules, {
    fields: [commissions.ruleId],
    references: [commissionRules.id],
  }),
  ledgerEntries: many(ledgerEntries),
}));

export const walletAccountsRelations = relations(walletAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [walletAccounts.userId],
    references: [users.id],
  }),
  ledgerEntries: many(ledgerEntries),
}));

export const ledgerEntriesRelations = relations(ledgerEntries, ({ one }) => ({
  walletAccount: one(walletAccounts, {
    fields: [ledgerEntries.walletAccountId],
    references: [walletAccounts.id],
  }),
  user: one(users, {
    fields: [ledgerEntries.userId],
    references: [users.id],
  }),
  commission: one(commissions, {
    fields: [ledgerEntries.commissionId],
    references: [commissions.id],
  }),
}));

export const payoutRequestsRelations = relations(payoutRequests, ({ one }) => ({
  user: one(users, {
    fields: [payoutRequests.userId],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [payoutRequests.approvedBy],
    references: [users.id],
  }),
}));

export const analyticsRelations = relations(analytics, ({ one }) => ({
  user: one(users, {
    fields: [analytics.userId],
    references: [users.id],
  }),
}));

export const aiChatConversationsRelations = relations(aiChatConversations, ({ one, many }) => ({
  user: one(users, {
    fields: [aiChatConversations.userId],
    references: [users.id],
  }),
  usage: many(aiChatUsage),
}));

export const aiChatUsageRelations = relations(aiChatUsage, ({ one }) => ({
  conversation: one(aiChatConversations, {
    fields: [aiChatUsage.conversationId],
    references: [aiChatConversations.id],
  }),
  user: one(users, {
    fields: [aiChatUsage.userId],
    references: [users.id],
  }),
}));

export const savedItemsRelations = relations(savedItems, ({ one }) => ({
  user: one(users, {
    fields: [savedItems.userId],
    references: [users.id],
  }),
}));

export const moduleWorkflowsRelations = relations(moduleWorkflows, ({ one }) => ({
  assignee: one(users, {
    fields: [moduleWorkflows.assignedTo],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [moduleWorkflows.createdBy],
    references: [users.id],
  }),
}));

export const applicationReviewsRelations = relations(applicationReviews, ({ one }) => ({
  application: one(applications, {
    fields: [applicationReviews.applicationId],
    references: [applications.id],
  }),
  reviewer: one(users, {
    fields: [applicationReviews.reviewerId],
    references: [users.id],
  }),
}));

export const applicationDocumentsRelations = relations(applicationDocuments, ({ one }) => ({
  application: one(applications, {
    fields: [applicationDocuments.applicationId],
    references: [applications.id],
  }),
  uploader: one(users, {
    fields: [applicationDocuments.uploadedBy],
    references: [users.id],
  }),
}));

export const contentRevisionsRelations = relations(contentRevisions, ({ one }) => ({
  creator: one(users, {
    fields: [contentRevisions.createdBy],
    references: [users.id],
  }),
}));

export const scheduledReportsRelations = relations(scheduledReports, ({ one }) => ({
  creator: one(users, {
    fields: [scheduledReports.createdBy],
    references: [users.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const permissionAuditLogsRelations = relations(permissionAuditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [permissionAuditLogs.actorId],
    references: [users.id],
  }),
  target: one(users, {
    fields: [permissionAuditLogs.targetUserId],
    references: [users.id],
  }),
}));

export const moduleAnalyticsSnapshotsRelations = relations(moduleAnalyticsSnapshots, ({ one }) => ({
  generator: one(users, {
    fields: [moduleAnalyticsSnapshots.generatedBy],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  mfaEnabled: true,
  totpSecret: true,
  mfaConfirmedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScholarshipSchema = createInsertSchema(scholarships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  submittedAt: true,
  updatedAt: true,
});

export const insertPartnerSchema = createInsertSchema(partners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTestimonialSchema = createInsertSchema(testimonials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  likes: true,
});

export const insertBlogCommentSchema = createInsertSchema(blogComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  viewCount: true,
  shareCount: true,
  likeCount: true,
});

export const insertEventRegistrationSchema = createInsertSchema(eventRegistrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  checkedInAt: true,
  checkedOutAt: true,
});

export const insertEventTicketTypeSchema = createInsertSchema(eventTicketTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventMediaAssetSchema = createInsertSchema(eventMediaAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventDocumentSchema = createInsertSchema(eventDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventNotificationPlanSchema = createInsertSchema(eventNotificationPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventCommentSchema = createInsertSchema(eventComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reportCount: true,
});

export const insertEventReactionSchema = createInsertSchema(eventReactions).omit({
  id: true,
  createdAt: true,
});

export const insertPartnerActivitySchema = createInsertSchema(partnerActivities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPartnerDocumentSchema = createInsertSchema(partnerDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSponsorshipSchema = createInsertSchema(sponsorships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPartnerOpportunitySchema = createInsertSchema(partnerOpportunities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPartnerFinancialRecordSchema = createInsertSchema(partnerFinancialRecords).omit({
  id: true,
  createdAt: true,
});

export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

export const insertWebhookSubscriptionSchema = createInsertSchema(webhookSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWebhookDeliverySchema = createInsertSchema(webhookDeliveries).omit({
  id: true,
  createdAt: true,
  deliveredAt: true,
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertReferralCampaignSchema = createInsertSchema(referralCampaigns).omit({
  id: true,
  createdAt: true,
});

export const insertReferralCodeSchema = createInsertSchema(referralCodes).omit({
  id: true,
  createdAt: true,
});

export const insertReferralClickSchema = createInsertSchema(referralClicks).omit({
  id: true,
  createdAt: true,
});

export const insertReferralRelationshipSchema = createInsertSchema(referralRelationships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const insertCommissionRuleSchema = createInsertSchema(commissionRules).omit({
  id: true,
  createdAt: true,
});

export const insertCommissionSchema = createInsertSchema(commissions).omit({
  id: true,
  createdAt: true,
});

export const insertWalletAccountSchema = createInsertSchema(walletAccounts).omit({
  id: true,
  createdAt: true,
});

export const insertLedgerEntrySchema = createInsertSchema(ledgerEntries).omit({
  id: true,
  createdAt: true,
});

export const insertStripeEventSchema = createInsertSchema(stripeEvents).omit({
  createdAt: true,
});

export const insertPaymentStatusEventSchema = createInsertSchema(paymentStatusEvents).omit({
  id: true,
  createdAt: true,
});

export const insertPayoutRequestSchema = createInsertSchema(payoutRequests).omit({
  id: true,
  requestedAt: true,
  approvedAt: true,
  paidAt: true,
});

export const insertFraudSignalSchema = createInsertSchema(fraudSignals).omit({
  id: true,
  createdAt: true,
});

export const insertReferralDisputeSchema = createInsertSchema(referralDisputes).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export const insertAnalyticsSchema = createInsertSchema(analytics).omit({
  id: true,
  timestamp: true,
});

export const insertAiChatConversationSchema = createInsertSchema(aiChatConversations).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertAiChatUsageSchema = createInsertSchema(aiChatUsage).omit({
  createdAt: true,
});

export const insertSavedItemSchema = createInsertSchema(savedItems).omit({
  id: true,
  createdAt: true,
});

export const insertModuleWorkflowSchema = createInsertSchema(moduleWorkflows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApplicationReviewSchema = createInsertSchema(applicationReviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApplicationDocumentSchema = createInsertSchema(applicationDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContentRevisionSchema = createInsertSchema(contentRevisions).omit({
  id: true,
  createdAt: true,
});

export const insertScheduledReportSchema = createInsertSchema(scheduledReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  createdAt: true,
});

export const insertPermissionAuditLogSchema = createInsertSchema(permissionAuditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertModuleAnalyticsSnapshotSchema = createInsertSchema(moduleAnalyticsSnapshots).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

export const insertSubscriberSchema = createInsertSchema(subscribers, {
  preferences: z.array(z.string()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailVerificationTokenSchema = createInsertSchema(emailVerificationTokens).omit({
  id: true,
  createdAt: true,
});

export const insertEmailJobSchema = createInsertSchema(emailJobs).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertEmailDeliveryEventSchema = createInsertSchema(emailDeliveryEvents).omit({
  id: true,
  createdAt: true,
});

export const insertCommunicationEventSchema = createInsertSchema(communicationEvents).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertCommunicationMessageSchema = createInsertSchema(communicationMessages).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertCommunicationTemplateVersionSchema = createInsertSchema(communicationTemplateVersions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommunicationDocumentSchema = createInsertSchema(communicationDocuments).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertCommunicationWorkflowTaskSchema = createInsertSchema(communicationWorkflowTasks).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertEmailPreferenceSchema = createInsertSchema(emailPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailTemplateVersionSchema = createInsertSchema(emailTemplateVersions).omit({
  id: true,
  createdAt: true,
});

export const insertEmailCampaignSchema = createInsertSchema(emailCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Scholarship = typeof scholarships.$inferSelect;
export type InsertScholarship = z.infer<typeof insertScholarshipSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Partner = typeof partners.$inferSelect;
export type InsertPartner = z.infer<typeof insertPartnerSchema>;
export type Testimonial = typeof testimonials.$inferSelect;
export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogComment = typeof blogComments.$inferSelect;
export type InsertBlogComment = z.infer<typeof insertBlogCommentSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type EventRegistration = typeof eventRegistrations.$inferSelect;
export type InsertEventRegistration = z.infer<typeof insertEventRegistrationSchema>;
export type EventTicketType = typeof eventTicketTypes.$inferSelect;
export type InsertEventTicketType = z.infer<typeof insertEventTicketTypeSchema>;
export type EventMediaAsset = typeof eventMediaAssets.$inferSelect;
export type InsertEventMediaAsset = z.infer<typeof insertEventMediaAssetSchema>;
export type EventDocument = typeof eventDocuments.$inferSelect;
export type InsertEventDocument = z.infer<typeof insertEventDocumentSchema>;
export type EventNotificationPlan = typeof eventNotificationPlans.$inferSelect;
export type InsertEventNotificationPlan = z.infer<typeof insertEventNotificationPlanSchema>;
export type EventComment = typeof eventComments.$inferSelect;
export type InsertEventComment = z.infer<typeof insertEventCommentSchema>;
export type EventReaction = typeof eventReactions.$inferSelect;
export type InsertEventReaction = z.infer<typeof insertEventReactionSchema>;
export type PartnerActivity = typeof partnerActivities.$inferSelect;
export type InsertPartnerActivity = z.infer<typeof insertPartnerActivitySchema>;
export type PartnerDocument = typeof partnerDocuments.$inferSelect;
export type InsertPartnerDocument = z.infer<typeof insertPartnerDocumentSchema>;
export type Sponsorship = typeof sponsorships.$inferSelect;
export type InsertSponsorship = z.infer<typeof insertSponsorshipSchema>;
export type PartnerOpportunity = typeof partnerOpportunities.$inferSelect;
export type InsertPartnerOpportunity = z.infer<typeof insertPartnerOpportunitySchema>;
export type PartnerFinancialRecord = typeof partnerFinancialRecords.$inferSelect;
export type InsertPartnerFinancialRecord = z.infer<typeof insertPartnerFinancialRecordSchema>;
export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type WebhookSubscription = typeof webhookSubscriptions.$inferSelect;
export type InsertWebhookSubscription = z.infer<typeof insertWebhookSubscriptionSchema>;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type InsertWebhookDelivery = z.infer<typeof insertWebhookDeliverySchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type ReferralCampaign = typeof referralCampaigns.$inferSelect;
export type InsertReferralCampaign = z.infer<typeof insertReferralCampaignSchema>;
export type ReferralCode = typeof referralCodes.$inferSelect;
export type InsertReferralCode = z.infer<typeof insertReferralCodeSchema>;
export type ReferralClick = typeof referralClicks.$inferSelect;
export type InsertReferralClick = z.infer<typeof insertReferralClickSchema>;
export type ReferralRelationship = typeof referralRelationships.$inferSelect;
export type InsertReferralRelationship = z.infer<typeof insertReferralRelationshipSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type CommissionRule = typeof commissionRules.$inferSelect;
export type InsertCommissionRule = z.infer<typeof insertCommissionRuleSchema>;
export type Commission = typeof commissions.$inferSelect;
export type InsertCommission = z.infer<typeof insertCommissionSchema>;
export type WalletAccount = typeof walletAccounts.$inferSelect;
export type InsertWalletAccount = z.infer<typeof insertWalletAccountSchema>;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type InsertLedgerEntry = z.infer<typeof insertLedgerEntrySchema>;
export type StripeEvent = typeof stripeEvents.$inferSelect;
export type InsertStripeEvent = z.infer<typeof insertStripeEventSchema>;
export type PaymentStatusEvent = typeof paymentStatusEvents.$inferSelect;
export type InsertPaymentStatusEvent = z.infer<typeof insertPaymentStatusEventSchema>;
export type PayoutRequest = typeof payoutRequests.$inferSelect;
export type InsertPayoutRequest = z.infer<typeof insertPayoutRequestSchema>;
export type FraudSignal = typeof fraudSignals.$inferSelect;
export type InsertFraudSignal = z.infer<typeof insertFraudSignalSchema>;
export type ReferralDispute = typeof referralDisputes.$inferSelect;
export type InsertReferralDispute = z.infer<typeof insertReferralDisputeSchema>;
export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;
export type AiChatConversationRecord = typeof aiChatConversations.$inferSelect;
export type InsertAiChatConversationRecord = z.infer<typeof insertAiChatConversationSchema>;
export type AiChatUsageRecord = typeof aiChatUsage.$inferSelect;
export type InsertAiChatUsageRecord = z.infer<typeof insertAiChatUsageSchema>;
export type SavedItem = typeof savedItems.$inferSelect;
export type InsertSavedItem = z.infer<typeof insertSavedItemSchema>;
export type ModuleWorkflow = typeof moduleWorkflows.$inferSelect;
export type InsertModuleWorkflow = z.infer<typeof insertModuleWorkflowSchema>;
export type ApplicationReview = typeof applicationReviews.$inferSelect;
export type InsertApplicationReview = z.infer<typeof insertApplicationReviewSchema>;
export type ApplicationDocument = typeof applicationDocuments.$inferSelect;
export type InsertApplicationDocument = z.infer<typeof insertApplicationDocumentSchema>;
export type ContentRevision = typeof contentRevisions.$inferSelect;
export type InsertContentRevision = z.infer<typeof insertContentRevisionSchema>;
export type ScheduledReport = typeof scheduledReports.$inferSelect;
export type InsertScheduledReport = z.infer<typeof insertScheduledReportSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type PermissionAuditLog = typeof permissionAuditLogs.$inferSelect;
export type InsertPermissionAuditLog = z.infer<typeof insertPermissionAuditLogSchema>;
export type ModuleAnalyticsSnapshot = typeof moduleAnalyticsSnapshots.$inferSelect;
export type InsertModuleAnalyticsSnapshot = z.infer<typeof insertModuleAnalyticsSnapshotSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Subscriber = typeof subscribers.$inferSelect;
export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type InsertEmailVerificationToken = z.infer<typeof insertEmailVerificationTokenSchema>;
export type EmailJob = typeof emailJobs.$inferSelect;
export type InsertEmailJob = z.infer<typeof insertEmailJobSchema>;
export type EmailDeliveryEvent = typeof emailDeliveryEvents.$inferSelect;
export type InsertEmailDeliveryEvent = z.infer<typeof insertEmailDeliveryEventSchema>;
export type CommunicationEventRecord = typeof communicationEvents.$inferSelect;
export type InsertCommunicationEvent = z.infer<typeof insertCommunicationEventSchema>;
export type CommunicationMessage = typeof communicationMessages.$inferSelect;
export type InsertCommunicationMessage = z.infer<typeof insertCommunicationMessageSchema>;
export type CommunicationTemplateVersion = typeof communicationTemplateVersions.$inferSelect;
export type InsertCommunicationTemplateVersion = z.infer<typeof insertCommunicationTemplateVersionSchema>;
export type CommunicationDocument = typeof communicationDocuments.$inferSelect;
export type InsertCommunicationDocument = z.infer<typeof insertCommunicationDocumentSchema>;
export type CommunicationWorkflowTask = typeof communicationWorkflowTasks.$inferSelect;
export type InsertCommunicationWorkflowTask = z.infer<typeof insertCommunicationWorkflowTaskSchema>;
export type EmailPreference = typeof emailPreferences.$inferSelect;
export type InsertEmailPreference = z.infer<typeof insertEmailPreferenceSchema>;
export type EmailTemplateVersion = typeof emailTemplateVersions.$inferSelect;
export type InsertEmailTemplateVersion = z.infer<typeof insertEmailTemplateVersionSchema>;
export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type InsertEmailCampaign = z.infer<typeof insertEmailCampaignSchema>;
