var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import path3 from "path";
import "dotenv/config";
import session from "express-session";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  analytics: () => analytics,
  analyticsRelations: () => analyticsRelations,
  applications: () => applications,
  applicationsRelations: () => applicationsRelations,
  blogPosts: () => blogPosts,
  blogPostsRelations: () => blogPostsRelations,
  insertAnalyticsSchema: () => insertAnalyticsSchema,
  insertApplicationSchema: () => insertApplicationSchema,
  insertBlogPostSchema: () => insertBlogPostSchema,
  insertJobSchema: () => insertJobSchema,
  insertPartnerSchema: () => insertPartnerSchema,
  insertReferralSchema: () => insertReferralSchema,
  insertScholarshipSchema: () => insertScholarshipSchema,
  insertTeamMemberSchema: () => insertTeamMemberSchema,
  insertTestimonialSchema: () => insertTestimonialSchema,
  insertUserSchema: () => insertUserSchema,
  jobs: () => jobs,
  jobsRelations: () => jobsRelations,
  partners: () => partners,
  referrals: () => referrals,
  referralsRelations: () => referralsRelations,
  scholarships: () => scholarships,
  scholarshipsRelations: () => scholarshipsRelations,
  teamMembers: () => teamMembers,
  testimonials: () => testimonials,
  testimonialsRelations: () => testimonialsRelations,
  users: () => users,
  usersRelations: () => usersRelations
});
import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
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
  // 'scholarship' or 'job'
  referenceId: integer("reference_id").notNull(),
  // scholarship_id or job_id
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
  metadata: jsonb("metadata"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow()
});
var usersRelations = relations(users, ({ many }) => ({
  applications: many(applications),
  testimonials: many(testimonials),
  blogPosts: many(blogPosts),
  referrals: many(referrals),
  analytics: many(analytics)
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
var blogPostsRelations = relations(blogPosts, ({ one }) => ({
  author: one(users, {
    fields: [blogPosts.authorId],
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

// server/db.ts
import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, desc, and, or, like, count, sql } from "drizzle-orm";
var DatabaseStorage = class {
  // ===================== USERS =====================
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async createUser(user) {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }
  async updateUser(id, user) {
    const [updated] = await db.update(users).set({ ...user, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id)).returning();
    return updated;
  }
  async deleteUser(id) {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }
  async getAllUsers() {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }
  // ===================== SCHOLARSHIPS =====================
  async getScholarship(id) {
    const [sch] = await db.select().from(scholarships).where(eq(scholarships.id, id));
    return sch;
  }
  async getAllScholarships() {
    return db.select().from(scholarships).orderBy(desc(scholarships.createdAt));
  }
  async getActiveScholarships() {
    return db.select().from(scholarships).where(and(eq(scholarships.isActive, true), sql`${scholarships.deadline} > NOW()`)).orderBy(desc(scholarships.createdAt));
  }
  async createScholarship(scholarship) {
    const [sch] = await db.insert(scholarships).values(scholarship).returning();
    return sch;
  }
  async updateScholarship(id, scholarship) {
    const [sch] = await db.update(scholarships).set({ ...scholarship, updatedAt: /* @__PURE__ */ new Date() }).where(eq(scholarships.id, id)).returning();
    return sch;
  }
  async deleteScholarship(id) {
    const result = await db.delete(scholarships).where(eq(scholarships.id, id));
    return result.rowCount > 0;
  }
  async searchScholarships(query) {
    return db.select().from(scholarships).where(and(eq(scholarships.isActive, true), or(
      like(scholarships.title, `%${query}%`),
      like(scholarships.description, `%${query}%`),
      like(scholarships.institution, `%${query}%`),
      like(scholarships.country, `%${query}%`)
    ))).orderBy(desc(scholarships.createdAt));
  }
  // ===================== JOBS =====================
  async getJob(id) {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }
  async getAllJobs() {
    return db.select().from(jobs).orderBy(desc(jobs.createdAt));
  }
  async getActiveJobs() {
    return db.select().from(jobs).where(eq(jobs.isActive, true)).orderBy(desc(jobs.createdAt));
  }
  async createJob(job) {
    const [newJob] = await db.insert(jobs).values(job).returning();
    return newJob;
  }
  async updateJob(id, job) {
    const [updated] = await db.update(jobs).set({ ...job, updatedAt: /* @__PURE__ */ new Date() }).where(eq(jobs.id, id)).returning();
    return updated;
  }
  async deleteJob(id) {
    const result = await db.delete(jobs).where(eq(jobs.id, id));
    return result.rowCount > 0;
  }
  async searchJobs(query) {
    return db.select().from(jobs).where(and(eq(jobs.isActive, true), or(
      like(jobs.title, `%${query}%`),
      like(jobs.description, `%${query}%`),
      like(jobs.company, `%${query}%`),
      like(jobs.location, `%${query}%`)
    ))).orderBy(desc(jobs.createdAt));
  }
  // ===================== APPLICATIONS =====================
  async getApplication(id) {
    const [app2] = await db.select().from(applications).where(eq(applications.id, id));
    return app2;
  }
  async getUserApplications(userId) {
    return db.select().from(applications).where(eq(applications.userId, userId)).orderBy(desc(applications.submittedAt));
  }
  async getAllApplications() {
    return db.select().from(applications).orderBy(desc(applications.submittedAt));
  }
  async createApplication(application) {
    const [app2] = await db.insert(applications).values(application).returning();
    return app2;
  }
  async updateApplication(id, application) {
    const [updated] = await db.update(applications).set({ ...application, updatedAt: /* @__PURE__ */ new Date() }).where(eq(applications.id, id)).returning();
    return updated;
  }
  async deleteApplication(id) {
    const result = await db.delete(applications).where(eq(applications.id, id));
    return result.rowCount > 0;
  }
  // ===================== PARTNERS =====================
  async getPartner(id) {
    const [partner] = await db.select().from(partners).where(eq(partners.id, id));
    return partner;
  }
  async getAllPartners() {
    return db.select().from(partners).orderBy(desc(partners.createdAt));
  }
  async getActivePartners() {
    return db.select().from(partners).where(eq(partners.isActive, true)).orderBy(desc(partners.createdAt));
  }
  async createPartner(partner) {
    const [p] = await db.insert(partners).values(partner).returning();
    return p;
  }
  async updatePartner(id, partner) {
    const [p] = await db.update(partners).set({ ...partner, updatedAt: /* @__PURE__ */ new Date() }).where(eq(partners.id, id)).returning();
    return p;
  }
  async deletePartner(id) {
    const result = await db.delete(partners).where(eq(partners.id, id));
    return result.rowCount > 0;
  }
  // ===================== TESTIMONIALS =====================
  async getTestimonial(id) {
    const [t] = await db.select().from(testimonials).where(eq(testimonials.id, id));
    return t;
  }
  async getAllTestimonials() {
    return db.select().from(testimonials).orderBy(desc(testimonials.createdAt));
  }
  async getApprovedTestimonials() {
    return db.select().from(testimonials).where(eq(testimonials.isApproved, true)).orderBy(desc(testimonials.createdAt));
  }
  async createTestimonial(testimonial) {
    const [t] = await db.insert(testimonials).values(testimonial).returning();
    return t;
  }
  async updateTestimonial(id, testimonial) {
    const [t] = await db.update(testimonials).set({ ...testimonial, updatedAt: /* @__PURE__ */ new Date() }).where(eq(testimonials.id, id)).returning();
    return t;
  }
  async deleteTestimonial(id) {
    const result = await db.delete(testimonials).where(eq(testimonials.id, id));
    return result.rowCount > 0;
  }
  // ===================== BLOG POSTS =====================
  async getBlogPost(id) {
    const [b] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    return b;
  }
  async getAllBlogPosts() {
    return db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
  }
  async getPublishedBlogPosts() {
    return db.select().from(blogPosts).where(eq(blogPosts.isPublished, true)).orderBy(desc(blogPosts.createdAt));
  }
  async createBlogPost(blogPost) {
    const [b] = await db.insert(blogPosts).values(blogPost).returning();
    return b;
  }
  async updateBlogPost(id, blogPost) {
    const [b] = await db.update(blogPosts).set({ ...blogPost, updatedAt: /* @__PURE__ */ new Date() }).where(eq(blogPosts.id, id)).returning();
    return b;
  }
  async deleteBlogPost(id) {
    const result = await db.delete(blogPosts).where(eq(blogPosts.id, id));
    return result.rowCount > 0;
  }
  // ===================== TEAM MEMBERS =====================
  async getTeamMember(id) {
    const [tm] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
    return tm;
  }
  async getAllTeamMembers() {
    return db.select().from(teamMembers).orderBy(desc(teamMembers.createdAt));
  }
  async getActiveTeamMembers() {
    return db.select().from(teamMembers).where(eq(teamMembers.isActive, true)).orderBy(desc(teamMembers.createdAt));
  }
  async createTeamMember(teamMember) {
    const [tm] = await db.insert(teamMembers).values(teamMember).returning();
    return tm;
  }
  async updateTeamMember(id, teamMember) {
    const [tm] = await db.update(teamMembers).set({ ...teamMember, updatedAt: /* @__PURE__ */ new Date() }).where(eq(teamMembers.id, id)).returning();
    return tm;
  }
  async deleteTeamMember(id) {
    const result = await db.delete(teamMembers).where(eq(teamMembers.id, id));
    return result.rowCount > 0;
  }
  // ===================== REFERRALS =====================
  async getReferral(id) {
    const [r] = await db.select().from(referrals).where(eq(referrals.id, id));
    return r;
  }
  async getUserReferrals(userId) {
    return db.select().from(referrals).where(eq(referrals.referrerId, userId)).orderBy(desc(referrals.createdAt));
  }
  async getAllReferrals() {
    return db.select().from(referrals).orderBy(desc(referrals.createdAt));
  }
  async createReferral(referral) {
    const [r] = await db.insert(referrals).values(referral).returning();
    return r;
  }
  async updateReferral(id, referral) {
    const [r] = await db.update(referrals).set(referral).where(eq(referrals.id, id)).returning();
    return r;
  }
  async deleteReferral(id) {
    const result = await db.delete(referrals).where(eq(referrals.id, id));
    return result.rowCount > 0;
  }
  // ===================== ANALYTICS =====================
  async logAnalytics(analytics2) {
    const [a] = await db.insert(analytics).values(analytics2).returning();
    return a;
  }
  async getAnalytics(startDate, endDate) {
    let query = db.select().from(analytics);
    if (startDate && endDate) {
      query = query.where(and(sql`${analytics.timestamp} >= ${startDate}`, sql`${analytics.timestamp} <= ${endDate}`));
    }
    return query.orderBy(desc(analytics.timestamp));
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
};
var storage = new DatabaseStorage();

// server/ai.ts
import OpenAI from "openai";
var openai = new OpenAI({
  apiKey: process.env.API_KEY
});
async function getChatResponse(message) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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

// server/routes.ts
var JWT_SECRET = process.env.JWT_SECRET;
var NODE_ENV = process.env.NODE_ENV || "development";
var FRONTEND_URL = process.env.FRONTEND_URL;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}
var authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    req.user = decoded;
    next();
  });
};
var requireAdmin = (req, res, next) => {
  if (!req.user || !["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};
async function registerRoutes(app2) {
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws",
    verifyClient: (info, done) => done(true)
  });
  wss.on("connection", (ws2, req) => {
    const origin = req.headers.origin;
    if (NODE_ENV === "production" && FRONTEND_URL && origin !== FRONTEND_URL) {
      ws2.close();
      return;
    }
    ws2.subscriptions = [];
    ws2.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.type === "subscribe") {
          ws2.subscriptions = data.channels || [];
        }
      } catch {
      }
    });
  });
  const broadcast = (channel, payload) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client.subscriptions?.includes(channel)) {
        client.send(JSON.stringify({ channel, data: payload }));
      }
    });
  };
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      if (await storage.getUserByEmail(userData.email)) {
        return res.status(400).json({ message: "User already exists" });
      }
      const password = await bcrypt.hash(userData.password, 10);
      const user = await storage.createUser({
        ...userData,
        password
      });
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
      await storage.logAnalytics({
        event: "user_registered",
        userId: user.id,
        metadata: { email: user.email }
      });
      broadcast("user_activity", { type: "registered", userId: user.id });
      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      });
    } catch (err) {
      res.status(400).json({
        message: "Registration failed",
        ...NODE_ENV !== "production" && { error: err.message }
      });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
      await storage.logAnalytics({
        event: "user_logged_in",
        userId: user.id
      });
      broadcast("user_activity", { type: "login", userId: user.id });
      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      });
    } catch {
      res.status(500).json({ message: "Login failed" });
    }
  });
  app2.get("/api/user/profile", authenticateToken, async (req, res) => {
    const user = await storage.getUser(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });
  const adminCreate = (schema, createFn, channel) => async (req, res) => {
    try {
      const data = schema.parse({ ...req.body, createdBy: req.user.id });
      const item = await createFn(data);
      broadcast(channel, item);
      res.status(201).json(item);
    } catch (err) {
      res.status(400).json({
        message: "Operation failed",
        ...NODE_ENV !== "production" && { error: err.message }
      });
    }
  };
  app2.get(
    "/api/scholarships",
    async (_, res) => res.json(await storage.getActiveScholarships())
  );
  app2.post(
    "/api/scholarships",
    authenticateToken,
    requireAdmin,
    adminCreate(insertScholarshipSchema, storage.createScholarship, "scholarships")
  );
  app2.get(
    "/api/jobs",
    async (_, res) => res.json(await storage.getActiveJobs())
  );
  app2.post(
    "/api/jobs",
    authenticateToken,
    requireAdmin,
    adminCreate(insertJobSchema, storage.createJob, "jobs")
  );
  app2.post("/api/chat", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) return res.status(400).json({ message: "Message required" });
      const response = await getChatResponse(message);
      res.json({ response });
    } catch {
      res.status(500).json({ message: "AI service error" });
    }
  });
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var vite_config_default = defineConfig({
  root: path.resolve(__dirname, "client"),
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared")
    }
  },
  build: {
    outDir: path.resolve(__dirname, "dist/client"),
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
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
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
var app = express2();
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com"
        ],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"]
      }
    }
  })
);
app.set("trust proxy", true);
app.use(cookieParser());
app.use(
  session({
    name: "__Host-session",
    secret: process.env.SESSION_SECRET || "change-this-now",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: true,
      // HTTPS only
      httpOnly: true,
      // JS cannot read
      sameSite: "lax",
      // safe default
      maxAge: 1e3 * 60 * 60 * 24
      // 1 day
    }
  })
);
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const startTime = Date.now();
  const requestPath = req.path;
  let responseBody;
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    responseBody = body;
    return originalJson(body);
  };
  res.on("finish", () => {
    if (!requestPath.startsWith("/api")) return;
    const duration = Date.now() - startTime;
    let line = `${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`;
    if (responseBody) {
      line += ` :: ${JSON.stringify(responseBody)}`;
    }
    if (line.length > 80) {
      line = line.slice(0, 79) + "\u2026";
    }
    log(line);
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    if (app.get("env") === "development") {
      console.error(err);
    }
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    app.use(express2.static("dist/client"));
    app.use("/admin", express2.static("dist/admin"));
    app.get("/admin/*", (_req, res) => {
      res.sendFile(path3.resolve("dist/admin/index.html"));
    });
    app.get("*", (_req, res) => {
      res.sendFile(path3.resolve("dist/client/index.html"));
    });
  }
  const PORT = Number(process.env.PORT);
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u{1F680} Server running on port ${PORT}`);
  });
})();
