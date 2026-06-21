# Deliverability Verification Report

- **Run ID:** deliverability-1782047723001-2f39dbd7
- **Started:** 2026-06-21T13:15:26.118Z
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
  - Job ID: 704bd610-380f-42fc-ade5-207e0900d0ba
  - Enqueue status: queued


## Evidence
- Last evidence snapshot: {
  "count": 9,
  "byType": {
    "queued": 3,
    "processing": 3,
    "sent": 3
  },
  "snapshotAt": "2026-06-21T13:15:35.459Z"
}

## Remaining issues & recommendations
- No delivered webhook/provider event detected during the verification window.
