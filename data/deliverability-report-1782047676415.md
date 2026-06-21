# Deliverability Verification Report

- **Run ID:** deliverability-1782047663733-9b7b0211
- **Started:** 2026-06-21T13:14:27.193Z
- **Elapsed:** 13s

## Gate Outcome
- **Provider delivered confirmed:** false
- **Mailbox inbox confirmed:** not_automated_in_repo
- **PASS:** false
- **Fail reasons:** 
  - Timed out waiting for provider-delivered evidence.

## Authentication & Readiness
- **Diagnostics ready (DNS):** false
- **Provider activation:** true
- **Blocking reasons:**

  - None

## SMTP Checks
- {
  "configured": true,
  "hostConfigured": true,
  "port": 587,
  "secure": false,
  "requireTLS": true,
  "usernameConfigured": true,
  "passwordConfigured": true,
  "senderDomain": "resend.dev"
}

## Test Emails
- Recipient: **test@example.com**
  - Job ID: a9ad9c73-3298-4fc2-9db6-7829a841329f
  - Enqueue status: queued


## Evidence
- Last evidence snapshot: {
  "count": 6,
  "byType": {
    "queued": 2,
    "processing": 2,
    "sent": 2
  },
  "snapshotAt": "2026-06-21T13:14:35.864Z"
}

## Remaining issues & recommendations
- No delivered webhook/provider event detected during the verification window.
