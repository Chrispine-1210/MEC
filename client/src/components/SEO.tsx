import { useEffect } from "react";
import { APP_NAME, BRAND_LOGO_SRC, BRAND_THEME_COLOR } from "@/lib/brand";

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  canonical?: string;
  type?: string;
  noIndex?: boolean;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export function SEO({ 
  title, 
  description, 
  image = BRAND_LOGO_SRC, 
  url,
  canonical,
  type = "website",
  noIndex = false,
  structuredData,
}: SEOProps) {
  const fullTitle = `${title} | ${APP_NAME}`;
  const resolvedUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const canonicalUrl = canonical || resolvedUrl;

  useEffect(() => {
    document.title = fullTitle;
    
    // Meta tags
    updateMetaTag("name", "description", description);
    updateMetaTag("name", "theme-color", BRAND_THEME_COLOR);
    updateMetaTag("name", "robots", noIndex ? "noindex,nofollow" : "index,follow");
    if (canonicalUrl) updateLinkTag("canonical", canonicalUrl);
    
    // Open Graph
    updateMetaTag("property", "og:title", fullTitle);
    updateMetaTag("property", "og:description", description);
    updateMetaTag("property", "og:image", image);
    updateMetaTag("property", "og:url", resolvedUrl);
    updateMetaTag("property", "og:type", type);
    
    // Twitter
    updateMetaTag("name", "twitter:card", "summary_large_image");
    updateMetaTag("name", "twitter:title", fullTitle);
    updateMetaTag("name", "twitter:description", description);
    updateMetaTag("name", "twitter:image", image);
    updateStructuredData(structuredData);
  }, [fullTitle, description, image, resolvedUrl, canonicalUrl, type, noIndex, structuredData]);

  return null;
}

function updateMetaTag(attr: string, key: string, content: string) {
  let element = document.querySelector(`meta[${attr}="${key}"]`);
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
