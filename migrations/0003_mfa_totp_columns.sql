
-- Migration: Add MFA TOTP columns to users
-- Date: 2026-05-11

-- No-op migration.
-- The MFA columns (mfa_enabled, totp_secret, mfa_confirmed_at) are already present in the DB.
-- Keeping this file as a no-op prevents repeated column-collision errors.

SELECT 1;




