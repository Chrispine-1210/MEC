const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;

export const hasRichHtml = (value?: string | null) => Boolean(value && HTML_TAG_PATTERN.test(value));

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const plainTextToHtml = (value: string) =>
  value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");

const sanitizeUrl = (value: string | null) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed.startsWith("//")) return "";
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(trimmed)) return trimmed;
  return "";
};

const sanitizeStyle = (value: string | null) => {
  if (!value) return "";
  const allowed: string[] = [];
  value.split(";").forEach((rule) => {
    const [rawProperty, rawValue] = rule.split(":");
    const property = rawProperty?.trim().toLowerCase();
    const ruleValue = rawValue?.trim().toLowerCase();
    if (property === "text-align" && /^(left|right|center|justify)$/.test(ruleValue || "")) {
      allowed.push(`${property}: ${ruleValue}`);
    }
  });
  return allowed.join("; ");
};

export const slugifyRichTextHeading = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const uniqueSlug = (base: string, counts: Map<string, number>) => {
  const fallback = base || "section";
  const count = counts.get(fallback) || 0;
  counts.set(fallback, count + 1);
  return count === 0 ? fallback : `${fallback}-${count + 1}`;
};

export function sanitizeRichHtml(value?: string | null) {
  if (!value?.trim()) return "";
  const html = hasRichHtml(value) ? value : plainTextToHtml(value);

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return plainTextToHtml(richTextToPlainText(html));
  }

  const allowedTags = new Set([
    "A",
    "B",
    "BLOCKQUOTE",
    "BR",
    "CODE",
    "DIV",
    "EM",
    "FIGCAPTION",
    "FIGURE",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "HR",
    "I",
    "IMG",
    "LI",
    "OL",
    "P",
    "PRE",
    "S",
    "SPAN",
    "STRIKE",
    "STRONG",
    "TABLE",
    "TBODY",
    "TD",
    "TH",
    "THEAD",
    "TR",
    "U",
    "UL",
  ]);

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const headingCounts = new Map<string, number>();

  const cleanNode = (node: Node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
        return;
      }

      if (child.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      const element = child as HTMLElement;
      if (!allowedTags.has(element.tagName)) {
        cleanNode(element);
        element.replaceWith(...Array.from(element.childNodes));
        return;
      }

      Array.from(element.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value;

        if (name.startsWith("on")) {
          element.removeAttribute(attribute.name);
          return;
        }

        if (name === "href" && element.tagName === "A") {
          const safeUrl = sanitizeUrl(value);
          if (!safeUrl) {
            element.removeAttribute(attribute.name);
            return;
          }
          element.setAttribute("href", safeUrl);
          element.setAttribute("rel", "noopener noreferrer");
          if (!safeUrl.startsWith("#") && !safeUrl.startsWith("/")) {
            element.setAttribute("target", "_blank");
          }
          return;
        }

        if (name === "src" && element.tagName === "IMG") {
          const safeUrl = sanitizeUrl(value);
          if (!safeUrl) {
            element.removeAttribute(attribute.name);
            return;
          }
          element.setAttribute("src", safeUrl);
          return;
        }

        if (name === "style") {
          const safeStyle = sanitizeStyle(value);
          if (safeStyle) element.setAttribute("style", safeStyle);
          else element.removeAttribute(attribute.name);
          return;
        }

        if (
          ![
            "alt",
            "colspan",
            "height",
            "id",
            "rowspan",
            "target",
            "title",
            "width",
          ].includes(name)
        ) {
          element.removeAttribute(attribute.name);
        }
      });

      if (/^H[1-6]$/.test(element.tagName) && !element.id) {
        const slug = uniqueSlug(slugifyRichTextHeading(element.textContent || ""), headingCounts);
        element.id = slug;
      }

      cleanNode(element);
    });
  };

  cleanNode(doc.body);
  return doc.body.innerHTML;
}

export function richTextToPlainText(value?: string | null) {
  if (!value?.trim()) return "";
  if (!hasRichHtml(value)) return value.replace(/\s+/g, " ").trim();

  if (typeof window !== "undefined" && typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(value, "text/html");
    return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
  }

  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function truncateRichText(value?: string | null, length = 180) {
  const text = richTextToPlainText(value);
  if (text.length <= length) return text;
  return `${text.slice(0, length).trim()}...`;
}

export function extractRichTextHeadings(value?: string | null) {
  if (!value?.trim() || !hasRichHtml(value)) return [];
  const source = sanitizeRichHtml(value);

  if (typeof window === "undefined" || typeof DOMParser === "undefined") return [];

  const doc = new DOMParser().parseFromString(source, "text/html");
  return Array.from(doc.querySelectorAll("h1,h2,h3"))
    .map((heading) => ({
      text: heading.textContent?.trim() || "",
      slug: heading.id || slugifyRichTextHeading(heading.textContent || ""),
    }))
    .filter((heading) => heading.text && heading.slug);
}
