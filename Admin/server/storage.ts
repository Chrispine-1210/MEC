import { 
  users, scholarships, jobOpportunities, partnerInstitutions, 
  blogPosts, teamMembers, applications, aiChatConversations,
  adminNotifications, auditLogs,
  type User, type InsertUser, type Scholarship, type InsertScholarship,
  type JobOpportunity, type InsertJobOpportunity, type PartnerInstitution, 
  type InsertPartnerInstitution, type BlogPost, type InsertBlogPost,
  type TeamMember, type InsertTeamMember, type Application, type InsertApplication,
  type AiChatConversation, type InsertAiChatConversation,
  type AdminNotification, type InsertAdminNotification,
  type AuditLog, type InsertAuditLog
} from "@shared/schema";
import { nanoid } from "nanoid";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  getUsers(limit?: number, offset?: number, search?: string): Promise<{ users: User[], total: number }>;

  // Scholarship methods
  getScholarships(limit?: number, offset?: number, search?: string, status?: string): Promise<{ scholarships: Scholarship[], total: number }>;
  getScholarship(id: string): Promise<Scholarship | undefined>;
  createScholarship(scholarship: InsertScholarship, createdBy: string): Promise<Scholarship>;
  updateScholarship(id: string, updates: Partial<InsertScholarship>): Promise<Scholarship>;
  deleteScholarship(id: string): Promise<void>;

  // Job opportunity methods
  getJobOpportunities(limit?: number, offset?: number, search?: string, status?: string): Promise<{ jobs: JobOpportunity[], total: number }>;
  getJobOpportunity(id: string): Promise<JobOpportunity | undefined>;
  createJobOpportunity(job: InsertJobOpportunity, createdBy: string): Promise<JobOpportunity>;
  updateJobOpportunity(id: string, updates: Partial<InsertJobOpportunity>): Promise<JobOpportunity>;
  deleteJobOpportunity(id: string): Promise<void>;

  // Partner institution methods
  getPartnerInstitutions(limit?: number, offset?: number, search?: string): Promise<{ partners: PartnerInstitution[], total: number }>;
  getPartnerInstitution(id: string): Promise<PartnerInstitution | undefined>;
  createPartnerInstitution(partner: InsertPartnerInstitution, createdBy: string): Promise<PartnerInstitution>;
  updatePartnerInstitution(id: string, updates: Partial<InsertPartnerInstitution>): Promise<PartnerInstitution>;
  deletePartnerInstitution(id: string): Promise<void>;

  // Blog post methods
  getBlogPosts(limit?: number, offset?: number, search?: string, status?: string): Promise<{ posts: BlogPost[], total: number }>;
  getBlogPost(id: string): Promise<BlogPost | undefined>;
  createBlogPost(post: InsertBlogPost, createdBy: string): Promise<BlogPost>;
  updateBlogPost(id: string, updates: Partial<InsertBlogPost>): Promise<BlogPost>;
  deleteBlogPost(id: string): Promise<void>;

  // Team member methods
  getTeamMembers(limit?: number, offset?: number, search?: string): Promise<{ members: TeamMember[], total: number }>;
  getTeamMember(id: string): Promise<TeamMember | undefined>;
  createTeamMember(member: InsertTeamMember, createdBy: string): Promise<TeamMember>;
  updateTeamMember(id: string, updates: Partial<InsertTeamMember>): Promise<TeamMember>;
  deleteTeamMember(id: string): Promise<void>;

  // Application methods
  getApplications(limit?: number, offset?: number, search?: string, status?: string): Promise<{ applications: Application[], total: number }>;
  getApplication(id: string): Promise<Application | undefined>;
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

  // Audit log methods
  getAuditLogs(limit?: number, offset?: number, userId?: string, entityType?: string): Promise<{ logs: AuditLog[], total: number }>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // Analytics methods
  getDashboardStats(): Promise<{
    totalUsers: number;
    totalApplications: number;
    activeScholarships: number;
    activeJobs: number;
    recentActivity: any[];
  }>;
}

export class MemStorage implements IStorage {
  private usersMap: Map<string, User>;
  private scholarshipsMap: Map<string, Scholarship>;
  private jobsMap: Map<string, JobOpportunity>;
  private partnersMap: Map<string, PartnerInstitution>;
  private blogMap: Map<string, BlogPost>;
  private teamMap: Map<string, TeamMember>;
  private applicationsMap: Map<string, Application>;
  private chatMap: Map<string, AiChatConversation>;
  private notificationsMap: Map<string, AdminNotification>;
  private auditLogsMap: Map<string, AuditLog>;

  constructor() {
    this.usersMap = new Map();
    this.scholarshipsMap = new Map();
    this.jobsMap = new Map();
    this.partnersMap = new Map();
    this.blogMap = new Map();
    this.teamMap = new Map();
    this.applicationsMap = new Map();
    this.chatMap = new Map();
    this.notificationsMap = new Map();
    this.auditLogsMap = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.usersMap.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(u => u.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(u => u.email === email);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = nanoid();
    const newUser: User = { 
      ...user, 
      id, 
      isActive: true, 
      profileImage: null, 
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.usersMap.set(id, newUser);
    return newUser;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const user = this.usersMap.get(id);
    if (!user) throw new Error("User not found");
    const updated = { ...user, ...updates, updatedAt: new Date() };
    this.usersMap.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    this.usersMap.delete(id);
  }

  async getUsers(limit = 50, offset = 0, search = ""): Promise<{ users: User[], total: number }> {
    let items = Array.from(this.usersMap.values());
    if (search) items = items.filter(u => u.username.includes(search));
    const total = items.length;
    return { users: items.slice(offset, offset + limit), total };
  }

  // Scholarship methods
  async getScholarships(limit = 50, offset = 0, search = "", status = ""): Promise<{ scholarships: Scholarship[], total: number }> {
    let items = Array.from(this.scholarshipsMap.values());
    if (search) items = items.filter(s => s.title.includes(search));
    if (status) items = items.filter(s => s.status === status);
    const total = items.length;
    return { scholarships: items.slice(offset, offset + limit), total };
  }

  async getScholarship(id: string): Promise<Scholarship | undefined> {
    return this.scholarshipsMap.get(id);
  }

  async createScholarship(scholarship: InsertScholarship, createdBy: string): Promise<Scholarship> {
    const id = nanoid();
    const item: Scholarship = { ...scholarship, id, createdBy, createdAt: new Date(), updatedAt: new Date() };
    this.scholarshipsMap.set(id, item);
    return item;
  }

  async updateScholarship(id: string, updates: Partial<InsertScholarship>): Promise<Scholarship> {
    const item = this.scholarshipsMap.get(id);
    if (!item) throw new Error("Not found");
    const updated = { ...item, ...updates, updatedAt: new Date() };
    this.scholarshipsMap.set(id, updated);
    return updated;
  }

  async deleteScholarship(id: string): Promise<void> {
    this.scholarshipsMap.delete(id);
  }

  // Job opportunity methods
  async getJobOpportunities(limit = 50, offset = 0, search = "", status = ""): Promise<{ jobs: JobOpportunity[], total: number }> {
    let items = Array.from(this.jobsMap.values());
    if (search) items = items.filter(j => j.title.includes(search));
    if (status) items = items.filter(j => j.status === status);
    const total = items.length;
    return { jobs: items.slice(offset, offset + limit), total };
  }

  async getJobOpportunity(id: string): Promise<JobOpportunity | undefined> {
    return this.jobsMap.get(id);
  }

  async createJobOpportunity(job: InsertJobOpportunity, createdBy: string): Promise<JobOpportunity> {
    const id = nanoid();
    const item: JobOpportunity = { ...job, id, createdBy, createdAt: new Date(), updatedAt: new Date() };
    this.jobsMap.set(id, item);
    return item;
  }

  async updateJobOpportunity(id: string, updates: Partial<InsertJobOpportunity>): Promise<JobOpportunity> {
    const item = this.jobsMap.get(id);
    if (!item) throw new Error("Not found");
    const updated = { ...item, ...updates, updatedAt: new Date() };
    this.jobsMap.set(id, updated);
    return updated;
  }

  async deleteJobOpportunity(id: string): Promise<void> {
    this.jobsMap.delete(id);
  }

  // Partner institution methods
  async getPartnerInstitutions(limit = 50, offset = 0, search = ""): Promise<{ partners: PartnerInstitution[], total: number }> {
    let items = Array.from(this.partnersMap.values());
    if (search) items = items.filter(p => p.name.includes(search));
    const total = items.length;
    return { partners: items.slice(offset, offset + limit), total };
  }

  async getPartnerInstitution(id: string): Promise<PartnerInstitution | undefined> {
    return this.partnersMap.get(id);
  }

  async createPartnerInstitution(partner: InsertPartnerInstitution, createdBy: string): Promise<PartnerInstitution> {
    const id = nanoid();
    const item: PartnerInstitution = { ...partner, id, createdBy, createdAt: new Date(), updatedAt: new Date() };
    this.partnersMap.set(id, item);
    return item;
  }

  async updatePartnerInstitution(id: string, updates: Partial<InsertPartnerInstitution>): Promise<PartnerInstitution> {
    const item = this.partnersMap.get(id);
    if (!item) throw new Error("Not found");
    const updated = { ...item, ...updates, updatedAt: new Date() };
    this.partnersMap.set(id, updated);
    return updated;
  }

  async deletePartnerInstitution(id: string): Promise<void> {
    this.partnersMap.delete(id);
  }

  // Blog post methods
  async getBlogPosts(limit = 50, offset = 0, search = "", status = ""): Promise<{ posts: BlogPost[], total: number }> {
    let items = Array.from(this.blogMap.values());
    if (search) items = items.filter(b => b.title.includes(search));
    if (status) items = items.filter(b => b.status === status);
    const total = items.length;
    return { posts: items.slice(offset, offset + limit), total };
  }

  async getBlogPost(id: string): Promise<BlogPost | undefined> {
    return this.blogMap.get(id);
  }

  async createBlogPost(post: InsertBlogPost, createdBy: string): Promise<BlogPost> {
    const id = nanoid();
    const item: BlogPost = { ...post, id, createdBy, createdAt: new Date(), updatedAt: new Date() };
    this.blogMap.set(id, item);
    return item;
  }

  async updateBlogPost(id: string, updates: Partial<InsertBlogPost>): Promise<BlogPost> {
    const item = this.blogMap.get(id);
    if (!item) throw new Error("Not found");
    const updated = { ...item, ...updates, updatedAt: new Date() };
    this.blogMap.set(id, updated);
    return updated;
  }

  async deleteBlogPost(id: string): Promise<void> {
    this.blogMap.delete(id);
  }

  // Team member methods
  async getTeamMembers(limit = 50, offset = 0, search = ""): Promise<{ members: TeamMember[], total: number }> {
    let items = Array.from(this.teamMap.values());
    if (search) items = items.filter(t => t.name.includes(search));
    const total = items.length;
    return { members: items.slice(offset, offset + limit), total };
  }

  async getTeamMember(id: string): Promise<TeamMember | undefined> {
    return this.teamMap.get(id);
  }

  async createTeamMember(member: InsertTeamMember, createdBy: string): Promise<TeamMember> {
    const id = nanoid();
    const item: TeamMember = { ...member, id, createdBy, createdAt: new Date(), updatedAt: new Date() };
    this.teamMap.set(id, item);
    return item;
  }

  async updateTeamMember(id: string, updates: Partial<InsertTeamMember>): Promise<TeamMember> {
    const item = this.teamMap.get(id);
    if (!item) throw new Error("Not found");
    const updated = { ...item, ...updates, updatedAt: new Date() };
    this.teamMap.set(id, updated);
    return updated;
  }

  async deleteTeamMember(id: string): Promise<void> {
    this.teamMap.delete(id);
  }

  // Application methods
  async getApplications(limit = 50, offset = 0, search = "", status = ""): Promise<{ applications: Application[], total: number }> {
    let items = Array.from(this.applicationsMap.values());
    if (status) items = items.filter(a => a.status === status);
    const total = items.length;
    return { applications: items.slice(offset, offset + limit), total };
  }

  async getApplication(id: string): Promise<Application | undefined> {
    return this.applicationsMap.get(id);
  }

  async createApplication(application: InsertApplication): Promise<Application> {
    const id = nanoid();
    const item: Application = { ...application, id, createdAt: new Date(), updatedAt: new Date() };
    this.applicationsMap.set(id, item);
    return item;
  }

  async updateApplication(id: string, updates: Partial<InsertApplication>): Promise<Application> {
    const item = this.applicationsMap.get(id);
    if (!item) throw new Error("Not found");
    const updated = { ...item, ...updates, updatedAt: new Date() };
    this.applicationsMap.set(id, updated);
    return updated;
  }

  async deleteApplication(id: string): Promise<void> {
    this.applicationsMap.delete(id);
  }

  // AI Chat conversation methods
  async getChatConversations(limit = 50, offset = 0): Promise<{ conversations: AiChatConversation[], total: number }> {
    const items = Array.from(this.chatMap.values());
    const total = items.length;
    return { conversations: items.slice(offset, offset + limit), total };
  }

  async getChatConversation(id: string): Promise<AiChatConversation | undefined> {
    return this.chatMap.get(id);
  }

  async createChatConversation(conversation: InsertAiChatConversation): Promise<AiChatConversation> {
    const id = nanoid();
    const item: AiChatConversation = { ...conversation, id, createdAt: new Date(), updatedAt: new Date() };
    this.chatMap.set(id, item);
    return item;
  }

  async updateChatConversation(id: string, updates: Partial<InsertAiChatConversation>): Promise<AiChatConversation> {
    const item = this.chatMap.get(id);
    if (!item) throw new Error("Not found");
    const updated = { ...item, ...updates, updatedAt: new Date() };
    this.chatMap.set(id, updated);
    return updated;
  }

  // Admin notification methods
  async getAdminNotifications(limit = 50, offset = 0, targetUserId?: string): Promise<{ notifications: AdminNotification[], total: number }> {
    let items = Array.from(this.notificationsMap.values());
    if (targetUserId) items = items.filter(n => n.targetUserId === targetUserId);
    const total = items.length;
    return { notifications: items.slice(offset, offset + limit), total };
  }

  async createAdminNotification(notification: InsertAdminNotification): Promise<AdminNotification> {
    const id = nanoid();
    const item: AdminNotification = { ...notification, id, isRead: false, createdAt: new Date(), updatedAt: new Date() };
    this.notificationsMap.set(id, item);
    return item;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    const item = this.notificationsMap.get(id);
    if (item) item.isRead = true;
  }

  // Audit log methods
  async getAuditLogs(limit = 50, offset = 0, userId?: string, entityType?: string): Promise<{ logs: AuditLog[], total: number }> {
    let items = Array.from(this.auditLogsMap.values());
    if (userId) items = items.filter(l => l.userId === userId);
    if (entityType) items = items.filter(l => l.entityType === entityType);
    const total = items.length;
    return { logs: items.slice(offset, offset + limit), total };
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const id = nanoid();
    const item: AuditLog = { ...log, id, createdAt: new Date() };
    this.auditLogsMap.set(id, item);
    return item;
  }

  // Analytics methods
  async getDashboardStats(): Promise<{
    totalUsers: number;
    totalApplications: number;
    activeScholarships: number;
    activeJobs: number;
    recentActivity: any[];
  }> {
    return {
      totalUsers: this.usersMap.size,
      totalApplications: this.applicationsMap.size,
      activeScholarships: Array.from(this.scholarshipsMap.values()).filter(s => s.status === 'published').length,
      activeJobs: Array.from(this.jobsMap.values()).filter(j => j.status === 'published').length,
      recentActivity: Array.from(this.auditLogsMap.values()).slice(-10).reverse()
    };
  }
}

export const storage = new MemStorage();
