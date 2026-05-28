import fs from "fs";
import path from "path";
import { resolveWritableRuntimePath } from "./runtime-paths";

export type AdminContentStatus = "draft" | "published" | "archived";

export type ScholarshipMeta = {
  slug?: string;
  shortDescription?: string;
  fullContent?: string;
  bannerImage?: string;
  eligibility?: string;
  scholarshipType?: string;
  fundingType?: string;
  eligibilityCriteria?: string;
  countryRestrictions?: string[];
  academicRequirements?: string[];
  openingDate?: string;
  fundingAmount?: string;
  sponsorOrganization?: string;
  benefits?: string[];
  applicationSteps?: string[];
  requiredDocuments?: string[];
  faq?: Array<Record<string, unknown>>;
  brochures?: Array<Record<string, unknown>>;
  videoEmbeds?: Array<Record<string, unknown>>;
  tags?: string[];
  seoMeta?: Record<string, unknown>;
  socialMeta?: Record<string, unknown>;
  applicationForm?: Array<Record<string, unknown>>;
  conditionalRules?: Array<Record<string, unknown>>;
  reviewPipeline?: Array<Record<string, unknown>>;
  visibilitySchedule?: Record<string, unknown>;
  automationHooks?: Record<string, unknown>;
  analytics?: Record<string, unknown>;
  status?: AdminContentStatus;
  isPremium?: boolean;
  isFeatured?: boolean;
  paymentStatus?: string;
  featuredImage?: string;
  region?: string;
};

export type JobMeta = {
  slug?: string;
  department?: string;
  responsibilities?: string[];
  qualifications?: string[];
  skills?: string[];
  experienceLevel?: string;
  employmentType?: string;
  salaryMin?: string;
  salaryMax?: string;
  attachments?: Array<Record<string, unknown>>;
  seoMeta?: Record<string, unknown>;
  socialMeta?: Record<string, unknown>;
  tags?: string[];
  isFeatured?: boolean;
  pipelineStages?: Array<Record<string, unknown>>;
  emailTemplates?: Array<Record<string, unknown>>;
  recruiterNotes?: Array<Record<string, unknown>>;
  automationHooks?: Record<string, unknown>;
  analytics?: Record<string, unknown>;
  salaryRange?: string;
  applicationUrl?: string;
  status?: AdminContentStatus;
  region?: string;
  isPremium?: boolean;
  price?: string;
  paymentStatus?: string;
  featuredImage?: string;
  benefits?: string;
};

export type PartnerMeta = {
  partnershipType?: string;
  logo?: string;
  coverImage?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  region?: string;
  country?: string;
  industryCategory?: string;
  partnershipLevel?: string;
  sponsorshipTier?: string;
  status?: string;
  socialLinks?: Record<string, string>;
  documents?: Array<Record<string, unknown>>;
  agreements?: Array<Record<string, unknown>>;
  notes?: string;
  internalComments?: string;
  linkedEvents?: Array<Record<string, unknown>>;
  linkedSponsorships?: Array<Record<string, unknown>>;
  linkedOpportunities?: Array<Record<string, unknown>>;
  partnershipHistory?: Array<Record<string, unknown>>;
  activities?: Array<Record<string, unknown>>;
  meetings?: Array<Record<string, unknown>>;
  reminders?: Array<Record<string, unknown>>;
  financialRecords?: Array<Record<string, unknown>>;
  performanceMetrics?: Record<string, unknown>;
  videoUrl?: string;
  videoTitle?: string;
  videoDescription?: string;
  isFeatured?: boolean;
  isPremium?: boolean;
  paymentStatus?: string;
};

export type BlogMeta = {
  slug?: string;
  gallery?: Array<Record<string, unknown>>;
  videos?: Array<Record<string, unknown>>;
  pullQuotes?: string[];
  tables?: Array<Record<string, unknown>>;
  codeBlocks?: Array<Record<string, unknown>>;
  seoMeta?: Record<string, unknown>;
  socialMeta?: Record<string, unknown>;
  structuredData?: Record<string, unknown>;
  readingTimeMinutes?: number;
  revisionHistory?: Array<Record<string, unknown>>;
  relatedPosts?: Array<Record<string, unknown>>;
  authorProfile?: Record<string, unknown>;
  scheduledAt?: string;
  automationHooks?: Record<string, unknown>;
  status?: AdminContentStatus;
  featuredImage?: string;
};

export type TeamMeta = {
  department?: string;
  profileImage?: string;
  title?: string;
  biography?: string;
  cvUrl?: string;
  skills?: string[];
  achievements?: string[];
  certifications?: string[];
  socialLinks?: Record<string, string>;
  contactInfo?: Record<string, unknown>;
  visibility?: "public" | "internal" | "hidden";
  leadershipLevel?: string;
  displayGroup?: string;
};

export type UserMeta = {
  region?: string;
  bio?: string;
  avatar?: string;
  socialLinks?: Record<string, string>;
  preferences?: Record<string, unknown>;
  notificationPreferences?: Record<string, unknown>;
  savedItems?: Array<Record<string, unknown>>;
  activityLogs?: Array<Record<string, unknown>>;
  loginHistory?: Array<Record<string, unknown>>;
  deviceHistory?: Array<Record<string, unknown>>;
  verification?: Record<string, unknown>;
  suspendedAt?: string | null;
  suspensionReason?: string | null;
};

export type ApplicationMeta = {
  workflowType?: "scholarship" | "job" | "partner" | "event" | "contact" | string;
  stage?: string;
  score?: number;
  reviewerComments?: Array<Record<string, unknown>>;
  reviewHistory?: Array<Record<string, unknown>>;
  documents?: Array<Record<string, unknown>>;
  verificationChecks?: Array<Record<string, unknown>>;
  interviewSchedule?: Array<Record<string, unknown>>;
  shortlist?: boolean;
  pipeline?: Array<Record<string, unknown>>;
  pdfUrl?: string;
  notificationHistory?: Array<Record<string, unknown>>;
  automationHooks?: Record<string, unknown>;
  analytics?: Record<string, unknown>;
};

export type AiChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

export type AiChatConversation = {
  id: string;
  userId: string | null;
  userEmail?: string | null;
  channel: "public" | "admin";
  messages: AiChatMessage[];
  summary: string | null;
  isActive: boolean;
  moderationFlags: string[];
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
};

export type AdminRole = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminSettings = {
  platformName: string;
  supportEmail: string;
  sessionTimeout: number;
  maxLoginAttempts: number;
  maintenanceMode: boolean;
  emailNotifications: boolean;
  twoFactorRequired: boolean;
  weeklySummary: boolean;
  contentPublishedNotifications: boolean;
  authTokenInvalidBefore: string | null;
  cacheVersion: number;
  updatedAt: string;
};

type AdminState = {
  users: Record<string, UserMeta>;
  scholarships: Record<string, ScholarshipMeta>;
  jobs: Record<string, JobMeta>;
  partners: Record<string, PartnerMeta>;
  blogPosts: Record<string, BlogMeta>;
  teamMembers: Record<string, TeamMeta>;
  applications: Record<string, ApplicationMeta>;
  aiConversations: Record<string, AiChatConversation>;
  roles: AdminRole[];
  settings: AdminSettings;
  readNotificationIds: string[];
};

const nowIso = () => new Date().toISOString();

export const CORE_ADMIN_ROLE_IDS = ["viewer", "writer", "editor", "admin", "super_admin"] as const;

const coreAdminRoleSet = new Set<string>(CORE_ADMIN_ROLE_IDS);

export const isCoreAdminRole = (id: string) => coreAdminRoleSet.has(id);

const DEFAULT_ROLES: AdminRole[] = [
  {
    id: "viewer",
    name: "Viewer",
    description: "Read-only access to platform content.",
    permissions: ["view_dashboard"],
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "writer",
    name: "Writer",
    description: "Can create and update platform content.",
    permissions: [
      "view_dashboard",
      "manage_events",
      "manage_scholarships",
      "manage_jobs",
      "manage_partners",
      "manage_blog",
      "manage_team",
      "manage_media",
    ],
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "super_admin",
    name: "Super Administrator",
    description: "Full system access including settings and roles.",
    permissions: [
      "view_dashboard",
      "manage_events",
      "manage_scholarships",
      "manage_jobs",
      "manage_partners",
      "manage_blog",
      "manage_team",
      "manage_media",
      "manage_users",
      "review_applications",
      "view_analytics",
      "manage_roles",
      "manage_settings",
    ],
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

const normalizeAdminRoles = (roles?: AdminRole[]) => {
  if (!roles?.length) return DEFAULT_ROLES;

  const provided = new Map(roles.map((role) => [role.id, role]));
  const normalizedCoreRoles = DEFAULT_ROLES.map((defaultRole) => {
    const existing = provided.get(defaultRole.id);
    if (!existing) return defaultRole;

    return {
      ...defaultRole,
      ...existing,
      permissions: Array.from(
        new Set([...(existing.permissions ?? []), ...defaultRole.permissions]),
      ),
      isActive: true,
      createdAt: existing.createdAt ?? defaultRole.createdAt,
      updatedAt: existing.updatedAt ?? defaultRole.updatedAt,
    };
  });

  const customRoles = roles.filter((role) => !isCoreAdminRole(role.id));
  return [...normalizedCoreRoles, ...customRoles];
};

const createDefaultState = (): AdminState => ({
  users: {},
  scholarships: {},
  jobs: {},
  partners: {},
  blogPosts: {},
  teamMembers: {},
  applications: {},
  aiConversations: {},
  roles: DEFAULT_ROLES,
  settings: {
    platformName: "Mtendere Education Platform",
    supportEmail: "mtendereeducation@gmail.com",
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    maintenanceMode: false,
    emailNotifications: true,
    twoFactorRequired: false,
    weeklySummary: false,
    contentPublishedNotifications: true,
    authTokenInvalidBefore: null,
    cacheVersion: 1,
    updatedAt: nowIso(),
  },
  readNotificationIds: [],
});

const stateFilePath = path.resolve(
  resolveWritableRuntimePath("data"),
  "admin-state.json",
);

const ensureStateDirectory = () => {
  fs.mkdirSync(path.dirname(stateFilePath), { recursive: true });
};

const getStateFileMtime = () => {
  try {
    return fs.statSync(stateFilePath).mtimeMs;
  } catch {
    return 0;
  }
};

const loadState = (): AdminState => {
  ensureStateDirectory();

  if (!fs.existsSync(stateFilePath)) {
    const initialState = createDefaultState();
    fs.writeFileSync(stateFilePath, JSON.stringify(initialState, null, 2), "utf-8");
    return initialState;
  }

  try {
    const raw = fs.readFileSync(stateFilePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<AdminState>;

    return {
      ...createDefaultState(),
      ...parsed,
      users: parsed.users ?? {},
      scholarships: parsed.scholarships ?? {},
      jobs: parsed.jobs ?? {},
      partners: parsed.partners ?? {},
      blogPosts: parsed.blogPosts ?? {},
      teamMembers: parsed.teamMembers ?? {},
      applications: parsed.applications ?? {},
      aiConversations: parsed.aiConversations ?? {},
      roles: normalizeAdminRoles(parsed.roles),
      settings: {
        ...createDefaultState().settings,
        ...(parsed.settings ?? {}),
      },
      readNotificationIds: parsed.readNotificationIds ?? [],
    };
  } catch {
    return createDefaultState();
  }
};

let cachedState = loadState();
let cachedStateMtime = getStateFileMtime();

const refreshStateFromDiskIfChanged = () => {
  const nextMtime = getStateFileMtime();
  if (nextMtime > 0 && nextMtime !== cachedStateMtime) {
    cachedState = loadState();
    cachedStateMtime = nextMtime;
  }
};

const saveState = () => {
  ensureStateDirectory();
  fs.writeFileSync(stateFilePath, JSON.stringify(cachedState, null, 2), "utf-8");
  cachedStateMtime = getStateFileMtime();
};

const updateCollectionItem = <T extends Record<string, unknown>>(
  collection: keyof Pick<
    AdminState,
    | "users"
    | "scholarships"
    | "jobs"
    | "partners"
    | "blogPosts"
    | "teamMembers"
    | "applications"
    | "aiConversations"
  >,
  id: string | number,
  value: T,
) => {
  refreshStateFromDiskIfChanged();

  cachedState = {
    ...cachedState,
    [collection]: {
      ...cachedState[collection],
      [String(id)]: {
        ...(cachedState[collection][String(id)] as T | undefined),
        ...value,
      },
    },
  };

  saveState();
};

const deleteCollectionItem = (
  collection: keyof Pick<
    AdminState,
    | "users"
    | "scholarships"
    | "jobs"
    | "partners"
    | "blogPosts"
    | "teamMembers"
    | "applications"
    | "aiConversations"
  >,
  id: string | number,
) => {
  refreshStateFromDiskIfChanged();

  const nextCollection = { ...cachedState[collection] };
  delete nextCollection[String(id)];

  cachedState = {
    ...cachedState,
    [collection]: nextCollection,
  };

  saveState();
};

export const getAdminState = () => {
  refreshStateFromDiskIfChanged();
  return cachedState;
};

export const getUserMeta = (id: string | number) => {
  refreshStateFromDiskIfChanged();
  return cachedState.users[String(id)] ?? {};
};
export const setUserMeta = (id: string | number, value: UserMeta) =>
  updateCollectionItem("users", id, value);
export const deleteUserMeta = (id: string | number) => deleteCollectionItem("users", id);

export const getScholarshipMeta = (id: string | number) => {
  refreshStateFromDiskIfChanged();
  return cachedState.scholarships[String(id)] ?? {};
};
export const setScholarshipMeta = (id: string | number, value: ScholarshipMeta) =>
  updateCollectionItem("scholarships", id, value);
export const deleteScholarshipMeta = (id: string | number) =>
  deleteCollectionItem("scholarships", id);

export const getJobMeta = (id: string | number) => {
  refreshStateFromDiskIfChanged();
  return cachedState.jobs[String(id)] ?? {};
};
export const setJobMeta = (id: string | number, value: JobMeta) =>
  updateCollectionItem("jobs", id, value);
export const deleteJobMeta = (id: string | number) => deleteCollectionItem("jobs", id);

export const getPartnerMeta = (id: string | number) => {
  refreshStateFromDiskIfChanged();
  return cachedState.partners[String(id)] ?? {};
};
export const setPartnerMeta = (id: string | number, value: PartnerMeta) =>
  updateCollectionItem("partners", id, value);
export const deletePartnerMeta = (id: string | number) =>
  deleteCollectionItem("partners", id);

export const getBlogMeta = (id: string | number) => {
  refreshStateFromDiskIfChanged();
  return cachedState.blogPosts[String(id)] ?? {};
};
export const setBlogMeta = (id: string | number, value: BlogMeta) =>
  updateCollectionItem("blogPosts", id, value);
export const deleteBlogMeta = (id: string | number) => deleteCollectionItem("blogPosts", id);

export const getTeamMeta = (id: string | number) => {
  refreshStateFromDiskIfChanged();
  return cachedState.teamMembers[String(id)] ?? {};
};
export const setTeamMeta = (id: string | number, value: TeamMeta) =>
  updateCollectionItem("teamMembers", id, value);
export const deleteTeamMeta = (id: string | number) => deleteCollectionItem("teamMembers", id);

export const getApplicationMeta = (id: string | number) => {
  refreshStateFromDiskIfChanged();
  return cachedState.applications[String(id)] ?? {};
};
export const setApplicationMeta = (id: string | number, value: ApplicationMeta) =>
  updateCollectionItem("applications", id, value);
export const deleteApplicationMeta = (id: string | number) =>
  deleteCollectionItem("applications", id);

export const getAiChatConversation = (id: string) => {
  refreshStateFromDiskIfChanged();
  return cachedState.aiConversations[id];
};

export const listAiChatConversations = () => {
  refreshStateFromDiskIfChanged();
  return Object.values(cachedState.aiConversations).sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );
};

export const upsertAiChatConversation = (
  conversation: Omit<AiChatConversation, "updatedAt"> & Partial<Pick<AiChatConversation, "updatedAt">>,
) => {
  const now = nowIso();
  const previous = getAiChatConversation(conversation.id);
  const nextConversation: AiChatConversation = {
    ...previous,
    ...conversation,
    messages: conversation.messages.slice(-40),
    moderationFlags: Array.from(new Set(conversation.moderationFlags ?? [])),
    createdAt: previous?.createdAt ?? conversation.createdAt ?? now,
    updatedAt: now,
    lastMessageAt: conversation.lastMessageAt ?? now,
  };

  updateCollectionItem("aiConversations", conversation.id, nextConversation);
  return nextConversation;
};

export const closeAiChatConversation = (id: string) => {
  const conversation = getAiChatConversation(id);
  if (!conversation) return null;

  return upsertAiChatConversation({
    ...conversation,
    isActive: false,
    lastMessageAt: nowIso(),
  });
};

export const getAdminRoles = () => {
  refreshStateFromDiskIfChanged();
  return [...cachedState.roles];
};

export const upsertAdminRole = (
  role: Omit<AdminRole, "createdAt" | "updatedAt"> & Partial<Pick<AdminRole, "createdAt">>,
) => {
  refreshStateFromDiskIfChanged();

  const existing = cachedState.roles.find((item) => item.id === role.id);
  const nextRole: AdminRole = {
    ...existing,
    ...role,
    createdAt: existing?.createdAt ?? role.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };

  cachedState = {
    ...cachedState,
    roles: existing
      ? cachedState.roles.map((item) => (item.id === nextRole.id ? nextRole : item))
      : [...cachedState.roles, nextRole],
  };

  saveState();
  return nextRole;
};

export const deleteAdminRole = (id: string) => {
  refreshStateFromDiskIfChanged();

  if (isCoreAdminRole(id)) {
    return false;
  }

  const existed = cachedState.roles.some((role) => role.id === id);
  if (!existed) {
    return false;
  }

  cachedState = {
    ...cachedState,
    roles: cachedState.roles.filter((role) => role.id !== id),
  };

  saveState();
  return true;
};

export const getAdminSettings = () => {
  refreshStateFromDiskIfChanged();
  return { ...cachedState.settings };
};

export const updateAdminSettings = (updates: Partial<AdminSettings>) => {
  refreshStateFromDiskIfChanged();

  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined),
  ) as Partial<AdminSettings>;

  cachedState = {
    ...cachedState,
    settings: {
      ...cachedState.settings,
      ...cleanUpdates,
      updatedAt: nowIso(),
    },
  };

  saveState();
  return cachedState.settings;
};

export const isNotificationRead = (id: string) => {
  refreshStateFromDiskIfChanged();
  return cachedState.readNotificationIds.includes(id);
};

export const markNotificationRead = (id: string) => {
  refreshStateFromDiskIfChanged();

  if (cachedState.readNotificationIds.includes(id)) {
    return;
  }

  cachedState = {
    ...cachedState,
    readNotificationIds: [...cachedState.readNotificationIds, id],
  };

  saveState();
};

export const markNotificationsRead = (ids: string[]) => {
  refreshStateFromDiskIfChanged();

  const uniqueIds = Array.from(new Set([...cachedState.readNotificationIds, ...ids]));

  cachedState = {
    ...cachedState,
    readNotificationIds: uniqueIds,
  };

  saveState();
};
