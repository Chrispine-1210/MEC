import { useEffect, useMemo } from "react";
import { APP_NAME, BRAND_LOGO_SRC, BRAND_THEME_COLOR } from "@/lib/brand";
import { absoluteUrl, buildPrimaryImageSchema, buildWebPageSchema, canonicalUrl, keywordsMeta, type SeoKeywordSet } from "@/lib/seo";

const SITE_LAST_REVIEWED_AT = String(import.meta.env.VITE_SITE_LAST_REVIEWED_AT || "2026-06-04T00:00:00.000Z");

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
  url?: string;
  canonical?: string;
  type?: string;
  noIndex?: boolean;
  keywords?: SeoKeywordSet | string[];
  author?: string;
  section?: string;
  publishedTime?: string | null;
  modifiedTime?: string | null;
  locale?: string;
  alternateUrls?: Record<string, string>;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export function SEO({ 
  title, 
  description, 
  image = BRAND_LOGO_SRC, 
  imageAlt,
  url,
  canonical,
  type = "website",
  noIndex = false,
  keywords,
  author,
  section,
  publishedTime,
  modifiedTime,
  locale = "en_US",
  alternateUrls,
  structuredData,
}: SEOProps) {
  const fullTitle = `${title} | ${APP_NAME}`;
  const resolvedUrl = canonicalUrl(url);
  const resolvedCanonicalUrl = canonicalUrl(canonical || url);
  const resolvedImage = absoluteUrl(image) || image;
  const resolvedKeywords = keywordsMeta(keywords);
  const lastReviewedTime = modifiedTime || publishedTime || SITE_LAST_REVIEWED_AT;
  const enrichedStructuredData = useMemo(
    () =>
      [
        ...(Array.isArray(structuredData) ? structuredData : structuredData ? [structuredData] : []),
        buildWebPageSchema({
          title,
          description,
          canonical: resolvedCanonicalUrl,
          image: resolvedImage,
          imageAlt: imageAlt || title,
          publishedTime,
          modifiedTime,
        }),
        buildPrimaryImageSchema({
          title,
          canonical: resolvedCanonicalUrl,
          image: resolvedImage,
          imageAlt: imageAlt || title,
        }),
      ].filter(Boolean) as Record<string, unknown>[],
    [description, imageAlt, modifiedTime, publishedTime, resolvedCanonicalUrl, resolvedImage, structuredData, title],
  );

  useEffect(() => {
    document.title = fullTitle;
    
    // Meta tags
    updateMetaTag("name", "description", description);
    updateMetaTag("name", "keywords", resolvedKeywords);
    updateMetaTag("name", "thumbnail", resolvedImage);
    updateMetaTag("name", "theme-color", BRAND_THEME_COLOR);
    updateMetaTag("name", "robots", noIndex ? "noindex,nofollow" : "index,follow");
    updateMetaTag("name", "author", author || "Mtendere Education Consult");
    updateMetaTag("name", "publisher", "Mtendere Education Consult");
    updateMetaTag("name", "distribution", "global");
    updateMetaTag("name", "rating", "general");
    updateMetaTag("name", "geo.region", "MW");
    updateMetaTag("name", "geo.placename", "Malawi");
    updateMetaTag("name", "content-freshness", classifyFreshness(lastReviewedTime));
    updateMetaTag("name", "last-reviewed", lastReviewedTime);
    if (resolvedCanonicalUrl) updateLinkTag("canonical", resolvedCanonicalUrl);
    updateAlternateLinks(alternateUrls);
    
    // Open Graph
    updateMetaTag("property", "og:title", fullTitle);
    updateMetaTag("property", "og:description", description);
    updateMetaTag("property", "og:image", resolvedImage);
    updateMetaTag("property", "og:image:alt", imageAlt || title);
    updateMetaTag("property", "og:url", resolvedUrl);
    updateMetaTag("property", "og:type", type);
    updateMetaTag("property", "og:site_name", APP_NAME);
    updateMetaTag("property", "og:locale", locale);
    updateMetaTag("property", "og:updated_time", modifiedTime || "");
    updateMetaTag("property", "article:published_time", publishedTime || "");
    updateMetaTag("property", "article:modified_time", modifiedTime || "");
    updateMetaTag("property", "article:author", author || "");
    updateMetaTag("property", "article:section", section || "");
    
    // Twitter
    updateMetaTag("name", "twitter:card", "summary_large_image");
    updateMetaTag("name", "twitter:title", fullTitle);
    updateMetaTag("name", "twitter:description", description);
    updateMetaTag("name", "twitter:image", resolvedImage);
    updateMetaTag("name", "twitter:image:alt", imageAlt || title);
    updateStructuredData(enrichedStructuredData);
  }, [
    fullTitle,
    description,
    resolvedKeywords,
    resolvedImage,
    imageAlt,
    title,
    resolvedUrl,
    resolvedCanonicalUrl,
    type,
    noIndex,
    author,
    section,
    publishedTime,
    modifiedTime,
    lastReviewedTime,
    locale,
    alternateUrls,
    enrichedStructuredData,
  ]);

  return null;
}

function classifyFreshness(value?: string | null) {
  if (!value) return "evergreen";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "evergreen";
  const daysOld = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
  if (daysOld <= 90) return "fresh";
  if (daysOld <= 180) return "current";
  if (daysOld <= 365) return "review-soon";
  return "refresh-recommended";
}

function updateMetaTag(attr: string, key: string, content?: string) {
  let element = document.querySelector(`meta[${attr}="${key}"]`);
  if (!content) {
    element?.remove();
    return;
  }

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function updateLinkTag(rel: string, href: string) {
  let element = document.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

function updateAlternateLinks(alternateUrls?: SEOProps["alternateUrls"]) {
  document.querySelectorAll('link[data-mtendere-alternate="true"]').forEach((element) => element.remove());
  if (!alternateUrls) return;

  Object.entries(alternateUrls).forEach(([language, href]) => {
    const element = document.createElement("link");
    element.rel = "alternate";
    element.hreflang = language;
    element.href = href;
    element.dataset.mtendereAlternate = "true";
    document.head.appendChild(element);
  });
}

function updateStructuredData(data?: SEOProps["structuredData"]) {
  const id = "mtendere-structured-data";
  const existing = document.getElementById(id);
  if (!data) {
    existing?.remove();
    return;
  }

  const element = existing || document.createElement("script");
  element.id = id;
  element.setAttribute("type", "application/ld+json");
  element.textContent = JSON.stringify(Array.isArray(data) ? data : [data]);
  if (!existing) document.head.appendChild(element);
}
