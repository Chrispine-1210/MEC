export const mediaModules = [
  "blogs",
  "teams",
  "partners",
  "universities",
  "logos",
  "hero-banners",
  "backgrounds",
  "scholarships",
  "jobs",
  "events",
  "opportunities",
  "projects",
  "programs",
  "news",
  "testimonials",
  "misc",
  "defaults",
] as const;

export type MediaModule = (typeof mediaModules)[number];

export type MediaAsset = {
  module: string;
  path: string;
  reference: string;
  previewUrl: string;
  size: number;
  updatedAt: string;
  valid: boolean;
  kind?: "image" | "logo" | "hero" | "background";
  contentType?: string;
  qualityFlags?: string[];
};

export type MediaAssetsResponse = {
  root: string;
  modules: string[];
  assets: MediaAsset[];
};

export type MediaAuditReference = {
  module: string;
  id: number | string;
  title: string;
  field: string;
  value?: string | null;
  reason: "external-url" | "upload-folder" | "missing-local-asset" | "missing";
};

export type MediaAuditResponse = {
  checked: number;
  invalidCount: number;
  invalidReferences: MediaAuditReference[];
  fallbackPolicy: string[];
  assets: MediaAsset[];
  duplicateGroups?: Array<{ hash: string; references: string[]; totalBytes: number }>;
  qualityFindings?: Array<{ reference: string; severity: "info" | "warning"; issue: string; recommendation: string }>;
};

export const mediaModuleLabels: Record<string, string> = {
  blogs: "Blogs",
  teams: "Teams",
  partners: "Partners",
  universities: "Universities",
  logos: "Logos",
  "hero-banners": "Hero Banners",
  backgrounds: "Backgrounds",
  scholarships: "Scholarships",
  jobs: "Jobs",
  events: "Events",
  opportunities: "Opportunities",
  projects: "Projects",
  programs: "Programs",
  news: "News",
  testimonials: "Testimonials",
  misc: "Misc",
  defaults: "Defaults",
};

export function normalizeMediaReference(value?: string | null) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value) || value.startsWith("/uploads/")) return value;

  return value
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^assets\/imgs\//i, "")
    .replace(/^media-assets\//i, "");
}

export function getMediaPreviewUrl(value?: string | null) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value) || value.startsWith("/uploads/")) return value;

  const reference = normalizeMediaReference(value);
  return `/media-assets/${reference
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

export function isGovernedMediaReference(value?: string | null) {
  if (!value || /^https?:\/\//i.test(value) || value.startsWith("/uploads/")) return false;

  const reference = normalizeMediaReference(value);
  const [moduleName] = reference.split("/");
  return mediaModules.includes(moduleName as MediaModule) && /\.(jpe?g|png|webp)$/i.test(reference);
}

export function formatAssetSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} KB`;
  return `${Math.round(size / 1024 / 102.4) / 10} MB`;
}
