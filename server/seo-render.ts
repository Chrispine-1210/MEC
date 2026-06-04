import type { Request } from "express";
import {
  getBlogMeta,
  getJobMeta,
  getPartnerMeta,
  getScholarshipMeta,
  getTeamMeta,
} from "./admin-state";
import { env } from "./env";
import { storage } from "./storage";

type JsonLd = Record<string, unknown>;

type SeoPageMeta = {
  title: string;
  description: string;
  keywords: string[];
  canonical: string;
  image: string;
  imageAlt: string;
  robots: string;
  type: "website" | "article" | "profile";
  section?: string;
  author?: string;
  publishedTime?: string | null;
  modifiedTime?: string | null;
  lastReviewedTime?: string | null;
  freshnessStatus?: string;
  structuredData: JsonLd[];
};

type StaticSeoRoute = {
  title: string;
  description: string;
  module: SeoModule;
  category: string;
  image: string;
};

type SeoFaq = {
  question: string;
  answer: string;
};

type RelatedSeoItem = {
  name: string;
  url: string;
  description?: string;
  image?: unknown;
};

type SeoModule =
  | "home"
  | "scholarship"
  | "job"
  | "event"
  | "partner"
  | "blog"
  | "team"
  | "service"
  | "contact"
  | "about";

const BRAND_NAME = "Mtendere Education Consult";
const APP_NAME = "Mtendere Education Platform";
const BRAND_LOGO = "/media-assets/logos/Mtendere_Logo.png";
const BRAND_THEME_COLOR = "#2563eb";
const DEFAULT_BASE_URL = "https://mtendereeducationconsult.com";
const SITE_LAST_REVIEWED_AT = process.env.SITE_LAST_REVIEWED_AT || process.env.BUILD_TIMESTAMP || "2026-06-04T00:00:00.000Z";

const mediaAssetModules = new Set([
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
  "testimonials",
  "students",
  "misc",
  "defaults",
]);

const staticSeoRoutes: Record<string, StaticSeoRoute> = {
  "/": {
    title: "Study Abroad, Scholarships, Jobs and Education Consulting",
    description:
      "Find international study pathways, scholarships, jobs, events, and expert education consulting from Mtendere Education Consult.",
    module: "home",
    category: "Education Consulting",
    image: "/media-assets/programs/international-studies.jpg",
  },
  "/scholarships": {
    title: "International Scholarships for Malawian and African Students",
    description:
      "Explore scholarship opportunities, eligibility, benefits, deadlines, and application guidance for local and international study.",
    module: "scholarship",
    category: "Scholarships",
    image: "/media-assets/scholarships/application-guidance.jpg",
  },
  "/jobs": {
    title: "Jobs, Careers and Graduate Opportunities",
    description:
      "Browse jobs, internships, graduate programs, volunteer roles, and career opportunities with application support and CV guidance.",
    module: "job",
    category: "Careers",
    image: "/media-assets/jobs/corporate.jpg",
  },
  "/resume-building": {
    title: "AI CV Builder and ATS Resume Optimization",
    description:
      "Build, optimize, print, and share an ATS-ready CV for scholarships, jobs, internships, and graduate programs.",
    module: "job",
    category: "CV Builder",
    image: "/media-assets/jobs/corporate.jpg",
  },
  "/events": {
    title: "Education Fairs, Career Workshops and Study Abroad Events",
    description:
      "Register for Mtendere education fairs, career workshops, study abroad seminars, partner sessions, and networking events.",
    module: "event",
    category: "Events",
    image: "/media-assets/events/IMG-20250321-WA0250.jpg",
  },
  "/partners": {
    title: "International University and Education Partners",
    description:
      "Meet Mtendere partner universities, institutions, and education organizations supporting international opportunities for students.",
    module: "partner",
    category: "Partners",
    image: "/media-assets/partners/cu-logo-white.webp",
  },
  "/partnership-opportunities": {
    title: "Partnership Opportunities with Mtendere Education Consult",
    description:
      "Explore institutional, school, sponsor, and employer partnership opportunities with Mtendere Education Consult.",
    module: "partner",
    category: "Partnerships",
    image: "/media-assets/partners/gbs-dubai.webp",
  },
  "/blog": {
    title: "Study Abroad, Scholarship and Career Advice Blog",
    description:
      "Read practical guidance on scholarships, study abroad, careers, applications, events, and education opportunities.",
    module: "blog",
    category: "Blog",
    image: "/media-assets/blogs/application-guidance.jpg",
  },
  "/team": {
    title: "Mtendere Education Consult Team",
    description:
      "Meet the education advisors, consultants, and leadership team guiding students, partners, and career seekers.",
    module: "team",
    category: "Team",
    image: "/media-assets/teams/ms-brenda.jpg",
  },
  "/about": {
    title: "About Mtendere Education Consult",
    description:
      "Learn about Mtendere Education Consult, our mission, education services, student support, partnerships, and impact.",
    module: "about",
    category: "About",
    image: "/media-assets/misc/about-mtendere.jpg",
  },
  "/contact": {
    title: "Contact Mtendere Education Consult",
    description:
      "Contact Mtendere for study abroad advice, scholarship guidance, career support, partnerships, and education consulting.",
    module: "contact",
    category: "Contact",
    image: BRAND_LOGO,
  },
  "/study-abroad": {
    title: "Study Abroad Guidance and University Pathways",
    description:
      "Plan your study abroad journey with destination guidance, university shortlisting, document support, and advisor-led application planning.",
    module: "service",
    category: "Study Abroad",
    image: "/media-assets/programs/abroad-students.jpg",
  },
  "/university-applications": {
    title: "University Application Support",
    description:
      "Get support with university applications, documents, statements, admissions timelines, and institution matching.",
    module: "service",
    category: "University Applications",
    image: "/media-assets/programs/students-campus.jpg",
  },
  "/career-counseling": {
    title: "Career Counseling and Employability Support",
    description:
      "Access career counseling, job readiness guidance, interview preparation, and professional development support.",
    module: "service",
    category: "Career Counseling",
    image: "/media-assets/blogs/career-motivation.jpg",
  },
};

const privateExactPaths = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/dashboard",
  "/referrals",
]);

const privatePrefixes = ["/admin", "/api", "/auth"];

export function shouldNoindexPath(pathname: string) {
  const path = normalizeRoutePath(pathname);
  return privateExactPaths.has(path) || privatePrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export async function renderSeoHtml(req: Request, html: string) {
  const baseUrl = getPublicBaseUrl(req);
  let meta: SeoPageMeta;
  try {
    meta = await resolveSeoMeta(req.path, baseUrl);
  } catch (error) {
    console.error("SEO metadata resolution error:", error);
    meta = buildFallbackSeoMeta(req.path, baseUrl);
  }
  return injectSeoIntoHtml(html, meta);
}

function getPublicBaseUrl(req: Request) {
  return (env.PUBLIC_APP_URL || `${req.protocol}://${req.get("host")}` || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

async function resolveSeoMeta(pathname: string, baseUrl: string): Promise<SeoPageMeta> {
  const path = normalizeRoutePath(pathname);

  if (shouldNoindexPath(path)) {
    return buildMeta({
      title: "Private Platform Area",
      description: "Private Mtendere Education Consult account and administration area.",
      keywords: ["Mtendere Education Consult"],
      canonicalPath: path,
      image: BRAND_LOGO,
      imageAlt: "Mtendere Education Consult logo",
      robots: "noindex,nofollow,noarchive",
      type: "website",
      structuredData: [buildOrganizationSchema(baseUrl)],
      baseUrl,
    });
  }

  const staticRoute = staticSeoRoutes[path];
  if (staticRoute) {
    return buildMeta({
      title: staticRoute.title,
      description: staticRoute.description,
      keywords: generateKeywords({
        module: staticRoute.module,
        title: staticRoute.title,
        category: staticRoute.category,
        location: "Malawi",
      }),
      canonicalPath: path,
      image: staticRoute.image,
      imageAlt: staticRoute.title,
      type: "website",
      structuredData: [
        buildOrganizationSchema(baseUrl),
        buildWebsiteSchema(baseUrl),
        buildBreadcrumbSchema([{ name: "Home", url: "/" }, ...(path === "/" ? [] : [{ name: staticRoute.category, url: path }])], baseUrl),
        buildCollectionPageSchema(staticRoute, path, baseUrl),
      ],
      baseUrl,
    });
  }

  const detailMatch = path.match(/^\/(scholarships|jobs|blog|events|partners|team)\/([^/]+)$/);
  if (!detailMatch) {
    return buildMeta({
      title: "Page Not Found",
      description: "The requested Mtendere Education Consult page could not be found.",
      keywords: ["Mtendere Education Consult"],
      canonicalPath: path,
      image: BRAND_LOGO,
      imageAlt: "Mtendere Education Consult logo",
      robots: "noindex,follow",
      type: "website",
      structuredData: [buildOrganizationSchema(baseUrl), buildWebsiteSchema(baseUrl)],
      baseUrl,
    });
  }

  const [, moduleName, rawIdentifier] = detailMatch;
  const identifier = safeDecode(rawIdentifier);

  if (moduleName === "scholarships") return resolveScholarshipMeta(identifier, baseUrl);
  if (moduleName === "jobs") return resolveJobMeta(identifier, baseUrl);
  if (moduleName === "blog") return resolveBlogMeta(identifier, baseUrl);
  if (moduleName === "events") return resolveEventMeta(identifier, baseUrl);
  if (moduleName === "partners") return resolvePartnerMeta(identifier, baseUrl);
  return resolveTeamMeta(identifier, baseUrl);
}

function buildFallbackSeoMeta(pathname: string, baseUrl: string): SeoPageMeta {
  const path = normalizeRoutePath(pathname);
  const staticRoute = staticSeoRoutes[path];
  if (staticRoute) {
    return buildMeta({
      title: staticRoute.title,
      description: staticRoute.description,
      keywords: generateKeywords({
        module: staticRoute.module,
        title: staticRoute.title,
        category: staticRoute.category,
        location: "Malawi",
      }),
      canonicalPath: path,
      image: staticRoute.image,
      imageAlt: staticRoute.title,
      type: "website",
      structuredData: [
        buildOrganizationSchema(baseUrl),
        buildWebsiteSchema(baseUrl),
        buildBreadcrumbSchema([{ name: "Home", url: "/" }, ...(path === "/" ? [] : [{ name: staticRoute.category, url: path }])], baseUrl),
      ],
      baseUrl,
    });
  }

  const detailMatch = path.match(/^\/(scholarships|jobs|blog|events|partners|team)\/([^/]+)$/);
  if (!detailMatch) {
    return buildMeta({
      title: "Mtendere Education Consult",
      description: "Explore education consulting, scholarships, jobs, events, partners, blogs, and team profiles from Mtendere Education Consult.",
      keywords: ["Mtendere Education Consult", "education consulting", "scholarships", "jobs", "study abroad"],
      canonicalPath: path,
      image: BRAND_LOGO,
      imageAlt: "Mtendere Education Consult logo",
      robots: shouldNoindexPath(path) ? "noindex,nofollow,noarchive" : undefined,
      type: "website",
      structuredData: [buildOrganizationSchema(baseUrl), buildWebsiteSchema(baseUrl)],
      baseUrl,
    });
  }

  const [, moduleName, identifier] = detailMatch;
  const readableName = titleCaseSlug(safeDecode(identifier));
  const moduleConfig: Record<string, { parent: string; parentUrl: string; title: string; description: string; image: string; module: SeoModule }> = {
    scholarships: {
      parent: "Scholarships",
      parentUrl: "/scholarships",
      title: `${readableName} Scholarship`,
      description: `${readableName} scholarship details from ${BRAND_NAME}, including eligibility, funding, deadlines, locations, benefits, and application guidance.`,
      image: "/media-assets/scholarships/application-guidance.jpg",
      module: "scholarship",
    },
    jobs: {
      parent: "Jobs",
      parentUrl: "/jobs",
      title: `${readableName} Job Opportunity`,
      description: `${readableName} job details from ${BRAND_NAME}, including requirements, location, employment type, salary guidance, deadline, and application support.`,
      image: "/media-assets/jobs/corporate.jpg",
      module: "job",
    },
    blog: {
      parent: "Blog",
      parentUrl: "/blog",
      title: readableName,
      description: `${readableName} article from ${BRAND_NAME}, with education, scholarship, career, event, and study abroad guidance.`,
      image: "/media-assets/blogs/application-guidance.jpg",
      module: "blog",
    },
    events: {
      parent: "Events",
      parentUrl: "/events",
      title: `${readableName} Event`,
      description: `${readableName} event details from ${BRAND_NAME}, including date, time, venue, speakers, registration, and attendance information.`,
      image: "/media-assets/events/IMG-20250321-WA0250.jpg",
      module: "event",
    },
    partners: {
      parent: "Partners",
      parentUrl: "/partners",
      title: `${readableName === identifier ? "Partner" : readableName} Profile`,
      description: `Partner profile from ${BRAND_NAME}, including institution details, official branding, programs, opportunities, and collaboration guidance.`,
      image: "/media-assets/partners/cu-logo-white.webp",
      module: "partner",
    },
    team: {
      parent: "Team",
      parentUrl: "/team",
      title: readableName,
      description: `${readableName} team profile from ${BRAND_NAME}, including professional role, advisory focus, and education consulting support.`,
      image: "/media-assets/teams/ms-brenda.jpg",
      module: "team",
    },
  };
  const config = moduleConfig[moduleName];

  return buildMeta({
    title: config.title,
    description: config.description,
    keywords: generateKeywords({
      module: config.module,
      title: config.title,
      category: config.parent,
      location: "Malawi",
    }),
    canonicalPath: path,
    image: config.image,
    imageAlt: config.title,
    type: moduleName === "blog" ? "article" : moduleName === "team" ? "profile" : "website",
    section: config.parent,
    structuredData: [
      buildOrganizationSchema(baseUrl),
      buildWebsiteSchema(baseUrl),
      buildBreadcrumbSchema(
        [
          { name: "Home", url: "/" },
          { name: config.parent, url: config.parentUrl },
          { name: config.title, url: path },
        ],
        baseUrl,
      ),
    ],
    baseUrl,
  });
}

async function resolveScholarshipMeta(identifier: string, baseUrl: string) {
  const scholarships = await storage.getActiveScholarships();
  const scholarship = await findByIdentifier(scholarships, identifier, (item) => {
    const meta = getScholarshipMeta(item.id);
    return meta.slug || slugify(item.title || `scholarship-${item.id}`);
  });
  if (!scholarship) return resolveSeoMeta("/not-found", baseUrl);

  const meta = getScholarshipMeta(scholarship.id);
  const slug = meta.slug || slugify(scholarship.title || `scholarship-${scholarship.id}`);
  const canonicalPath = `/scholarships/${slug}`;
  const title = stringMeta(meta.seoMeta, "title") || scholarship.title;
  const description = seoDescription(
    stringMeta(meta.seoMeta, "description") || meta.shortDescription || meta.fullContent || scholarship.description,
    `${scholarship.title} scholarship at ${scholarship.institution} with eligibility, funding, deadline, and application guidance.`,
  );
  const image = meta.featuredImage || scholarship.imageUrl || "/media-assets/scholarships/application-guidance.jpg";
  const scholarshipFaqs = toFaqs(meta.faq, [
    {
      question: `Who is eligible for ${scholarship.title}?`,
      answer:
        meta.eligibilityCriteria ||
        asStringArray((meta as Record<string, unknown>).requirements || scholarship.requirements).join("; ") ||
        "Eligibility details are listed in the scholarship requirements and should be confirmed before applying.",
    },
    {
      question: `What funding does ${scholarship.title} provide?`,
      answer:
        meta.fundingAmount ||
        asStringArray(meta.benefits).join("; ") ||
        "Funding details depend on the sponsor and should be reviewed before submission.",
    },
    {
      question: `When is the deadline for ${scholarship.title}?`,
      answer: scholarship.deadline ? `The listed application deadline is ${formatSeoDate(scholarship.deadline)}.` : "The deadline should be confirmed before applying.",
    },
  ]);
  const relatedScholarships = scholarships
    .filter((item) => item.id !== scholarship.id)
    .sort((a, b) => scoreScholarshipRelatedness(b, scholarship) - scoreScholarshipRelatedness(a, scholarship))
    .slice(0, 4)
    .map((item) => {
      const itemMeta = getScholarshipMeta(item.id);
      const itemSlug = itemMeta.slug || slugify(item.title || `scholarship-${item.id}`);
      return {
        name: item.title,
        url: `/scholarships/${itemSlug}`,
        description: seoDescription(item.description, `${item.title} scholarship opportunity.`),
        image: itemMeta.featuredImage || item.imageUrl,
      };
    });

  return buildMeta({
    title,
    description,
    keywords: generateKeywords({
      module: "scholarship",
      title: scholarship.title,
      category: scholarship.category,
      institution: scholarship.institution,
      location: meta.region || scholarship.country || "Malawi",
      tags: meta.tags,
    }),
    canonicalPath,
    image,
    imageAlt: `${scholarship.title} scholarship`,
    type: "website",
    section: scholarship.category,
    publishedTime: toIso(scholarship.createdAt),
    modifiedTime: toIso(scholarship.updatedAt || scholarship.createdAt),
    structuredData: [
      buildOrganizationSchema(baseUrl),
      buildWebsiteSchema(baseUrl),
      buildBreadcrumbSchema(
        [
          { name: "Home", url: "/" },
          { name: "Scholarships", url: "/scholarships" },
          { name: scholarship.title, url: canonicalPath },
        ],
        baseUrl,
      ),
      buildScholarshipSchema({ ...scholarship, ...meta, imageUrl: image, slug }, baseUrl),
      buildFaqSchema(scholarshipFaqs),
      buildRelatedItemListSchema("Related scholarships", relatedScholarships, baseUrl),
    ],
    baseUrl,
  });
}

async function resolveJobMeta(identifier: string, baseUrl: string) {
  const jobs = await storage.getActiveJobs();
  const job = await findByIdentifier(jobs, identifier, (item) => {
    const meta = getJobMeta(item.id);
    return meta.slug || slugify(item.title || `job-${item.id}`);
  });
  if (!job) return resolveSeoMeta("/not-found", baseUrl);

  const meta = getJobMeta(job.id);
  const slug = meta.slug || slugify(job.title || `job-${job.id}`);
  const canonicalPath = `/jobs/${slug}`;
  const title = stringMeta(meta.seoMeta, "title") || `${job.title} at ${job.company}`;
  const description = seoDescription(
    stringMeta(meta.seoMeta, "description") || job.description,
    `${job.title} job at ${job.company} with requirements, salary, location, employment type, deadline, and application guidance.`,
  );
  const image = meta.featuredImage || (job as { imageUrl?: string | null }).imageUrl || "/media-assets/jobs/corporate.jpg";
  const relatedJobs = jobs
    .filter((item) => item.id !== job.id)
    .sort((a, b) => scoreJobRelatedness(b, job) - scoreJobRelatedness(a, job))
    .slice(0, 4)
    .map((item) => {
      const itemMeta = getJobMeta(item.id);
      const itemSlug = itemMeta.slug || slugify(item.title || `job-${item.id}`);
      return {
        name: `${item.title} at ${item.company}`,
        url: `/jobs/${itemSlug}`,
        description: seoDescription(item.description, `${item.title} job at ${item.company}.`),
        image: itemMeta.featuredImage || (item as { imageUrl?: string | null }).imageUrl,
      };
    });

  return buildMeta({
    title,
    description,
    keywords: generateKeywords({
      module: "job",
      title: job.title,
      category: meta.category || job.jobType,
      company: job.company,
      location: meta.region || job.location || "Malawi",
      tags: meta.tags,
    }),
    canonicalPath,
    image,
    imageAlt: `${job.title} job at ${job.company}`,
    type: "website",
    section: meta.category || job.jobType,
    publishedTime: toIso(job.createdAt),
    modifiedTime: toIso(job.updatedAt || job.createdAt),
    structuredData: [
      buildOrganizationSchema(baseUrl),
      buildWebsiteSchema(baseUrl),
      buildBreadcrumbSchema(
        [
          { name: "Home", url: "/" },
          { name: "Jobs", url: "/jobs" },
          { name: job.title, url: canonicalPath },
        ],
        baseUrl,
      ),
      buildJobPostingSchema({ ...job, ...meta, imageUrl: image, slug }, baseUrl),
      buildFaqSchema([
        { question: `How do I apply for ${job.title}?`, answer: meta.applicationInstructions || "Use the application option on this page and prepare the requested documents before submission." },
        { question: `What are the requirements for ${job.title}?`, answer: asStringArray(meta.requirements || job.requirements).join("; ") || "Review the requirements and skills listed on the job page before applying." },
      ]),
      buildRelatedItemListSchema("Related jobs", relatedJobs, baseUrl),
    ],
    baseUrl,
  });
}

async function resolveBlogMeta(identifier: string, baseUrl: string) {
  const posts = await storage.getPublishedBlogPosts();
  const post = await findByIdentifier(posts, identifier, (item) => {
    const meta = getBlogMeta(item.id);
    return meta.slug || slugify(item.title || `post-${item.id}`);
  });
  if (!post) return resolveSeoMeta("/not-found", baseUrl);

  const meta = getBlogMeta(post.id);
  const slug = meta.slug || slugify(post.title || `post-${post.id}`);
  const canonicalPath = `/blog/${slug}`;
  const readingTimeMinutes = meta.readingTimeMinutes || Math.max(1, Math.ceil(stripHtml(post.content || "").split(/\s+/).filter(Boolean).length / 220));
  const title = stringMeta(meta.seoMeta, "title") || post.title;
  const description = seoDescription(stringMeta(meta.seoMeta, "description") || post.excerpt || post.content, `${post.title} from ${BRAND_NAME}.`);
  const image = meta.featuredImage || post.imageUrl || "/media-assets/blogs/application-guidance.jpg";
  const relatedPosts = posts
    .filter((item) => item.id !== post.id)
    .sort((a, b) => scoreBlogRelatedness(b, post) - scoreBlogRelatedness(a, post))
    .slice(0, 4)
    .map((item) => {
      const itemMeta = getBlogMeta(item.id);
      const itemSlug = itemMeta.slug || slugify(item.title || `post-${item.id}`);
      return {
        name: item.title,
        url: `/blog/${itemSlug}`,
        description: seoDescription(item.excerpt || item.content, `${item.title} article.`),
        image: itemMeta.featuredImage || item.imageUrl,
      };
    });

  return buildMeta({
    title,
    description,
    keywords: generateKeywords({
      module: "blog",
      title: post.title,
      category: post.category,
      tags: Array.isArray(post.tags) ? post.tags : [],
      location: "Malawi",
    }),
    canonicalPath,
    image,
    imageAlt: `${post.title} article`,
    type: "article",
    section: post.category,
    author: stringMeta(meta.authorProfile, "name") || BRAND_NAME,
    publishedTime: toIso(post.createdAt),
    modifiedTime: toIso(post.updatedAt || post.createdAt),
    structuredData: [
      buildOrganizationSchema(baseUrl),
      buildWebsiteSchema(baseUrl),
      buildBreadcrumbSchema(
        [
          { name: "Home", url: "/" },
          { name: "Blog", url: "/blog" },
          { name: post.title, url: canonicalPath },
        ],
        baseUrl,
      ),
      buildBlogPostingSchema({ ...post, ...meta, imageUrl: image, slug }, readingTimeMinutes, baseUrl),
      buildFaqSchema([
        { question: `What is ${post.title} about?`, answer: description },
        { question: "Who published this guide?", answer: `${BRAND_NAME} published this guide for students, professionals, and partners exploring education opportunities.` },
      ]),
      buildRelatedItemListSchema("Related articles", relatedPosts, baseUrl),
    ],
    baseUrl,
  });
}

async function resolveEventMeta(identifier: string, baseUrl: string) {
  const events = await storage.getPublishedEvents();
  const event = await findByIdentifier(events, identifier, (item) => item.slug || slugify(item.title || `event-${item.id}`));
  if (!event) return resolveSeoMeta("/not-found", baseUrl);

  const canonicalPath = `/events/${event.slug || slugify(event.title || `event-${event.id}`)}`;
  const title = stringMeta(event.seoMeta, "title") || event.title;
  const description = seoDescription(
    stringMeta(event.seoMeta, "description") || event.summary || event.description,
    `${event.title} event with date, time, venue, speakers, registration, and event details.`,
  );
  const image = event.coverImage || "/media-assets/events/IMG-20250321-WA0250.jpg";
  const eventFaqs = toFaqs(event.faqs, [
    {
      question: `How do I register for ${event.title}?`,
      answer: "Use the registration option on the event page to reserve a seat or submit your participation details.",
    },
    {
      question: `Where is ${event.title} hosted?`,
      answer: event.isVirtual ? "This event is available online." : `This event is hosted at ${event.venueName || event.location || "the listed venue"}.`,
    },
  ]);
  const relatedEvents = events
    .filter((item) => item.id !== event.id)
    .sort((a, b) => scoreEventRelatedness(b, event) - scoreEventRelatedness(a, event))
    .slice(0, 4)
    .map((item) => ({
      name: item.title,
      url: `/events/${item.slug || slugify(item.title || `event-${item.id}`)}`,
      description: seoDescription(item.summary || item.description, `${item.title} event.`),
      image: item.coverImage,
    }));

  return buildMeta({
    title,
    description,
    keywords: generateKeywords({
      module: "event",
      title: event.title,
      category: event.category,
      location: event.location,
      tags: event.tags,
    }),
    canonicalPath,
    image,
    imageAlt: `${event.title} event`,
    type: "website",
    section: event.category,
    publishedTime: toIso(event.createdAt),
    modifiedTime: toIso(event.updatedAt || event.createdAt),
    structuredData: [
      buildOrganizationSchema(baseUrl),
      buildWebsiteSchema(baseUrl),
      buildBreadcrumbSchema(
        [
          { name: "Home", url: "/" },
          { name: "Events", url: "/events" },
          { name: event.title, url: canonicalPath },
        ],
        baseUrl,
      ),
      buildEventSchema(event, baseUrl),
      buildFaqSchema(eventFaqs),
      buildRelatedItemListSchema("Related events", relatedEvents, baseUrl),
    ],
    baseUrl,
  });
}

async function resolvePartnerMeta(identifier: string, baseUrl: string) {
  const numericId = Number.parseInt(identifier, 10);
  const partner = Number.isNaN(numericId) ? undefined : await storage.getPartner(numericId);
  if (!partner || partner.isActive === false) return resolveSeoMeta("/not-found", baseUrl);

  const meta = getPartnerMeta(partner.id);
  const canonicalPath = `/partners/${partner.id}`;
  const title = `${partner.name} Partner Profile`;
  const description = seoDescription(partner.description, `${partner.name} partner institution profile with programs, opportunities, contact details, and application guidance.`);
  const image = meta.logo || partner.logoUrl || meta.coverImage || partner.coverImage || "/media-assets/partners/cu-logo-white.webp";
  const partners = await storage.getActivePartners();
  const relatedPartners = partners
    .filter((item) => item.id !== partner.id)
    .sort((a, b) => scorePartnerRelatedness(b, partner) - scorePartnerRelatedness(a, partner))
    .slice(0, 4)
    .map((item) => {
      const itemMeta = getPartnerMeta(item.id);
      return {
        name: item.name,
        url: `/partners/${item.id}`,
        description: seoDescription(item.description, `${item.name} partner profile.`),
        image: itemMeta.logo || item.logoUrl || item.coverImage,
      };
    });
  const partnerFaqs: SeoFaq[] = [
    {
      question: `How can students evaluate ${partner.name}?`,
      answer: "Compare program fit, tuition, student support, destination requirements, and application timelines before deciding.",
    },
    {
      question: `Can Mtendere help with ${partner.name} applications?`,
      answer: `${BRAND_NAME} can help students compare this partner, prepare documents, and plan next application steps.`,
    },
  ];

  return buildMeta({
    title,
    description,
    keywords: generateKeywords({
      module: "partner",
      title: partner.name,
      category: meta.industryCategory || partner.industryCategory || "Education Partner",
      institution: partner.name,
      location: meta.country || partner.country || "Global",
    }),
    canonicalPath,
    image,
    imageAlt: `${partner.name} official partner image`,
    type: "website",
    section: meta.industryCategory || partner.industryCategory || "Partner",
    publishedTime: toIso(partner.createdAt),
    modifiedTime: toIso(partner.updatedAt || partner.createdAt),
    structuredData: [
      buildOrganizationSchema(baseUrl),
      buildWebsiteSchema(baseUrl),
      buildBreadcrumbSchema(
        [
          { name: "Home", url: "/" },
          { name: "Partners", url: "/partners" },
          { name: partner.name, url: canonicalPath },
        ],
        baseUrl,
      ),
      buildPartnerSchema({ ...partner, ...meta, logoUrl: image }, baseUrl),
      buildFaqSchema(partnerFaqs),
      buildRelatedItemListSchema("Related partners", relatedPartners, baseUrl),
    ],
    baseUrl,
  });
}

async function resolveTeamMeta(identifier: string, baseUrl: string) {
  const members = await storage.getActiveTeamMembers();
  const member = await findByIdentifier(members, identifier, (item) => {
    const meta = getTeamMeta(item.id);
    return slugify(String(meta.title || item.position || item.name || `team-${item.id}`));
  }, (item) => slugify(item.name || ""));
  if (!member) return resolveSeoMeta("/not-found", baseUrl);

  const meta = getTeamMeta(member.id);
  const title = meta.title || member.position || "";
  const canonicalPath = `/team/${slugify(String(title || member.name || `team-${member.id}`))}`;
  const description = seoDescription(meta.biography || member.bio, `${member.name}, ${title}, at ${BRAND_NAME}.`);
  const image = meta.profileImage || member.imageUrl || "/media-assets/teams/ms-brenda.jpg";

  return buildMeta({
    title: `${member.name} - ${title}`,
    description,
    keywords: generateKeywords({
      module: "team",
      title: member.name,
      category: title,
      audience: meta.department,
      location: "Malawi",
    }),
    canonicalPath,
    image,
    imageAlt: `${member.name} professional portrait`,
    type: "profile",
    section: "Team",
    modifiedTime: toIso(member.updatedAt || member.createdAt),
    structuredData: [
      buildOrganizationSchema(baseUrl),
      buildWebsiteSchema(baseUrl),
      buildBreadcrumbSchema(
        [
          { name: "Home", url: "/" },
          { name: "Team", url: "/team" },
          { name: member.name, url: canonicalPath },
        ],
        baseUrl,
      ),
      buildPersonSchema({ ...member, ...meta, imageUrl: image, title }, baseUrl),
    ],
    baseUrl,
  });
}

function buildMeta(input: {
  title: string;
  description: string;
  keywords: string[];
  canonicalPath: string;
  image: string;
  imageAlt: string;
  robots?: string;
  type: SeoPageMeta["type"];
  section?: string;
  author?: string;
  publishedTime?: string | null;
  modifiedTime?: string | null;
  lastReviewedTime?: string | null;
  structuredData: Array<JsonLd | undefined>;
  baseUrl: string;
}): SeoPageMeta {
  const canonical = absoluteUrl(input.canonicalPath, input.baseUrl).replace(/[?#].*$/, "").replace(/\/+$/, "") || input.baseUrl;
  const lastReviewedTime = input.lastReviewedTime || input.modifiedTime || input.publishedTime || SITE_LAST_REVIEWED_AT;
  return {
    title: input.title,
    description: seoDescription(input.description, `${input.title} from ${BRAND_NAME}.`),
    keywords: unique(input.keywords).slice(0, 30),
    canonical,
    image: resolveImageUrl(input.image, input.baseUrl),
    imageAlt: input.imageAlt,
    robots: input.robots || "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
    type: input.type,
    section: input.section,
    author: input.author || BRAND_NAME,
    publishedTime: input.publishedTime,
    modifiedTime: input.modifiedTime,
    lastReviewedTime,
    freshnessStatus: classifyFreshness(lastReviewedTime),
    structuredData: input.structuredData.filter((item): item is JsonLd => Boolean(item)),
  };
}

function injectSeoIntoHtml(html: string, meta: SeoPageMeta) {
  const cleaned = html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, "")
    .replace(/\s*<meta\s+(?:name|property)=["'](?:description|keywords|robots|author|publisher|theme-color|thumbnail|distribution|rating|revisit-after|geo\.region|geo\.placename|content-freshness|last-reviewed|google-site-verification|msvalidate\.01|yandex-verification|baidu-site-verification|og:[^"']+|article:[^"']+|twitter:[^"']+)["'][^>]*>\s*/gi, "")
    .replace(/\s*<link\s+rel=["']canonical["'][^>]*>\s*/gi, "")
    .replace(/\s*<link\s+rel=["']alternate["'][^>]*>\s*/gi, "")
    .replace(/\s*<link\s+rel=["']preload["'][^>]*as=["']image["'][^>]*>\s*/gi, "")
    .replace(/\s*<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi, "");

  const fullTitle = `${meta.title} | ${APP_NAME}`;
  const verificationTags = ([
    ["google-site-verification", process.env.GOOGLE_SITE_VERIFICATION || process.env.VITE_GOOGLE_SITE_VERIFICATION],
    ["msvalidate.01", process.env.BING_SITE_VERIFICATION || process.env.VITE_BING_SITE_VERIFICATION],
    ["yandex-verification", process.env.YANDEX_SITE_VERIFICATION || process.env.VITE_YANDEX_SITE_VERIFICATION],
    ["baidu-site-verification", process.env.BAIDU_SITE_VERIFICATION || process.env.VITE_BAIDU_SITE_VERIFICATION],
  ] as Array<[string, string | undefined]>)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([name, value]) => `<meta name="${escapeAttribute(name)}" content="${escapeAttribute(value)}" />`);

  const structuredData = JSON.stringify([
    ...meta.structuredData,
    buildWebPageSchema(meta),
    buildPrimaryImageSchema(meta),
  ]).replace(/</g, "\\u003c");
  const preloadImage = meta.image && !/noindex/i.test(meta.robots) ? `<link rel="preload" as="image" href="${escapeAttribute(meta.image)}" fetchpriority="high" />` : "";
  const seoHead = [
    `<title>${escapeHtml(fullTitle)}</title>`,
    `<meta name="description" content="${escapeAttribute(meta.description)}" />`,
    `<meta name="keywords" content="${escapeAttribute(meta.keywords.join(", "))}" />`,
    `<meta name="thumbnail" content="${escapeAttribute(meta.image)}" />`,
    `<meta name="theme-color" content="${BRAND_THEME_COLOR}" />`,
    `<meta name="robots" content="${escapeAttribute(meta.robots)}" />`,
    `<meta name="author" content="${escapeAttribute(meta.author || BRAND_NAME)}" />`,
    `<meta name="publisher" content="${BRAND_NAME}" />`,
    `<meta name="distribution" content="global" />`,
    `<meta name="rating" content="general" />`,
    `<meta name="revisit-after" content="7 days" />`,
    `<meta name="geo.region" content="MW" />`,
    `<meta name="geo.placename" content="Malawi" />`,
    `<meta name="content-freshness" content="${escapeAttribute(meta.freshnessStatus || "evergreen")}" />`,
    meta.lastReviewedTime ? `<meta name="last-reviewed" content="${escapeAttribute(meta.lastReviewedTime)}" />` : "",
    ...verificationTags,
    preloadImage,
    `<link rel="canonical" href="${escapeAttribute(meta.canonical)}" />`,
    `<link rel="alternate" hreflang="en" href="${escapeAttribute(meta.canonical)}" />`,
    `<link rel="alternate" hreflang="x-default" href="${escapeAttribute(meta.canonical)}" />`,
    `<meta property="og:title" content="${escapeAttribute(fullTitle)}" />`,
    `<meta property="og:description" content="${escapeAttribute(meta.description)}" />`,
    `<meta property="og:image" content="${escapeAttribute(meta.image)}" />`,
    `<meta property="og:image:alt" content="${escapeAttribute(meta.imageAlt)}" />`,
    `<meta property="og:url" content="${escapeAttribute(meta.canonical)}" />`,
    `<meta property="og:type" content="${meta.type === "article" ? "article" : "website"}" />`,
    `<meta property="og:site_name" content="${APP_NAME}" />`,
    `<meta property="og:locale" content="en_US" />`,
    meta.modifiedTime ? `<meta property="og:updated_time" content="${escapeAttribute(meta.modifiedTime)}" />` : "",
    meta.publishedTime ? `<meta property="article:published_time" content="${escapeAttribute(meta.publishedTime)}" />` : "",
    meta.modifiedTime ? `<meta property="article:modified_time" content="${escapeAttribute(meta.modifiedTime)}" />` : "",
    meta.section ? `<meta property="article:section" content="${escapeAttribute(meta.section)}" />` : "",
    meta.author ? `<meta property="article:author" content="${escapeAttribute(meta.author)}" />` : "",
    ...meta.keywords.slice(0, 8).map((keyword) => `<meta property="article:tag" content="${escapeAttribute(keyword)}" />`),
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttribute(fullTitle)}" />`,
    `<meta name="twitter:description" content="${escapeAttribute(meta.description)}" />`,
    `<meta name="twitter:image" content="${escapeAttribute(meta.image)}" />`,
    `<meta name="twitter:image:alt" content="${escapeAttribute(meta.imageAlt)}" />`,
    `<script id="mtendere-structured-data" type="application/ld+json">${structuredData}</script>`,
  ]
    .filter(Boolean)
    .map((tag) => `    ${tag}`)
    .join("\n");

  return cleaned.replace(/<\/head>/i, `${seoHead}\n  </head>`);
}

function buildOrganizationSchema(baseUrl: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    name: BRAND_NAME,
    alternateName: APP_NAME,
    url: baseUrl,
    logo: resolveImageUrl(BRAND_LOGO, baseUrl),
    image: resolveImageUrl(BRAND_LOGO, baseUrl),
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        areaServed: ["MW", "Africa", "Global"],
        availableLanguage: ["English"],
        email: process.env.ADMIN_NOTIFICATION_EMAIL || undefined,
      },
    ],
    sameAs: [
      "https://www.facebook.com/mtendereeducationconsult",
      "https://www.linkedin.com/company/mtendere-education-consult",
    ],
  };
}

function buildWebsiteSchema(baseUrl: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    name: APP_NAME,
    url: baseUrl,
    publisher: { "@id": `${baseUrl}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: `${baseUrl}/api/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

function buildBreadcrumbSchema(items: Array<{ name: string; url: string }>, baseUrl: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url, baseUrl),
    })),
  };
}

function buildCollectionPageSchema(route: StaticSeoRoute, path: string, baseUrl: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": route.module === "blog" ? "Blog" : "CollectionPage",
    name: route.title,
    description: route.description,
    url: absoluteUrl(path, baseUrl),
    isPartOf: { "@id": `${baseUrl}/#website` },
    publisher: { "@id": `${baseUrl}/#organization` },
  };
}

function buildWebPageSchema(meta: SeoPageMeta): JsonLd {
  return compactJsonLd({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${meta.canonical}#webpage`,
    name: meta.title,
    description: meta.description,
    url: meta.canonical,
    isPartOf: { "@id": `${new URL(meta.canonical).origin}/#website` },
    publisher: { "@id": `${new URL(meta.canonical).origin}/#organization` },
    primaryImageOfPage: { "@id": `${meta.canonical}#primaryimage` },
    datePublished: meta.publishedTime || undefined,
    dateModified: meta.modifiedTime || meta.lastReviewedTime || undefined,
    reviewedBy: { "@id": `${new URL(meta.canonical).origin}/#organization` },
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", "main p:first-of-type", "article p:first-of-type"],
    },
  });
}

function buildPrimaryImageSchema(meta: SeoPageMeta): JsonLd {
  return compactJsonLd({
    "@context": "https://schema.org",
    "@type": "ImageObject",
    "@id": `${meta.canonical}#primaryimage`,
    url: meta.image,
    contentUrl: meta.image,
    caption: meta.imageAlt,
    name: meta.imageAlt || meta.title,
    representativeOfPage: true,
  });
}

function buildRelatedItemListSchema(name: string, items: RelatedSeoItem[], baseUrl: string): JsonLd | undefined {
  const related = items
    .filter((item) => item.name && item.url)
    .slice(0, 6)
    .map((item, index) =>
      compactJsonLd({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(item.url, baseUrl),
        name: item.name,
        item: {
          "@type": "Thing",
          name: item.name,
          url: absoluteUrl(item.url, baseUrl),
          description: item.description,
          image: item.image ? resolveImageUrl(item.image, baseUrl) : undefined,
        },
      }),
    );
  if (!related.length) return undefined;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: related,
  };
}

function buildScholarshipSchema(item: any, baseUrl: string): JsonLd {
  return compactJsonLd({
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalProgram",
    name: item.title,
    description: stripHtml(item.fullContent || item.description || item.shortDescription),
    provider: { "@type": "Organization", name: item.sponsorOrganization || item.institution },
    educationalProgramMode: item.scholarshipType || item.category,
    programPrerequisites: asStringArray(item.requirements || item.academicRequirements).join("; ") || undefined,
    eligibilityToWorkRequirement: item.eligibilityCriteria || undefined,
    occupationalCategory: item.category,
    applicationDeadline: toIso(item.deadline),
    startDate: toIso(item.openingDate),
    financialAidEligible: Boolean(item.fundingType || item.fundingAmount || item.amount || asStringArray(item.benefits).length),
    offers: {
      "@type": "Offer",
      availabilityEnds: toIso(item.deadline),
      priceCurrency: item.currency || "USD",
      price: item.amount || 0,
      description: item.fundingAmount || asStringArray(item.benefits).join("; ") || "Scholarship funding support",
    },
    areaServed: item.region || item.country,
    image: resolveImageUrl(item.imageUrl || item.bannerImage, baseUrl),
    url: `${baseUrl}/scholarships/${item.slug || item.id}`,
  });
}

function buildJobPostingSchema(item: any, baseUrl: string): JsonLd {
  const salaryRange = parseSalary(item.salaryRange || item.salaryMin || item.salaryMax || item.salary);
  const isRemote = String(item.workMode || "").toLowerCase().includes("remote") || item.isRemote;
  return compactJsonLd({
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: item.title,
    description: stripHtml(item.description),
    datePosted: toIso(item.createdAt || item.updatedAt),
    validThrough: toIso(item.deadline),
    employmentType: normalizeEmploymentType(item.employmentType || item.jobType),
    hiringOrganization: {
      "@type": "Organization",
      name: item.company,
      sameAs: item.website,
      logo: resolveImageUrl(item.companyLogo, baseUrl),
    },
    jobLocationType: isRemote ? "TELECOMMUTE" : undefined,
    applicantLocationRequirements: isRemote ? { "@type": "Country", name: "Global" } : undefined,
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: item.location,
        addressCountry: item.region || "MW",
      },
    },
    baseSalary: salaryRange
      ? {
          "@type": "MonetaryAmount",
          currency: item.currency || "USD",
          value: {
            "@type": "QuantitativeValue",
            minValue: salaryRange.min,
            maxValue: salaryRange.max,
            value: salaryRange.value,
            unitText: "MONTH",
          },
        }
      : undefined,
    skills: asStringArray([...(asStringArray(item.requiredSkills)), ...(asStringArray(item.preferredSkills))]).join(", ") || undefined,
    qualifications: asStringArray(item.qualifications || item.educationRequirements || item.requirements).join("; ") || undefined,
    responsibilities: asStringArray(item.responsibilities).join("; ") || undefined,
    image: resolveImageUrl(item.imageUrl, baseUrl),
    url: `${baseUrl}/jobs/${item.slug || item.id}`,
  });
}

function buildBlogPostingSchema(item: any, readingTimeMinutes: number, baseUrl: string): JsonLd {
  return compactJsonLd({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: item.title,
    description: seoDescription(item.excerpt || item.content, `${item.title} from ${BRAND_NAME}.`),
    image: resolveImageUrl(item.imageUrl, baseUrl),
    author: { "@type": "Organization", name: BRAND_NAME },
    publisher: {
      "@type": "Organization",
      name: BRAND_NAME,
      logo: { "@type": "ImageObject", url: resolveImageUrl(BRAND_LOGO, baseUrl) },
    },
    datePublished: toIso(item.createdAt),
    dateModified: toIso(item.updatedAt || item.createdAt),
    mainEntityOfPage: `${baseUrl}/blog/${item.slug || item.id}`,
    articleSection: item.category,
    keywords: asStringArray(item.tags).join(", "),
    timeRequired: `PT${readingTimeMinutes}M`,
  });
}

function buildEventSchema(item: any, baseUrl: string): JsonLd {
  const attendanceMode = item.isVirtual
    ? "https://schema.org/OnlineEventAttendanceMode"
    : item.virtualUrl
      ? "https://schema.org/MixedEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode";
  return compactJsonLd({
    "@context": "https://schema.org",
    "@type": "Event",
    name: item.title,
    description: stripHtml(item.description || item.summary),
    image: resolveImageUrl(item.coverImage, baseUrl),
    startDate: toIso(item.startAt),
    endDate: toIso(item.endAt),
    eventStatus: item.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: attendanceMode,
    location: item.isVirtual
      ? { "@type": "VirtualLocation", url: item.virtualUrl || item.livestreamUrl || `${baseUrl}/events/${item.slug || item.id}` }
      : { "@type": "Place", name: item.venueName || item.location, address: item.address || item.location },
    organizer: { "@type": "Organization", name: item.organizer || BRAND_NAME, url: baseUrl },
    performer: Array.isArray(item.speakers)
      ? item.speakers.map((speaker: Record<string, unknown>) => ({ "@type": "Person", name: speaker.name || speaker.title }))
      : undefined,
    offers: {
      "@type": "Offer",
      url: `${baseUrl}/events/${item.slug || item.id}`,
      price: item.priceAmount || 0,
      priceCurrency: item.currency || "MWK",
      availability: "https://schema.org/InStock",
      validFrom: toIso(item.createdAt || item.startAt),
    },
  });
}

function buildPartnerSchema(item: any, baseUrl: string): JsonLd {
  const socialLinks = item.socialLinks ? Object.values(item.socialLinks).filter(Boolean) : [];
  return compactJsonLd({
    "@context": "https://schema.org",
    "@type": String(item.industryCategory || "").toLowerCase().includes("university") ? "CollegeOrUniversity" : "EducationalOrganization",
    name: item.name,
    description: stripHtml(item.description),
    url: item.website || `${baseUrl}/partners/${item.id}`,
    sameAs: [item.website, ...socialLinks].filter(Boolean),
    logo: resolveImageUrl(item.logoUrl, baseUrl),
    image: resolveImageUrl(item.coverImage || item.logoUrl, baseUrl),
    address: item.address || item.country,
    areaServed: item.country || item.region || "Global",
    contactPoint: item.contactEmail || item.contactPhone
      ? {
          "@type": "ContactPoint",
          name: item.contactName,
          email: item.contactEmail,
          telephone: item.contactPhone,
          contactType: "partnership",
        }
      : undefined,
  });
}

function buildPersonSchema(item: any, baseUrl: string): JsonLd {
  return compactJsonLd({
    "@context": "https://schema.org",
    "@type": "Person",
    name: item.name,
    jobTitle: item.title || item.position,
    description: stripHtml(item.biography || item.bio),
    image: resolveImageUrl(item.imageUrl || item.profileImage, baseUrl),
    email: item.email,
    worksFor: { "@id": `${baseUrl}/#organization` },
    url: `${baseUrl}/team/${item.slug || slugify(String(item.title || item.name || item.id))}`,
    sameAs: [item.linkedin, item.twitter, item.socialLinks?.linkedin, item.socialLinks?.twitter].filter(Boolean),
  });
}

function buildFaqSchema(value: unknown): JsonLd | undefined {
  const faqs = toFaqs(value)
    .slice(0, 8);
  if (!faqs.length) return undefined;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

function toFaqs(value: unknown, fallback: SeoFaq[] = []): SeoFaq[] {
  if (!Array.isArray(value)) return fallback;
  const faqs = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const question = String(record.question || record.title || record.name || "").trim();
      const answer = String(record.answer || record.description || record.content || "").trim();
      return question && answer ? { question, answer } : null;
    })
    .filter((item): item is { question: string; answer: string } => Boolean(item))
    .slice(0, 8);
  return faqs.length ? faqs : fallback;
}

function scoreScholarshipRelatedness(candidate: any, current: any) {
  return scoreShared(candidate.category, current.category, 5) + scoreShared(candidate.country, current.country, 3) + scoreShared(candidate.institution, current.institution, 2);
}

function scoreJobRelatedness(candidate: any, current: any) {
  return scoreShared(candidate.category || candidate.jobType, current.category || current.jobType, 5) + scoreShared(candidate.location, current.location, 3) + scoreShared(candidate.company, current.company, 2);
}

function scoreBlogRelatedness(candidate: any, current: any) {
  const sharedTags = asStringArray(candidate.tags).filter((tag) => asStringArray(current.tags).map((item) => item.toLowerCase()).includes(tag.toLowerCase())).length;
  return scoreShared(candidate.category, current.category, 5) + sharedTags;
}

function scoreEventRelatedness(candidate: any, current: any) {
  return scoreShared(candidate.category, current.category, 5) + scoreShared(candidate.location, current.location, 2) + scoreShared(candidate.isVirtual ? "virtual" : "physical", current.isVirtual ? "virtual" : "physical", 1);
}

function scorePartnerRelatedness(candidate: any, current: any) {
  return scoreShared(candidate.country, current.country, 4) + scoreShared(candidate.industryCategory, current.industryCategory, 3) + scoreShared(candidate.partnershipType, current.partnershipType, 2);
}

function scoreShared(a: unknown, b: unknown, score: number) {
  const left = String(a ?? "").trim().toLowerCase();
  const right = String(b ?? "").trim().toLowerCase();
  return left && right && left === right ? score : 0;
}

function classifyFreshness(value: string | null | undefined) {
  if (!value) return "evergreen";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "evergreen";
  const daysOld = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
  if (daysOld <= 90) return "fresh";
  if (daysOld <= 180) return "current";
  if (daysOld <= 365) return "review-soon";
  return "refresh-recommended";
}

function formatSeoDate(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "the listed date";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

async function findByIdentifier<T extends { id: number }>(
  items: T[],
  identifier: string,
  getSlug: (item: T) => string,
  getAlternateSlug?: (item: T) => string,
) {
  const numericId = Number.parseInt(identifier, 10);
  if (!Number.isNaN(numericId) && String(numericId) === identifier) {
    return items.find((item) => item.id === numericId);
  }

  const normalized = slugify(identifier);
  return items.find((item) => getSlug(item) === normalized || getAlternateSlug?.(item) === normalized);
}

function generateKeywords(input: {
  module: SeoModule;
  title: string;
  category?: string | null;
  location?: string | null;
  tags?: string[] | null;
  institution?: string | null;
  company?: string | null;
  audience?: string | null;
}) {
  const moduleTerms: Record<SeoModule, string[]> = {
    home: ["education consulting", "study abroad", "scholarships", "jobs", "career guidance"],
    scholarship: ["scholarships", "funding", "eligibility", "study abroad scholarships", "student grants"],
    job: ["jobs", "careers", "graduate opportunities", "internships", "CV builder"],
    event: ["education events", "career workshops", "study abroad fairs", "seminars", "registration"],
    partner: ["university partners", "education partners", "institution profiles", "international universities"],
    blog: ["education advice", "study abroad blog", "scholarship tips", "career advice"],
    team: ["education consultants", "student advisors", "Mtendere team", "career advisors"],
    service: ["education services", "application guidance", "student support", "career counseling"],
    contact: ["contact education consultant", "admissions advice", "student support"],
    about: ["Mtendere Education Consult", "education consultancy", "student success"],
  };
  const title = input.title.trim();
  const location = input.location || "Malawi";
  const entityTerms = [
    title,
    input.category,
    input.location,
    input.institution,
    input.company,
    input.audience,
    ...(input.tags || []),
  ].filter((item): item is string => Boolean(item && item.trim()));

  return unique([
    [title, input.category].filter(Boolean).join(" ") || title,
    ...entityTerms,
    ...moduleTerms[input.module],
    `${title} ${input.module === "job" ? "application" : "guidance"}`,
    `${title} eligibility and requirements`,
    `${title} opportunities for students`,
    `${input.category || title} support with ${BRAND_NAME}`,
    `${title} Malawi`,
    `${input.category || input.module} opportunities in Malawi`,
    `${input.category || input.module} for African students`,
    `${location} ${input.module} opportunities`,
  ]);
}

function resolveImageUrl(value: unknown, baseUrl: string) {
  const raw = typeof value === "string" && value.trim() ? value.trim() : BRAND_LOGO;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("/uploads/") || raw.startsWith("/media-assets/") || raw.startsWith("/assets/")) {
    return absoluteUrl(raw, baseUrl);
  }

  const normalized = raw
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^src\/assets\/imgs\//i, "")
    .replace(/^client\/src\/assets\/imgs\//i, "")
    .replace(/^assets\/imgs\//i, "")
    .replace(/^media-assets\//i, "");
  const moduleName = normalized.split("/")[0]?.toLowerCase() || "";
  if (mediaAssetModules.has(moduleName)) return absoluteUrl(`/media-assets/${normalized}`, baseUrl);
  if (/\.(jpe?g|png|webp|avif)$/i.test(normalized) && normalized.toLowerCase().includes("logo")) {
    return absoluteUrl(`/media-assets/logos/${normalized}`, baseUrl);
  }
  return absoluteUrl(BRAND_LOGO, baseUrl);
}

function absoluteUrl(value: string, baseUrl: string) {
  if (/^https?:\/\//i.test(value)) return value;
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

function seoDescription(value: unknown, fallback: string, maxLength = 158) {
  const text = stripHtml(value || fallback).replace(/\s+/g, " ").trim() || fallback;
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).replace(/\s+\S*$/, "")}.`;
}

function stripHtml(value: unknown) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stringMeta(value: unknown, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const entry = (value as Record<string, unknown>)[key];
  return typeof entry === "string" ? entry.trim() : "";
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function toIso(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseSalary(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return { value, min: undefined, max: undefined };
  if (!value) return undefined;
  const numbers = String(value)
    .match(/\d[\d,]*(?:\.\d+)?/g)
    ?.map((item) => Number(item.replace(/,/g, "")))
    .filter((item) => Number.isFinite(item) && item > 0);
  if (!numbers?.length) return undefined;
  if (numbers.length === 1) return { value: numbers[0], min: undefined, max: undefined };
  return { value: undefined, min: Math.min(...numbers), max: Math.max(...numbers) };
}

function normalizeEmploymentType(value: unknown) {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("part")) return "PART_TIME";
  if (normalized.includes("contract")) return "CONTRACTOR";
  if (normalized.includes("intern")) return "INTERN";
  if (normalized.includes("volunteer")) return "VOLUNTEER";
  return "FULL_TIME";
}

function compactJsonLd<T extends JsonLd>(value: T): T {
  const clean = (item: unknown): unknown => {
    if (Array.isArray(item)) {
      const next = item.map(clean).filter((entry) => entry !== undefined && entry !== null && entry !== "");
      return next.length ? next : undefined;
    }
    if (item && typeof item === "object") {
      const next = Object.entries(item as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, entry]) => {
        const cleaned = clean(entry);
        if (cleaned !== undefined && cleaned !== null && cleaned !== "") acc[key] = cleaned;
        return acc;
      }, {});
      return Object.keys(next).length ? next : undefined;
    }
    return item;
  };
  return (clean(value) || value) as T;
}

function normalizeRoutePath(pathname: string) {
  const path = (`/${String(pathname || "/").split(/[?#]/)[0].replace(/^\/+/, "")}`).replace(/\/{2,}/g, "/");
  return path.length > 1 ? path.replace(/\/+$/, "") : "/";
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 160) || "content"
  );
}

function titleCaseSlug(value: string) {
  const normalized = value
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "Mtendere Education Content";
  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function unique(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value)
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
