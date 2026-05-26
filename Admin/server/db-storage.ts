import { eq, ilike, and, or, desc, count, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users, scholarships, jobOpportunities, partnerInstitutions,
  blogPosts, teamMembers, applications, aiChatConversations,
  adminNotifications, auditLogs, settings as settingsTable,
  type User, type InsertUser, type Scholarship, type InsertScholarship,
  type JobOpportunity, type InsertJobOpportunity,
  type PartnerInstitution, type InsertPartnerInstitution,
  type BlogPost, type InsertBlogPost,
  type TeamMember, type InsertTeamMember,
  type Application, type InsertApplication,
  type AiChatConversation, type InsertAiChatConversation,
  type AdminNotification, type InsertAdminNotification,
  type AuditLog, type InsertAuditLog,
  type Settings, type InsertSettings,
} from "@shared/schema";
import { type IStorage, type Role } from "./storage";
import { nanoid } from "nanoid";
import bcrypt from "bcrypt";

export class DatabaseStorage implements IStorage {

  // ─── Users ──────────────────────────────────────────────────────────────────
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUsers(limit = 50, offset = 0, search = ""): Promise<{ users: User[]; total: number }> {
    const where = search
      ? or(ilike(users.username, `%${search}%`), ilike(users.email, `%${search}%`))
      : undefined;

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(users)
      .where(where);

    const rows = await db
      .select()
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    return { users: rows, total: Number(total) };
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = nanoid();
    const [created] = await db
      .insert(users)
      .values({ ...user, id })
      .returning();
    return created;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    if (!updated) throw new Error("User not found");
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // ─── Roles (kept in-memory as they don't need DB persistence for now) ────────
  private rolesMap: Map<string, Role> = (() => {
    const m = new Map<string, Role>();
    const now = new Date();
    m.set("viewer", { id: "viewer", name: "Viewer", description: "Read-only access to public content", permissions: ["view_dashboard"], createdAt: now, updatedAt: now });
    m.set("writer", { id: "writer", name: "Writer", description: "Can create and edit content", permissions: ["view_dashboard", "manage_scholarships", "manage_jobs", "manage_blog", "manage_partners", "manage_team"], createdAt: now, updatedAt: now });
    m.set("super_admin", { id: "super_admin", name: "Super Administrator", description: "Complete system access including settings", permissions: ["view_dashboard", "manage_scholarships", "manage_jobs", "manage_partners", "manage_blog", "manage_team", "manage_users", "review_applications", "manage_roles", "view_analytics", "manage_settings"], createdAt: now, updatedAt: now });
    return m;
  })();

  async getRoles(): Promise<{ roles: Role[]; total: number }> {
    const roles = Array.from(this.rolesMap.values()).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return { roles, total: roles.length };
  }

  async createRole(role: Omit<Role, "id" | "createdAt" | "updatedAt">): Promise<Role> {
    const id = nanoid();
    const newRole: Role = { ...role, id, createdAt: new Date(), updatedAt: new Date() };
    this.rolesMap.set(id, newRole);
    return newRole;
  }

  async updateRole(id: string, updates: Partial<Omit<Role, "id" | "createdAt" | "updatedAt">>): Promise<Role> {
    const role = this.rolesMap.get(id);
    if (!role) throw new Error("Role not found");
    const updated = { ...role, ...updates, updatedAt: new Date() };
    this.rolesMap.set(id, updated);
    return updated;
  }

  async deleteRole(id: string): Promise<void> {
    this.rolesMap.delete(id);
  }

  // ─── Scholarships ────────────────────────────────────────────────────────────
  async getScholarships(limit = 50, offset = 0, search = "", status = ""): Promise<{ scholarships: Scholarship[]; total: number }> {
    const conditions = [];
    if (search) conditions.push(or(ilike(scholarships.title, `%${search}%`), ilike(scholarships.description, `%${search}%`)));
    if (status) conditions.push(eq(scholarships.status, status as any));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ value: total }] = await db.select({ value: count() }).from(scholarships).where(where);
    const rows = await db.select().from(scholarships).where(where).orderBy(desc(scholarships.createdAt)).limit(limit).offset(offset);
    return { scholarships: rows, total: Number(total) };
  }

  async createScholarship(scholarship: InsertScholarship, userId: string): Promise<Scholarship> {
    const id = nanoid();
    const [created] = await db.insert(scholarships).values({ ...scholarship, id, createdBy: userId }).returning();
    return created;
  }

  async updateScholarship(id: string, updates: Partial<InsertScholarship>): Promise<Scholarship> {
    const [updated] = await db.update(scholarships).set({ ...updates, updatedAt: new Date() }).where(eq(scholarships.id, id)).returning();
    if (!updated) throw new Error("Scholarship not found");
    return updated;
  }

  async deleteScholarship(id: string): Promise<void> {
    await db.delete(scholarships).where(eq(scholarships.id, id));
  }

  // ─── Job Opportunities ───────────────────────────────────────────────────────
  async getJobOpportunities(limit = 50, offset = 0, search = "", status = ""): Promise<{ jobs: JobOpportunity[]; total: number }> {
    const conditions = [];
    if (search) conditions.push(or(ilike(jobOpportunities.title, `%${search}%`), ilike(jobOpportunities.company, `%${search}%`)));
    if (status) conditions.push(eq(jobOpportunities.status, status as any));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ value: total }] = await db.select({ value: count() }).from(jobOpportunities).where(where);
    const rows = await db.select().from(jobOpportunities).where(where).orderBy(desc(jobOpportunities.createdAt)).limit(limit).offset(offset);
    return { jobs: rows, total: Number(total) };
  }

  async createJobOpportunity(job: InsertJobOpportunity, userId: string): Promise<JobOpportunity> {
    const id = nanoid();
    const [created] = await db.insert(jobOpportunities).values({ ...job, id, createdBy: userId }).returning();
    return created;
  }

  async updateJobOpportunity(id: string, updates: Partial<InsertJobOpportunity>): Promise<JobOpportunity> {
    const [updated] = await db.update(jobOpportunities).set({ ...updates, updatedAt: new Date() }).where(eq(jobOpportunities.id, id)).returning();
    if (!updated) throw new Error("Job opportunity not found");
    return updated;
  }

  async deleteJobOpportunity(id: string): Promise<void> {
    await db.delete(jobOpportunities).where(eq(jobOpportunities.id, id));
  }

  // ─── Partner Institutions ────────────────────────────────────────────────────
  async getPartnerInstitutions(limit = 50, offset = 0, search = ""): Promise<{ partners: PartnerInstitution[]; total: number }> {
    const where = search ? ilike(partnerInstitutions.name, `%${search}%`) : undefined;
    const [{ value: total }] = await db.select({ value: count() }).from(partnerInstitutions).where(where);
    const rows = await db.select().from(partnerInstitutions).where(where).orderBy(desc(partnerInstitutions.createdAt)).limit(limit).offset(offset);
    return { partners: rows, total: Number(total) };
  }

  async createPartnerInstitution(partner: InsertPartnerInstitution, userId: string): Promise<PartnerInstitution> {
    const id = nanoid();
    const [created] = await db.insert(partnerInstitutions).values({ ...partner, id, createdBy: userId }).returning();
    return created;
  }

  async updatePartnerInstitution(id: string, updates: Partial<InsertPartnerInstitution>): Promise<PartnerInstitution> {
    const [updated] = await db.update(partnerInstitutions).set({ ...updates, updatedAt: new Date() }).where(eq(partnerInstitutions.id, id)).returning();
    if (!updated) throw new Error("Partner institution not found");
    return updated;
  }

  async deletePartnerInstitution(id: string): Promise<void> {
    await db.delete(partnerInstitutions).where(eq(partnerInstitutions.id, id));
  }

  // ─── Blog Posts ──────────────────────────────────────────────────────────────
  async getBlogPosts(limit = 50, offset = 0, search = "", status = ""): Promise<{ posts: BlogPost[]; total: number }> {
    const conditions = [];
    if (search) conditions.push(ilike(blogPosts.title, `%${search}%`));
    if (status) conditions.push(eq(blogPosts.status, status as any));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ value: total }] = await db.select({ value: count() }).from(blogPosts).where(where);
    const rows = await db.select().from(blogPosts).where(where).orderBy(desc(blogPosts.createdAt)).limit(limit).offset(offset);
    return { posts: rows, total: Number(total) };
  }

  async createBlogPost(post: InsertBlogPost, userId: string): Promise<BlogPost> {
    const id = nanoid();
    const [created] = await db.insert(blogPosts).values({ ...post, id, createdBy: userId }).returning();
    return created;
  }

  async updateBlogPost(id: string, updates: Partial<InsertBlogPost>): Promise<BlogPost> {
    const [updated] = await db.update(blogPosts).set({ ...updates, updatedAt: new Date() }).where(eq(blogPosts.id, id)).returning();
    if (!updated) throw new Error("Blog post not found");
    return updated;
  }

  async deleteBlogPost(id: string): Promise<void> {
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
  }

  // ─── Team Members ────────────────────────────────────────────────────────────
  async getTeamMembers(limit = 50, offset = 0, search = ""): Promise<{ members: TeamMember[]; total: number }> {
    const where = search ? ilike(teamMembers.name, `%${search}%`) : undefined;
    const [{ value: total }] = await db.select({ value: count() }).from(teamMembers).where(where);
    const rows = await db.select().from(teamMembers).where(where).orderBy(teamMembers.order, desc(teamMembers.createdAt)).limit(limit).offset(offset);
    return { members: rows, total: Number(total) };
  }

  async createTeamMember(member: InsertTeamMember, userId: string): Promise<TeamMember> {
    const id = nanoid();
    const [created] = await db.insert(teamMembers).values({ ...member, id, createdBy: userId }).returning();
    return created;
  }

  async updateTeamMember(id: string, updates: Partial<InsertTeamMember>): Promise<TeamMember> {
    const [updated] = await db.update(teamMembers).set({ ...updates, updatedAt: new Date() }).where(eq(teamMembers.id, id)).returning();
    if (!updated) throw new Error("Team member not found");
    return updated;
  }

  async deleteTeamMember(id: string): Promise<void> {
    await db.delete(teamMembers).where(eq(teamMembers.id, id));
  }

  // ─── Applications ────────────────────────────────────────────────────────────
  async getApplications(limit = 50, offset = 0, search = "", status = ""): Promise<{ applications: Application[]; total: number }> {
    const conditions = [];
    if (status) conditions.push(eq(applications.status, status as any));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ value: total }] = await db.select({ value: count() }).from(applications).where(where);
    const rows = await db.select().from(applications).where(where).orderBy(desc(applications.createdAt)).limit(limit).offset(offset);
    return { applications: rows, total: Number(total) };
  }

  async createApplication(application: InsertApplication): Promise<Application> {
    const id = nanoid();
    const [created] = await db.insert(applications).values({ ...application, id }).returning();
    return created;
  }

  async updateApplication(id: string, updates: Partial<InsertApplication>): Promise<Application> {
    const [updated] = await db.update(applications).set({ ...updates, updatedAt: new Date() }).where(eq(applications.id, id)).returning();
    if (!updated) throw new Error("Application not found");
    return updated;
  }

  async deleteApplication(id: string): Promise<void> {
    await db.delete(applications).where(eq(applications.id, id));
  }

  // ─── AI Chat ─────────────────────────────────────────────────────────────────
  async getChatConversations(limit = 50, offset = 0): Promise<{ conversations: AiChatConversation[]; total: number }> {
    const [{ value: total }] = await db.select({ value: count() }).from(aiChatConversations);
    const rows = await db.select().from(aiChatConversations).orderBy(desc(aiChatConversations.createdAt)).limit(limit).offset(offset);
    return { conversations: rows, total: Number(total) };
  }

  async getChatConversation(id: string): Promise<AiChatConversation | undefined> {
    const [row] = await db.select().from(aiChatConversations).where(eq(aiChatConversations.id, id));
    return row;
  }

  async createChatConversation(conversation: InsertAiChatConversation): Promise<AiChatConversation> {
    const id = nanoid();
    const [created] = await db.insert(aiChatConversations).values({ ...conversation, id }).returning();
    return created;
  }

  async updateChatConversation(id: string, updates: Partial<InsertAiChatConversation>): Promise<AiChatConversation> {
    const [updated] = await db.update(aiChatConversations).set({ ...updates, updatedAt: new Date() }).where(eq(aiChatConversations.id, id)).returning();
    if (!updated) throw new Error("Conversation not found");
    return updated;
  }

  // ─── Admin Notifications ─────────────────────────────────────────────────────
  async getAdminNotifications(limit = 20, offset = 0, targetUserId?: string): Promise<{ notifications: AdminNotification[]; total: number }> {
    const where = targetUserId ? eq(adminNotifications.targetUserId, targetUserId) : undefined;
    const [{ value: total }] = await db.select({ value: count() }).from(adminNotifications).where(where);
    const rows = await db.select().from(adminNotifications).where(where).orderBy(desc(adminNotifications.createdAt)).limit(limit).offset(offset);
    return { notifications: rows, total: Number(total) };
  }

  async createAdminNotification(notification: InsertAdminNotification): Promise<AdminNotification> {
    const id = nanoid();
    const [created] = await db.insert(adminNotifications).values({ ...notification, id }).returning();
    return created;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db.update(adminNotifications).set({ isRead: true }).where(eq(adminNotifications.id, id));
  }

  // ─── Settings ────────────────────────────────────────────────────────────────
  async getSettings(): Promise<Settings> {
    const rows = await db.select().from(settingsTable).limit(1);
    if (rows.length > 0) return rows[0];
    const [created] = await db.insert(settingsTable).values({ id: "default", platformName: "Mtendere Education Platform", supportEmail: "support@mtendere.com", sessionTimeout: 30, maxLoginAttempts: 5 }).returning();
    return created;
  }

  async updateSettings(updates: Partial<InsertSettings>): Promise<Settings> {
    const current = await this.getSettings();
    const [updated] = await db.update(settingsTable).set({ ...updates, updatedAt: new Date() }).where(eq(settingsTable.id, current.id)).returning();
    return updated;
  }

  // ─── Audit Logs ──────────────────────────────────────────────────────────────
  async getAuditLogs(limit = 50, offset = 0, userId?: string, entityType?: string): Promise<{ logs: AuditLog[]; total: number }> {
    const conditions = [];
    if (userId) conditions.push(eq(auditLogs.userId, userId));
    if (entityType) conditions.push(eq(auditLogs.entityType, entityType));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ value: total }] = await db.select({ value: count() }).from(auditLogs).where(where);
    const rows = await db.select().from(auditLogs).where(where).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset);
    return { logs: rows, total: Number(total) };
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const id = nanoid();
    const [created] = await db.insert(auditLogs).values({ ...log, id }).returning();
    return created;
  }

  // ─── Dashboard Stats ─────────────────────────────────────────────────────────
  async getDashboardStats() {
    const [[{ totalUsers }], [{ totalScholarships }], [{ totalJobs }], [{ totalPartners }], [{ totalBlogPosts }], [{ totalApplications }], [{ totalActiveChats }]] = await Promise.all([
      db.select({ totalUsers: count() }).from(users),
      db.select({ totalScholarships: count() }).from(scholarships),
      db.select({ totalJobs: count() }).from(jobOpportunities),
      db.select({ totalPartners: count() }).from(partnerInstitutions),
      db.select({ totalBlogPosts: count() }).from(blogPosts),
      db.select({ totalApplications: count() }).from(applications),
      db.select({ totalActiveChats: count() }).from(aiChatConversations).where(eq(aiChatConversations.isActive, true)),
    ]);

    const [[{ activeScholarships }], [{ activeJobs }], [{ pendingApplications }], [{ publishedPosts }]] = await Promise.all([
      db.select({ activeScholarships: count() }).from(scholarships).where(eq(scholarships.status, "published")),
      db.select({ activeJobs: count() }).from(jobOpportunities).where(eq(jobOpportunities.status, "published")),
      db.select({ pendingApplications: count() }).from(applications).where(eq(applications.status, "pending")),
      db.select({ publishedPosts: count() }).from(blogPosts).where(eq(blogPosts.status, "published")),
    ]);

    const appStatusRows = await db.select({ status: applications.status, cnt: count() }).from(applications).groupBy(applications.status);
    const applicationStats: Record<string, number> = {};
    for (const r of appStatusRows) applicationStats[r.status] = Number(r.cnt);

    const recentLogs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(10);
    const recentActivity = recentLogs.map(l => ({ id: l.id, action: l.action, entityType: l.entityType, details: `${l.action} ${l.entityType}`, createdAt: l.createdAt }));

    return {
      totalUsers: Number(totalUsers),
      totalScholarships: Number(totalScholarships),
      totalJobs: Number(totalJobs),
      totalPartners: Number(totalPartners),
      totalBlogPosts: Number(totalBlogPosts),
      totalApplications: Number(totalApplications),
      totalActiveChats: Number(totalActiveChats),
      activeScholarships: Number(activeScholarships),
      activeJobs: Number(activeJobs),
      pendingApplications: Number(pendingApplications),
      publishedPosts: Number(publishedPosts),
      applicationStats,
      applicationStatusStats: applicationStats,
      contentModerationStats: { flaggedCount: 0, approvedCount: Number(totalScholarships) + Number(totalJobs) },
      userGrowth: [{ date: new Date().toISOString().split("T")[0], count: Number(totalUsers) }],
      regionalStats: [{ region: "Global", scholarshipCount: Number(totalScholarships), jobCount: Number(totalJobs) }],
      recentActivity,
    };
  }

  // ─── Seed admin user if DB is empty ─────────────────────────────────────────
  async seed() {
    const existingAdmin = await this.getUserByUsername("admin");
    if (!existingAdmin) {
      const password = process.env.SEED_SUPER_ADMIN_PASSWORD || process.env.SUPER_ADMIN_PASSWORD;
      if (!password) throw new Error("SEED_SUPER_ADMIN_PASSWORD is required to seed a super admin");
      const hashedPassword = await bcrypt.hash(password, 12);
      await this.createUser({
        username: "admin",
        email: process.env.SEED_SUPER_ADMIN_EMAIL || "admin@mtendere.com",
        password: hashedPassword,
        firstName: "Mtendere",
        lastName: "Admin",
        role: "super_admin",
      });
      console.log("[db] Seeded super admin user from environment credentials");
    }
  }
}
