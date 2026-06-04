const fs = require("fs");
const path = require("path");

const baseUrl = normalizeBaseUrl(process.argv[2] || process.env.SEO_AUDIT_BASE_URL || "http://localhost:5000");
const maxPages = Number(process.env.SEO_AUDIT_MAX_PAGES || 80);
const requiredSitemaps = [
  "/pages-sitemap.xml",
  "/scholarships-sitemap.xml",
  "/jobs-sitemap.xml",
  "/blog-sitemap.xml",
  "/events-sitemap.xml",
  "/partners-sitemap.xml",
  "/team-sitemap.xml",
  "/images-sitemap.xml",
];

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    limits: { maxPages },
    summary: {},
    robots: {},
    sitemaps: {},
    pages: [],
    images: [],
    issues: [],
  };

  const robotsUrl = absoluteUrl("/robots.txt");
  const robots = await fetchText(robotsUrl);
  report.robots = {
    url: robotsUrl,
    status: robots.status,
    hasAdminDisallow: /Disallow:\s*\/admin/i.test(robots.text),
    hasApiDisallow: /Disallow:\s*\/api\//i.test(robots.text),
    sitemapCount: (robots.text.match(/^Sitemap:/gim) || []).length,
  };
  addIssueIf(report, robots.status >= 400, "error", "robots.txt is not reachable", { url: robotsUrl, status: robots.status });
  addIssueIf(report, !report.robots.hasAdminDisallow, "error", "robots.txt does not disallow admin routes", { url: robotsUrl });
  addIssueIf(report, !report.robots.hasApiDisallow, "warning", "robots.txt does not disallow API routes", { url: robotsUrl });

  const sitemapIndexUrl = absoluteUrl("/sitemap.xml");
  const sitemapIndex = await fetchText(sitemapIndexUrl);
  const indexedSitemaps = extractLocs(sitemapIndex.text);
  report.sitemaps.index = { url: sitemapIndexUrl, status: sitemapIndex.status, sitemapCount: indexedSitemaps.length };
  addIssueIf(report, sitemapIndex.status >= 400, "error", "sitemap.xml is not reachable", { url: sitemapIndexUrl, status: sitemapIndex.status });

  for (const sitemapPath of requiredSitemaps) {
    const sitemapUrl = absoluteUrl(sitemapPath);
    const existsInIndex = indexedSitemaps.some((loc) => normalizeUrl(loc) === normalizeUrl(sitemapUrl));
    const response = await fetchText(sitemapUrl);
    const locs = extractLocs(response.text);
    report.sitemaps[sitemapPath] = {
      url: sitemapUrl,
      status: response.status,
      existsInIndex,
      locCount: locs.length,
      locs,
    };
    addIssueIf(report, !existsInIndex, "warning", "Sitemap is missing from sitemap index", { sitemap: sitemapPath });
    addIssueIf(report, response.status >= 400, "error", "Sitemap is not reachable", { sitemap: sitemapPath, status: response.status });
  }

  const pageUrls = unique(
    requiredSitemaps
      .filter((sitemapPath) => sitemapPath !== "/images-sitemap.xml")
      .flatMap((sitemapPath) => report.sitemaps[sitemapPath]?.locs || []),
  );

  if (pageUrls.length === 0) {
    for (const sitemapPath of requiredSitemaps.filter((item) => item !== "/images-sitemap.xml")) {
      const sitemap = await fetchText(absoluteUrl(sitemapPath));
      pageUrls.push(...extractLocs(sitemap.text));
    }
  }

  const pageResults = [];
  for (const url of unique(pageUrls).slice(0, maxPages)) {
    const page = await auditPage(url);
    pageResults.push(page);
    for (const issue of page.issues) report.issues.push(issue);
  }
  report.pages = pageResults;

  const imageSitemap = await fetchText(absoluteUrl("/images-sitemap.xml"));
  const imageEntries = extractImageEntries(imageSitemap.text);
  const imageResults = [];
  for (const entry of imageEntries.slice(0, Math.min(maxPages, 120))) {
    const url = entry.loc;
    const result = await checkAsset(url);
    imageResults.push({ ...result, title: entry.title, caption: entry.caption, page: entry.page });
    addIssueIf(report, result.status >= 400 || !result.ok, "warning", "Image sitemap asset is not reachable", result);
    addIssueIf(report, result.ok && !/^image\//i.test(result.contentType || ""), "warning", "Image sitemap asset did not return an image content type", result);
    addIssueIf(report, !entry.title, "warning", "Image sitemap entry is missing image title", { url, page: entry.page });
    addIssueIf(report, !entry.caption, "warning", "Image sitemap entry is missing image caption", { url, page: entry.page });
  }
  report.images = imageResults;

  addDuplicateIssues(report, pageResults, "title", "Duplicate meta title");
  addDuplicateIssues(report, pageResults, "description", "Duplicate meta description");

  report.summary = {
    checkedPages: pageResults.length,
    checkedImages: imageResults.length,
    issues: report.issues.length,
    errors: report.issues.filter((issue) => issue.severity === "error").length,
    warnings: report.issues.filter((issue) => issue.severity === "warning").length,
    duplicateTitles: report.issues.filter((issue) => issue.message === "Duplicate meta title").length,
    duplicateDescriptions: report.issues.filter((issue) => issue.message === "Duplicate meta description").length,
    pagesWithFaqSchema: pageResults.filter((page) => page.jsonLdTypes.includes("FAQPage")).length,
    pagesWithRelatedSchema: pageResults.filter((page) => page.jsonLdTypes.includes("ItemList")).length,
    pagesWithImageObjectSchema: pageResults.filter((page) => page.jsonLdTypes.includes("ImageObject")).length,
  };

  const reportPath = path.resolve(process.cwd(), "docs", "seo-governance-report.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`SEO governance audit complete for ${baseUrl}`);
  console.log(`Pages: ${report.summary.checkedPages}, images: ${report.summary.checkedImages}, issues: ${report.summary.issues}`);
  console.log(`Report: ${reportPath}`);

  if (report.summary.errors > 0) {
    process.exitCode = 1;
  }
}

async function auditPage(url) {
  const response = await fetchText(url);
  const html = response.text;
  const title = textMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = metaContent(html, "name", "description");
  const canonical = linkHref(html, "canonical");
  const robots = metaContent(html, "name", "robots");
  const ogTitle = metaContent(html, "property", "og:title");
  const ogDescription = metaContent(html, "property", "og:description");
  const ogImage = metaContent(html, "property", "og:image");
  const twitterCard = metaContent(html, "name", "twitter:card");
  const lastReviewed = metaContent(html, "name", "last-reviewed");
  const contentFreshness = metaContent(html, "name", "content-freshness");
  const thumbnail = metaContent(html, "name", "thumbnail");
  const alternateLanguages = extractAlternateLanguages(html);
  const jsonLdBlocks = extractJsonLd(html);
  const jsonLdTypes = unique(jsonLdBlocks.flatMap(extractJsonLdTypes));
  const jsonLdCount = jsonLdBlocks.length;
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  const localLinks = extractLocalLinks(html, url);
  const routeExpectation = schemaExpectationForUrl(url);
  const issues = [];

  pushPageIssue(issues, response.status >= 400, "error", "Page is not reachable", url, { status: response.status });
  pushPageIssue(issues, !title || title.length < 12, "error", "Missing or weak title", url, { title });
  pushPageIssue(issues, !description || description.length < 50, "error", "Missing or weak meta description", url, { description });
  pushPageIssue(issues, !canonical, "error", "Missing canonical URL", url);
  pushPageIssue(issues, Boolean(canonical && canonical.includes("?")), "warning", "Canonical URL contains query parameters", url, { canonical });
  pushPageIssue(issues, !ogTitle || !ogDescription || !ogImage, "warning", "Incomplete Open Graph metadata", url);
  pushPageIssue(issues, !twitterCard, "warning", "Missing Twitter card metadata", url);
  pushPageIssue(issues, jsonLdCount === 0, "warning", "Missing JSON-LD structured data", url);
  pushPageIssue(issues, !jsonLdTypes.includes("Organization"), "warning", "Missing Organization schema", url, { jsonLdTypes });
  pushPageIssue(issues, !jsonLdTypes.includes("WebSite"), "warning", "Missing WebSite schema", url, { jsonLdTypes });
  pushPageIssue(issues, !jsonLdTypes.includes("BreadcrumbList"), "warning", "Missing BreadcrumbList schema", url, { jsonLdTypes });
  pushPageIssue(issues, !jsonLdTypes.includes("WebPage"), "warning", "Missing WebPage schema", url, { jsonLdTypes });
  pushPageIssue(issues, !jsonLdTypes.includes("ImageObject"), "warning", "Missing ImageObject schema", url, { jsonLdTypes });
  pushPageIssue(issues, Boolean(routeExpectation.requiredSchema && !jsonLdTypes.includes(routeExpectation.requiredSchema)), "warning", `Missing ${routeExpectation.requiredSchema} rich-result schema`, url, { jsonLdTypes });
  pushPageIssue(issues, routeExpectation.needsFaq && !jsonLdTypes.includes("FAQPage"), "warning", "Detail page is missing FAQPage schema", url, { jsonLdTypes });
  pushPageIssue(issues, routeExpectation.needsRelated && !jsonLdTypes.includes("ItemList"), "warning", "Detail page is missing related content ItemList schema", url, { jsonLdTypes });
  pushPageIssue(issues, !lastReviewed, "warning", "Missing last-reviewed freshness metadata", url);
  pushPageIssue(issues, !contentFreshness, "warning", "Missing content-freshness metadata", url);
  pushPageIssue(issues, !thumbnail, "warning", "Missing thumbnail image metadata", url);
  pushPageIssue(issues, !alternateLanguages.includes("en") || !alternateLanguages.includes("x-default"), "warning", "Missing default hreflang alternates", url, { alternateLanguages });
  pushPageIssue(issues, /noindex/i.test(robots || "") && !/\/(login|register|reset-password|forgot-password|dashboard|referrals|admin|not-found)/i.test(url), "warning", "Indexable public page has noindex robots metadata", url, { robots });

  return {
    url,
    status: response.status,
    title: decodeEntities(title),
    description: decodeEntities(description),
    canonical,
    robots,
    ogTitle,
    ogDescription,
    ogImage,
    twitterCard,
    lastReviewed,
    contentFreshness,
    thumbnail,
    alternateLanguages,
    jsonLdCount,
    jsonLdTypes,
    h1Count,
    localLinkCount: localLinks.length,
    issues,
  };
}

async function checkAsset(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, { method: "HEAD", signal: controller.signal });
    clearTimeout(timeout);
    return {
      url,
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get("content-type"),
      robots: response.headers.get("x-robots-tag"),
    };
  } catch (error) {
    return { url, status: 0, ok: false, error: error.message };
  }
}

async function fetchText(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();
    clearTimeout(timeout);
    return { status: response.status, text };
  } catch (error) {
    return { status: 0, text: "", error: error.message };
  }
}

function extractLocs(xml) {
  return Array.from(xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)).map((match) => decodeEntities(match[1].trim()));
}

function extractImageLocs(xml) {
  return Array.from(xml.matchAll(/<image:loc>\s*([^<]+?)\s*<\/image:loc>/gi)).map((match) => decodeEntities(match[1].trim()));
}

function extractImageEntries(xml) {
  const entries = [];
  const urlBlocks = Array.from(xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)).map((match) => match[1]);
  for (const block of urlBlocks) {
    const page = textMatch(block, /<loc>\s*([^<]+?)\s*<\/loc>/i);
    const imageBlocks = Array.from(block.matchAll(/<image:image>([\s\S]*?)<\/image:image>/gi)).map((match) => match[1]);
    for (const imageBlock of imageBlocks) {
      const loc = textMatch(imageBlock, /<image:loc>\s*([^<]+?)\s*<\/image:loc>/i);
      if (!loc) continue;
      entries.push({
        page: decodeEntities(page),
        loc: decodeEntities(loc),
        title: decodeEntities(textMatch(imageBlock, /<image:title>\s*([^<]*?)\s*<\/image:title>/i)),
        caption: decodeEntities(textMatch(imageBlock, /<image:caption>\s*([^<]*?)\s*<\/image:caption>/i)),
      });
    }
  }
  return entries.length ? entries : extractImageLocs(xml).map((loc) => ({ loc, title: "", caption: "", page: "" }));
}

function extractJsonLd(html) {
  const blocks = Array.from(html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)).map((match) => match[1].trim());
  return blocks.flatMap((block) => {
    try {
      const parsed = JSON.parse(decodeEntities(block));
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  });
}

function extractJsonLdTypes(value) {
  if (!value || typeof value !== "object") return [];
  const type = value["@type"];
  const ownTypes = Array.isArray(type) ? type : type ? [type] : [];
  const nestedTypes = Object.values(value).flatMap((entry) => {
    if (Array.isArray(entry)) return entry.flatMap(extractJsonLdTypes);
    return extractJsonLdTypes(entry);
  });
  return [...ownTypes.map(String), ...nestedTypes];
}

function schemaExpectationForUrl(url) {
  const pathname = new URL(url).pathname;
  if (/^\/jobs\//.test(pathname)) return { requiredSchema: "JobPosting", needsFaq: true, needsRelated: true };
  if (/^\/scholarships\//.test(pathname)) return { requiredSchema: "EducationalOccupationalProgram", needsFaq: true, needsRelated: true };
  if (/^\/blog\//.test(pathname)) return { requiredSchema: "BlogPosting", needsFaq: true, needsRelated: true };
  if (/^\/events\//.test(pathname)) return { requiredSchema: "Event", needsFaq: true, needsRelated: true };
  if (/^\/partners\//.test(pathname)) return { requiredSchema: "EducationalOrganization", needsFaq: true, needsRelated: true };
  if (/^\/team\//.test(pathname)) return { requiredSchema: "Person", needsFaq: false, needsRelated: false };
  return { requiredSchema: "", needsFaq: false, needsRelated: false };
}

function extractAlternateLanguages(html) {
  return Array.from(html.matchAll(/<link\b(?=[^>]*\brel=["']alternate["'])(?=[^>]*\bhreflang=["']([^"']+)["'])[^>]*>/gi)).map((match) => match[1]);
}

function extractLocalLinks(html, pageUrl) {
  return Array.from(html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi))
    .map((match) => match[1])
    .filter((href) => href && !href.startsWith("#") && !/^(mailto:|tel:|javascript:)/i.test(href))
    .map((href) => {
      try {
        return new URL(href, pageUrl).href;
      } catch {
        return "";
      }
    })
    .filter((href) => href && normalizeBaseUrl(href).startsWith(baseUrl));
}

function addDuplicateIssues(report, pages, field, message) {
  const groups = pages.reduce((acc, page) => {
    const value = String(page[field] || "").trim().toLowerCase();
    if (!value) return acc;
    acc[value] = acc[value] || [];
    acc[value].push(page.url);
    return acc;
  }, {});

  for (const urls of Object.values(groups)) {
    if (urls.length > 1) {
      report.issues.push({ severity: "warning", message, urls });
    }
  }
}

function addIssueIf(report, condition, severity, message, details = {}) {
  if (condition) report.issues.push({ severity, message, ...details });
}

function pushPageIssue(issues, condition, severity, message, url, details = {}) {
  if (condition) issues.push({ severity, message, url, ...details });
}

function metaContent(html, attr, key) {
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\b${attr}=["']${escapeRegex(key)}["'])[^>]*\\bcontent=["']([^"']*)["'][^>]*>`, "i");
  return textMatch(html, pattern);
}

function linkHref(html, rel) {
  const pattern = new RegExp(`<link\\b(?=[^>]*\\brel=["']${escapeRegex(rel)}["'])[^>]*\\bhref=["']([^"']*)["'][^>]*>`, "i");
  return textMatch(html, pattern);
}

function textMatch(value, pattern) {
  const match = value.match(pattern);
  return match ? match[1].trim() : "";
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function absoluteUrl(value) {
  return new URL(value, `${baseUrl}/`).href;
}

function normalizeBaseUrl(value) {
  const url = new URL(value);
  return `${url.protocol}//${url.host}`.replace(/\/+$/, "");
}

function normalizeUrl(value) {
  const url = new URL(value);
  return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
