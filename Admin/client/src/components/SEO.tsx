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
  keywords?: string[];
}

export function SEO({ 
  title, 
  description, 
  image = BRAND_LOGO_SRC, 
  url,
  canonical,
  type = "website",
  noIndex = true,
  keywords = [],
}: SEOProps) {
  const fullTitle = `${title} | ${APP_NAME}`;
  const resolvedUrl = url || (typeof window !== "undefined" ? window.location.href.replace(/[?#].*$/, "") : "");
  const canonicalUrl = canonical || resolvedUrl;

  useEffect(() => {
    document.title = fullTitle;
    
    // Meta tags
    updateMetaTag("name", "description", description);
    updateMetaTag("name", "keywords", keywords.join(", "));
    updateMetaTag("name", "theme-color", BRAND_THEME_COLOR);
    updateMetaTag("name", "robots", noIndex ? "noindex,nofollow,noarchive" : "index,follow");
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
  }, [fullTitle, description, image, resolvedUrl, canonicalUrl, type, noIndex, keywords]);

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
