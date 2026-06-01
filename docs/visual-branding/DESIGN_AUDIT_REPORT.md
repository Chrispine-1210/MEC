# Mtendere Visual Design Audit Report

Date: 2026-06-01

## Scope

Reviewed public Client Portal pages, Admin Management media tooling, shared image rendering, shared button/card primitives, partner/university branding surfaces, and seeded visual content.

## Duplicate Image Findings

- Exact duplicate image hash groups found: 42.
- Duplicate filenames found: 33.
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
- Standardized Button and Card primitives across Client and Admin.

## Remaining Asset Governance Work

- Exact duplicate binary files still exist in the repository and should be physically consolidated in a later cleanup after all references are migrated.
- New source uploads should be compressed before assignment, preferably WebP for large photographic assets.
