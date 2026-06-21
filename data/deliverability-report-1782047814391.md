# Deliverability Verification Report

- **Run ID:** deliverability-1782047803952-8c15d426
- **Started:** 2026-06-21T13:16:46.664Z
- **Elapsed:** 10s

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
  - Job ID: d74f3eb5-1cee-4afd-ab3a-3c09be461cfe
  - Enqueue status: queued


## Evidence
- Last evidence snapshot: {
  "count": 12,
  "byType": {
    "queued": 4,
    "processing": 4,
    "sent": 4
  },
  "snapshotAt": "2026-06-21T13:16:53.890Z"
}

## Remaining issues & recommendations
- No delivered webhook/provider event detected during the verification window.
