import { APP_NAME, BRAND_LOGO_SRC, BRAND_NAME, BRAND_THEME_COLOR } from "@/lib/brand";
import { richTextToPlainText, truncateRichText } from "@/lib/rich-text";

type JsonLd = Record<string, unknown>;

export type SeoKeywordSet = {
  primary: string;
  secondary: string[];
  longTail: string[];
  regional: string[];
  all: string[];
};

export type SeoContentInput = {
  module:
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
  title: string;
  category?: string | null;
  location?: string | null;
  tags?: string[] | null;
  institution?: string | null;
  company?: string | null;
  audience?: string | null;
};

export type SeoFaq = {
  question: string;
  answer: string;
};

export type StaticSeoPage = {
  title: string;
  description: string;
  module: SeoContentInput["module"];
  category?: string;
  canonicalPath: string;
  keywords: SeoKeywordSet;
  image?: string;
  noIndex?: boolean;
};

const PUBLIC_APP_URL = String(import.meta.env.VITE_PUBLIC_APP_URL || "https://mtendereeducationconsult.com").replace(/\/+$/, "");

export const staticSeoPages: Record<string, StaticSeoPage> = {
  "/": createStaticPage("/", "Study Abroad, Scholarships, Jobs and Education Consulting", "Find international study pathways, scholarships, jobs, events, and expert education consulting from Mtendere Education Consult.", "home"),
  "/scholarships": createStaticPage("/scholarships", "International Scholarships for Malawian and African Students", "Explore scholarship opportunities, eligibility, benefits, deadlines, and application guidance for students planning local and international study.", "scholarship", "Scholarships"),
  "/jobs": createStaticPage("/jobs", "Jobs, Careers and Graduate Opportunities", "Browse jobs, internships, graduate programs, volunteer roles, and career opportunities with application support and CV guidance.", "job", "Careers"),
  "/resume-building": createStaticPage("/resume-building", "AI CV Builder and ATS Resume Optimization", "Build, optimize, print, and share an ATS-ready CV for scholarships, jobs, internships, and graduate programs.", "job", "CV Builder"),
  "/events": createStaticPage("/events", "Education Fairs, Career Workshops and Study Abroad Events", "Register for Mtendere education fairs, career workshops, study abroad seminars, partner sessions, and networking events.", "event", "Events"),
  "/partners": createStaticPage("/partners", "International University and Education Partners", "Meet Mtendere partner universities, institutions, and education organizations supporting international opportunities for students.", "partner", "Partners"),
  "/partnership-opportunities": createStaticPage("/partnership-opportunities", "Partnership Opportunities with Mtendere Education Consult", "Explore institutional, school, sponsor, and employer partnership opportunities with Mtendere Education Consult.", "partner", "Partnerships"),
  "/blog": createStaticPage("/blog", "Study Abroad, Scholarship and Career Advice Blog", "Read practical guidance on scholarships, study abroad, careers, applications, events, and education opportunities.", "blog", "Blog"),
  "/team": createStaticPage("/team", "Mtendere Education Consult Team", "Meet the education advisors, consultants, and leadership team guiding students, partners, and career seekers.", "team", "Team"),
  "/about": createStaticPage("/about", "About Mtendere Education Consult", "Learn about Mtendere Education Consult, our mission, education services, student support, partnerships, and impact.", "about", "About"),
  "/contact": createStaticPage("/contact", "Contact Mtendere Education Consult", "Contact Mtendere for study abroad advice, scholarship guidance, career support, partnerships, and education consulting.", "contact", "Contact"),
  "/study-abroad": createStaticPage("/study-abroad", "Study Abroad Guidance and University Pathways", "Plan your study abroad journey with destination guidance, university shortlisting, document support, and advisor-led application planning.", "service", "Study Abroad"),
  "/university-applications": createStaticPage("/university-applications", "University Application Support", "Get support with university applications, documents, statements, admissions timelines, and institution matching.", "service", "University Applications"),
  "/career-counseling": createStaticPage("/career-counseling", "Career Counseling and Employability Support", "Access career counseling, job readiness guidance, interview preparation, and professional development support.", "service", "Career Counseling"),
};

export function getPublicOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return PUBLIC_APP_URL;
}

export function absoluteUrl(value?: string | null, baseUrl = getPublicOrigin()) {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

export function canonicalUrl(pathOrUrl?: string | null, baseUrl = getPublicOrigin()) {
  const source =
    pathOrUrl ||
    (typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}${window.location.hash}` : "/");
  const url = absoluteUrl(source, baseUrl) || baseUrl;
  return url.replace(/[?#].*$/, "").replace(/\/+$/, "") || baseUrl;
}

export function compactText(value?: string | null, fallback = "") {
  const text = richTextToPlainText(value || "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

export function seoDescription(value?: string | null, fallback = "", maxLength = 158) {
  const text = compactText(value, fallback) || truncateRichText(value || fallback, maxLength);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).replace(/\s+\S*$/, "")}.`;
}

export function generateKeywords(input: SeoContentInput): SeoKeywordSet {
  const title = input.title.trim();
  const moduleTerms: Record<SeoContentInput["module"], string[]> = {
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
  const entityTerms = [
    title,
    input.category,
    input.location,
    input.institution,
    input.company,
    input.audience,
    ...(input.tags || []),
  ].filter((item): item is string => Boolean(item && item.trim()));
  const primary = [title, input.category].filter(Boolean).join(" ") || title;
  const secondary = unique([...entityTerms, ...moduleTerms[input.module]]);
  const location = input.location || "Malawi";
  const longTail = unique([
    `${title} ${input.module === "job" ? "application" : "guidance"}`,
    `${title} eligibility and requirements`,
    `${title} opportunities for students`,
    `${input.category || title} support with ${BRAND_NAME}`,
  ]);
  const regional = unique([
    `${title} Malawi`,
    `${input.category || input.module} opportunities in Malawi`,
    `${input.category || input.module} for African students`,
    `${location} ${input.module} opportunities`,
  ]);
  const all = unique([primary, ...secondary, ...longTail, ...regional]).slice(0, 30);
  return { primary, secondary: secondary.slice(0, 10), longTail, regional, all };
}

export function keywordsMeta(keywords?: SeoKeywordSet | string[]) {
  if (!keywords) return "";
  return Array.isArray(keywords) ? unique(keywords).join(", ") : keywords.all.join(", ");
}

export function buildOrganizationSchema(baseUrl = getPublicOrigin()): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    name: BRAND_NAME,
    alternateName: APP_NAME,
    url: baseUrl,
    logo: absoluteUrl(BRAND_LOGO_SRC, baseUrl),
    image: absoluteUrl(BRAND_LOGO_SRC, baseUrl),
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        areaServed: ["MW", "Africa", "Global"],
        availableLanguage: ["English"],
      },
    ],
    sameAs: [
      "https://www.facebook.com/mtendereeducationconsult",
      "https://www.linkedin.com/company/mtendere-education-consult",
    ],
  };
}

export function buildWebsiteSchema(baseUrl = getPublicOrigin()): JsonLd {
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

export function buildBreadcrumbSchema(items: Array<{ name: string; url: string }>, baseUrl = getPublicOrigin()): JsonLd {
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

export function buildFaqSchema(faqs: SeoFaq[]): JsonLd | undefined {
  const valid = faqs.filter((faq) => faq.question && faq.answer).slice(0, 8);
  if (valid.length === 0) return undefined;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: valid.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function buildCollectionPageSchema(page: StaticSeoPage, baseUrl = getPublicOrigin()): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": page.module === "blog" ? "Blog" : "CollectionPage",
    name: page.title,
    description: page.description,
    url: absoluteUrl(page.canonicalPath, baseUrl),
    isPartOf: { "@id": `${baseUrl}/#website` },
    publisher: { "@id": `${baseUrl}/#organization` },
  };
}

export function buildJobPostingSchema(job: any, baseUrl = getPublicOrigin()): JsonLd {
  const salaryRange = parseSalary(job.salaryRange || job.salaryMin || job.salary);
  return compactJsonLd({
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: compactText(job.description, `${job.title} at ${job.company}`),
    identifier: {
      "@type": "PropertyValue",
      name: BRAND_NAME,
      value: String(job.id),
    },
    datePosted: job.createdAt || job.updatedAt,
    validThrough: job.deadline,
    employmentType: normalizeEmploymentType(job.employmentType || job.jobType),
    hiringOrganization: {
      "@type": "Organization",
      name: job.company,
      sameAs: job.website,
      logo: absoluteUrl(job.companyLogo, baseUrl),
    },
    jobLocationType: String(job.workMode || "").toLowerCase().includes("remote") ? "TELECOMMUTE" : undefined,
    applicantLocationRequirements: String(job.workMode || "").toLowerCase().includes("remote")
      ? { "@type": "Country", name: "Global" }
      : undefined,
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location,
        addressCountry: job.region || "MW",
      },
    },
    baseSalary: salaryRange
      ? {
          "@type": "MonetaryAmount",
          currency: job.currency || "USD",
          value: {
            "@type": "QuantitativeValue",
            minValue: salaryRange.min,
            maxValue: salaryRange.max,
            value: salaryRange.value,
            unitText: "MONTH",
          },
        }
      : undefined,
    skills: [...(job.requiredSkills || []), ...(job.preferredSkills || [])].join(", ") || undefined,
    qualifications: (job.qualifications || job.educationRequirements || []).join("; ") || undefined,
    responsibilities: (job.responsibilities || []).join("; ") || undefined,
    image: absoluteUrl(job.imageUrl, baseUrl),
    url: `${baseUrl}/jobs/${job.slug || job.id}`,
  });
}

export function buildScholarshipSchema(scholarship: any, baseUrl = getPublicOrigin()): JsonLd {
  return compactJsonLd({
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalProgram",
    name: scholarship.title,
    description: compactText(scholarship.fullContent || scholarship.description, scholarship.shortDescription),
    provider: {
      "@type": "Organization",
      name: scholarship.sponsorOrganization || scholarship.institution,
    },
    educationalProgramMode: scholarship.scholarshipType || scholarship.category,
    programPrerequisites: (scholarship.requirements || scholarship.academicRequirements || []).join("; ") || undefined,
    eligibilityToWorkRequirement: scholarship.eligibilityCriteria || undefined,
    occupationalCategory: scholarship.category,
    applicationDeadline: scholarship.deadline,
    startDate: scholarship.openingDate || undefined,
    financialAidEligible: scholarship.fundingType || scholarship.fundingAmount || scholarship.amount ? true : undefined,
    offers: {
      "@type": "Offer",
      availabilityEnds: scholarship.deadline,
      priceCurrency: scholarship.currency || "USD",
      price: scholarship.amount || 0,
      description: scholarship.fundingAmount || scholarship.benefits?.join("; ") || "Scholarship funding support",
    },
    areaServed: scholarship.country,
    image: absoluteUrl(scholarship.bannerImage || scholarship.imageUrl, baseUrl),
    url: `${baseUrl}/scholarships/${scholarship.slug || scholarship.id}`,
  });
}

export function buildBlogPostingSchema(post: any, readingTimeMinutes: number, baseUrl = getPublicOrigin()): JsonLd {
  return compactJsonLd({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: seoDescription(post.excerpt || post.content),
    image: absoluteUrl(post.imageUrl, baseUrl),
    author: {
      "@type": "Organization",
      name: BRAND_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: BRAND_NAME,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(BRAND_LOGO_SRC, baseUrl),
      },
    },
    datePublished: post.createdAt,
    dateModified: post.updatedAt || post.createdAt,
    mainEntityOfPage: `${baseUrl}/blog/${post.slug || post.id}`,
    articleSection: post.category,
    keywords: (post.tags || []).join(", "),
    timeRequired: `PT${readingTimeMinutes}M`,
  });
}

export function buildEventSchema(event: any, baseUrl = getPublicOrigin()): JsonLd {
  const attendanceMode = event.isVirtual
    ? "https://schema.org/OnlineEventAttendanceMode"
    : event.virtualUrl
      ? "https://schema.org/MixedEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode";
  return compactJsonLd({
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: compactText(event.description, event.summary),
    image: absoluteUrl(event.coverImage, baseUrl),
    startDate: event.startAt,
    endDate: event.endAt,
    eventStatus: event.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: attendanceMode,
    location: event.isVirtual
      ? {
          "@type": "VirtualLocation",
          url: event.virtualUrl || event.livestreamUrl || `${baseUrl}/events/${event.slug || event.id}`,
        }
      : {
          "@type": "Place",
          name: event.venueName || event.location,
          address: event.address || event.location,
        },
    organizer: {
      "@type": "Organization",
      name: event.organizer || BRAND_NAME,
      url: baseUrl,
    },
    performer: (event.speakers || []).map((speaker: Record<string, unknown>) => ({
      "@type": "Person",
      name: speaker.name || speaker.title,
    })),
    offers: {
      "@type": "Offer",
      url: `${baseUrl}/events/${event.slug || event.id}`,
      price: event.priceAmount || 0,
      priceCurrency: event.currency || "MWK",
      availability: "https://schema.org/InStock",
      validFrom: event.createdAt || event.startAt,
    },
  });
}

export function buildPartnerSchema(partner: any, baseUrl = getPublicOrigin()): JsonLd {
  const socialLinks = partner.socialLinks ? Object.values(partner.socialLinks).filter(Boolean) : [];
  return compactJsonLd({
    "@context": "https://schema.org",
    "@type": partner.industryCategory?.toLowerCase().includes("university") ? "CollegeOrUniversity" : "EducationalOrganization",
    name: partner.name,
    description: compactText(partner.description),
    url: partner.website || `${baseUrl}/partners/${partner.id}`,
    sameAs: [partner.website, ...socialLinks].filter(Boolean),
    logo: absoluteUrl(partner.logoUrl, baseUrl),
    image: absoluteUrl(partner.coverImage || partner.logoUrl, baseUrl),
    address: partner.address || partner.country,
    areaServed: partner.country || partner.region || "Global",
    contactPoint: partner.contactEmail || partner.contactPhone
      ? {
          "@type": "ContactPoint",
          name: partner.contactName,
          email: partner.contactEmail,
          telephone: partner.contactPhone,
          contactType: "partnership",
        }
      : undefined,
  });
}

export function buildPersonSchema(member: any, baseUrl = getPublicOrigin()): JsonLd {
  return compactJsonLd({
    "@context": "https://schema.org",
    "@type": "Person",
    name: member.name,
    jobTitle: member.title || member.position,
    description: compactText(member.biography || member.bio),
    image: absoluteUrl(member.imageUrl || member.profileImage, baseUrl),
    email: member.email,
    worksFor: { "@id": `${baseUrl}/#organization` },
    url: `${baseUrl}/team/${member.slug || member.id}`,
    sameAs: [member.linkedin, member.twitter, member.socialLinks?.linkedin, member.socialLinks?.twitter].filter(Boolean),
  });
}

export function toSeoFaqs(value: unknown, fallback: SeoFaq[] = []) {
  if (!Array.isArray(value)) return fallback;
  const faqs = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const question = String(record.question ?? record.title ?? record.name ?? "").trim();
      const answer = String(record.answer ?? record.description ?? record.content ?? "").trim();
      return question && answer ? { question, answer } : null;
    })
    .filter((item): item is SeoFaq => Boolean(item));
  return faqs.length ? faqs : fallback;
}

function createStaticPage(
  canonicalPath: string,
  title: string,
  description: string,
  module: SeoContentInput["module"],
  category?: string,
): StaticSeoPage {
  return {
    title,
    description,
    module,
    category,
    canonicalPath,
    image: BRAND_LOGO_SRC,
    keywords: generateKeywords({ module, title, category, location: "Malawi" }),
  };
}

function normalizeEmploymentType(value?: string | null) {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("part")) return "PART_TIME";
  if (normalized.includes("contract")) return "CONTRACTOR";
  if (normalized.includes("intern")) return "INTERN";
  if (normalized.includes("volunteer")) return "VOLUNTEER";
  if (normalized.includes("graduate")) return "FULL_TIME";
  return "FULL_TIME";
}

function parseSalary(value?: string | number | null) {
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

export { APP_NAME, BRAND_NAME, BRAND_THEME_COLOR };
