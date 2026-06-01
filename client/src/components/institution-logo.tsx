import type { CSSProperties } from "react";
import amityLogo from "@assets/imgs/au-logo.png";
import chandigarhLogo from "@assets/imgs/cu-logo-white.webp";
import ctLogo from "@assets/imgs/ct-logo.png";
import gbsLogo from "@assets/imgs/gbs-dubai-1.webp";
import geduLogo from "@assets/imgs/gedu-logo.png";
import msmUnifyLogo from "@assets/imgs/msm-unify-logo.png";
import { cn } from "@/lib/utils";

type InstitutionLogoProps = {
  name: string;
  logoUrl?: string | null;
  className?: string;
  imageClassName?: string;
  compact?: boolean;
};

type InstitutionBrand = {
  match: string[];
  logoSrc: string;
  accent: string;
  surface: string;
};

const institutionBrands: InstitutionBrand[] = [
  {
    match: ["chandigarh", "cuchd"],
    logoSrc: chandigarhLogo,
    accent: "#0b4fb3",
    surface: "#0b4fb3",
  },
  {
    match: ["ct university", "ct group"],
    logoSrc: ctLogo,
    accent: "#173f78",
    surface: "#ffffff",
  },
  {
    match: ["gedu", "global education"],
    logoSrc: geduLogo,
    accent: "#0f4c81",
    surface: "#ffffff",
  },
  {
    match: ["gbs", "global banking school"],
    logoSrc: gbsLogo,
    accent: "#c1121f",
    surface: "#ffffff",
  },
  {
    match: ["msm", "msm unify"],
    logoSrc: msmUnifyLogo,
    accent: "#0070b8",
    surface: "#ffffff",
  },
  {
    match: ["amity"],
    logoSrc: amityLogo,
    accent: "#0c3b73",
    surface: "#ffffff",
  },
];

const placeholderPatterns = [
  /partners-default/i,
  /partners-2/i,
  /our-partners/i,
  /graduates-default/i,
  /students\.jpg/i,
  /jobs-default/i,
  /events-default/i,
  /mtendere-default/i,
];

export default function InstitutionLogo({
  name,
  logoUrl,
  className,
  imageClassName,
  compact = false,
}: InstitutionLogoProps) {
  const brand = resolveInstitutionBrand(name);
  const candidateLogo = brand?.logoSrc || resolveGovernedLogoUrl(logoUrl);
  const accent = brand?.accent || "#1d4ed8";
  const surface = brand?.surface || "#ffffff";
  const initials = getInitials(name);

  const style = {
    "--institution-accent": accent,
    "--institution-surface": surface,
  } as CSSProperties;

  return (
    <div
      className={cn(
        "institution-logo flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/70 shadow-sm",
        compact ? "h-14 w-14 p-2" : "h-20 w-20 p-3",
        className,
      )}
      style={style}
      aria-label={`${name} logo`}
    >
      {candidateLogo ? (
        <img
          src={candidateLogo}
          alt={`${name} logo`}
          loading="lazy"
          decoding="async"
          sizes={compact ? "56px" : "80px"}
          className={cn("max-h-full max-w-full object-contain", imageClassName)}
        />
      ) : (
        <span className="text-lg font-black tracking-normal text-white">{initials}</span>
      )}
    </div>
  );
}

export function resolveInstitutionBrand(name: string) {
  const normalizedName = name.toLowerCase();
  return institutionBrands.find((brand) => brand.match.some((keyword) => normalizedName.includes(keyword)));
}

function resolveGovernedLogoUrl(value?: string | null) {
  if (!value || placeholderPatterns.some((pattern) => pattern.test(value))) return "";
  if (/^(https?:|data:|blob:)/i.test(value) || value.startsWith("/uploads/")) return value;

  const reference = value
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^assets\/imgs\//i, "")
    .replace(/^media-assets\//i, "");

  if (!/\.(jpe?g|png|webp)$/i.test(reference) || reference.includes("..")) return "";

  return `/media-assets/${reference
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

function getInitials(value: string) {
  const words = value
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !["of", "the", "and", "university"].includes(word.toLowerCase()));

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("") || "ME";
}
