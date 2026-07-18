export type GovernedImageModule =
  | "blog"
  | "team"
  | "partner"
  | "university"
  | "scholarship"
  | "job"
  | "event"
  | "opportunity"
  | "project"
  | "program"
  | "news"
  | "testimonial"
  | "misc"
  | "default";

export type GovernedImageVariant = "hero" | "card" | "inline" | "profile" | "logo" | "gallery" | "fallback";

export type GovernedImageInput = {
  module: GovernedImageModule;
  src?: string | null;
  title?: string | null;
  category?: string | null;
  tags?: Array<string | null | undefined> | null;
  index?: number;
  variant?: GovernedImageVariant;
};

export type ResolvedGovernedImage = {
  src: string;
  alt: string;
  title: string;
  caption: string;
  description: string;
  key: string;
  fallbackLevel: "assigned" | "category" | "module" | "global" | "placeholder";
  module: GovernedImageModule;
};

type AssetEntry = {
  key: string;
  src: string;
  relativePath: string;
  normalizedPath: string;
  fileName: string;
  folder: string;
};

const GOVERNED_ASSET_FOLDERS = new Set([
  "blogs",
  "team",
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
  "misc",
  "defaults",
  "testimonials",
  "students",
]);

const imageModules = import.meta.glob(
  [
    "../assets/imgs/Blogs/application-guidance.jpg",
    "../assets/imgs/Blogs/career-motivation.jpg",
    "../assets/imgs/Blogs/chiunda-campus.jpg",
    "../assets/imgs/Blogs/counselling-mentorship.jpg",
    "../assets/imgs/team.jpg",
    "../assets/imgs/team/Brend tawina.jpg",
    "../assets/imgs/team/christoper.jpg",
    "../assets/imgs/team/dr. daniel.jpg",
    "../assets/imgs/team/george.jpg",
    "../assets/imgs/team/mr. rabson.jpg",
    "../assets/imgs/team/ms brenda.jpg",
    "../assets/imgs/team/timothy.jpg",
    "../assets/imgs/teams/brend-tawina.jpg",
    "../assets/imgs/teams/dr-daniel.jpg",
    "../assets/imgs/teams/george.jpg",
    "../assets/imgs/teams/ms-brenda.jpg",
    "../assets/imgs/teams/timothy.jpg",
    "../assets/imgs/au-logo.png",
    "../assets/imgs/ct-logo.png",
    "../assets/imgs/gedu-logo.png",
    "../assets/imgs/msm-unify-logo.png",
    "../assets/imgs/cu-logo-white.webp",
    "../assets/imgs/gbs-dubai-1.webp",
    "../assets/imgs/Students on Campus with Branded Jerseys.jpg",
    "../assets/imgs/Partners/cu-logo-white.webp",
    "../assets/imgs/Partners/gbs-dubai.webp",
    "../assets/imgs/Partners/our-partners.jpg",
    "../assets/imgs/Partners/partners-2.jpg",
    "../assets/imgs/Partners/partners-default.jpg",
    "../assets/imgs/universities/university-of-malawi.jpg",
    "../assets/imgs/universities/university-of-oxford.jpg",
    "../assets/imgs/universities/african-development-bank.jpg",
    "../assets/imgs/universities/chandigarh-university.jpg",
    "../assets/imgs/universities/gbs-dubai.webp",
    "../assets/imgs/universities/ct-university-logo.png",
    "../assets/imgs/universities/amity-university-logo.png",
    "../assets/imgs/universities/msm-unify-logo.png",
    "../assets/imgs/universities/gedu-global-banner.png",
    "../assets/imgs/universities/technical-university-of-munich.jpg",
    "../assets/imgs/universities/london-school-of-economics.jpg",
    "../assets/imgs/universities/inlaks-foundation.png",
    "../assets/imgs/scholarships/application-guidance.jpg",
    "../assets/imgs/scholarships/application-registration.jpg",
    "../assets/imgs/scholarships/graduates-default.jpg",
    "../assets/imgs/scholarships/students.jpg",
    "../assets/imgs/jobs/computer-repair.jpg",
    "../assets/imgs/jobs/corporate.jpg",
    "../assets/imgs/jobs/inspector.jpg",
    "../assets/imgs/jobs/jobs-default.jpg",
    "../assets/imgs/Events/IMG-20221029-WA0058.jpg",
    "../assets/imgs/Events/IMG-20220907-WA0124.jpg",
    "../assets/imgs/Events/IMG-20230311-WA0110.jpg",
    "../assets/imgs/Events/IMG-20250321-WA0250.jpg",
    "../assets/imgs/Events/events-default.jpg",
    "../assets/imgs/projects/foundation.jpg",
    "../assets/imgs/programs/abroad-students.jpg",
    "../assets/imgs/programs/international-studies.jpg",
    "../assets/imgs/programs/students-campus.jpg",
    "../assets/imgs/students/Edna Kalonga.jpg",
    "../assets/imgs/students/Ian Ndola.jpg",
    "../assets/imgs/students/Janet Kandulu.jpg",
    "../assets/imgs/testimonials/edna-kalonga.jpg",
    "../assets/imgs/testimonials/ian-ndola.jpg",
    "../assets/imgs/testimonials/trust-mangani.jpg",
    "../assets/imgs/misc/about-mtendere.jpg",
    "../assets/imgs/misc/mtendere.jpg",
    "../assets/imgs/defaults/mtendere-default.png",
  ],
  {
    eager: true,
    import: "default",
    query: "?url",
  },
) as Record<string, string>;

const assets: AssetEntry[] = Object.entries(imageModules)
  .map(([key, src]) => {
    const relativePath = key.replace(/^..\/assets\/imgs\//, "");
    const normalizedPath = normalizePath(relativePath);
    const segments = normalizedPath.split("/");

    return {
      key,
      src,
      relativePath,
      normalizedPath,
      fileName: segments[segments.length - 1] || normalizedPath,
      folder: segments[0] || "root",
    };
  })
  .sort((left, right) => left.normalizedPath.localeCompare(right.normalizedPath));

const CURATED_CATALOGUE_ASSETS = [
  { terms: ["mastercard foundation scholars program", "university of malawi"], path: "universities/university-of-malawi.jpg" },
  { terms: ["commonwealth scholarship for africa", "university of oxford"], path: "universities/university-of-oxford.jpg" },
  { terms: ["daad study scholarship germany", "technical university of munich"], path: "universities/technical-university-of-munich.jpg" },
  { terms: ["chevening scholarship", "london school of economics"], path: "universities/london-school-of-economics.jpg" },
  { terms: ["african development bank scholarship", "african development bank"], path: "universities/african-development-bank.jpg" },
  { terms: ["inlaks shivdasani foundation scholarship", "inlaks foundation"], path: "universities/inlaks-foundation.png" },
  { terms: ["chandigarh university"], path: "universities/chandigarh-university.jpg" },
  { terms: ["gbs dubai"], path: "universities/gbs-dubai.webp" },
  { terms: ["ct university"], path: "universities/ct-university-logo.png" },
  { terms: ["amity university"], path: "universities/amity-university-logo.png" },
  { terms: ["msm unify"], path: "universities/msm-unify-logo.png" },
  { terms: ["gedu global education"], path: "universities/gedu-global-banner.png" },
];

const MODULE_FOLDERS: Record<GovernedImageModule, string[]> = {
  blog: ["blogs", "blog"],
  team: ["teams", "team"],
  partner: ["partners", "partner"],
  university: ["universities", "partners", "programs", "students"],
  scholarship: ["scholarships", "scholarship", "students"],
  job: ["jobs", "job"],
  event: ["events", "event"],
  opportunity: ["opportunities", "opportunity"],
  project: ["projects", "project"],
  program: ["programs", "program", "courses", "services"],
  news: ["news", "events", "blog"],
  testimonial: ["students", "testimonials", "team"],
  misc: ["misc", "background", "services"],
  default: ["defaults"],
};

const MODULE_KEYWORDS: Record<GovernedImageModule, string[]> = {
  blog: [
    "blog",
    "application",
    "career",
    "motivation",
    "students",
    "study",
    "education",
    "events",
    "expo",
    "india",
    "europe",
    "departure",
    "partnership",
    "mentorship",
    "campus",
    "consultant",
  ],
  team: ["team", "brenda", "george", "daniel", "christ", "timothy", "rabson", "ortiz", "staff"],
  partner: ["partner", "university", "campus", "chandigarh", "ct-logo", "gedu", "gbs", "msm", "au-logo"],
  university: ["university", "campus", "chandigarh", "ct-logo", "gedu", "gbs", "msm", "au-logo", "students"],
  scholarship: ["scholarship", "graduate", "students", "campus", "application", "study", "abroad", "foundation"],
  job: ["job", "career", "business", "corporate", "worker", "factory", "computer", "chart", "resume"],
  event: ["event", "cerebration", "registration", "workshop", "meeting", "exhibition", "departure"],
  opportunity: ["opportunity", "career", "students", "application", "international", "study"],
  project: ["project", "foundation", "students", "moments", "services"],
  program: ["program", "course", "services", "students", "application", "study"],
  news: ["news", "event", "moments", "foundation", "departure"],
  testimonial: ["students", "campus", "graduate", "trust", "mirabel", "janet", "edna", "karonga", "ian", "edina"],
  misc: ["mtendere", "about", "moments", "background", "services"],
  default: ["default", "mtendere", "logo"],
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  scholarship: ["scholarship", "graduate", "students", "application", "guidance", "foundation"],
  scholarships: ["scholarship", "graduate", "students", "application", "guidance", "foundation"],
  education: ["students", "campus", "study", "university", "graduates", "chandigarh"],
  "study abroad": ["abroad", "international", "campus", "students", "departure", "malawi"],
  career: ["career", "motivation", "business", "corporate", "mentorship", "recruit"],
  "tips & guides": ["application", "guidance", "registration", "mentorship", "students"],
  visa: ["application", "registration", "departure", "international", "abroad"],
  business: ["business", "corporate", "chart", "partner", "meeting"],
  tech: ["computer", "chips", "factory", "technology", "businessman"],
  technology: ["computer", "chips", "factory", "technology", "businessman"],
  events: ["event", "workshop", "meeting", "cerebration", "exhibition"],
  event: ["event", "workshop", "meeting", "cerebration", "exhibition"],
  "education expo": ["event", "exhibition", "meeting", "students", "partners"],
  india: ["india", "students", "campus", "chandigarh", "application"],
  europe: ["international", "study", "event", "partners", "students"],
  departure: ["departure", "abroad", "students", "airport", "study"],
  partnerships: ["partners", "meeting", "university", "international", "event"],
  general: ["mtendere", "moments", "about", "students", "foundation"],
};

const MODULE_DEFAULT_KEYS: Record<GovernedImageModule, string[]> = {
  blog: ["events/img-20250321-wa0250.jpg", "events/img-20221029-wa0058.jpg", "events/img-20220907-wa0124.jpg", "events/img-20230311-wa0110.jpg"],
  team: ["teams/ms-brenda.jpg", "teams/george", "teams/dr-daniel", "teams/timothy"],
  partner: ["partners/cu-logo-white.webp", "gbs-dubai", "ct-logo", "gedu-logo", "programs/students-campus", "blogs/chiunda-campus"],
  university: ["students on campus with branded jerseys", "partners/cu-logo-white.webp", "gbs-dubai", "ct-logo", "gedu-logo"],
  scholarship: ["scholarships/application-registration", "scholarships/application-guidance", "programs/students-campus", "projects/foundation"],
  job: ["jobs/corporate", "jobs/computer-repair", "jobs/inspector", "blogs/career-motivation"],
  event: ["events/img-20250321-wa0250", "events/img-20221029-wa0058", "events/img-20220907-wa0124", "events/img-20230311-wa0110"],
  opportunity: ["scholarships/application-guidance", "blogs/career-motivation", "programs/students-campus"],
  project: ["projects/foundation", "misc/mtendere", "programs/students-campus"],
  program: ["programs/international-studies", "programs/students-campus", "programs/abroad-students"],
  news: ["events/img-20250321-wa0250", "projects/foundation", "blogs/application-guidance"],
  testimonial: ["students/Janet Kandulu.jpg", "students/Edna Kalonga.jpg", "students/Ian Ndola.jpg"],
  misc: ["misc/mtendere", "misc/about-mtendere", "programs/students-campus"],
  default: ["misc/mtendere", "misc/about-mtendere", "defaults/mtendere-default.png"],
};

export function getGovernedImageAssets() {
  return assets.map(({ key, src, relativePath, folder }) => ({ key, src, relativePath, folder }));
}

export function resolveGovernedImage(input: GovernedImageInput): ResolvedGovernedImage {
  const module = input.module;
  const curated = resolveCuratedCatalogueAsset(input);
  if (curated) {
    return toResolved(curated, input, "assigned");
  }

  const assigned = resolveAssignedLocalAsset(input.src);

  if (assigned && shouldHonorAssignedAsset(assigned, input)) {
    return toResolved(assigned, input, "assigned");
  }

  const categoryAsset = pickCategoryAsset(input);
  if (categoryAsset) {
    return toResolved(categoryAsset, input, "category");
  }

  const moduleAsset = pickModuleAsset(input);
  if (moduleAsset) {
    return toResolved(moduleAsset, input, "module");
  }

  const globalAsset = pickByHints(MODULE_DEFAULT_KEYS.default, assets) || assets[0];

  if (globalAsset) {
    return toResolved(globalAsset, { ...input, module }, "global");
  }

  return {
    src: "",
    alt: buildAlt(input),
    title: buildImageTitle(input),
    caption: buildCaption(input),
    description: buildImageDescription(input),
    key: "placeholder",
    fallbackLevel: "placeholder",
    module,
  };
}

export function getGovernedImageSrc(input: GovernedImageInput) {
  return resolveGovernedImage(input).src;
}

export function getGovernedBackgroundImage(input: GovernedImageInput) {
  return `url("${getGovernedImageSrc(input)}")`;
}

export function getBlogInlineImages(input: {
  title: string;
  content: string;
  category?: string | null;
  tags?: string[] | null;
  maxImages?: number;
}) {
  const sectionCount = (input.content.match(/^#{2,3}\s+/gm) || []).length;
  const wordCount = input.content.split(/\s+/).filter(Boolean).length;
  const targetCount = Math.max(1, Math.min(input.maxImages ?? 4, sectionCount || Math.ceil(wordCount / 350)));

  return Array.from({ length: targetCount }, (_, index) =>
    resolveGovernedImage({
      module: "blog",
      title: input.title,
      category: input.category,
      tags: input.tags,
      index: index + 1,
      variant: "inline",
    }),
  );
}

export function isExternalImage(src?: string | null) {
  return Boolean(src && /^https?:\/\//i.test(src));
}

export function isGovernedAsset(src?: string | null) {
  return Boolean(resolveAssignedLocalAsset(src));
}

function pickCategoryAsset(input: GovernedImageInput) {
  const tokens = [
    ...(input.category ? splitTokens(input.category) : []),
    ...(input.tags || []).flatMap((tag) => splitTokens(tag || "")),
  ];
  const hints = tokens.flatMap((token) => CATEGORY_KEYWORDS[token] || [token]);
  const modulePool = filterPoolForVariant(getModulePool(input.module), input);
  return pickByHints(hints, modulePool, input) || pickByHints(hints, assets, input);
}

function pickModuleAsset(input: GovernedImageInput) {
  const moduleDefaults = pickByHints(MODULE_DEFAULT_KEYS[input.module], assets, input);
  if (moduleDefaults) return moduleDefaults;

  const modulePool = filterPoolForVariant(getModulePool(input.module), input);
  if (modulePool.length > 0) return pickDeterministic(modulePool, getHashSeed(input));

  return pickByHints(MODULE_KEYWORDS[input.module], assets, input);
}

function getModulePool(module: GovernedImageModule) {
  const folders = MODULE_FOLDERS[module] || [];
  const keywords = MODULE_KEYWORDS[module] || [];

  return assets.filter((asset) => {
    const path = asset.normalizedPath;
    return (
      folders.some((folder) => path === folder || path.startsWith(`${folder}/`)) ||
      keywords.some((keyword) => path.includes(normalizePath(keyword)))
    );
  });
}

function resolveCuratedCatalogueAsset(input: GovernedImageInput) {
  if (!["scholarship", "university", "partner"].includes(input.module)) return undefined;

  const content = [input.title, input.category, ...(input.tags || [])]
    .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
    .map(normalizePath)
    .join(" ");
  const match = CURATED_CATALOGUE_ASSETS.find((entry) => entry.terms.some((term) => content.includes(term)));
  return match ? assets.find((asset) => asset.normalizedPath === match.path) : undefined;
}

function resolveAssignedLocalAsset(src?: string | null) {
  if (!src || isExternalImage(src) || src.startsWith("/uploads/")) return undefined;

  const normalizedSrc = normalizePath(src);
  const bundledAsset =
    assets.find((asset) => asset.src === src) ||
    assets.find((asset) => normalizedSrc.includes(asset.normalizedPath)) ||
    assets.find((asset) => asset.normalizedPath.includes(normalizedSrc)) ||
    assets.find((asset) => normalizedSrc.endsWith(asset.fileName));

  if (bundledAsset) return bundledAsset;

  const runtimeReference = toGovernedRuntimeReference(normalizedSrc);
  if (!runtimeReference) return undefined;

  const segments = runtimeReference.split("/");
  return {
    key: `runtime:${runtimeReference}`,
    src: `/media-assets/${runtimeReference.split("/").map(encodeURIComponent).join("/")}`,
    relativePath: runtimeReference,
    normalizedPath: runtimeReference,
    fileName: segments[segments.length - 1] || runtimeReference,
    folder: segments[0] || "runtime",
  };
}

function toGovernedRuntimeReference(value: string) {
  const normalized = value
    .replace(/^assets\/imgs\//, "")
    .replace(/^media-assets\//, "")
    .replace(/^\/media-assets\//, "")
    .replace(/^\/assets\/imgs\//, "");
  const [folder] = normalized.split("/");

  if (!folder || !GOVERNED_ASSET_FOLDERS.has(folder)) return "";
  if (normalized.includes("..") || !/\.(jpe?g|png|webp)$/i.test(normalized)) return "";
  return normalized;
}

function pickByHints(hints: string[] = [], pool: AssetEntry[] = assets, input?: GovernedImageInput) {
  const normalizedHints = hints.map(normalizePath).filter(Boolean);
  if (normalizedHints.length === 0) return undefined;

  const matches = filterPoolForVariant(
    pool.filter((asset) => normalizedHints.some((hint) => asset.normalizedPath.includes(hint))),
    input,
  );
  if (matches.length === 0) return undefined;

  return pickDeterministic(matches, getHashSeed(input));
}

function pickDeterministic(pool: AssetEntry[], seed = "mtendere") {
  if (pool.length === 0) return undefined;
  return pool[positiveHash(seed) % pool.length];
}

function toResolved(asset: AssetEntry, input: GovernedImageInput, fallbackLevel: ResolvedGovernedImage["fallbackLevel"]) {
  return {
    src: asset.src,
    alt: buildAlt(input),
    title: buildImageTitle(input),
    caption: buildCaption(input),
    description: buildImageDescription(input),
    key: asset.relativePath,
    fallbackLevel,
    module: input.module,
  };
}

function buildAlt(input: GovernedImageInput) {
  const title = input.title?.trim();
  if (title) return title;
  const moduleLabel = input.module === "default" ? "Mtendere image" : `${input.module} image`;
  return moduleLabel.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildCaption(input: GovernedImageInput) {
  const category = input.category?.trim();
  if (category && input.variant === "inline") return `${category} insight from Mtendere Education Consult`;
  if (input.variant === "profile") return "Mtendere team profile";
  if (input.variant === "logo") return "Mtendere partner identity";
  return "Mtendere Education Consult";
}

function buildImageTitle(input: GovernedImageInput) {
  const title = input.title?.trim();
  const moduleLabel = input.module === "default" ? "Mtendere Education" : `${input.module} visual`;
  return [title || moduleLabel, input.category?.trim()].filter(Boolean).join(" - ");
}

function buildImageDescription(input: GovernedImageInput) {
  const title = input.title?.trim() || "Mtendere Education Consult content";
  const category = input.category?.trim();
  const tags = (input.tags || []).filter(Boolean).join(", ");
  return [
    `${title} image selected for ${input.module} content.`,
    category ? `Category: ${category}.` : "",
    tags ? `Tags: ${tags}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function getHashSeed(input?: GovernedImageInput) {
  if (!input) return "mtendere";
  return [input.module, input.variant, input.category, input.title, input.index, ...(input.tags || [])]
    .filter(Boolean)
    .join("|");
}

function splitTokens(value: string) {
  return normalizePath(value)
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function normalizePath(value: string) {
  return value.replace(/\\/g, "/").toLowerCase().replace(/^\/+/, "").trim();
}

function filterPoolForVariant(pool: AssetEntry[], input?: GovernedImageInput) {
  if (!input) return pool;

  if (input.variant === "logo") {
    const logoAssets = pool.filter(isLogoAsset);
    return logoAssets.length ? logoAssets : pool.filter((asset) => !isPhotoPlaceholderAsset(asset));
  }

  const nonLogoAssets = pool.filter((asset) => !isLogoAsset(asset));
  const specificAssets = nonLogoAssets.filter((asset) => !isPhotoPlaceholderAsset(asset));
  if (specificAssets.length) return specificAssets;
  return nonLogoAssets.length ? nonLogoAssets : pool;
}

function shouldHonorAssignedAsset(asset: AssetEntry, input: GovernedImageInput) {
  if (input.module === "default" || input.variant === "fallback") return true;
  return !isPhotoPlaceholderAsset(asset);
}

function isLogoAsset(asset: AssetEntry) {
  const normalizedPath = asset.normalizedPath;
  return (
    normalizedPath.includes("logo") ||
    normalizedPath.includes("crest") ||
    normalizedPath.includes("shield") ||
    normalizedPath.includes("brand") ||
    normalizedPath.includes("cu-logo") ||
    normalizedPath.includes("ct-logo") ||
    normalizedPath.includes("gedu") ||
    normalizedPath.includes("msm-unify") ||
    normalizedPath.includes("gbs-dubai") ||
    normalizedPath.includes("au-logo")
  );
}

function isPhotoPlaceholderAsset(asset: AssetEntry) {
  const normalizedPath = asset.normalizedPath;
  return (
    normalizedPath.includes("partners-default") ||
    normalizedPath.includes("partners-2") ||
    normalizedPath.includes("our-partners") ||
    normalizedPath.includes("graduates-default") ||
    normalizedPath.includes("jobs-default") ||
    normalizedPath.includes("events-default") ||
    normalizedPath.includes("mtendere-default")
  );
}

function positiveHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}
