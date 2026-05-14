import fs from "fs";
import path from "path";

export type AdminContentStatus = "draft" | "published" | "archived";

export type ScholarshipMeta = {
  eligibility?: string;
  status?: AdminContentStatus;
  isPremium?: boolean;
  paymentStatus?: string;
  featuredImage?: string;
  region?: string;
};

export type JobMeta = {
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
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  region?: string;
  isPremium?: boolean;
  paymentStatus?: string;
};

export type BlogMeta = {
  slug?: string;
  status?: AdminContentStatus;
  featuredImage?: string;
};

export type TeamMeta = {
  department?: string;
  profileImage?: string;
};

export type UserMeta = {
  region?: string;
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
  updatedAt: string;
};

type AdminState = {
  users: Record<string, UserMeta>;
  scholarships: Record<string, ScholarshipMeta>;
  jobs: Record<string, JobMeta>;
  partners: Record<string, PartnerMeta>;
  blogPosts: Record<string, BlogMeta>;
  teamMembers: Record<string, TeamMeta>;
  roles: AdminRole[];
  settings: AdminSettings;
  readNotificationIds: string[];
};

const nowIso = () => new Date().toISOString();

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
    id: "editor",
    name: "Editor",
    description: "Can create and update platform content.",
    permissions: [
      "view_dashboard",
      "manage_scholarships",
      "manage_jobs",
      "manage_partners",
      "manage_blog",
      "manage_team",
    ],
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
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
      "view_analytics",
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
      "manage_scholarships",
      "manage_jobs",
      "manage_partners",
      "manage_blog",
      "manage_team",
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

const createDefaultState = (): AdminState => ({
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
    updatedAt: nowIso(),
  },
  readNotificationIds: [],
});

const stateFilePath = path.resolve(
  import.meta.dirname,
  "..",
  "data",
  "admin-state.json",
);

const ensureStateDirectory = () => {
  fs.mkdirSync(path.dirname(stateFilePath), { recursive: true });
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
      roles: parsed.roles?.length ? parsed.roles : DEFAULT_ROLES,
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

const saveState = () => {
  ensureStateDirectory();
  fs.writeFileSync(stateFilePath, JSON.stringify(cachedState, null, 2), "utf-8");
};

const updateCollectionItem = <T extends Record<string, unknown>>(
  collection: keyof Pick<
    AdminState,
    "users" | "scholarships" | "jobs" | "partners" | "blogPosts" | "teamMembers"
  >,
  id: string | number,
  value: T,
) => {
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
    "users" | "scholarships" | "jobs" | "partners" | "blogPosts" | "teamMembers"
  >,
  id: string | number,
) => {
  const nextCollection = { ...cachedState[collection] };
  delete nextCollection[String(id)];

  cachedState = {
    ...cachedState,
    [collection]: nextCollection,
  };

  saveState();
};

export const getAdminState = () => cachedState;

export const getUserMeta = (id: string | number) => cachedState.users[String(id)] ?? {};
export const setUserMeta = (id: string | number, value: UserMeta) =>
  updateCollectionItem("users", id, value);
export const deleteUserMeta = (id: string | number) => deleteCollectionItem("users", id);

export const getScholarshipMeta = (id: string | number) =>
  cachedState.scholarships[String(id)] ?? {};
export const setScholarshipMeta = (id: string | number, value: ScholarshipMeta) =>
  updateCollectionItem("scholarships", id, value);
export const deleteScholarshipMeta = (id: string | number) =>
  deleteCollectionItem("scholarships", id);

export const getJobMeta = (id: string | number) => cachedState.jobs[String(id)] ?? {};
export const setJobMeta = (id: string | number, value: JobMeta) =>
  updateCollectionItem("jobs", id, value);
export const deleteJobMeta = (id: string | number) => deleteCollectionItem("jobs", id);

export const getPartnerMeta = (id: string | number) =>
  cachedState.partners[String(id)] ?? {};
export const setPartnerMeta = (id: string | number, value: PartnerMeta) =>
  updateCollectionItem("partners", id, value);
export const deletePartnerMeta = (id: string | number) =>
  deleteCollectionItem("partners", id);

export const getBlogMeta = (id: string | number) => cachedState.blogPosts[String(id)] ?? {};
export const setBlogMeta = (id: string | number, value: BlogMeta) =>
  updateCollectionItem("blogPosts", id, value);
export const deleteBlogMeta = (id: string | number) => deleteCollectionItem("blogPosts", id);

export const getTeamMeta = (id: string | number) =>
  cachedState.teamMembers[String(id)] ?? {};
export const setTeamMeta = (id: string | number, value: TeamMeta) =>
  updateCollectionItem("teamMembers", id, value);
export const deleteTeamMeta = (id: string | number) => deleteCollectionItem("teamMembers", id);

export const getAdminRoles = () => [...cachedState.roles];

export const upsertAdminRole = (
  role: Omit<AdminRole, "createdAt" | "updatedAt"> & Partial<Pick<AdminRole, "createdAt">>,
) => {
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
  cachedState = {
    ...cachedState,
    roles: cachedState.roles.filter((role) => role.id !== id),
  };

  saveState();
};

export const getAdminSettings = () => ({ ...cachedState.settings });

export const updateAdminSettings = (updates: Partial<AdminSettings>) => {
  cachedState = {
    ...cachedState,
    settings: {
      ...cachedState.settings,
      ...updates,
      updatedAt: nowIso(),
    },
  };

  saveState();
  return cachedState.settings;
};

export const isNotificationRead = (id: string) =>
  cachedState.readNotificationIds.includes(id);

export const markNotificationRead = (id: string) => {
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
  const uniqueIds = Array.from(new Set([...cachedState.readNotificationIds, ...ids]));

  cachedState = {
    ...cachedState,
    readNotificationIds: uniqueIds,
  };

  saveState();
};
