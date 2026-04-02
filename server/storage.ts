import {
  users, scholarships, jobs, applications, partners, testimonials, blogPosts, teamMembers, referrals, analytics, blogComments,
  type User, type InsertUser, type Scholarship, type InsertScholarship, type Job, type InsertJob,
  type Application, type InsertApplication, type Partner, type InsertPartner, type Testimonial, type InsertTestimonial,
  type BlogPost, type InsertBlogPost, type TeamMember, type InsertTeamMember, type Referral, type InsertReferral,
  type Analytics, type InsertAnalytics, type BlogComment, type InsertBlogComment
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
  searchBlogPosts(query: string): Promise<BlogPost[]>;
  incrementBlogLikes(id: number): Promise<BlogPost>;
  getBlogComments(blogPostId: number): Promise<BlogComment[]>;
  createBlogComment(comment: InsertBlogComment): Promise<BlogComment>;

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
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updateUser: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updateUser, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result as any).rowCount > 0;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  // Scholarships
  async getScholarship(id: number): Promise<Scholarship | undefined> {
    const [scholarship] = await db.select().from(scholarships).where(eq(scholarships.id, id));
    return scholarship || undefined;
  }

  async getAllScholarships(): Promise<Scholarship[]> {
    return await db.select().from(scholarships).orderBy(desc(scholarships.createdAt));
  }

  async getActiveScholarships(): Promise<Scholarship[]> {
    return await db
      .select()
      .from(scholarships)
      .where(and(eq(scholarships.isActive, true), sql`${scholarships.deadline} > NOW()`))
      .orderBy(desc(scholarships.createdAt));
  }

  async createScholarship(insertScholarship: InsertScholarship): Promise<Scholarship> {
    const [scholarship] = await db.insert(scholarships).values(insertScholarship).returning();
    return scholarship;
  }

  async updateScholarship(id: number, updateScholarship: Partial<InsertScholarship>): Promise<Scholarship> {
    const [scholarship] = await db
      .update(scholarships)
      .set({ ...updateScholarship, updatedAt: new Date() })
      .where(eq(scholarships.id, id))
      .returning();
    return scholarship;
  }

  async deleteScholarship(id: number): Promise<boolean> {
    const result = await db.delete(scholarships).where(eq(scholarships.id, id));
    return (result as any).rowCount > 0;
  }

  async searchScholarships(query: string): Promise<Scholarship[]> {
    return await db
      .select()
      .from(scholarships)
      .where(
        and(
          eq(scholarships.isActive, true),
          or(
            like(scholarships.title, `%${query}%`),
            like(scholarships.description, `%${query}%`),
            like(scholarships.institution, `%${query}%`),
            like(scholarships.country, `%${query}%`)
          )
        )
      )
      .orderBy(desc(scholarships.createdAt));
  }

  // Jobs
  async getJob(id: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job || undefined;
  }

  async getAllJobs(): Promise<Job[]> {
    return await db.select().from(jobs).orderBy(desc(jobs.createdAt));
  }

  async getActiveJobs(): Promise<Job[]> {
    return await db
      .select()
      .from(jobs)
      .where(eq(jobs.isActive, true))
      .orderBy(desc(jobs.createdAt));
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const [job] = await db.insert(jobs).values(insertJob).returning();
    return job;
  }

  async updateJob(id: number, updateJob: Partial<InsertJob>): Promise<Job> {
    const [job] = await db
      .update(jobs)
      .set({ ...updateJob, updatedAt: new Date() })
      .where(eq(jobs.id, id))
      .returning();
    return job;
  }

  async deleteJob(id: number): Promise<boolean> {
    const result = await db.delete(jobs).where(eq(jobs.id, id));
    return (result as any).rowCount > 0;
  }

  async searchJobs(query: string): Promise<Job[]> {
    return await db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.isActive, true),
          or(
            like(jobs.title, `%${query}%`),
            like(jobs.description, `%${query}%`),
            like(jobs.company, `%${query}%`),
            like(jobs.location, `%${query}%`)
          )
        )
      )
      .orderBy(desc(jobs.createdAt));
  }

  // Applications
  async getApplication(id: number): Promise<Application | undefined> {
    const [application] = await db.select().from(applications).where(eq(applications.id, id));
    return application || undefined;
  }

  async getUserApplications(userId: number): Promise<Application[]> {
    return await db
      .select()
      .from(applications)
      .where(eq(applications.userId, userId))
      .orderBy(desc(applications.submittedAt));
  }

  async getAllApplications(): Promise<Application[]> {
    return await db.select().from(applications).orderBy(desc(applications.submittedAt));
  }

  async createApplication(insertApplication: InsertApplication): Promise<Application> {
    const [application] = await db.insert(applications).values(insertApplication).returning();
    return application;
  }

  async updateApplication(id: number, updateApplication: Partial<InsertApplication>): Promise<Application> {
    const [application] = await db
      .update(applications)
      .set({ ...updateApplication, updatedAt: new Date() })
      .where(eq(applications.id, id))
      .returning();
    return application;
  }

  async deleteApplication(id: number): Promise<boolean> {
    const result = await db.delete(applications).where(eq(applications.id, id));
    return (result as any).rowCount > 0;
  }

  // Partners
  async getPartner(id: number): Promise<Partner | undefined> {
    const [partner] = await db.select().from(partners).where(eq(partners.id, id));
    return partner || undefined;
  }

  async getAllPartners(): Promise<Partner[]> {
    return await db.select().from(partners).orderBy(desc(partners.createdAt));
  }

  async getActivePartners(): Promise<Partner[]> {
    return await db
      .select()
      .from(partners)
      .where(eq(partners.isActive, true))
      .orderBy(desc(partners.createdAt));
  }

  async createPartner(insertPartner: InsertPartner): Promise<Partner> {
    const [partner] = await db.insert(partners).values(insertPartner).returning();
    return partner;
  }

  async updatePartner(id: number, updatePartner: Partial<InsertPartner>): Promise<Partner> {
    const [partner] = await db
      .update(partners)
      .set({ ...updatePartner, updatedAt: new Date() })
      .where(eq(partners.id, id))
      .returning();
    return partner;
  }

  async deletePartner(id: number): Promise<boolean> {
    const result = await db.delete(partners).where(eq(partners.id, id));
    return (result as any).rowCount > 0;
  }

  // Testimonials
  async getTestimonial(id: number): Promise<Testimonial | undefined> {
    const [testimonial] = await db.select().from(testimonials).where(eq(testimonials.id, id));
    return testimonial || undefined;
  }

  async getAllTestimonials(): Promise<Testimonial[]> {
    return await db.select().from(testimonials).orderBy(desc(testimonials.createdAt));
  }

  async getApprovedTestimonials(): Promise<Testimonial[]> {
    return await db
      .select()
      .from(testimonials)
      .where(eq(testimonials.isApproved, true))
      .orderBy(desc(testimonials.createdAt));
  }

  async createTestimonial(insertTestimonial: InsertTestimonial): Promise<Testimonial> {
    const [testimonial] = await db.insert(testimonials).values(insertTestimonial).returning();
    return testimonial;
  }

  async updateTestimonial(id: number, updateTestimonial: Partial<InsertTestimonial>): Promise<Testimonial> {
    const [testimonial] = await db
      .update(testimonials)
      .set({ ...updateTestimonial, updatedAt: new Date() })
      .where(eq(testimonials.id, id))
      .returning();
    return testimonial;
  }

  async deleteTestimonial(id: number): Promise<boolean> {
    const result = await db.delete(testimonials).where(eq(testimonials.id, id));
    return (result as any).rowCount > 0;
  }

  // Blog Posts
  async getBlogPost(id: number): Promise<BlogPost | undefined> {
    const [blogPost] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    return blogPost || undefined;
  }

  async getAllBlogPosts(): Promise<BlogPost[]> {
    return await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
  }

  async getPublishedBlogPosts(): Promise<BlogPost[]> {
    return await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.isPublished, true))
      .orderBy(desc(blogPosts.createdAt));
  }

  async createBlogPost(insertBlogPost: InsertBlogPost): Promise<BlogPost> {
    const [blogPost] = await db.insert(blogPosts).values(insertBlogPost).returning();
    return blogPost;
  }

  async updateBlogPost(id: number, updateBlogPost: Partial<InsertBlogPost>): Promise<BlogPost> {
    const [blogPost] = await db
      .update(blogPosts)
      .set({ ...updateBlogPost, updatedAt: new Date() })
      .where(eq(blogPosts.id, id))
      .returning();
    return blogPost;
  }

  async deleteBlogPost(id: number): Promise<boolean> {
    const result = await db.delete(blogPosts).where(eq(blogPosts.id, id));
    return (result as any).rowCount > 0;
  }

  async searchBlogPosts(query: string): Promise<BlogPost[]> {
    return await db
      .select()
      .from(blogPosts)
      .where(
        or(
          like(blogPosts.title, `%${query}%`),
          like(blogPosts.content, `%${query}%`),
          like(blogPosts.category, `%${query}%`)
        )
      )
      .orderBy(desc(blogPosts.createdAt));
  }

  async incrementBlogLikes(id: number): Promise<BlogPost> {
    const [blogPost] = await db
      .update(blogPosts)
      .set({ likes: sql`${blogPosts.likes} + 1` })
      .where(eq(blogPosts.id, id))
      .returning();
    return blogPost;
  }

  async getBlogComments(blogPostId: number): Promise<BlogComment[]> {
    return await db
      .select()
      .from(blogComments)
      .where(eq(blogComments.blogPostId, blogPostId))
      .orderBy(blogComments.createdAt);
  }

  async createBlogComment(insertComment: InsertBlogComment): Promise<BlogComment> {
    const [comment] = await db.insert(blogComments).values(insertComment).returning();
    return comment;
  }

  // Team Members
  async getTeamMember(id: number): Promise<TeamMember | undefined> {
    const [teamMember] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
    return teamMember || undefined;
  }

  async getAllTeamMembers(): Promise<TeamMember[]> {
    return await db.select().from(teamMembers).orderBy(desc(teamMembers.createdAt));
  }

  async getActiveTeamMembers(): Promise<TeamMember[]> {
    return await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.isActive, true))
      .orderBy(desc(teamMembers.createdAt));
  }

  async createTeamMember(insertTeamMember: InsertTeamMember): Promise<TeamMember> {
    const [teamMember] = await db.insert(teamMembers).values(insertTeamMember).returning();
    return teamMember;
  }

  async updateTeamMember(id: number, updateTeamMember: Partial<InsertTeamMember>): Promise<TeamMember> {
    const [teamMember] = await db
      .update(teamMembers)
      .set({ ...updateTeamMember, updatedAt: new Date() })
      .where(eq(teamMembers.id, id))
      .returning();
    return teamMember;
  }

  async deleteTeamMember(id: number): Promise<boolean> {
    const result = await db.delete(teamMembers).where(eq(teamMembers.id, id));
    return (result as any).rowCount > 0;
  }

  // Referrals
  async getReferral(id: number): Promise<Referral | undefined> {
    const [referral] = await db.select().from(referrals).where(eq(referrals.id, id));
    return referral || undefined;
  }

  async getUserReferrals(userId: number): Promise<Referral[]> {
    return await db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerId, userId))
      .orderBy(desc(referrals.createdAt));
  }

  async getAllReferrals(): Promise<Referral[]> {
    return await db.select().from(referrals).orderBy(desc(referrals.createdAt));
  }

  async createReferral(insertReferral: InsertReferral): Promise<Referral> {
    const [referral] = await db.insert(referrals).values(insertReferral).returning();
    return referral;
  }

  async updateReferral(id: number, updateReferral: Partial<InsertReferral>): Promise<Referral> {
    const [referral] = await db
      .update(referrals)
      .set(updateReferral)
      .where(eq(referrals.id, id))
      .returning();
    return referral;
  }

  async deleteReferral(id: number): Promise<boolean> {
    const result = await db.delete(referrals).where(eq(referrals.id, id));
    return (result as any).rowCount > 0;
  }

  // Analytics
  async logAnalytics(insertAnalytics: InsertAnalytics): Promise<Analytics> {
    const [log] = await db.insert(analytics).values(insertAnalytics).returning();
    return log;
  }

  async getAnalytics(startDate?: Date, endDate?: Date): Promise<Analytics[]> {
    let query = db.select().from(analytics);
    
    if (startDate && endDate) {
      query = query.where(and(
        sql`${analytics.timestamp} >= ${startDate}`,
        sql`${analytics.timestamp} <= ${endDate}`
      ));
    }
    
    return await query.orderBy(desc(analytics.timestamp));
  }

  async getAnalyticsSummary(): Promise<any> {
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
      publishedBlogPosts: publishedBlogPosts[0].count,
    };
  }
}

export const storage = new DatabaseStorage();
