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
import { relations } from "drizzle-orm";
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
  website: text("website"),
  country: text("country"),
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
    agenda: jsonb("agenda").$type<Array<Record<string, unknown>> | null>(),
    speakers: jsonb("speakers").$type<Array<Record<string, unknown>> | null>(),
    sponsors: jsonb("sponsors").$type<Array<Record<string, unknown>> | null>(),
    faqs: jsonb("faqs").$type<Array<Record<string, unknown>> | null>(),
    resources: jsonb("resources").$type<Array<Record<string, unknown>> | null>(),
    gallery: jsonb("gallery").$type<Array<Record<string, unknown>> | null>(),
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
    status: varchar("status", { length: 40 }).notNull().default("pending"),
    ticketCode: varchar("ticket_code", { length: 80 }).notNull().unique(),
    attendanceStatus: varchar("attendance_status", { length: 40 }).notNull().default("registered"),
    answers: jsonb("answers").$type<Record<string, unknown> | null>(),
    reminderOptIn: boolean("reminder_opt_in").default(true),
    checkedInAt: timestamp("checked_in_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    eventIdx: index("event_registrations_event_idx").on(table.eventId),
    emailIdx: index("event_registrations_email_idx").on(table.email),
    statusIdx: index("event_registrations_status_idx").on(table.status),
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
  metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  paidAt: timestamp("paid_at"),
  refundedAt: timestamp("refunded_at"),
  createdAt: timestamp("created_at").defaultNow(),
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
  processedAt: timestamp("processed_at"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
});

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

export const savedItems = pgTable("saved_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  referenceId: integer("reference_id").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

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

export const applicationsRelations = relations(applications, ({ one }) => ({
  user: one(users, {
    fields: [applications.userId],
    references: [users.id],
  }),
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
  comments: many(eventComments),
  reactions: many(eventReactions),
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

export const savedItemsRelations = relations(savedItems, ({ one }) => ({
  user: one(users, {
    fields: [savedItems.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
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

export const insertSavedItemSchema = createInsertSchema(savedItems).omit({
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
export type EventComment = typeof eventComments.$inferSelect;
export type InsertEventComment = z.infer<typeof insertEventCommentSchema>;
export type EventReaction = typeof eventReactions.$inferSelect;
export type InsertEventReaction = z.infer<typeof insertEventReactionSchema>;
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
export type PayoutRequest = typeof payoutRequests.$inferSelect;
export type InsertPayoutRequest = z.infer<typeof insertPayoutRequestSchema>;
export type FraudSignal = typeof fraudSignals.$inferSelect;
export type InsertFraudSignal = z.infer<typeof insertFraudSignalSchema>;
export type ReferralDispute = typeof referralDisputes.$inferSelect;
export type InsertReferralDispute = z.infer<typeof insertReferralDisputeSchema>;
export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;
export type SavedItem = typeof savedItems.$inferSelect;
export type InsertSavedItem = z.infer<typeof insertSavedItemSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Subscriber = typeof subscribers.$inferSelect;
export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;
