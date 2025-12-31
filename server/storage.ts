import {
  users as usersTable,
  scholarships as scholarshipsTable,
  jobs as jobsTable,
  applications as applicationsTable,
  partners as partnersTable,
  testimonials as testimonialsTable,
  blogPosts as blogPostsTable,
  teamMembers as teamMembersTable,
  referrals as referralsTable,
  analytics as analyticsTable,
  type User, type InsertUser,
  type Scholarship, type InsertScholarship,
  type Job, type InsertJob,
  type Application, type InsertApplication,
  type Partner, type InsertPartner,
  type Testimonial, type InsertTestimonial,
  type BlogPost, type InsertBlogPost,
  type TeamMember, type InsertTeamMember,
  type Referral, type InsertReferral,
  type Analytics, type InsertAnalytics
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, count, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;

  // Scholarships
  getScholarship(id: number): Promise<Scholarship | undefined>;
  getAllScholarships(): Promise<Scholarship[]>;
  getActiveScholarships(): Promise<Scholarship[]>;
  createScholarship(scholarship: InsertScholarship): Promise<Scholarship>;
  updateScholarship(id: number, scholarship: Partial<InsertScholarship>): Promise<Scholarship>;
  deleteScholarship(id: number): Promise<boolean>;
  searchScholarships(query: string): Promise<Scholarship[]>;

  // Jobs
  getJob(id: number): Promise<Job | undefined>;
  getAllJobs(): Promise<Job[]>;
  getActiveJobs(): Promise<Job[]>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, job: Partial<InsertJob>): Promise<Job>;
  deleteJob(id: number): Promise<boolean>;
  searchJobs(query: string): Promise<Job[]>;

  // Applications
  getApplication(id: number): Promise<Application | undefined>;
  getUserApplications(userId: number): Promise<Application[]>;
  getAllApplications(): Promise<Application[]>;
  createApplication(application: InsertApplication): Promise<Application>;
  updateApplication(id: number, application: Partial<InsertApplication>): Promise<Application>;
  deleteApplication(id: number): Promise<boolean>;

  // Partners
  getPartner(id: number): Promise<Partner | undefined>;
  getAllPartners(): Promise<Partner[]>;
  getActivePartners(): Promise<Partner[]>;
  createPartner(partner: InsertPartner): Promise<Partner>;
  updatePartner(id: number, partner: Partial<InsertPartner>): Promise<Partner>;
  deletePartner(id: number): Promise<boolean>;

  // Testimonials
  getTestimonial(id: number): Promise<Testimonial | undefined>;
  getAllTestimonials(): Promise<Testimonial[]>;
  getApprovedTestimonials(): Promise<Testimonial[]>;
  createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial>;
  updateTestimonial(id: number, testimonial: Partial<InsertTestimonial>): Promise<Testimonial>;
  deleteTestimonial(id: number): Promise<boolean>;

  // Blog Posts
  getBlogPost(id: number): Promise<BlogPost | undefined>;
  getAllBlogPosts(): Promise<BlogPost[]>;
  getPublishedBlogPosts(): Promise<BlogPost[]>;
  createBlogPost(blogPost: InsertBlogPost): Promise<BlogPost>;
  updateBlogPost(id: number, blogPost: Partial<InsertBlogPost>): Promise<BlogPost>;
  deleteBlogPost(id: number): Promise<boolean>;

  // Team Members
  getTeamMember(id: number): Promise<TeamMember | undefined>;
  getAllTeamMembers(): Promise<TeamMember[]>;
  getActiveTeamMembers(): Promise<TeamMember[]>;
  createTeamMember(teamMember: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: number, teamMember: Partial<InsertTeamMember>): Promise<TeamMember>;
  deleteTeamMember(id: number): Promise<boolean>;

  // Referrals
  getReferral(id: number): Promise<Referral | undefined>;
  getUserReferrals(userId: number): Promise<Referral[]>;
  getAllReferrals(): Promise<Referral[]>;
  createReferral(referral: InsertReferral): Promise<Referral>;
  updateReferral(id: number, referral: Partial<InsertReferral>): Promise<Referral>;
  deleteReferral(id: number): Promise<boolean>;

  // Analytics
  logAnalytics(analytics: InsertAnalytics): Promise<Analytics>;
  getAnalytics(startDate?: Date, endDate?: Date): Promise<Analytics[]>;
  getAnalyticsSummary(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // ===================== USERS =====================
  async getUser(id: number) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    return user;
  }

  async getUserByUsername(username: string) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
    return user;
  }

  async getUserByEmail(email: string) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    return user;
  }

  async createUser(user: InsertUser) {
    const [newUser] = await db.insert(usersTable).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>) {
    const [updated] = await db.update(usersTable).set({ ...user, updatedAt: new Date() }).where(eq(usersTable.id, id)).returning();
    return updated;
  }

  async deleteUser(id: number) {
    const result = await db.delete(usersTable).where(eq(usersTable.id, id));
    return result.rowCount > 0;
  }

  async getAllUsers() {
    return db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  }

  // ===================== SCHOLARSHIPS =====================
  async getScholarship(id: number) {
    const [sch] = await db.select().from(scholarshipsTable).where(eq(scholarshipsTable.id, id));
    return sch;
  }

  async getAllScholarships() {
    return db.select().from(scholarshipsTable).orderBy(desc(scholarshipsTable.createdAt));
  }

  async getActiveScholarships() {
    return db.select().from(scholarshipsTable).where(and(eq(scholarshipsTable.isActive, true), sql`${scholarshipsTable.deadline} > NOW()`)).orderBy(desc(scholarshipsTable.createdAt));
  }

  async createScholarship(scholarship: InsertScholarship) {
    const [sch] = await db.insert(scholarshipsTable).values(scholarship).returning();
    return sch;
  }

  async updateScholarship(id: number, scholarship: Partial<InsertScholarship>) {
    const [sch] = await db.update(scholarshipsTable).set({ ...scholarship, updatedAt: new Date() }).where(eq(scholarshipsTable.id, id)).returning();
    return sch;
  }

  async deleteScholarship(id: number) {
    const result = await db.delete(scholarshipsTable).where(eq(scholarshipsTable.id, id));
    return result.rowCount > 0;
  }

  async searchScholarships(query: string) {
    return db.select().from(scholarshipsTable).where(and(eq(scholarshipsTable.isActive, true), or(
      like(scholarshipsTable.title, `%${query}%`),
      like(scholarshipsTable.description, `%${query}%`),
      like(scholarshipsTable.institution, `%${query}%`),
      like(scholarshipsTable.country, `%${query}%`)
    ))).orderBy(desc(scholarshipsTable.createdAt));
  }

  // ===================== JOBS =====================
  async getJob(id: number) {
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
    return job;
  }

  async getAllJobs() {
    return db.select().from(jobsTable).orderBy(desc(jobsTable.createdAt));
  }

  async getActiveJobs() {
    return db.select().from(jobsTable).where(eq(jobsTable.isActive, true)).orderBy(desc(jobsTable.createdAt));
  }

  async createJob(job: InsertJob) {
    const [newJob] = await db.insert(jobsTable).values(job).returning();
    return newJob;
  }

  async updateJob(id: number, job: Partial<InsertJob>) {
    const [updated] = await db.update(jobsTable).set({ ...job, updatedAt: new Date() }).where(eq(jobsTable.id, id)).returning();
    return updated;
  }

  async deleteJob(id: number) {
    const result = await db.delete(jobsTable).where(eq(jobsTable.id, id));
    return result.rowCount > 0;
  }

  async searchJobs(query: string) {
    return db.select().from(jobsTable).where(and(eq(jobsTable.isActive, true), or(
      like(jobsTable.title, `%${query}%`),
      like(jobsTable.description, `%${query}%`),
      like(jobsTable.company, `%${query}%`),
      like(jobsTable.location, `%${query}%`)
    ))).orderBy(desc(jobsTable.createdAt));
  }

  // ===================== APPLICATIONS =====================
  async getApplication(id: number) {
    const [app] = await db.select().from(applicationsTable).where(eq(applicationsTable.id, id));
    return app;
  }

  async getUserApplications(userId: number) {
    return db.select().from(applicationsTable).where(eq(applicationsTable.userId, userId)).orderBy(desc(applicationsTable.submittedAt));
  }

  async getAllApplications() {
    return db.select().from(applicationsTable).orderBy(desc(applicationsTable.submittedAt));
  }

  async createApplication(application: InsertApplication) {
    const [app] = await db.insert(applicationsTable).values(application).returning();
    return app;
  }

  async updateApplication(id: number, application: Partial<InsertApplication>) {
    const [updated] = await db.update(applicationsTable).set({ ...application, updatedAt: new Date() }).where(eq(applicationsTable.id, id)).returning();
    return updated;
  }

  async deleteApplication(id: number) {
    const result = await db.delete(applicationsTable).where(eq(applicationsTable.id, id));
    return result.rowCount > 0;
  }

  // ===================== PARTNERS =====================
  async getPartner(id: number) {
    const [partner] = await db.select().from(partnersTable).where(eq(partnersTable.id, id));
    return partner;
  }

  async getAllPartners() {
    return db.select().from(partnersTable).orderBy(desc(partnersTable.createdAt));
  }

  async getActivePartners() {
    return db.select().from(partnersTable).where(eq(partnersTable.isActive, true)).orderBy(desc(partnersTable.createdAt));
  }

  async createPartner(partner: InsertPartner) {
    const [p] = await db.insert(partnersTable).values(partner).returning();
    return p;
  }

  async updatePartner(id: number, partner: Partial<InsertPartner>) {
    const [p] = await db.update(partnersTable).set({ ...partner, updatedAt: new Date() }).where(eq(partnersTable.id, id)).returning();
    return p;
  }

  async deletePartner(id: number) {
    const result = await db.delete(partnersTable).where(eq(partnersTable.id, id));
    return result.rowCount > 0;
  }

  // ===================== TESTIMONIALS =====================
  async getTestimonial(id: number) {
    const [t] = await db.select().from(testimonialsTable).where(eq(testimonialsTable.id, id));
    return t;
  }

  async getAllTestimonials() {
    return db.select().from(testimonialsTable).orderBy(desc(testimonialsTable.createdAt));
  }

  async getApprovedTestimonials() {
    return db.select().from(testimonialsTable).where(eq(testimonialsTable.isApproved, true)).orderBy(desc(testimonialsTable.createdAt));
  }

  async createTestimonial(testimonial: InsertTestimonial) {
    const [t] = await db.insert(testimonialsTable).values(testimonial).returning();
    return t;
  }

  async updateTestimonial(id: number, testimonial: Partial<InsertTestimonial>) {
    const [t] = await db.update(testimonialsTable).set({ ...testimonial, updatedAt: new Date() }).where(eq(testimonialsTable.id, id)).returning();
    return t;
  }

  async deleteTestimonial(id: number) {
    const result = await db.delete(testimonialsTable).where(eq(testimonialsTable.id, id));
    return result.rowCount > 0;
  }

  // ===================== BLOG POSTS =====================
  async getBlogPost(id: number) {
    const [b] = await db.select().from(blogPostsTable).where(eq(blogPostsTable.id, id));
    return b;
  }

  async getAllBlogPosts() {
    return db.select().from(blogPostsTable).orderBy(desc(blogPostsTable.createdAt));
  }

  async getPublishedBlogPosts() {
    return db.select().from(blogPostsTable).where(eq(blogPostsTable.isPublished, true)).orderBy(desc(blogPostsTable.createdAt));
  }

  async createBlogPost(blogPost: InsertBlogPost) {
    const [b] = await db.insert(blogPostsTable).values(blogPost).returning();
    return b;
  }

  async updateBlogPost(id: number, blogPost: Partial<InsertBlogPost>) {
    const [b] = await db.update(blogPostsTable).set({ ...blogPost, updatedAt: new Date() }).where(eq(blogPostsTable.id, id)).returning();
    return b;
  }

  async deleteBlogPost(id: number) {
    const result = await db.delete(blogPostsTable).where(eq(blogPostsTable.id, id));
    return result.rowCount > 0;
  }

  // ===================== TEAM MEMBERS =====================
  async getTeamMember(id: number) {
    const [tm] = await db.select().from(teamMembersTable).where(eq(teamMembersTable.id, id));
    return tm;
  }

  async getAllTeamMembers() {
    return db.select().from(teamMembersTable).orderBy(desc(teamMembersTable.createdAt));
  }

  async getActiveTeamMembers() {
    return db.select().from(teamMembersTable).where(eq(teamMembersTable.isActive, true)).orderBy(desc(teamMembersTable.createdAt));
  }

  async createTeamMember(teamMember: InsertTeamMember) {
    const [tm] = await db.insert(teamMembersTable).values(teamMember).returning();
    return tm;
  }

  async updateTeamMember(id: number, teamMember: Partial<InsertTeamMember>) {
    const [tm] = await db.update(teamMembersTable).set({ ...teamMember, updatedAt: new Date() }).where(eq(teamMembersTable.id, id)).returning();
    return tm;
  }

  async deleteTeamMember(id: number) {
    const result = await db.delete(teamMembersTable).where(eq(teamMembersTable.id, id));
    return result.rowCount > 0;
  }

  // ===================== REFERRALS =====================
  async getReferral(id: number) {
    const [r] = await db.select().from(referralsTable).where(eq(referralsTable.id, id));
    return r;
  }

  async getUserReferrals(userId: number) {
    return db.select().from(referralsTable).where(eq(referralsTable.referrerId, userId)).orderBy(desc(referralsTable.createdAt));
  }

  async getAllReferrals() {
    return db.select().from(referralsTable).orderBy(desc(referralsTable.createdAt));
  }

  async createReferral(referral: InsertReferral) {
    const [r] = await db.insert(referralsTable).values(referral).returning();
    return r;
  }

  async updateReferral(id: number, referral: Partial<InsertReferral>) {
    const [r] = await db.update(referralsTable).set(referral).where(eq(referralsTable.id, id)).returning();
    return r;
  }

  async deleteReferral(id: number) {
    const result = await db.delete(referralsTable).where(eq(referralsTable.id, id));
    return result.rowCount > 0;
  }

  // ===================== ANALYTICS =====================
  async logAnalytics(analytics: InsertAnalytics) {
    const [a] = await db.insert(analyticsTable).values(analytics).returning();
    return a;
  }

  async getAnalytics(startDate?: Date, endDate?: Date) {
    let query = db.select().from(analyticsTable);
    if (startDate && endDate) {
      query = query.where(and(sql`${analyticsTable.timestamp} >= ${startDate}`, sql`${analyticsTable.timestamp} <= ${endDate}`));
    }
    return query.orderBy(desc(analyticsTable.timestamp));
  }

  async getAnalyticsSummary() {
    const totalUsers = await db.select({ count: count() }).from(usersTable);
    const totalScholarships = await db.select({ count: count() }).from(scholarshipsTable);
    const totalJobs = await db.select({ count: count() }).from(jobsTable);
    const totalApplications = await db.select({ count: count() }).from(applicationsTable);
    const activeTestimonials = await db.select({ count: count() }).from(testimonialsTable).where(eq(testimonialsTable.isApproved, true));
    const publishedBlogPosts = await db.select({ count: count() }).from(blogPostsTable).where(eq(blogPostsTable.isPublished, true));

    return {
      totalUsers: totalUsers[0].count,
      totalScholarships: totalScholarships[0].count,
      totalJobs: totalJobs[0].count,
      totalApplications: totalApplications[0].count,
      activeTestimonials: activeTestimonials[0].count,
      publishedBlogPosts: publishedBlogPosts[0].count
    };
  }
}

export const storage = new DatabaseStorage();
