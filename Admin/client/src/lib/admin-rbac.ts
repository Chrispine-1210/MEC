const ADMIN_ROLES = ["viewer", "editor", "admin", "super_admin"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

const DASHBOARD_ROUTES = ["/admin", "/admin/dashboard"];
const CONTENT_ROUTES = [
  "/admin/scholarships",
  "/admin/jobs",
  "/admin/events",
  "/admin/partners",
  "/admin/blog",
  "/admin/team",
  "/admin/media",
];
const ADMIN_ONLY_ROUTES = [
  "/admin/ecosystem",
  "/admin/users",
  "/admin/applications",
  "/admin/messages",
  "/admin/analytics",
  "/admin/activity",
  "/admin/ai-chat",
];
const SUPER_ADMIN_ROUTES = ["/admin/roles", "/admin/settings"];

const routeRoles = new Map<string, AdminRole[]>();

for (const route of DASHBOARD_ROUTES) {
  routeRoles.set(route, ["viewer", "editor", "admin", "super_admin"]);
}
for (const route of CONTENT_ROUTES) {
  routeRoles.set(route, ["editor", "admin", "super_admin"]);
}
for (const route of ADMIN_ONLY_ROUTES) {
  routeRoles.set(route, ["admin", "super_admin"]);
}
for (const route of SUPER_ADMIN_ROUTES) {
  routeRoles.set(route, ["super_admin"]);
}

export const isAdminPortalRole = (role: string): role is AdminRole =>
  (ADMIN_ROLES as readonly string[]).includes(role);

export const normalizeAdminPath = (path: string) => {
  if (!path.startsWith("/admin")) return path;
  if (path === "/admin" || path === "/admin/") return "/admin";
  const clean = path.replace(/\/+$/, "");
  if (clean === "/admin") return "/admin";
  return clean;
};

export const getAllowedRolesForPath = (path: string): AdminRole[] => {
  const normalized = normalizeAdminPath(path);
  return routeRoles.get(normalized) ?? ["viewer", "editor", "admin", "super_admin"];
};

export const canAccessAdminPath = (role: string, path: string) => {
  if (!isAdminPortalRole(role)) return false;
  const allowedRoles = getAllowedRolesForPath(path);
  return allowedRoles.includes(role);
};

export const canCreateContent = (role: string) =>
  role === "editor" || role === "admin" || role === "super_admin";

export const canManageUsers = (role: string) => role === "admin" || role === "super_admin";

export const canUseAiAssistant = (role: string) => role === "admin" || role === "super_admin";
