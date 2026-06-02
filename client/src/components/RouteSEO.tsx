import { useLocation } from "wouter";
import { SEO } from "@/components/SEO";
import {
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildOrganizationSchema,
  buildWebsiteSchema,
  canonicalUrl,
  staticSeoPages,
  type StaticSeoPage,
} from "@/lib/seo";

const privatePages: Record<string, Pick<StaticSeoPage, "title" | "description" | "canonicalPath" | "keywords"> & { noIndex: true }> = {
  "/login": {
    title: "Secure Login",
    description: "Sign in securely to access your Mtendere Education Consult account.",
    canonicalPath: "/login",
    keywords: { primary: "Mtendere login", secondary: [], longTail: [], regional: [], all: ["Mtendere login"] },
    noIndex: true,
  },
  "/register": {
    title: "Create Account",
    description: "Create a secure Mtendere Education Consult account.",
    canonicalPath: "/register",
    keywords: { primary: "Mtendere account", secondary: [], longTail: [], regional: [], all: ["Mtendere account"] },
    noIndex: true,
  },
  "/forgot-password": {
    title: "Password Recovery",
    description: "Recover access to your Mtendere Education Consult account.",
    canonicalPath: "/forgot-password",
    keywords: { primary: "Mtendere password recovery", secondary: [], longTail: [], regional: [], all: ["Mtendere password recovery"] },
    noIndex: true,
  },
  "/reset-password": {
    title: "Reset Password",
    description: "Reset your Mtendere Education Consult password securely.",
    canonicalPath: "/reset-password",
    keywords: { primary: "Mtendere reset password", secondary: [], longTail: [], regional: [], all: ["Mtendere reset password"] },
    noIndex: true,
  },
  "/dashboard": {
    title: "User Dashboard",
    description: "Private Mtendere Education Consult account dashboard.",
    canonicalPath: "/dashboard",
    keywords: { primary: "Mtendere dashboard", secondary: [], longTail: [], regional: [], all: ["Mtendere dashboard"] },
    noIndex: true,
  },
  "/admin": {
    title: "Administration",
    description: "Private Mtendere Education Consult administration workspace.",
    canonicalPath: "/admin",
    keywords: { primary: "Mtendere administration", secondary: [], longTail: [], regional: [], all: ["Mtendere administration"] },
    noIndex: true,
  },
  "/referrals": {
    title: "Referral Dashboard",
    description: "Private Mtendere Education Consult referral dashboard.",
    canonicalPath: "/referrals",
    keywords: { primary: "Mtendere referrals", secondary: [], longTail: [], regional: [], all: ["Mtendere referrals"] },
    noIndex: true,
  },
};

export default function RouteSEO() {
  const [location] = useLocation();
  const path = location.split(/[?#]/)[0] || "/";
  const page = staticSeoPages[path];
  const privatePage = privatePages[path];

  if (!page && !privatePage) return null;

  const item = page || privatePage;
  const structuredData = page
    ? [
        buildOrganizationSchema(),
        buildWebsiteSchema(),
        buildBreadcrumbSchema([
          { name: "Home", url: "/" },
          ...(path === "/" ? [] : [{ name: page.category || page.title, url: path }]),
        ]),
        buildCollectionPageSchema(page),
      ]
    : [buildOrganizationSchema()];

  return (
    <SEO
      title={item.title}
      description={item.description}
      image={page?.image}
      imageAlt={item.title}
      canonical={canonicalUrl(item.canonicalPath)}
      keywords={item.keywords}
      noIndex={item.noIndex}
      structuredData={structuredData}
    />
  );
}
