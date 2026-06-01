# Mtendere Visual Design Audit Report

Date: 2026-06-01

## Scope

Reviewed public Client Portal pages, Admin Management media tooling, shared image rendering, shared button/card primitives, partner/university branding surfaces, and seeded visual content.

## Duplicate Image Findings

- Exact duplicate image hash groups found: 42.
- Duplicate filenames found: 33.
- Total governed image files reviewed: 303.
- Known generic/default asset references still present for audit visibility: 7.
- High-impact duplicates included:
  - `about mtendere.jpg` repeated across Background, misc, and root image folders.
  - `Application guidance.jpg` repeated across Background, Blogs, scholarships, and root folders.
  - `graduates.jpg` / `graduates-default.jpg` repeated across five paths.
  - `partners-default.jpg` reused as partner branding.
  - `B98A2595.JPG` duplicated twice at roughly 9.12 MB each.
- Largest source images observed were above 8 MB, including several campus/service/job images.

## Branding Inconsistencies

- Partner/university logos were sometimes rendered as cropped photographic cards.
- Generic partner images were used for named institutions.
- Seed data referenced global universities with generic stock-like visuals.
- Logo presentation lacked a dedicated fallback when official branding was unavailable.
- Root-level official logo assets were not exposed through the Admin `logos` module, making logo governance harder than it needed to be.

## Accessibility And Contrast Issues

- Outline buttons could become low contrast when used over hero images.
- Admin and client button styles differed in weight, shadow, and hover behavior.
- Hero sections relied on per-page overlays instead of a consistent contrast layer.

## Corrections Implemented

- Added deterministic logo-aware image governance.
- Added official/institutional logo rendering through `InstitutionLogo`.
- Split partner card imagery from institutional identity marks.
- Added Admin media duplicate and quality reporting.
- Added Admin bulk media reference replacement.
- Added root-logo aliases so existing official logo files are managed as `logos/...` references in Admin without duplicating binary files.
- Removed default placeholder media from new scholarship, event, partner, and video seed assignments.
- Updated public image governance to ignore stale placeholder assignments and choose contextual assets instead.
- Standardized Button and Card primitives across Client and Admin.

## Remaining Asset Governance Work

- Exact duplicate binary files still exist in the repository and should be physically consolidated in a later cleanup after all references are migrated.
- New source uploads should be compressed before assignment, preferably WebP for large photographic assets.
- Placeholder binaries remain in the source tree only as flagged audit targets and last-resort fallbacks, not preferred presentation assets.
