# Mtendere Asset Usage Report

Date: 2026-06-01

## Images And Logos Replaced In User-Facing Flows

- University Applications no longer uses repeated generic partner photos for named institutions.
- Partner listing cards now use a contextual cover image area plus a separate official/institutional logo tile.
- Partner detail hero sections now use cover imagery instead of stretching logos as background photos.
- Event partner strips now render institution logos through the same optimized logo component.
- Future partner video seeds now prioritize Chandigarh University and GBS Dubai logo references where available.

## Official Branding Assets Integrated

The new logo renderer prioritizes known institutional marks already present in the asset library:

- Chandigarh University
- CT University
- GEDU Global Education
- GBS Dubai
- MSM Unify
- Amity University

If no official logo is available, the platform renders a branded initials fallback instead of recycling a generic stock image.

## Admin Media Management Enhancements

- Added governed media modules for `universities`, `logos`, `hero-banners`, and `backgrounds`.
- Added asset type filtering for images, logos, hero banners, and backgrounds.
- Added quality flags for large files, placeholder-like assets, and non-WebP files.
- Added duplicate hash reporting to identify exact duplicate source files.
- Added bulk media reference replacement to retire repeated placeholders across content records.

## Performance Improvements

- Shared image rendering now applies responsive `sizes`.
- Logos default to `object-contain` and avoid photographic gradient overlays.
- Non-priority images remain lazy-loaded and async-decoded.
- Admin audit now highlights large files before they are assigned to public pages.
