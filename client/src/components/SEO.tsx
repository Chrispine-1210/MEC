import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
}

export function SEO({ 
  title, 
  description, 
  image = "/og-image.png", 
  url = window.location.href,
  type = "website" 
}: SEOProps) {
  const fullTitle = `${title} | Mtendere Education Platform`;

  useEffect(() => {
    document.title = fullTitle;
    
    // Meta tags
    updateMetaTag("name", "description", description);
    
    // Open Graph
    updateMetaTag("property", "og:title", fullTitle);
    updateMetaTag("property", "og:description", description);
    updateMetaTag("property", "og:image", image);
    updateMetaTag("property", "og:url", url);
    updateMetaTag("property", "og:type", type);
    
    // Twitter
    updateMetaTag("name", "twitter:card", "summary_large_image");
    updateMetaTag("name", "twitter:title", fullTitle);
    updateMetaTag("name", "twitter:description", description);
    updateMetaTag("name", "twitter:image", image);
  }, [fullTitle, description, image, url, type]);

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
