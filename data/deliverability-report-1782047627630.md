# Deliverability Verification Report

- **Run ID:** deliverability-1782047608283-05bb344c
- **Started:** 2026-06-21T13:13:34.327Z
- **Elapsed:** 19s

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
  - Job ID: d75fcd1b-1b48-4263-979b-48a8643a8e61
  - Enqueue status: queued


## Evidence
- Last evidence snapshot: {
  "count": 3,
  "byType": {
    "queued": 1,
    "processing": 1,
    "sent": 1
  },
  "snapshotAt": "2026-06-21T13:13:46.567Z"
}

## Remaining issues & recommendations
- No delivered webhook/provider event detected during the verification window.
