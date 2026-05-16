var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import fs4 from "fs";
import path5 from "path";
import { randomUUID } from "crypto";

// server/env.ts
import "dotenv/config";
import { z } from "zod";
var envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5e3),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(6e4),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120)
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
  insertAnalyticsSchema: () => insertAnalyticsSchema,
  insertApplicationSchema: () => insertApplicationSchema,
  insertBlogCommentSchema: () => insertBlogCommentSchema,
  insertBlogPostSchema: () => insertBlogPostSchema,
  insertJobSchema: () => insertJobSchema,
  insertMessageSchema: () => insertMessageSchema,
  insertPartnerSchema: () => insertPartnerSchema,
  insertReferralSchema: () => insertReferralSchema,
  insertSavedItemSchema: () => insertSavedItemSchema,
  insertScholarshipSchema: () => insertScholarshipSchema,
  insertTeamMemberSchema: () => insertTeamMemberSchema,
  insertTestimonialSchema: () => insertTestimonialSchema,
  insertUserSchema: () => insertUserSchema,
  jobs: () => jobs,
  jobsRelations: () => jobsRelations,
  messages: () => messages,
  partners: () => partners,
  referrals: () => referrals,
  referralsRelations: () => referralsRelations,
  savedItems: () => savedItems,
  savedItemsRelations: () => savedItemsRelations,
  scholarships: () => scholarships,
  scholarshipsRelations: () => scholarshipsRelations,
  teamMembers: () => teamMembers,
  testimonials: () => testimonials,
  testimonialsRelations: () => testimonialsRelations,
  users: () => users,
  usersRelations: () => usersRelations
});
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
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
var usersRelations = relations(users, ({ many }) => ({
  applications: many(applications),
  testimonials: many(testimonials),
  blogPosts: many(blogPosts),
  blogComments: many(blogComments),
  referrals: many(referrals),
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
var insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
  completedAt: true
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
import { eq, desc, asc, and, or, like, count, sql } from "drizzle-orm";
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
          like(scholarships.title, `%${query}%`),
          like(scholarships.description, `%${query}%`),
          like(scholarships.institution, `%${query}%`),
          like(scholarships.country, `%${query}%`)
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
          like(jobs.title, `%${query}%`),
          like(jobs.description, `%${query}%`),
          like(jobs.company, `%${query}%`),
          like(jobs.location, `%${query}%`)
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
        like(blogPosts.title, `%${query}%`),
        like(blogPosts.content, `%${query}%`),
        like(blogPosts.category, `%${query}%`)
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
    return {
      totalUsers: totalUsers[0].count,
      totalScholarships: totalScholarships[0].count,
      totalJobs: totalJobs[0].count,
      totalApplications: totalApplications[0].count,
      activeTestimonials: activeTestimonials[0].count,
      publishedBlogPosts: publishedBlogPosts[0].count
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
};
var storage = new DatabaseStorage();

// server/routes.ts
import bcrypt from "bcryptjs";
import fs2 from "fs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path2 from "path";
import { z as z2 } from "zod";

// server/ai.ts
import OpenAI from "openai";
var apiKey = process.env.OPENAI_API_KEY ?? process.env.API_KEY;
var model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
var openai = apiKey ? new OpenAI({ apiKey }) : null;
async function getChatResponse(message) {
  if (!openai) {
    return "AI chat is not configured yet. Please contact our team directly and set OPENAI_API_KEY to enable assistant responses.";
  }
  try {
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
          
          Our partners include GBS (Global Business School), Chandigarh University, and other international institutions.
          
          Be professional, helpful, and encouraging. Provide specific, actionable advice when possible.
          If you don't know something specific about our services, direct users to contact our team directly.`
        },
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
    return "I'm currently experiencing technical difficulties. Please try again later or contact our support team for immediate assistance.";
  }
}

// server/admin-state.ts
import fs from "fs";
import path from "path";
var nowIso = () => (/* @__PURE__ */ new Date()).toISOString();
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
      "manage_scholarships",
      "manage_jobs",
      "manage_partners",
      "manage_blog",
      "manage_team"
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
      "manage_scholarships",
      "manage_jobs",
      "manage_partners",
      "manage_blog",
      "manage_team",
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
      "manage_scholarships",
      "manage_jobs",
      "manage_partners",
      "manage_blog",
      "manage_team",
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
var createDefaultState = () => ({
  users: {},
  scholarships: {},
  jobs: {},
  partners: {},
  blogPosts: {},
  teamMembers: {},
  roles: DEFAULT_ROLES,
  settings: {
    platformName: "Mtendere Education Platform",
    supportEmail: "support@mtendere.com",
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    updatedAt: nowIso()
  },
  readNotificationIds: []
});
var stateFilePath = path.resolve(
  import.meta.dirname,
  "..",
  "data",
  "admin-state.json"
);
var ensureStateDirectory = () => {
  fs.mkdirSync(path.dirname(stateFilePath), { recursive: true });
};
var loadState = () => {
  ensureStateDirectory();
  if (!fs.existsSync(stateFilePath)) {
    const initialState = createDefaultState();
    fs.writeFileSync(stateFilePath, JSON.stringify(initialState, null, 2), "utf-8");
    return initialState;
  }
  try {
    const raw = fs.readFileSync(stateFilePath, "utf-8");
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
      roles: parsed.roles?.length ? parsed.roles : DEFAULT_ROLES,
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
var saveState = () => {
  ensureStateDirectory();
  fs.writeFileSync(stateFilePath, JSON.stringify(cachedState, null, 2), "utf-8");
};
var updateCollectionItem = (collection, id, value) => {
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
  const nextCollection = { ...cachedState[collection] };
  delete nextCollection[String(id)];
  cachedState = {
    ...cachedState,
    [collection]: nextCollection
  };
  saveState();
};
var getUserMeta = (id) => cachedState.users[String(id)] ?? {};
var setUserMeta = (id, value) => updateCollectionItem("users", id, value);
var deleteUserMeta = (id) => deleteCollectionItem("users", id);
var getScholarshipMeta = (id) => cachedState.scholarships[String(id)] ?? {};
var setScholarshipMeta = (id, value) => updateCollectionItem("scholarships", id, value);
var deleteScholarshipMeta = (id) => deleteCollectionItem("scholarships", id);
var getJobMeta = (id) => cachedState.jobs[String(id)] ?? {};
var setJobMeta = (id, value) => updateCollectionItem("jobs", id, value);
var deleteJobMeta = (id) => deleteCollectionItem("jobs", id);
var getPartnerMeta = (id) => cachedState.partners[String(id)] ?? {};
var setPartnerMeta = (id, value) => updateCollectionItem("partners", id, value);
var deletePartnerMeta = (id) => deleteCollectionItem("partners", id);
var getBlogMeta = (id) => cachedState.blogPosts[String(id)] ?? {};
var setBlogMeta = (id, value) => updateCollectionItem("blogPosts", id, value);
var deleteBlogMeta = (id) => deleteCollectionItem("blogPosts", id);
var getTeamMeta = (id) => cachedState.teamMembers[String(id)] ?? {};
var setTeamMeta = (id, value) => updateCollectionItem("teamMembers", id, value);
var deleteTeamMeta = (id) => deleteCollectionItem("teamMembers", id);
var getAdminRoles = () => [...cachedState.roles];
var upsertAdminRole = (role) => {
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
  cachedState = {
    ...cachedState,
    roles: cachedState.roles.filter((role) => role.id !== id)
  };
  saveState();
};
var getAdminSettings = () => ({ ...cachedState.settings });
var updateAdminSettings = (updates) => {
  cachedState = {
    ...cachedState,
    settings: {
      ...cachedState.settings,
      ...updates,
      updatedAt: nowIso()
    }
  };
  saveState();
  return cachedState.settings;
};
var isNotificationRead = (id) => cachedState.readNotificationIds.includes(id);
var markNotificationRead = (id) => {
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
  const uniqueIds = Array.from(/* @__PURE__ */ new Set([...cachedState.readNotificationIds, ...ids]));
  cachedState = {
    ...cachedState,
    readNotificationIds: uniqueIds
  };
  saveState();
};

// server/routes.ts
var JWT_SECRET = env.JWT_SECRET;
var getErrorMessage = (error) => {
  if (error instanceof z2.ZodError) {
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
  dateOfBirth: user.dateOfBirth
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
var signToken = (user) => jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
  expiresIn: "24h"
});
var getAuthenticatedUser = (req) => req.user;
var getOptionalAuthenticatedUser = (req) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!token) {
    return null;
  }
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};
var isAdmin = (user) => user?.role === "admin" || user?.role === "super_admin";
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
    req.user = user;
    next();
  });
};
var requireAdmin = (req, res, next) => {
  if (!isAdmin(getAuthenticatedUser(req))) {
    return res.status(403).json({ message: "Admin access required" });
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
  const uploadsDir = path2.resolve(import.meta.dirname, "..", "uploads");
  fs2.mkdirSync(uploadsDir, { recursive: true });
  app2.use("/uploads", express.static(uploadsDir));
  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadsDir,
      filename: (_req, file, cb) => {
        const ext = path2.extname(file.originalname);
        const base = path2.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, "");
        cb(null, `${base}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
      }
    }),
    limits: { fileSize: 10 * 1024 * 1024 }
  });
  app2.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  const registerHandler = async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(userData.email) || await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "A user with that email or username already exists" });
      }
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      await storage.logAnalytics({
        event: "user_registered",
        userId: user.id,
        metadata: { email: user.email, role: user.role },
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      });
      broadcast("user_activity", { type: "user_registered", user: buildPublicUser(user) });
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
      const user = looksLikeEmail ? await storage.getUserByEmail(normalizedIdentifier) : await storage.getUserByUsername(normalizedIdentifier);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      await storage.logAnalytics({
        event: "user_logged_in",
        userId: user.id,
        metadata: { email: user.email },
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      });
      broadcast("user_activity", { type: "user_logged_in", user: buildPublicUser(user) });
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
  app2.post("/auth/logout", (_req, res) => {
    res.json({ message: "Logged out successfully" });
  });
  app2.post("/auth/refresh", (_req, res) => {
    res.status(401).json({ message: "Refresh token not available" });
  });
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
      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ message: "Search query is required" });
      }
      const scholarships2 = await storage.searchScholarships(q);
      res.json(scholarships2);
    } catch (error) {
      console.error("Scholarship search error:", error);
      res.status(500).json({ message: "Failed to search scholarships" });
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
      res.json(jobs2);
    } catch (error) {
      console.error("Jobs fetch error:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });
  app2.get("/api/jobs/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ message: "Search query is required" });
      }
      const jobs2 = await storage.searchJobs(q);
      res.json(jobs2);
    } catch (error) {
      console.error("Job search error:", error);
      res.status(500).json({ message: "Failed to search jobs" });
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
  app2.post("/api/applications", authenticateToken, async (req, res) => {
    try {
      const authUser = getAuthenticatedUser(req);
      const applicationData = insertApplicationSchema.parse({
        ...req.body,
        userId: authUser.id
      });
      const application = await storage.createApplication(applicationData);
      broadcast("applications", { type: "application_created", application });
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
      res.json(partners2);
    } catch (error) {
      console.error("Partners fetch error:", error);
      res.status(500).json({ message: "Failed to fetch partners" });
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
      const testimonialData = insertTestimonialSchema.parse({
        ...req.body,
        userId: getAuthenticatedUser(req).id
      });
      const testimonial = await storage.createTestimonial(testimonialData);
      broadcast("testimonials", { type: "testimonial_created", testimonial });
      res.status(201).json(testimonial);
    } catch (error) {
      console.error("Testimonial creation error:", error);
      res.status(400).json({ message: "Failed to create testimonial", error: getErrorMessage(error) });
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
      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ message: "Search query is required" });
      }
      const blogPosts2 = await storage.searchBlogPosts(q);
      res.json(blogPosts2);
    } catch (error) {
      console.error("Blog search error:", error);
      res.status(500).json({ message: "Failed to search blog posts" });
    }
  });
  app2.get("/api/blog-posts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.getBlogPost(id);
      if (!post) {
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
  app2.get("/api/referrals", authenticateToken, async (req, res) => {
    try {
      const referrals2 = await storage.getUserReferrals(getAuthenticatedUser(req).id);
      res.json(referrals2);
    } catch (error) {
      console.error("Referrals fetch error:", error);
      res.status(500).json({ message: "Failed to fetch referrals" });
    }
  });
  app2.post("/api/referrals", authenticateToken, async (req, res) => {
    try {
      const referralData = insertReferralSchema.parse({
        ...req.body,
        referrerId: getAuthenticatedUser(req).id
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
  const paginate = (items, page, limit) => {
    const total = items.length;
    const start = (page - 1) * limit;
    return { items: items.slice(start, start + limit), total };
  };
  app2.get("/api/admin/dashboard/stats", authenticateToken, requireEditor, async (_req, res) => {
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
        totalActiveChats: 0,
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
  app2.get("/api/admin/dashboard/recent-activity", authenticateToken, requireEditor, async (_req, res) => {
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
      const search = String(req.query.search ?? "").toLowerCase();
      const allUsers = await storage.getAllUsers();
      const filtered = search ? allUsers.filter(
        (user) => user.username.toLowerCase().includes(search) || user.email.toLowerCase().includes(search)
      ) : allUsers;
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
      const userData = insertUserSchema.parse(req.body);
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
      const updateData = insertUserSchema.partial().parse(req.body);
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
      const search = String(req.query.search ?? "").toLowerCase();
      const statusFilter = String(req.query.status ?? "").toLowerCase();
      const allScholarships = await storage.getAllScholarships();
      const mapped = allScholarships.map(toAdminScholarship);
      const filtered = mapped.filter((item) => {
        const matchesSearch = !search || item.title.toLowerCase().includes(search) || item.description.toLowerCase().includes(search) || item.institution.toLowerCase().includes(search);
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
  app2.post("/api/admin/scholarships", authenticateToken, requireEditor, async (req, res) => {
    try {
      const createdBy = getAuthenticatedUser(req).id;
      const amount = parseNumber(req.body.amount);
      const deadline = req.body.deadline ? new Date(req.body.deadline) : /* @__PURE__ */ new Date();
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
        createdBy
      });
      const scholarship = await storage.createScholarship(scholarshipData);
      setScholarshipMeta(scholarship.id, {
        eligibility: req.body.eligibility ?? "",
        status: normalizeAdminStatus(req.body.status, scholarship.isActive),
        isPremium: Boolean(req.body.isPremium),
        paymentStatus: req.body.paymentStatus ?? "unpaid",
        featuredImage: req.body.featuredImage ?? "",
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
      if (req.body.featuredImage !== void 0) payload.imageUrl = req.body.featuredImage;
      if (req.body.status !== void 0) payload.isActive = req.body.status === "published";
      const updateData = insertScholarshipSchema.partial().parse(payload);
      const scholarship = await storage.updateScholarship(id, updateData);
      if (!scholarship) return res.status(404).json({ message: "Scholarship not found" });
      setScholarshipMeta(id, {
        eligibility: req.body.eligibility,
        status: req.body.status,
        isPremium: parseOptionalBoolean(req.body.isPremium),
        paymentStatus: req.body.paymentStatus,
        featuredImage: req.body.featuredImage,
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
      const search = String(req.query.search ?? "").toLowerCase();
      const statusFilter = String(req.query.status ?? "").toLowerCase();
      const allJobs = await storage.getAllJobs();
      const mapped = allJobs.map(toAdminJob);
      const filtered = mapped.filter((item) => {
        const matchesSearch = !search || item.title.toLowerCase().includes(search) || item.company.toLowerCase().includes(search);
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
  app2.post("/api/admin/jobs", authenticateToken, requireEditor, async (req, res) => {
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
        featuredImage: req.body.featuredImage ?? "",
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
      if (req.body.featuredImage !== void 0) payload.imageUrl = req.body.featuredImage;
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
        featuredImage: req.body.featuredImage,
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
  app2.post("/api/admin/partners", authenticateToken, requireEditor, async (req, res) => {
    try {
      const partnerData = insertPartnerSchema.parse({
        name: req.body.name ?? "",
        description: req.body.description ?? "",
        logoUrl: req.body.logo ?? null,
        website: req.body.website ?? null,
        country: req.body.region ?? "Global",
        studentCount: req.body.studentCount ?? null,
        ranking: req.body.ranking ?? null,
        isActive: req.body.isActive ?? true
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
      if (req.body.logo !== void 0) payload.logoUrl = req.body.logo;
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
        logo: req.body.logo,
        contactEmail: req.body.contactEmail,
        contactPhone: req.body.contactPhone,
        address: req.body.address,
        region: req.body.region,
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
      const search = String(req.query.search ?? "").toLowerCase();
      const statusFilter = String(req.query.status ?? "").toLowerCase();
      const allPosts = await storage.getAllBlogPosts();
      const mapped = allPosts.map(toAdminBlogPost);
      const filtered = mapped.filter((item) => {
        const matchesSearch = !search || item.title.toLowerCase().includes(search) || item.content.toLowerCase().includes(search);
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
  app2.post("/api/admin/blog", authenticateToken, requireEditor, async (req, res) => {
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
        authorId
      });
      const post = await storage.createBlogPost(postData);
      setBlogMeta(post.id, {
        slug: req.body.slug ?? `post-${post.id}`,
        status: normalizeAdminStatus(req.body.status, post.isPublished),
        featuredImage: req.body.featuredImage ?? ""
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
      if (req.body.featuredImage !== void 0) payload.imageUrl = req.body.featuredImage;
      if (req.body.category !== void 0) payload.category = req.body.category;
      if (req.body.tags !== void 0) payload.tags = parseStringArray(req.body.tags) ?? [];
      if (req.body.status !== void 0) payload.isPublished = req.body.status === "published";
      const updateData = insertBlogPostSchema.partial().parse(payload);
      const post = await storage.updateBlogPost(id, updateData);
      if (!post) return res.status(404).json({ message: "Blog post not found" });
      setBlogMeta(id, {
        slug: req.body.slug,
        status: req.body.status,
        featuredImage: req.body.featuredImage
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
  app2.post("/api/admin/team", authenticateToken, requireEditor, async (req, res) => {
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
        isActive: req.body.isActive ?? true
      });
      const member = await storage.createTeamMember(memberData);
      setTeamMeta(member.id, {
        department: req.body.department ?? "",
        profileImage: req.body.profileImage ?? ""
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
      if (req.body.profileImage !== void 0) payload.imageUrl = req.body.profileImage;
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
        profileImage: req.body.profileImage
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
  app2.get("/api/admin/applications", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 50);
      const search = String(req.query.search ?? "").toLowerCase();
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
      const searched = search ? enriched.filter(
        (app3) => app3.applicantName.toLowerCase().includes(search) || app3.applicantEmail.toLowerCase().includes(search) || app3.opportunityTitle.toLowerCase().includes(search) || app3.opportunityType.toLowerCase().includes(search)
      ) : enriched;
      const { items, total } = paginate(searched, page, limit);
      res.json({ applications: items, total });
    } catch (error) {
      console.error("Admin applications error:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });
  app2.put("/api/admin/applications/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const updateData = insertApplicationSchema.partial().parse({
        status: req.body.status,
        notes: req.body.reviewNotes
      });
      const application = await storage.updateApplication(id, updateData);
      await emitAdminRealtimeEvent(req, {
        event: "application_updated",
        channel: "applications",
        entityType: "application",
        referenceId: id,
        payload: { application: { ...application, id: String(application.id) } }
      });
      res.json(application);
    } catch (error) {
      console.error("Admin applications update error:", error);
      res.status(400).json({ message: "Failed to update application", error: getErrorMessage(error) });
    }
  });
  app2.get("/api/admin/ai-chat/conversations", authenticateToken, requireAdmin, (_req, res) => {
    res.json({ conversations: [], total: 0 });
  });
  app2.get("/api/admin/ai-chat/conversations/:id", authenticateToken, requireAdmin, (_req, res) => {
    res.status(404).json({ message: "Conversation not found" });
  });
  app2.get("/api/admin/ai/conversations", authenticateToken, requireAdmin, (req, res) => {
    res.redirect(307, "/api/admin/ai-chat/conversations");
  });
  app2.post("/api/admin/ai/chat", authenticateToken, requireAdmin, async (req, res) => {
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
  app2.get("/api/admin/roles", authenticateToken, requireAdmin, (req, res) => {
    const search = String(req.query.search ?? "").toLowerCase();
    const roles = getAdminRoles().filter((role) => {
      if (!search) return true;
      return role.name.toLowerCase().includes(search) || role.description.toLowerCase().includes(search);
    });
    res.json({ roles, total: roles.length });
  });
  app2.post("/api/admin/roles", authenticateToken, requireAdmin, async (req, res) => {
    const role = upsertAdminRole({
      id: req.body.name?.toLowerCase().replace(/\s+/g, "-") || String(Date.now()),
      name: req.body.name ?? "Role",
      description: req.body.description ?? "",
      permissions: Array.isArray(req.body.permissions) ? req.body.permissions : [],
      isActive: true
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
  app2.put("/api/admin/roles/:id", authenticateToken, requireAdmin, async (req, res) => {
    const role = upsertAdminRole({
      id: req.params.id,
      name: req.body.name ?? req.params.id,
      description: req.body.description ?? "",
      permissions: Array.isArray(req.body.permissions) ? req.body.permissions : [],
      isActive: req.body.isActive ?? true
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
  app2.delete("/api/admin/roles/:id", authenticateToken, requireAdmin, async (req, res) => {
    deleteAdminRole(req.params.id);
    await emitAdminRealtimeEvent(req, {
      event: "role_deleted",
      channel: "admin-roles",
      entityType: "role",
      referenceId: req.params.id,
      payload: { id: req.params.id }
    });
    res.status(204).send();
  });
  app2.get("/api/admin/settings", authenticateToken, requireAdmin, (_req, res) => {
    res.json(getAdminSettings());
  });
  app2.put("/api/admin/settings", authenticateToken, requireAdmin, async (req, res) => {
    const settings = updateAdminSettings({
      platformName: req.body.platformName,
      supportEmail: req.body.supportEmail,
      sessionTimeout: req.body.sessionTimeout,
      maxLoginAttempts: req.body.maxLoginAttempts
    });
    await emitAdminRealtimeEvent(req, {
      event: "settings_updated",
      channel: "admin-settings",
      entityType: "settings",
      payload: { settings }
    });
    res.json(settings);
  });
  app2.get("/api/admin/notifications", authenticateToken, requireEditor, async (req, res) => {
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
  app2.put("/api/admin/notifications/:id/read", authenticateToken, requireEditor, (req, res) => {
    markNotificationRead(req.params.id);
    res.status(204).send();
  });
  app2.put("/api/admin/notifications/read-all", authenticateToken, requireEditor, async (_req, res) => {
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
  app2.post("/api/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
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
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }
      const response = await getChatResponse(message);
      res.json({ response });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ message: "Failed to get chat response", error: getErrorMessage(error) });
    }
  });
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs3 from "fs";
import path4 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path3 from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path3.dirname(__filename);
var vite_config_default = defineConfig({
  root: path3.resolve(__dirname, "client"),
  plugins: [react()],
  resolve: {
    alias: {
      "@": path3.resolve(__dirname, "client/src"),
      "@assets": path3.resolve(__dirname, "client/src/assets"),
      "@shared": path3.resolve(__dirname, "shared")
    }
  },
  build: {
    outDir: path3.resolve(__dirname, "dist/client"),
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
      const clientTemplate = path4.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs3.promises.readFile(clientTemplate, "utf-8");
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
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"]
      }
    }
  })
);
app.set("trust proxy", true);
app.use(express3.json({ limit: "1mb" }));
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
  const requestId = randomUUID();
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
    const clientDistPath = path5.resolve(import.meta.dirname, "..", "dist", "client");
    const adminDistPath = path5.resolve(import.meta.dirname, "..", "dist", "admin");
    if (fs4.existsSync(adminDistPath)) {
      app.use("/admin", express3.static(adminDistPath));
      app.get("/admin/*", (_req, res) => {
        res.sendFile(path5.join(adminDistPath, "index.html"));
      });
    }
    app.use(express3.static(clientDistPath));
    app.get("*", (_req, res) => {
      res.sendFile(path5.join(clientDistPath, "index.html"));
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
