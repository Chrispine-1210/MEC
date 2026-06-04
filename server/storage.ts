import {
  users, scholarships, jobs, applications, partners, testimonials, blogPosts, teamMembers, events, eventRegistrations, eventComments, eventReactions, referrals, analytics, blogComments, savedItems, messages, subscribers, emailVerificationTokens, emailJobs, emailDeliveryEvents, emailPreferences,
  type User, type InsertUser, type Scholarship, type InsertScholarship, type Job, type InsertJob,
  type Application, type InsertApplication, type Partner, type InsertPartner, type Testimonial, type InsertTestimonial,
  type BlogPost, type InsertBlogPost, type TeamMember, type InsertTeamMember, type Referral, type InsertReferral,
  type Analytics, type InsertAnalytics, type BlogComment, type InsertBlogComment,
  type SavedItem, type InsertSavedItem, type Message, type InsertMessage,
  type Subscriber, type InsertSubscriber,
  type EmailVerificationToken, type InsertEmailVerificationToken,
  type EmailJob, type InsertEmailJob, type InsertEmailDeliveryEvent,
  type EmailPreference, type InsertEmailPreference,
  type Event, type InsertEvent, type EventRegistration, type InsertEventRegistration,
  type EventComment, type InsertEventComment, type EventReaction, type InsertEventReaction
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, ilike, count, sql, gte, lte, inArray } from "drizzle-orm";

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

  // Events
  getEvent(id: number): Promise<Event | undefined>;
  getEventBySlug(slug: string): Promise<Event | undefined>;
  getAllEvents(): Promise<Event[]>;
  getPublishedEvents(): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(id: number): Promise<boolean>;
  searchEvents(query: string): Promise<Event[]>;
  incrementEventView(id: number): Promise<Event>;
  incrementEventShare(id: number): Promise<Event>;
  incrementEventLike(id: number): Promise<Event>;
  getEventRegistrations(eventId: number): Promise<EventRegistration[]>;
  getAllEventRegistrations(): Promise<EventRegistration[]>;
  createEventRegistration(registration: InsertEventRegistration): Promise<EventRegistration>;
  updateEventRegistration(
    id: number,
    registration: Partial<InsertEventRegistration> & { checkedInAt?: Date; checkedOutAt?: Date },
  ): Promise<EventRegistration>;
  getEventComments(eventId: number, includeModerated?: boolean): Promise<EventComment[]>;
  createEventComment(comment: InsertEventComment): Promise<EventComment>;
  updateEventComment(id: number, comment: Partial<InsertEventComment>): Promise<EventComment>;
  createEventReaction(reaction: InsertEventReaction): Promise<EventReaction>;

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

  // Saved Items
  getSavedItem(id: number): Promise<SavedItem | undefined>;
  getUserSavedItems(userId: number): Promise<SavedItem[]>;
  createSavedItem(savedItem: InsertSavedItem): Promise<SavedItem>;
  deleteSavedItem(id: number): Promise<boolean>;
  isItemSaved(userId: number, type: string, referenceId: number): Promise<boolean>;

  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getAllMessages(): Promise<Message[]>;
  markMessageRead(id: number): Promise<Message>;

  // Subscribers
  getSubscriberByEmail(email: string): Promise<Subscriber | undefined>;
  getSubscriberByVerificationToken(token: string): Promise<Subscriber | undefined>;
  getSubscriberByUnsubscribeToken(token: string): Promise<Subscriber | undefined>;
  getAllSubscribers(): Promise<Subscriber[]>;
  createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber>;
  updateSubscriber(id: number, subscriber: Partial<InsertSubscriber>): Promise<Subscriber>;

  // Enterprise email
  createEmailVerificationToken(token: InsertEmailVerificationToken): Promise<EmailVerificationToken>;
  getEmailVerificationTokenByHash(tokenHash: string): Promise<EmailVerificationToken | undefined>;
  countEmailVerificationRequests(email: string, since: Date): Promise<number>;
  revokePendingEmailVerificationTokens(userId: number, replacedAt?: Date): Promise<void>;
  useEmailVerificationToken(id: number): Promise<EmailVerificationToken>;
  createEmailJob(job: InsertEmailJob): Promise<EmailJob>;
  getEmailJob(id: string): Promise<EmailJob | undefined>;
  getEmailJobByProviderMessageId(providerMessageId: string): Promise<EmailJob | undefined>;
  getDueEmailJobs(limit?: number): Promise<EmailJob[]>;
  markEmailJobProcessing(id: string): Promise<EmailJob | undefined>;
  markEmailJobSent(id: string, provider: string, providerMessageId?: string | null): Promise<EmailJob>;
  markEmailJobFailed(id: string, error: string, scheduledFor?: Date | null, finalFailure?: boolean): Promise<EmailJob>;
  createEmailDeliveryEvent(event: InsertEmailDeliveryEvent): Promise<void>;
  getEmailDeliveryStats(days?: number): Promise<{
    totals: Record<string, number>;
    byCategory: Record<string, Record<string, number>>;
    queue: Record<string, number>;
    recentFailures: EmailJob[];
  }>;
  getEmailPreferenceByEmail(email: string): Promise<EmailPreference | undefined>;
  getEmailPreferenceByTokenHash(tokenHash: string): Promise<EmailPreference | undefined>;
  upsertEmailPreference(preference: InsertEmailPreference): Promise<EmailPreference>;
  updateEmailPreference(id: number, preference: Partial<InsertEmailPreference>): Promise<EmailPreference>;
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
            ilike(scholarships.title, `%${query}%`),
            ilike(scholarships.description, `%${query}%`),
            ilike(scholarships.institution, `%${query}%`),
            ilike(scholarships.country, `%${query}%`)
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
            ilike(jobs.title, `%${query}%`),
            ilike(jobs.description, `%${query}%`),
            ilike(jobs.company, `%${query}%`),
            ilike(jobs.location, `%${query}%`)
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
    const [partner] = await db.insert(partners).values(insertPartner as typeof partners.$inferInsert).returning();
    return partner;
  }

  async updatePartner(id: number, updatePartner: Partial<InsertPartner>): Promise<Partner> {
    const [partner] = await db
      .update(partners)
      .set({ ...(updatePartner as Partial<typeof partners.$inferInsert>), updatedAt: new Date() })
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
          ilike(blogPosts.title, `%${query}%`),
          ilike(blogPosts.content, `%${query}%`),
          ilike(blogPosts.category, `%${query}%`)
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
    return await db
      .select()
      .from(teamMembers)
      .orderBy(asc(teamMembers.order), desc(teamMembers.createdAt));
  }

  async getActiveTeamMembers(): Promise<TeamMember[]> {
    return await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.isActive, true))
      .orderBy(asc(teamMembers.order), desc(teamMembers.createdAt));
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

  // Events
  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }

  async getEventBySlug(slug: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.slug, slug));
    return event || undefined;
  }

  async getAllEvents(): Promise<Event[]> {
    return await db.select().from(events).orderBy(desc(events.startAt), desc(events.createdAt));
  }

  async getPublishedEvents(): Promise<Event[]> {
    return await db
      .select()
      .from(events)
      .where(eq(events.status, "published"))
      .orderBy(asc(events.startAt), desc(events.createdAt));
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(insertEvent as typeof events.$inferInsert).returning();
    return event;
  }

  async updateEvent(id: number, updateEvent: Partial<InsertEvent>): Promise<Event> {
    const [event] = await db
      .update(events)
      .set({ ...updateEvent, updatedAt: new Date() } as Partial<typeof events.$inferInsert>)
      .where(eq(events.id, id))
      .returning();
    return event;
  }

  async deleteEvent(id: number): Promise<boolean> {
    await db.delete(eventReactions).where(eq(eventReactions.eventId, id));
    await db.delete(eventComments).where(eq(eventComments.eventId, id));
    await db.delete(eventRegistrations).where(eq(eventRegistrations.eventId, id));
    const result = await db.delete(events).where(eq(events.id, id));
    return (result as any).rowCount > 0;
  }

  async searchEvents(query: string): Promise<Event[]> {
    return await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.status, "published"),
          or(
            ilike(events.title, `%${query}%`),
            ilike(events.description, `%${query}%`),
            ilike(events.category, `%${query}%`),
            ilike(events.location, `%${query}%`),
          ),
        ),
      )
      .orderBy(asc(events.startAt));
  }

  async incrementEventView(id: number): Promise<Event> {
    const [event] = await db
      .update(events)
      .set({ viewCount: sql`${events.viewCount} + 1` })
      .where(eq(events.id, id))
      .returning();
    return event;
  }

  async incrementEventShare(id: number): Promise<Event> {
    const [event] = await db
      .update(events)
      .set({ shareCount: sql`${events.shareCount} + 1` })
      .where(eq(events.id, id))
      .returning();
    return event;
  }

  async incrementEventLike(id: number): Promise<Event> {
    const [event] = await db
      .update(events)
      .set({ likeCount: sql`${events.likeCount} + 1` })
      .where(eq(events.id, id))
      .returning();
    return event;
  }

  async getEventRegistrations(eventId: number): Promise<EventRegistration[]> {
    return await db
      .select()
      .from(eventRegistrations)
      .where(eq(eventRegistrations.eventId, eventId))
      .orderBy(desc(eventRegistrations.createdAt));
  }

  async getAllEventRegistrations(): Promise<EventRegistration[]> {
    return await db.select().from(eventRegistrations).orderBy(desc(eventRegistrations.createdAt));
  }

  async createEventRegistration(insertRegistration: InsertEventRegistration): Promise<EventRegistration> {
    const [registration] = await db.insert(eventRegistrations).values(insertRegistration as typeof eventRegistrations.$inferInsert).returning();
    return registration;
  }

  async updateEventRegistration(
    id: number,
    updateRegistration: Partial<InsertEventRegistration> & { checkedInAt?: Date; checkedOutAt?: Date },
  ): Promise<EventRegistration> {
    const [registration] = await db
      .update(eventRegistrations)
      .set({ ...updateRegistration, updatedAt: new Date() } as Partial<typeof eventRegistrations.$inferInsert>)
      .where(eq(eventRegistrations.id, id))
      .returning();
    return registration;
  }

  async getEventComments(eventId: number, includeModerated = false): Promise<EventComment[]> {
    return await db
      .select()
      .from(eventComments)
      .where(
        includeModerated
          ? eq(eventComments.eventId, eventId)
          : and(eq(eventComments.eventId, eventId), eq(eventComments.status, "approved")),
      )
      .orderBy(asc(eventComments.createdAt));
  }

  async createEventComment(insertComment: InsertEventComment): Promise<EventComment> {
    const [comment] = await db.insert(eventComments).values(insertComment).returning();
    return comment;
  }

  async updateEventComment(id: number, updateComment: Partial<InsertEventComment>): Promise<EventComment> {
    const [comment] = await db
      .update(eventComments)
      .set({ ...updateComment, updatedAt: new Date() })
      .where(eq(eventComments.id, id))
      .returning();
    return comment;
  }

  async createEventReaction(insertReaction: InsertEventReaction): Promise<EventReaction> {
    const [reaction] = await db.insert(eventReactions).values(insertReaction).returning();
    return reaction;
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
    const metadata = insertAnalytics.metadata;
    const safeMetadata =
      metadata === undefined
        ? undefined
        : metadata === null
          ? null
          : typeof metadata === "object" && !Array.isArray(metadata)
            ? (metadata as Record<string, unknown>)
            : null;

    const [log] = await db
      .insert(analytics)
      .values({ ...insertAnalytics, metadata: safeMetadata })
      .returning();
    return log;
  }

  async getAnalytics(startDate?: Date, endDate?: Date): Promise<Analytics[]> {
    if (startDate && endDate) {
      return await db
        .select()
        .from(analytics)
        .where(and(
          sql`${analytics.timestamp} >= ${startDate}`,
          sql`${analytics.timestamp} <= ${endDate}`
        ))
        .orderBy(desc(analytics.timestamp));
    }

    return await db.select().from(analytics).orderBy(desc(analytics.timestamp));
  }

  async getAnalyticsSummary(): Promise<any> {
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
      eventRegistrations: eventRegistrationsCount[0].count,
    };
  }

  // Saved Items
  async getSavedItem(id: number): Promise<SavedItem | undefined> {
    const [item] = await db.select().from(savedItems).where(eq(savedItems.id, id));
    return item || undefined;
  }

  async getUserSavedItems(userId: number): Promise<SavedItem[]> {
    return await db
      .select()
      .from(savedItems)
      .where(eq(savedItems.userId, userId))
      .orderBy(desc(savedItems.createdAt));
  }

  async createSavedItem(insertSavedItem: InsertSavedItem): Promise<SavedItem> {
    const [item] = await db.insert(savedItems).values(insertSavedItem).returning();
    return item;
  }

  async deleteSavedItem(id: number): Promise<boolean> {
    const result = await db.delete(savedItems).where(eq(savedItems.id, id));
    return (result as any).rowCount > 0;
  }

  async isItemSaved(userId: number, type: string, referenceId: number): Promise<boolean> {
    const [item] = await db
      .select()
      .from(savedItems)
      .where(and(
        eq(savedItems.userId, userId),
        eq(savedItems.type, type),
        eq(savedItems.referenceId, referenceId)
      ));
    return !!item;
  }

  // Messages
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async getAllMessages(): Promise<Message[]> {
    return await db.select().from(messages).orderBy(desc(messages.createdAt));
  }

  async markMessageRead(id: number): Promise<Message> {
    const [message] = await db
      .update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, id))
      .returning();
    return message;
  }

  async getSubscriberByEmail(email: string): Promise<Subscriber | undefined> {
    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, email.toLowerCase()));
    return subscriber || undefined;
  }

  async getSubscriberByVerificationToken(token: string): Promise<Subscriber | undefined> {
    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.verificationToken, token));
    return subscriber || undefined;
  }

  async getSubscriberByUnsubscribeToken(token: string): Promise<Subscriber | undefined> {
    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.unsubscribeToken, token));
    return subscriber || undefined;
  }

  async getAllSubscribers(): Promise<Subscriber[]> {
    return await db.select().from(subscribers).orderBy(desc(subscribers.createdAt));
  }

  async createSubscriber(insertSubscriber: InsertSubscriber): Promise<Subscriber> {
    const [subscriber] = await db.insert(subscribers).values(insertSubscriber).returning();
    return subscriber;
  }

  async updateSubscriber(id: number, updateSubscriber: Partial<InsertSubscriber>): Promise<Subscriber> {
    const [subscriber] = await db
      .update(subscribers)
      .set({ ...updateSubscriber, updatedAt: new Date() })
      .where(eq(subscribers.id, id))
      .returning();
    return subscriber;
  }

  async createEmailVerificationToken(insertToken: InsertEmailVerificationToken): Promise<EmailVerificationToken> {
    const [token] = await db
      .insert(emailVerificationTokens)
      .values(insertToken as typeof emailVerificationTokens.$inferInsert)
      .returning();
    return token;
  }

  async getEmailVerificationTokenByHash(tokenHash: string): Promise<EmailVerificationToken | undefined> {
    const [token] = await db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.tokenHash, tokenHash));
    return token || undefined;
  }

  async countEmailVerificationRequests(email: string, since: Date): Promise<number> {
    const [result] = await db
      .select({ value: count() })
      .from(emailVerificationTokens)
      .where(and(eq(emailVerificationTokens.email, email.toLowerCase()), gte(emailVerificationTokens.createdAt, since)));
    return Number(result?.value || 0);
  }

  async revokePendingEmailVerificationTokens(userId: number, replacedAt = new Date()): Promise<void> {
    await db
      .update(emailVerificationTokens)
      .set({ status: "replaced", replacedAt })
      .where(and(eq(emailVerificationTokens.userId, userId), eq(emailVerificationTokens.status, "pending")));
  }

  async useEmailVerificationToken(id: number): Promise<EmailVerificationToken> {
    const [token] = await db
      .update(emailVerificationTokens)
      .set({ status: "used", usedAt: new Date() })
      .where(eq(emailVerificationTokens.id, id))
      .returning();
    return token;
  }

  async createEmailJob(insertJob: InsertEmailJob): Promise<EmailJob> {
    const [job] = await db
      .insert(emailJobs)
      .values(insertJob as typeof emailJobs.$inferInsert)
      .returning();
    return job;
  }

  async getEmailJob(id: string): Promise<EmailJob | undefined> {
    const [job] = await db.select().from(emailJobs).where(eq(emailJobs.id, id));
    return job || undefined;
  }

  async getEmailJobByProviderMessageId(providerMessageId: string): Promise<EmailJob | undefined> {
    const [job] = await db
      .select()
      .from(emailJobs)
      .where(eq(emailJobs.providerMessageId, providerMessageId));
    return job || undefined;
  }

  async getDueEmailJobs(limit = 10): Promise<EmailJob[]> {
    return await db
      .select()
      .from(emailJobs)
      .where(
        and(
          inArray(emailJobs.status, ["queued", "retry_scheduled"]),
          lte(emailJobs.scheduledFor, new Date()),
        ),
      )
      .orderBy(asc(emailJobs.priority), asc(emailJobs.scheduledFor), asc(emailJobs.createdAt))
      .limit(limit);
  }

  async markEmailJobProcessing(id: string): Promise<EmailJob | undefined> {
    const [job] = await db
      .update(emailJobs)
      .set({
        status: "processing",
        attempts: sql`${emailJobs.attempts} + 1`,
        processingAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(emailJobs.id, id), inArray(emailJobs.status, ["queued", "retry_scheduled"])))
      .returning();
    return job || undefined;
  }

  async markEmailJobSent(id: string, provider: string, providerMessageId?: string | null): Promise<EmailJob> {
    const [job] = await db
      .update(emailJobs)
      .set({
        status: "sent",
        provider,
        providerMessageId: providerMessageId || null,
        sentAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(emailJobs.id, id))
      .returning();
    return job;
  }

  async markEmailJobFailed(
    id: string,
    error: string,
    scheduledFor?: Date | null,
    finalFailure = false,
  ): Promise<EmailJob> {
    const [job] = await db
      .update(emailJobs)
      .set({
        status: finalFailure ? "failed" : "retry_scheduled",
        lastError: error,
        failedAt: finalFailure ? new Date() : null,
        scheduledFor: scheduledFor || new Date(),
        updatedAt: new Date(),
      })
      .where(eq(emailJobs.id, id))
      .returning();
    return job;
  }

  async createEmailDeliveryEvent(insertEvent: InsertEmailDeliveryEvent): Promise<void> {
    await db
      .insert(emailDeliveryEvents)
      .values(insertEvent as typeof emailDeliveryEvents.$inferInsert);
  }

  async getEmailDeliveryStats(days = 30): Promise<{
    totals: Record<string, number>;
    byCategory: Record<string, Record<string, number>>;
    queue: Record<string, number>;
    recentFailures: EmailJob[];
  }> {
    const since = new Date(Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000);
    const [events, jobs, recentFailures] = await Promise.all([
      db.select().from(emailDeliveryEvents).where(gte(emailDeliveryEvents.createdAt, since)),
      db.select().from(emailJobs).where(gte(emailJobs.createdAt, since)),
      db
        .select()
        .from(emailJobs)
        .where(eq(emailJobs.status, "failed"))
        .orderBy(desc(emailJobs.updatedAt))
        .limit(20),
    ]);

    const totals: Record<string, number> = {};
    const byCategory: Record<string, Record<string, number>> = {};
    const queue: Record<string, number> = {};

    for (const event of events) {
      totals[event.eventType] = (totals[event.eventType] || 0) + 1;
      const category = event.category || "uncategorized";
      byCategory[category] = byCategory[category] || {};
      byCategory[category][event.eventType] = (byCategory[category][event.eventType] || 0) + 1;
    }

    for (const job of jobs) {
      queue[job.status] = (queue[job.status] || 0) + 1;
    }

    return { totals, byCategory, queue, recentFailures };
  }

  async getEmailPreferenceByEmail(email: string): Promise<EmailPreference | undefined> {
    const [preference] = await db
      .select()
      .from(emailPreferences)
      .where(eq(emailPreferences.email, email.toLowerCase()));
    return preference || undefined;
  }

  async getEmailPreferenceByTokenHash(tokenHash: string): Promise<EmailPreference | undefined> {
    const [preference] = await db
      .select()
      .from(emailPreferences)
      .where(eq(emailPreferences.unsubscribeTokenHash, tokenHash));
    return preference || undefined;
  }

  async upsertEmailPreference(insertPreference: InsertEmailPreference): Promise<EmailPreference> {
    const [preference] = await db
      .insert(emailPreferences)
      .values(insertPreference as typeof emailPreferences.$inferInsert)
      .onConflictDoUpdate({
        target: emailPreferences.email,
        set: {
          userId: insertPreference.userId ?? null,
          categories: insertPreference.categories,
          consentStatus: insertPreference.consentStatus,
          consentSource: insertPreference.consentSource ?? null,
          consentAt: insertPreference.consentAt ?? null,
          unsubscribedAt: insertPreference.unsubscribedAt ?? null,
          unsubscribeTokenHash: insertPreference.unsubscribeTokenHash,
          auditTrail: (insertPreference.auditTrail as Array<Record<string, unknown>> | null | undefined) ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return preference;
  }

  async updateEmailPreference(
    id: number,
    updatePreference: Partial<InsertEmailPreference>,
  ): Promise<EmailPreference> {
    const [preference] = await db
      .update(emailPreferences)
      .set({ ...updatePreference, updatedAt: new Date() } as Partial<typeof emailPreferences.$inferInsert>)
      .where(eq(emailPreferences.id, id))
      .returning();
    return preference;
  }
}

export const storage = new DatabaseStorage();
