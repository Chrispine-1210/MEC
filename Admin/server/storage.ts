import { type User, type InsertUser, type Scholarship, type InsertScholarship, type JobOpportunity, type InsertJobOpportunity, type PartnerInstitution, type InsertPartnerInstitution, type BlogPost, type InsertBlogPost, type TeamMember, type InsertTeamMember, type Application, type InsertApplication, type AiChatConversation, type InsertAiChatConversation, type AdminNotification, type InsertAdminNotification, type AuditLog, type InsertAuditLog, type Settings, type InsertSettings } from "@shared/schema";
import { nanoid } from "nanoid";
import bcrypt from "bcrypt";

const DISABLED_ADMIN_PASSWORD_HASH =
  "$2b$12$Q7HwTDwl4rEGtv.HTL/q/e5qI9TeeVXQqzNvnG7yqIuW8xgZi7ffu";

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(limit?: number, offset?: number, search?: string): Promise<{ users: User[], total: number }>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Role methods
  getRoles(): Promise<{ roles: Role[], total: number }>;
  createRole(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role>;
  updateRole(id: string, updates: Partial<Omit<Role, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Role>;
  deleteRole(id: string): Promise<void>;

  // Scholarship methods
  getScholarships(limit?: number, offset?: number, search?: string, status?: string): Promise<{ scholarships: Scholarship[], total: number }>;
  createScholarship(scholarship: InsertScholarship, userId: string): Promise<Scholarship>;
  updateScholarship(id: string, updates: Partial<InsertScholarship>): Promise<Scholarship>;
  deleteScholarship(id: string): Promise<void>;

  // Job Opportunity methods
  getJobOpportunities(limit?: number, offset?: number, search?: string, status?: string): Promise<{ jobs: JobOpportunity[], total: number }>;
  createJobOpportunity(job: InsertJobOpportunity, userId: string): Promise<JobOpportunity>;
  updateJobOpportunity(id: string, updates: Partial<InsertJobOpportunity>): Promise<JobOpportunity>;
  deleteJobOpportunity(id: string): Promise<void>;

  // Partner Institution methods
  getPartnerInstitutions(limit?: number, offset?: number, search?: string): Promise<{ partners: PartnerInstitution[], total: number }>;
  createPartnerInstitution(partner: InsertPartnerInstitution, userId: string): Promise<PartnerInstitution>;
  updatePartnerInstitution(id: string, updates: Partial<InsertPartnerInstitution>): Promise<PartnerInstitution>;
  deletePartnerInstitution(id: string): Promise<void>;

  // Blog post methods
  getBlogPosts(limit?: number, offset?: number, search?: string, status?: string): Promise<{ posts: BlogPost[], total: number }>;
  createBlogPost(post: InsertBlogPost, userId: string): Promise<BlogPost>;
  updateBlogPost(id: string, updates: Partial<InsertBlogPost>): Promise<BlogPost>;
  deleteBlogPost(id: string): Promise<void>;

  // Team member methods
  getTeamMembers(limit?: number, offset?: number, search?: string): Promise<{ members: TeamMember[], total: number }>;
  createTeamMember(member: InsertTeamMember, userId: string): Promise<TeamMember>;
  updateTeamMember(id: string, updates: Partial<InsertTeamMember>): Promise<TeamMember>;
  deleteTeamMember(id: string): Promise<void>;

  // Application methods
  getApplications(limit?: number, offset?: number, search?: string, status?: string): Promise<{ applications: Application[], total: number }>;
  createApplication(application: InsertApplication): Promise<Application>;
  updateApplication(id: string, updates: Partial<InsertApplication>): Promise<Application>;
  deleteApplication(id: string): Promise<void>;

  // AI Chat conversation methods
  getChatConversations(limit?: number, offset?: number): Promise<{ conversations: AiChatConversation[], total: number }>;
  getChatConversation(id: string): Promise<AiChatConversation | undefined>;
  createChatConversation(conversation: InsertAiChatConversation): Promise<AiChatConversation>;
  updateChatConversation(id: string, updates: Partial<InsertAiChatConversation>): Promise<AiChatConversation>;

  // Admin notification methods
  getAdminNotifications(limit?: number, offset?: number, targetUserId?: string): Promise<{ notifications: AdminNotification[], total: number }>;
  createAdminNotification(notification: InsertAdminNotification): Promise<AdminNotification>;
  markNotificationAsRead(id: string): Promise<void>;

  // Platform settings methods
  getSettings(): Promise<Settings>;
  updateSettings(updates: Partial<InsertSettings>): Promise<Settings>;

  // Audit log methods
  getAuditLogs(limit?: number, offset?: number, userId?: string, entityType?: string): Promise<{ logs: AuditLog[], total: number }>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // Analytics methods
  getDashboardStats(): Promise<{
    totalUsers: number;
    totalScholarships: number;
    totalJobs: number;
    totalPartners: number;
    totalBlogPosts: number;
    totalApplications: number;
    totalActiveChats: number;
    activeScholarships: number;
    activeJobs: number;
    pendingApplications: number;
    publishedPosts: number;
    applicationStats: Record<string, number>;
    applicationStatusStats: Record<string, number>;
    contentModerationStats: { flaggedCount: number; approvedCount: number };
    userGrowth: { date: string; count: number }[];
    regionalStats: { region: string; scholarshipCount: number; jobCount: number }[];
    recentActivity: { id: string; action: string; entityType: string; details: string; createdAt: Date }[];
  }>;
}

export class MemStorage implements IStorage {
  private usersMap: Map<string, User>;
  private rolesMap: Map<string, Role>;
  private scholarshipsMap: Map<string, Scholarship>;
  private jobsMap: Map<string, JobOpportunity>;
  private partnersMap: Map<string, PartnerInstitution>;
  private blogMap: Map<string, BlogPost>;
  private teamMap: Map<string, TeamMember>;
  private applicationsMap: Map<string, Application>;
  private chatMap: Map<string, AiChatConversation>;
  private notificationsMap: Map<string, AdminNotification>;
  private auditLogsMap: Map<string, AuditLog>;
  private settings: Settings;

  constructor() {
    this.usersMap = new Map();
    this.rolesMap = new Map();
    this.scholarshipsMap = new Map();
    this.jobsMap = new Map();
    this.partnersMap = new Map();
    this.blogMap = new Map();
    this.teamMap = new Map();
    this.applicationsMap = new Map();
    this.chatMap = new Map();
    this.notificationsMap = new Map();
    this.auditLogsMap = new Map();
    
    // Initialize default settings
    this.settings = {
      id: "default",
      platformName: "Mtendere Education Platform",
      supportEmail: "support@mtendere.com",
      sessionTimeout: 30,
      maxLoginAttempts: 5,
      updatedAt: new Date()
    };

    // Add default super admin only when strong credentials are provided by the environment.
    const defaultAdminId = "default-admin-id";
    const seedSuperAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD || process.env.SUPER_ADMIN_PASSWORD;
    const hashedPassword = seedSuperAdminPassword
      ? bcrypt.hashSync(seedSuperAdminPassword, 12)
      : DISABLED_ADMIN_PASSWORD_HASH;
    this.usersMap.set(defaultAdminId, {
      id: defaultAdminId,
      username: "admin",
      email: "admin@mtendere.com",
      password: hashedPassword,
      firstName: "Mtendere",
      lastName: "Admin",
      profileImage: null,
      role: "super_admin",
      region: "Global",
      isActive: Boolean(seedSuperAdminPassword),
      lastLogin: null,

      mfaEnabled: false,
      totpSecret: null,
      mfaConfirmedAt: null,

      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Seed default roles
    const now = new Date();
    this.rolesMap.set("viewer", { id: "viewer", name: "Viewer", description: "Read-only access to public content", permissions: ["view_dashboard"], createdAt: now, updatedAt: now });
    this.rolesMap.set("writer", { id: "writer", name: "Writer", description: "Can create and edit content", permissions: ["view_dashboard", "manage_scholarships", "manage_jobs", "manage_blog", "manage_partners", "manage_team"], createdAt: now, updatedAt: now });
    this.rolesMap.set("admin", { id: "admin", name: "Administrator", description: "Operational administration access", permissions: ["view_dashboard", "manage_scholarships", "manage_jobs", "manage_partners", "manage_blog", "manage_team", "review_applications", "view_analytics"], createdAt: now, updatedAt: now });
    this.rolesMap.set("super_admin", { id: "super_admin", name: "Super Administrator", description: "Complete system access including settings", permissions: ["view_dashboard", "manage_scholarships", "manage_jobs", "manage_partners", "manage_blog", "manage_team", "manage_users", "review_applications", "manage_roles", "view_analytics", "manage_settings"], createdAt: now, updatedAt: now });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.usersMap.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(u => u.username === username);
  }

  async getUsers(limit: number = 50, offset: number = 0, search: string = ""): Promise<{ users: User[], total: number }> {
    let items = Array.from(this.usersMap.values());
    if (search) {
      items = items.filter(u => u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));
    }
    const total = items.length;
    return { users: items.slice(offset, offset + limit), total };
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = nanoid();
    const newUser: User = {
      ...user,
      id,
      isActive: true,
      profileImage: user.profileImage || null,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      role: user.role || "viewer",
      region: "Global",
      lastLogin: null,

      mfaEnabled: user.mfaEnabled ?? false,
      totpSecret: user.totpSecret ?? null,
      mfaConfirmedAt: user.mfaConfirmedAt ?? null,

      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.usersMap.set(id, newUser);
    return newUser;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) throw new Error("User not found");
    const updatedUser = { ...user, ...updates, updatedAt: new Date() } as User;
    this.usersMap.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    this.usersMap.delete(id);
  }

  async getRoles(): Promise<{ roles: Role[], total: number }> {
    const roles = Array.from(this.rolesMap.values()).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return { roles, total: roles.length };
  }

  async createRole(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role> {
    const id = nanoid();
    const newRole: Role = { ...role, id, createdAt: new Date(), updatedAt: new Date() };
    this.rolesMap.set(id, newRole);
    return newRole;
  }

  async updateRole(id: string, updates: Partial<Omit<Role, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Role> {
    const role = this.rolesMap.get(id);
    if (!role) throw new Error("Role not found");
    const updated = { ...role, ...updates, updatedAt: new Date() };
    this.rolesMap.set(id, updated);
    return updated;
  }

  async deleteRole(id: string): Promise<void> {
    this.rolesMap.delete(id);
  }

  async getScholarships(limit: number = 50, offset: number = 0, search: string = "", status: string = ""): Promise<{ scholarships: Scholarship[], total: number }> {
    let items = Array.from(this.scholarshipsMap.values());
    if (search) {
      items = items.filter(s => s.title.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase()));
    }
    if (status) {
      items = items.filter(s => s.status === status);
    }
    const total = items.length;
    return { scholarships: items.slice(offset, offset + limit), total };
  }

  async createScholarship(scholarship: InsertScholarship, userId: string): Promise<Scholarship> {
    const id = nanoid();
    const item: Scholarship = {
      ...scholarship,
      id,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      region: scholarship.region || "Global",
      isPremium: scholarship.isPremium || false,
      paymentStatus: scholarship.paymentStatus || "unpaid",
      status: scholarship.status || "draft",
      amount: scholarship.amount || null,
      requirements: scholarship.requirements || null,
      featuredImage: scholarship.featuredImage || null,
    };
    this.scholarshipsMap.set(id, item);
    return item;
  }

  async updateScholarship(id: string, updates: Partial<InsertScholarship>): Promise<Scholarship> {
    const item = this.scholarshipsMap.get(id);
    if (!item) throw new Error("Scholarship not found");
    const updated = { ...item, ...updates, updatedAt: new Date() } as Scholarship;
    this.scholarshipsMap.set(id, updated);
    return updated;
  }

  async deleteScholarship(id: string): Promise<void> {
    this.scholarshipsMap.delete(id);
  }

  async getJobOpportunities(limit: number = 50, offset: number = 0, search: string = "", status: string = ""): Promise<{ jobs: JobOpportunity[], total: number }> {
    let items = Array.from(this.jobsMap.values());
    if (search) {
      items = items.filter(j => j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase()));
    }
    if (status) {
      items = items.filter(j => j.status === status);
    }
    const total = items.length;
    return { jobs: items.slice(offset, offset + limit), total };
  }

  async createJobOpportunity(job: InsertJobOpportunity, userId: string): Promise<JobOpportunity> {
    const id = nanoid();
    const item: JobOpportunity = {
      ...job,
      id,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      region: job.region || "Global",
      isPremium: job.isPremium || false,
      paymentStatus: job.paymentStatus || "unpaid",
      status: job.status || "draft",
      salaryRange: job.salaryRange || null,
      requirements: job.requirements || null,
      benefits: job.benefits || null,
      applicationUrl: job.applicationUrl || null,
      deadline: job.deadline || null,
      price: job.price || null,
      featuredImage: job.featuredImage || null,
    };
    this.jobsMap.set(id, item);
    return item;
  }

  async updateJobOpportunity(id: string, updates: Partial<InsertJobOpportunity>): Promise<JobOpportunity> {
    const item = this.jobsMap.get(id);
    if (!item) throw new Error("Job opportunity not found");
    const updated = { ...item, ...updates, updatedAt: new Date() } as JobOpportunity;
    this.jobsMap.set(id, updated);
    return updated;
  }

  async deleteJobOpportunity(id: string): Promise<void> {
    this.jobsMap.delete(id);
  }

  async getPartnerInstitutions(limit: number = 50, offset: number = 0, search: string = ""): Promise<{ partners: PartnerInstitution[], total: number }> {
    let items = Array.from(this.partnersMap.values());
    if (search) {
      items = items.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    }
    const total = items.length;
    return { partners: items.slice(offset, offset + limit), total };
  }

  async createPartnerInstitution(partner: InsertPartnerInstitution, userId: string): Promise<PartnerInstitution> {
    const id = nanoid();
    const item: PartnerInstitution = {
      ...partner,
      id,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      region: partner.region || "Global",
      isPremium: partner.isPremium || false,
      paymentStatus: partner.paymentStatus || "unpaid",
      isActive: partner.isActive ?? true,
      logo: partner.logo || null,
      coverImage: partner.coverImage || null,
      website: partner.website || null,
      contactName: partner.contactName || null,
      contactEmail: partner.contactEmail || null,
      contactPhone: partner.contactPhone || null,
      socialLinks: partner.socialLinks || null,
      industryCategory: partner.industryCategory || null,
      partnershipLevel: partner.partnershipLevel || null,
      sponsorshipTier: partner.sponsorshipTier || null,
      status: partner.status || "active",
      country: partner.country || "Global",
      address: partner.address || null,
      documents: partner.documents || null,
      agreements: partner.agreements || null,
      notes: partner.notes || null,
      internalComments: partner.internalComments || null,
      linkedEvents: partner.linkedEvents || null,
      linkedSponsorships: partner.linkedSponsorships || null,
      linkedOpportunities: partner.linkedOpportunities || null,
      partnershipHistory: partner.partnershipHistory || null,
      videoUrl: partner.videoUrl || null,
      videoTitle: partner.videoTitle || null,
      videoDescription: partner.videoDescription || null,
      isFeatured: partner.isFeatured ?? false,
    };
    this.partnersMap.set(id, item);
    return item;
  }

  async updatePartnerInstitution(id: string, updates: Partial<InsertPartnerInstitution>): Promise<PartnerInstitution> {
    const item = this.partnersMap.get(id);
    if (!item) throw new Error("Partner institution not found");
    const updated = { ...item, ...updates, updatedAt: new Date() } as PartnerInstitution;
    this.partnersMap.set(id, updated);
    return updated;
  }

  async deletePartnerInstitution(id: string): Promise<void> {
    this.partnersMap.delete(id);
  }

  async getBlogPosts(limit: number = 50, offset: number = 0, search: string = "", status: string = ""): Promise<{ posts: BlogPost[], total: number }> {
    let items = Array.from(this.blogMap.values());
    if (search) {
      items = items.filter(b => b.title.toLowerCase().includes(search.toLowerCase()));
    }
    if (status) {
      items = items.filter(b => b.status === status);
    }
    const total = items.length;
    return { posts: items.slice(offset, offset + limit), total };
  }

  async createBlogPost(post: InsertBlogPost, userId: string): Promise<BlogPost> {
    const id = nanoid();
    const item: BlogPost = {
      ...post,
      id,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: post.status || "draft",
      featuredImage: post.featuredImage || null,
      excerpt: post.excerpt || null,
      tags: post.tags || null,
      publishedAt: post.publishedAt || null,
    };
    this.blogMap.set(id, item);
    return item;
  }

  async updateBlogPost(id: string, updates: Partial<InsertBlogPost>): Promise<BlogPost> {
    const item = this.blogMap.get(id);
    if (!item) throw new Error("Blog post not found");
    const updated = { ...item, ...updates, updatedAt: new Date() } as BlogPost;
    this.blogMap.set(id, updated);
    return updated;
  }

  async deleteBlogPost(id: string): Promise<void> {
    this.blogMap.delete(id);
  }

  async getTeamMembers(limit: number = 50, offset: number = 0, search: string = ""): Promise<{ members: TeamMember[], total: number }> {
    let items = Array.from(this.teamMap.values());
    if (search) {
      items = items.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
    }
    const total = items.length;
    return { members: items.slice(offset, offset + limit), total };
  }

  async createTeamMember(member: InsertTeamMember, userId: string): Promise<TeamMember> {
    const id = nanoid();
    const item: TeamMember = {
      ...member,
      id,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: member.isActive ?? true,
      email: member.email || null,
      profileImage: member.profileImage || null,
      bio: member.bio || null,
      linkedIn: member.linkedIn || null,
      twitter: member.twitter || null,
      department: member.department || null,
      order: member.order || 0,
    };
    this.teamMap.set(id, item);
    return item;
  }

  async updateTeamMember(id: string, updates: Partial<InsertTeamMember>): Promise<TeamMember> {
    const item = this.teamMap.get(id);
    if (!item) throw new Error("Team member not found");
    const updated = { ...item, ...updates, updatedAt: new Date() } as TeamMember;
    this.teamMap.set(id, updated);
    return updated;
  }

  async deleteTeamMember(id: string): Promise<void> {
    this.teamMap.delete(id);
  }

  async getApplications(limit: number = 50, offset: number = 0, search: string = "", status: string = ""): Promise<{ applications: Application[], total: number }> {
    let items = Array.from(this.applicationsMap.values());
    if (status) {
      items = items.filter(a => a.status === status);
    }
    const total = items.length;
    return { applications: items.slice(offset, offset + limit), total };
  }

  async createApplication(application: InsertApplication): Promise<Application> {
    const id = nanoid();
    const item: Application = {
      ...application,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: application.status || "pending",
      scholarshipId: application.scholarshipId || null,
      jobId: application.jobId || null,
      reviewNotes: application.reviewNotes || null,
      reviewedBy: application.reviewedBy || null,
      reviewedAt: application.reviewedAt || null,
    };
    this.applicationsMap.set(id, item);
    return item;
  }

  async updateApplication(id: string, updates: Partial<InsertApplication>): Promise<Application> {
    const item = this.applicationsMap.get(id);
    if (!item) throw new Error("Application not found");
    const updated = { ...item, ...updates, updatedAt: new Date() } as Application;
    this.applicationsMap.set(id, updated);
    return updated;
  }

  async deleteApplication(id: string): Promise<void> {
    this.applicationsMap.delete(id);
  }

  async getChatConversations(limit: number = 50, offset: number = 0): Promise<{ conversations: AiChatConversation[], total: number }> {
    const items = Array.from(this.chatMap.values());
    const total = items.length;
    return { conversations: items.slice(offset, offset + limit), total };
  }

  async getChatConversation(id: string): Promise<AiChatConversation | undefined> {
    return this.chatMap.get(id);
  }

  async createChatConversation(conversation: InsertAiChatConversation): Promise<AiChatConversation> {
    const id = nanoid();
    const item: AiChatConversation = {
      ...conversation,
      id,
      isActive: conversation.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
      summary: conversation.summary || null,
      moderationFlags: conversation.moderationFlags || null,
    };
    this.chatMap.set(id, item);
    return item;
  }

  async updateChatConversation(id: string, updates: Partial<InsertAiChatConversation>): Promise<AiChatConversation> {
    const item = this.chatMap.get(id);
    if (!item) throw new Error("Conversation not found");
    const updated = { ...item, ...updates, updatedAt: new Date() } as AiChatConversation;
    this.chatMap.set(id, updated);
    return updated;
  }

  async getAdminNotifications(limit: number = 50, offset: number = 0, targetUserId?: string): Promise<{ notifications: AdminNotification[], total: number }> {
    let items = Array.from(this.notificationsMap.values());
    if (targetUserId) {
      items = items.filter(n => n.targetUserId === targetUserId || !n.targetUserId);
    }
    const total = items.length;
    return { notifications: items.slice(offset, offset + limit), total };
  }

  async createAdminNotification(notification: InsertAdminNotification): Promise<AdminNotification> {
    const id = nanoid();
    const item: AdminNotification = {
      ...notification,
      id,
      isRead: false,
      createdAt: new Date(),
      targetUserId: notification.targetUserId || null,
      metadata: notification.metadata || null,
    };
    this.notificationsMap.set(id, item);
    return item;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    const item = this.notificationsMap.get(id);
    if (item) {
      this.notificationsMap.set(id, { ...item, isRead: true });
    }
  }

  async getAuditLogs(limit: number = 50, offset: number = 0, userId?: string, entityType?: string): Promise<{ logs: AuditLog[], total: number }> {
    let items = Array.from(this.auditLogsMap.values());
    if (userId) items = items.filter(l => l.userId === userId);
    if (entityType) items = items.filter(l => l.entityType === entityType);
    const total = items.length;
    return { logs: items.slice(offset, offset + limit), total };
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const id = nanoid();
    const item: AuditLog = {
      ...log,
      id,
      createdAt: new Date(),
      entityId: log.entityId || null,
      oldData: log.oldData || null,
      newData: log.newData || null,
      ipAddress: log.ipAddress || null,
      userAgent: log.userAgent || null,
    };
    this.auditLogsMap.set(id, item);
    return item;
  }

  async getSettings(): Promise<Settings> {
    return this.settings;
  }

  async updateSettings(updates: Partial<InsertSettings>): Promise<Settings> {
    this.settings = { ...this.settings, ...updates, updatedAt: new Date() };
    return this.settings;
  }

  async getDashboardStats() {
    const applicationStatusStats = Array.from(this.applicationsMap.values()).reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const activeScholarships = Array.from(this.scholarshipsMap.values()).filter(s => s.status === "published").length;
    const activeJobs = Array.from(this.jobsMap.values()).filter(j => j.status === "published").length;
    const pendingApplications = Array.from(this.applicationsMap.values()).filter(a => a.status === "pending").length;
    const publishedPosts = Array.from(this.blogMap.values()).filter(b => b.status === "published").length;

    const recentLogs = Array.from(this.auditLogsMap.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10)
      .map(l => ({ id: l.id, action: l.action, entityType: l.entityType, details: `${l.action} ${l.entityType}`, createdAt: l.createdAt }));

    return {
      totalUsers: this.usersMap.size,
      totalScholarships: this.scholarshipsMap.size,
      totalJobs: this.jobsMap.size,
      totalPartners: this.partnersMap.size,
      totalBlogPosts: this.blogMap.size,
      totalApplications: this.applicationsMap.size,
      totalActiveChats: Array.from(this.chatMap.values()).filter(c => c.isActive).length,
      activeScholarships,
      activeJobs,
      pendingApplications,
      publishedPosts,
      applicationStats: applicationStatusStats,
      applicationStatusStats,
      contentModerationStats: { flaggedCount: 0, approvedCount: this.scholarshipsMap.size + this.jobsMap.size },
      userGrowth: [{ date: new Date().toISOString().split('T')[0], count: this.usersMap.size }],
      regionalStats: [{ region: "Global", scholarshipCount: this.scholarshipsMap.size, jobCount: this.jobsMap.size }],
      recentActivity: recentLogs,
    };
  }
}

import { DatabaseStorage } from "./db-storage";

export const storage: IStorage = new DatabaseStorage();

// Seed default admin on startup
(storage as DatabaseStorage).seed?.().catch(console.error);
