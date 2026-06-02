import { useEffect } from "react";
import { APP_NAME, BRAND_LOGO_SRC, BRAND_THEME_COLOR } from "@/lib/brand";
import { absoluteUrl, canonicalUrl, keywordsMeta, type SeoKeywordSet } from "@/lib/seo";

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

  useEffect(() => {
    document.title = fullTitle;
    
    // Meta tags
    updateMetaTag("name", "description", description);
    updateMetaTag("name", "keywords", resolvedKeywords);
    updateMetaTag("name", "theme-color", BRAND_THEME_COLOR);
    updateMetaTag("name", "robots", noIndex ? "noindex,nofollow" : "index,follow");
    updateMetaTag("name", "author", author || "Mtendere Education Consult");
    updateMetaTag("name", "publisher", "Mtendere Education Consult");
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
    updateStructuredData(structuredData);
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
    locale,
    alternateUrls,
    structuredData,
  ]);

  return null;
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
