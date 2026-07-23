import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const moduleDir = process.env.DOC_GEN_NODE_MODULES || path.join(os.tmpdir(), "mec-admin-training-build", "node_modules");
const htmlToDocx = require(path.join(moduleDir, "html-to-docx"));
const pptxgen = require(path.join(moduleDir, "pptxgenjs"));
const sharp = require(path.join(moduleDir, "sharp"));

const root = path.resolve(process.cwd());
const outDir = path.join(root, "docs", "admin-training");
const screenshotDir = path.join(outDir, "screenshots");
const annotatedDir = path.join(screenshotDir, "annotated");
fs.mkdirSync(annotatedDir, { recursive: true });

const brand = {
  green: "166534",
  dark: "0F172A",
  gold: "F2B705",
  light: "F8FAFC",
  muted: "64748B",
};

const version = "1.0";
const preparedDate = "23 July 2026";

const modules = [
  ["Dashboard", "/admin", "viewer, writer, editor, admin, super_admin", "Operational overview metrics and recent activity."],
  ["Ecosystem", "/admin/ecosystem", "admin, super_admin", "Cross-platform ecosystem overview."],
  ["Analytics", "/admin/analytics", "admin, super_admin", "Content, application and engagement reporting."],
  ["Activity", "/admin/activity", "admin, super_admin", "Administrative activity and progress monitoring."],
  ["Scholarships", "/admin/scholarships", "writer, editor, admin, super_admin", "Create, edit, publish, unpublish and maintain scholarship records."],
  ["Job Opportunities", "/admin/jobs", "writer, editor, admin, super_admin", "Maintain work abroad and opportunity listings."],
  ["Events", "/admin/events", "writer, editor, admin, super_admin", "Manage events and registrations."],
  ["Partners", "/admin/partners", "writer, editor, admin, super_admin", "Manage partner organisation records."],
  ["Blog Posts", "/admin/blog", "writer, editor, admin, super_admin", "Create and manage articles/resources."],
  ["Team Members", "/admin/team", "writer, editor, admin, super_admin", "Maintain public staff/team records."],
  ["Media Governance", "/admin/media", "writer, editor, admin, super_admin", "Review media assets and usage governance."],
  ["Users", "/admin/users", "super_admin", "Create and maintain administrator accounts."],
  ["Applications", "/admin/applications", "admin, super_admin", "Review submitted applications and change statuses."],
  ["Payments", "/admin/payments", "admin, super_admin", "Payment and transaction operations where Stripe is configured."],
  ["Communications", "/admin/communications", "admin, super_admin", "Templates, campaigns, workflow and communication audit."],
  ["Subscribers", "/admin/subscribers", "admin, super_admin", "Newsletter subscriber review and export."],
  ["Messages", "/admin/messages", "admin, super_admin", "Consultation/contact request inbox."],
  ["Roles & Permissions", "/admin/roles", "super_admin", "Role and permission boundary review."],
  ["AI Chat Assistant", "/admin/ai-chat", "admin, super_admin", "Beta monitoring page for AI assistant activity."],
  ["Settings", "/admin/settings", "super_admin", "Security, sessions, cache and platform configuration."],
];

const figures = fs.existsSync(path.join(screenshotDir, "figures.json"))
  ? JSON.parse(fs.readFileSync(path.join(screenshotDir, "figures.json"), "utf8")).figures
  : fs.readdirSync(screenshotDir).filter((f) => f.endsWith(".png")).map((file) => ({ file, caption: file.replace(/[-_]/g, " ") }));

const knownFigureFiles = new Set(figures.map((fig) => fig.file));
for (const file of fs.readdirSync(screenshotDir).filter((f) => f.endsWith(".png")).sort()) {
  if (!knownFigureFiles.has(file)) {
    const caption = file === "01-login-page.png"
      ? "Admin sign-in page with username and password fields."
      : file.replace(/^\d+-/, "").replace(/[-_]/g, " ").replace(/\.png$/i, ".");
    figures.unshift({ file, caption });
    knownFigureFiles.add(file);
  }
}

const imageDataUri = (file) => {
  const full = path.join(annotatedDir, file);
  const fallback = path.join(screenshotDir, file);
  const data = fs.readFileSync(fs.existsSync(full) ? full : fallback);
  return `data:image/png;base64,${data.toString("base64")}`;
};

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const annotateScreenshots = async () => {
  for (let index = 0; index < figures.length; index += 1) {
    const fig = figures[index];
    const input = path.join(screenshotDir, fig.file);
    if (!fs.existsSync(input)) continue;
    const meta = await sharp(input).metadata();
    const width = meta.width || 1440;
    const overlay = `
      <svg width="${width}" height="130" xmlns="http://www.w3.org/2000/svg">
        <rect x="22" y="18" rx="18" ry="18" width="74" height="74" fill="#${brand.green}" opacity="0.96"/>
        <text x="59" y="68" font-family="Arial" font-size="34" font-weight="700" fill="white" text-anchor="middle">${index + 1}</text>
        <rect x="110" y="24" rx="12" ry="12" width="${Math.min(width - 140, 1080)}" height="62" fill="white" opacity="0.92"/>
        <text x="132" y="63" font-family="Arial" font-size="25" font-weight="700" fill="#0F172A">${escapeHtml(fig.caption).slice(0, 95)}</text>
      </svg>`;
    await sharp(input)
      .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
      .png()
      .toFile(path.join(annotatedDir, fig.file));
  }
};

const roleMatrixHtml = () => `
  <table><thead><tr><th>Role</th><th>Primary purpose</th><th>Typical access</th></tr></thead><tbody>
  <tr><td>Super Admin</td><td>Owns the platform, accounts, roles and settings.</td><td>All admin modules, including Users, Roles & Permissions and Settings.</td></tr>
  <tr><td>Admin</td><td>Runs daily operations and reviews platform activity.</td><td>Applications, Messages, Subscribers, Communications, Analytics, Activity, Payments and content modules.</td></tr>
  <tr><td>Writer / Content Manager</td><td>Maintains public content.</td><td>Scholarships, Job Opportunities, Events, Partners, Blog Posts, Team Members and Media Governance.</td></tr>
  <tr><td>Viewer</td><td>Reads high-level operational status only.</td><td>Dashboard only.</td></tr>
  </tbody></table>`;

const operationBlock = (title, authorized, where, procedure, warnings = "Never paste passwords, tokens, MFA secrets or applicant private data into public notes or screenshots.") => `
  <h3>${title}</h3>
  <p><strong>Purpose:</strong> ${procedure.purpose}</p>
  <p><strong>Authorized users:</strong> ${authorized}</p>
  <p><strong>Where to find it:</strong> ${where}</p>
  <p><strong>Required information:</strong> ${procedure.required}</p>
  <ol>${procedure.steps.map((s) => `<li>${s}</li>`).join("")}</ol>
  <p><strong>Expected result:</strong> ${procedure.result}</p>
  <p><strong>Common mistakes:</strong> ${procedure.mistakes}</p>
  <p><strong>Security warning:</strong> ${warnings}</p>
  <p><strong>Troubleshooting:</strong> ${procedure.troubleshooting}</p>`;

const manualHtml = () => `
<!doctype html><html><head><meta charset="utf-8"><title>Mtendere Admin User Manual</title>
<style>
@page { size: A4; margin: 18mm 15mm; }
body { font-family: Arial, Helvetica, sans-serif; color:#0F172A; line-height:1.45; }
h1 { color:#166534; font-size:30px; page-break-before:always; }
h1.cover { page-break-before:auto; font-size:38px; margin-top:120px; }
h2 { color:#166534; border-bottom:2px solid #F2B705; padding-bottom:4px; }
h3 { color:#0F172A; margin-top:20px; }
.coverbox { border-left:14px solid #166534; padding:28px; background:#F8FAFC; }
.meta { color:#475569; font-size:14px; }
table { border-collapse: collapse; width:100%; margin:12px 0; font-size:13px; }
th { background:#166534; color:white; text-align:left; }
th, td { border:1px solid #CBD5E1; padding:8px; vertical-align:top; }
.figure { page-break-inside:avoid; margin:16px 0; }
.figure img { width:100%; border:1px solid #CBD5E1; border-radius:8px; }
.caption { font-size:12px; color:#475569; text-align:center; margin-top:6px; }
.note { background:#FEF9C3; border-left:5px solid #F2B705; padding:10px; }
.warn { background:#FEE2E2; border-left:5px solid #DC2626; padding:10px; }
li { margin:4px 0; }
</style></head><body>
<div class="coverbox"><h1 class="cover">Mtendere Education Consult<br>Admin User Manual</h1>
<p class="meta">Version ${version} · ${preparedDate}</p>
<p><strong>Prepared for:</strong> Mtendere Education Consult</p>
<p><strong>Prepared by:</strong> Chrispine Mndala / Aöthothe Technologies</p>
<p>This manual trains administrators to operate the live Mtendere Education Consult admin platform confidently, securely and efficiently.</p></div>

<h1>Revision History</h1>
<table><tr><th>Version</th><th>Date</th><th>Prepared by</th><th>Summary</th></tr>
<tr><td>1.0</td><td>${preparedDate}</td><td>Chrispine Mndala / Aöthothe Technologies</td><td>Initial manual generated from current admin portal audit and screenshots.</td></tr></table>

<h1>Table of Contents</h1>
<ol>${["Introduction and platform purpose","Roles and permissions","Secure login, logout, passwords and MFA","Dashboard overview","Module operating procedures","Applications and consultation workflows","Communications and subscribers","Payments, analytics and audit activity","Settings and security procedures","Troubleshooting, checklists, escalation, FAQ and glossary"].map((x)=>`<li>${x}</li>`).join("")}</ol>

<h1>Introduction and Platform Purpose</h1>
<p>The Mtendere Education Consult platform supports scholarship, study abroad, work abroad, events, content, consultation and administrative operations. The admin portal is the control center for maintaining public records, reviewing user requests, communicating with clients and protecting sensitive data.</p>
<p class="note">This manual documents features verified from the current admin source code and captured admin interface. Items marked incomplete, beta or configuration-dependent should not be presented to trainees as fully available production workflows.</p>

<h1>Administrative Roles and Permissions</h1>
${roleMatrixHtml()}
<h2>Route access summary</h2>
<table><tr><th>Module</th><th>Route</th><th>Authorized roles</th><th>Purpose</th></tr>${modules.map((m)=>`<tr><td>${m[0]}</td><td>${m[1]}</td><td>${m[2]}</td><td>${m[3]}</td></tr>`).join("")}</table>

<h1>Secure Login, Logout, Passwords, MFA and Recovery</h1>
${operationBlock("Sign in to the admin portal", "All active administrator roles", "Admin login page", {
  purpose: "Verify identity before allowing access to the administration console.",
  required: "Username and password issued by the super administrator.",
  steps: ["Open the admin portal login page.", "Enter the exact Username.", "Enter the Password.", "Select Sign In.", "If MFA is enabled, enter the six-digit authenticator code."],
  result: "The administrator lands on the Dashboard or the highest permitted page.",
  mistakes: "Using an email address when the account requires a username; typing an old password; using an expired MFA code.",
  troubleshooting: "Check account status with the Super Admin; reset the password if needed; verify that MFA is currently configured correctly."
})}
<div class="warn"><strong>MFA status:</strong> MFA is currently disabled for administrator handoff/use with available credentials. The MFA setup screen exists and should be re-enabled in a future security update after credentials, QR labels and recovery procedures are finalized.</div>

<h1>Dashboard Overview</h1>
<p>The Dashboard gives administrators a quick health check of operational activity. Viewer accounts are restricted to this area. Admins and super admins should review dashboard metrics at the start of each working day.</p>

<h1>Module Operating Procedures</h1>
${operationBlock("Create, edit, publish, unpublish or delete content records", "Writer / Content Manager, Editor, Admin, Super Admin", "Scholarships, Job Opportunities, Events, Partners, Blog Posts, Team Members or Media Governance", {
  purpose: "Keep public information accurate and current.",
  required: "Title/name, description, category, dates/deadlines, images where required, publication status and any external links.",
  steps: ["Open the relevant content module.", "Select Add, Create or New where available.", "Complete all required fields.", "Save as draft if the record still needs review.", "Preview or review the record.", "Publish only after verifying dates, spelling, eligibility and links.", "Use Unpublish instead of Delete when a record may need to be restored."],
  result: "The record appears in the module list and, when published, on the public website.",
  mistakes: "Publishing with missing deadlines; uploading unclear images; deleting records instead of archiving/unpublishing; pasting unverified external links.",
  troubleshooting: "If Save fails, check required fields and network status. If the public page does not update immediately, refresh the cache or check Settings/cache controls."
})}
${operationBlock("Manage users and assign administrative roles", "Super Admin only", "Users and Roles & Permissions", {
  purpose: "Give staff the minimum access needed for their duties.",
  required: "Name, username, email, temporary password, active status and correct role.",
  steps: ["Open Users.", "Create or edit the administrator account.", "Choose the role that matches the person's responsibilities.", "Save the account.", "Confirm access by signing in with the test account or reviewing role boundaries.", "Deactivate accounts immediately when staff leave or change duties."],
  result: "The user can access only the modules allowed by the assigned role.",
  mistakes: "Giving Super Admin access for routine content work; leaving inactive accounts enabled; sharing one account among multiple staff.",
  troubleshooting: "If the user sees Access denied, compare their role against the route access summary. If they can access too much, reduce the role immediately."
})}
${operationBlock("Review applications and change status", "Admin and Super Admin", "Applications", {
  purpose: "Process submitted scholarship, study abroad, work abroad or service applications.",
  required: "Applicant record, current status, review decision, internal note and supporting documents where available.",
  steps: ["Open Applications.", "Search or filter for the applicant.", "Open the application details.", "Review submitted information carefully.", "Change the status to the appropriate stage.", "Record an internal note explaining the decision.", "Save the change and notify the applicant through the approved communication channel."],
  result: "The application status is updated and the administrative record is traceable.",
  mistakes: "Changing status without notes; exposing applicant private information; making decisions from incomplete records.",
  troubleshooting: "If status does not save, retry after refreshing. If the applicant cannot be located, search by name, email and date submitted."
})}
${operationBlock("Respond to consultation and assessment requests", "Admin and Super Admin", "Messages", {
  purpose: "Convert incoming enquiries into timely follow-up actions.",
  required: "Client name, contact channel, request type, message content and response status.",
  steps: ["Open Messages.", "Review new requests.", "Prioritize urgent or high-value enquiries.", "Respond using verified contact details.", "Mark the request as handled where the UI supports it.", "Escalate technical, payment or sensitive cases to the appropriate owner."],
  result: "The request is handled and no enquiry is left unanswered.",
  mistakes: "Replying to unverified contact details; leaving handled messages unmarked; copying private data into unsecured tools.",
  troubleshooting: "If outgoing email links fail, use the Communications audit and dry-run logs to confirm template URLs and tokens."
})}
${operationBlock("Manage newsletter subscribers", "Admin and Super Admin", "Subscribers", {
  purpose: "Maintain opt-in subscriber records and respect unsubscribe choices.",
  required: "Subscriber email/status, consent source and requested action.",
  steps: ["Open Subscribers.", "Search for the subscriber.", "Review subscription status.", "Export reports only when authorized.", "Honor unsubscribe or deletion requests according to data-protection procedures."],
  result: "Subscriber records stay accurate and compliant.",
  mistakes: "Re-subscribing users without consent; exporting lists to personal devices; ignoring unsubscribe requests.",
  troubleshooting: "If confirmation or unsubscribe links fail, verify that public email action routes and base URL configuration are deployed."
})}
${operationBlock("Export reports", "Admin and Super Admin where export controls are available", "Applications, Subscribers, Analytics or Payments", {
  purpose: "Create operational reports for management review.",
  required: "Report type, date range, filters and approved storage location.",
  steps: ["Open the relevant reporting module.", "Apply date range and filters.", "Select Export if available.", "Store the file in the approved business location.", "Delete temporary copies from personal downloads folders."],
  result: "A report is available for business use without unnecessary data exposure.",
  mistakes: "Exporting all records when a filtered report is enough; sharing spreadsheets by personal email.",
  troubleshooting: "If Export is missing, the feature may be incomplete or role-restricted; escalate to the technical owner."
})}

<h1>Email, Notification and Alert Management</h1>
<p>Communications includes templates, campaigns, workflow and audit. Email confirmation, unsubscribe and event action links depend on correct base URL configuration and matching public routes. If a link redirects to a missing page, verify the configured public URL, route handler and token expiry before sending more campaigns.</p>

<h1>Payments, Media, Analytics, Audit Logs and Settings</h1>
<p><strong>Payments:</strong> Payment and transaction management is available where Stripe/payment configuration is present. Treat it as configuration-dependent.</p>
<p><strong>Media Governance:</strong> Use approved images only and review duplicates. The audit found repeated media keys in the current interface; this should be cleaned up to avoid confusing administrators.</p>
<p><strong>Analytics:</strong> Use Analytics for trend monitoring. Do not treat dashboard numbers as audited financial statements.</p>
<p><strong>Activity:</strong> Use Activity to review administrative progress and accountability.</p>
<p><strong>Settings:</strong> Super Admins use Settings for security, sessions, cache and platform controls. Changes can affect all users.</p>

<h1>Security and Data-Protection Procedures</h1>
<ul><li>Use named accounts only; never share admin logins.</li><li>Use the lowest role that allows the work.</li><li>Do not expose passwords, MFA secrets, reset links, payment data or applicant documents in screenshots.</li><li>Export personal data only for an approved business purpose.</li><li>Deactivate unused administrator accounts promptly.</li><li>Re-enable MFA after the next authentication-hardening update and test recovery codes before enforcing it.</li></ul>

<h1>Common Errors and Troubleshooting</h1>
<table><tr><th>Symptom</th><th>Likely cause</th><th>Action</th></tr>
<tr><td>Access denied</td><td>Role does not permit the route.</td><td>Ask the Super Admin to verify the assigned role.</td></tr>
<tr><td>Email action link opens a missing page</td><td>Base URL or public route mismatch.</td><td>Check template link generation, deployed public route and token handler.</td></tr>
<tr><td>MFA setup appears unexpectedly</td><td>MFA enforcement was enabled.</td><td>Use the configured authenticator app or temporarily disable only during controlled handoff.</td></tr>
<tr><td>Save button fails</td><td>Required field, validation, API or session issue.</td><td>Check visible validation errors, refresh, sign in again, then escalate with screenshot and timestamp.</td></tr>
<tr><td>Payment page missing data</td><td>Stripe/payment environment not configured.</td><td>Escalate to technical support before changing payment settings.</td></tr></table>

<h1>Administrator Checklists</h1>
<h2>Daily</h2><ul><li>Log in and review Dashboard.</li><li>Check Applications and Messages.</li><li>Review new Subscribers and Communications alerts.</li><li>Confirm urgent content deadlines.</li></ul>
<h2>Weekly</h2><ul><li>Review Activity and Analytics.</li><li>Check published scholarships, jobs and events for expired items.</li><li>Verify user access for current staff duties.</li></ul>
<h2>Monthly</h2><ul><li>Audit administrator accounts.</li><li>Export approved management reports.</li><li>Review data-protection and backup practices.</li><li>Confirm broken links and media duplicates are resolved.</li></ul>

<h1>Practical Training Exercises and Knowledge Checks</h1>
<ol><li>Log in and review the Dashboard. Expected result: trainee can identify key metrics and recent activity.</li><li>Create a draft scholarship. Expected result: saved draft with complete required fields.</li><li>Preview and publish the scholarship. Expected result: public-ready listing appears as published.</li><li>Review a submitted application and change its status with an internal note.</li><li>Add a blog article with a featured image.</li><li>Review a consultation request and identify the appropriate response path.</li><li>Export an administrative report where the Export button is available.</li><li>Create a user and assign the correct role.</li><li>Locate a specific action in Activity/audit records.</li></ol>
<p><strong>Assessment criteria:</strong> The trainee uses the correct role, avoids exposing private data, completes required fields, records decisions, and can explain what to escalate.</p>
<p><strong>Knowledge-check answers:</strong> Super Admin manages roles/settings; Admin reviews applications/messages/subscribers; Writer manages content; Viewer sees Dashboard only; MFA should be re-enabled after the next authentication update; unsubscribe requests must be honored.</p>

<h1>Escalation and Technical Support</h1>
<p>For platform bugs, broken email links, failed payments, access issues or security incidents, capture the page name, time, account role, browser, exact error message and screenshot with sensitive data hidden. Escalate to Chrispine Mndala / Aöthothe Technologies for technical review.</p>

<h1>Frequently Asked Questions</h1>
<p><strong>Can a Writer approve applications?</strong> No. Application review is restricted to Admin and Super Admin.</p>
<p><strong>Can a Viewer change content?</strong> No. Viewer access is dashboard-only.</p>
<p><strong>Should MFA remain disabled?</strong> No. It is disabled for the current handoff but should return in the next security update after recovery and setup procedures are complete.</p>

<h1>Glossary</h1>
<table><tr><th>Term</th><th>Meaning</th></tr><tr><td>MFA</td><td>Multi-factor authentication using a six-digit authenticator code.</td></tr><tr><td>RBAC</td><td>Role-based access control.</td></tr><tr><td>Draft</td><td>A saved record not yet public.</td></tr><tr><td>Published</td><td>A record visible to public users where supported.</td></tr><tr><td>Audit activity</td><td>Traceable administrative actions used for accountability.</td></tr></table>

<h1>Verified Screenshots</h1>
${figures.map((fig, i) => `<div class="figure"><img src="${imageDataUri(fig.file)}"><div class="caption">Figure ${i + 1}. ${escapeHtml(fig.caption)}</div></div>`).join("")}
</body></html>`;

const writePdfFromHtml = async (html, outPath, landscape = false) => {
  const htmlPath = outPath.replace(/\.pdf$/i, ".html");
  fs.writeFileSync(htmlPath, html, "utf8");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: landscape ? 1280 : 900, height: landscape ? 720 : 1200 } });
  await page.goto(`file://${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "load" });
  await page.pdf({ path: outPath, format: landscape ? undefined : "A4", width: landscape ? "13.333in" : undefined, height: landscape ? "7.5in" : undefined, printBackground: true, margin: { top: "0.35in", bottom: "0.35in", left: "0.35in", right: "0.35in" } });
  await browser.close();
};

const writeDocx = async (html) => {
  const buffer = await htmlToDocx(html, null, {
    table: { row: { cantSplit: true } },
    footer: true,
    pageNumber: true,
    margins: { top: 720, right: 720, bottom: 720, left: 720 },
  });
  fs.writeFileSync(path.join(outDir, "Mtendere_Admin_User_Manual.docx"), buffer);
};

const slideData = [
  ["Mtendere Admin Training", "Operating the live Mtendere Education Consult platform securely and confidently."],
  ["Training objectives", "Navigate the admin portal, protect data, manage content, review applications, handle communications and know when to escalate."],
  ["Platform purpose", "The admin portal supports scholarships, work abroad opportunities, events, articles, users, applications, subscribers, messages, analytics and platform settings."],
  ["Administrator responsibilities", "Keep information accurate, respond quickly, protect personal data, use the correct role and maintain an audit trail."],
  ["Role boundaries", "Super Admin owns users/settings; Admin runs operations; Writer manages content; Viewer reviews dashboard only."],
  ["Security rules", "Use named accounts, strong passwords, least privilege, no shared credentials, no private data in screenshots, and re-enable MFA in the next authentication update."],
  ["Login demonstration", "Use the issued username and password. MFA is currently disabled for handoff but the setup workflow remains for future updates.", "01-login-page.png"],
  ["Dashboard tour", "Start every admin session from the Dashboard and check current activity.", "02-dashboard.png"],
  ["Navigation map", "Use the left menu groups: Overview, Content, People, Intelligence and System.", "03-navigation-menu.png"],
  ["Users", "Only Super Admins create, deactivate and update administrator accounts.", "04-users-list.png"],
  ["Roles & Permissions", "Use the role matrix to confirm access before assigning privileges.", "05-roles-permissions.png"],
  ["Scholarships workflow", "Create draft, complete fields, review, publish, update, unpublish or delete carefully.", "06-scholarships.png"],
  ["Job Opportunities workflow", "Maintain work abroad listings with verified deadlines and external links.", "07-job-opportunities.png"],
  ["Application review", "Admins and Super Admins review submissions, update status and record notes.", "08-applications.png"],
  ["Messages and consultations", "Review incoming enquiries, respond through verified channels and escalate sensitive cases.", "09-consultation-messages.png"],
  ["Blog and resources", "Writers prepare articles; publish only after checking image, title, content and links.", "10-blog-posts.png"],
  ["Events", "Create and manage event records and registrations.", "11-events.png"],
  ["Partners", "Maintain partner names, logos and public descriptions.", "12-partners.png"],
  ["Team Members", "Keep staff biographies and contact details accurate.", "13-team-members.png"],
  ["Subscribers", "Respect consent, confirmation and unsubscribe requests.", "14-subscribers.png"],
  ["Communications", "Templates, campaigns and email audit depend on correct public action links.", "15-communications.png"],
  ["Payments", "Payment operations are configuration-dependent and require careful escalation.", "16-payments.png"],
  ["Media Governance", "Use approved images, avoid duplicate records and protect sensitive assets.", "17-media-governance.png"],
  ["Analytics", "Use analytics for operational trends, not formal financial statements.", "18-analytics.png"],
  ["Activity and audit", "Review actions for accountability and troubleshooting.", "19-activity.png"],
  ["AI Chat Assistant", "Beta monitoring feature. Treat as incomplete until production-ready policies are confirmed.", "20-ai-chat.png"],
  ["Settings", "Super Admins manage security, session, cache and platform controls.", "21-settings.png"],
  ["Create/edit entry points", "Look for Add, Create or New buttons; complete required fields before saving.", "22-scholarship-form-or-create.png"],
  ["Responsive view", "Administrators can review key information on mobile, but complex edits are safer on desktop.", "23-mobile-subscribers.png"],
  ["Email link failures", "If confirmation or unsubscribe links fail, stop campaigns and verify base URL, token route and deployed public page."],
  ["Application-processing workflow", "Open record → review details → select status → add note → save → notify applicant."],
  ["Content publishing workflow", "Draft → complete required fields → preview/review → publish → verify public page → monitor expiry."],
  ["User access workflow", "Identify duty → choose least-privilege role → create account → test access → deactivate when no longer needed."],
  ["Daily checklist", "Dashboard, Applications, Messages, Subscribers, urgent deadlines and failed communications."],
  ["Weekly checklist", "Activity, Analytics, stale records, expired opportunities, access review and broken links."],
  ["Monthly checklist", "User audit, approved exports, media cleanup, data-protection review and platform improvement log."],
  ["Exercise 1", "Log in, review Dashboard, identify one metric and one recent action."],
  ["Exercise 2", "Create a draft scholarship, save it and explain what must be checked before publishing."],
  ["Exercise 3", "Review an application, change status and add an internal note."],
  ["Exercise 4", "Create a blog article with a featured image and preview it before publishing."],
  ["Exercise 5", "Create a user and assign the lowest role that fits the scenario."],
  ["Knowledge check", "Who can manage roles? Who reviews applications? What should happen when unsubscribe links fail?"],
  ["Competency checklist", "Trainee can navigate, protect data, complete workflows, troubleshoot and escalate."],
  ["Support and escalation", "Capture page, timestamp, role, browser, exact error and sanitized screenshot; escalate to Chrispine Mndala / Aöthothe Technologies."],
  ["Closing", "Operate carefully, document decisions and protect client trust."],
];

const writePptx = async () => {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Chrispine Mndala / Aöthothe Technologies";
  pptx.subject = "Mtendere Education Consult Admin Training";
  pptx.title = "Mtendere Admin Training Presentation";
  pptx.company = "Aöthothe Technologies";
  pptx.theme = { headFontFace: "Aptos Display", bodyFontFace: "Aptos", lang: "en-US" };
  slideData.forEach(([title, body, image], idx) => {
    const slide = pptx.addSlide();
    slide.background = { color: idx === 0 ? brand.green : "FFFFFF" };
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.18, fill: { color: brand.gold }, line: { color: brand.gold } });
    slide.addText(title, { x: 0.55, y: idx === 0 ? 1.7 : 0.35, w: 7.2, h: 0.75, fontFace: "Aptos Display", fontSize: idx === 0 ? 36 : 28, bold: true, color: idx === 0 ? "FFFFFF" : brand.green });
    slide.addText(body, { x: 0.6, y: idx === 0 ? 2.65 : 1.22, w: image ? 5.0 : 11.8, h: 3.8, fontFace: "Aptos", fontSize: idx === 0 ? 19 : 18, color: idx === 0 ? "FFFFFF" : brand.dark, breakLine: false, fit: "shrink" });
    if (image && fs.existsSync(path.join(annotatedDir, image))) {
      slide.addImage({ path: path.join(annotatedDir, image), x: 6.05, y: 1.15, w: 6.7, h: 5.0, sizingCrop: true });
    }
    slide.addText(`Mtendere Education Consult · Admin Training · ${idx + 1}`, { x: 0.55, y: 7.08, w: 5.5, h: 0.22, fontSize: 8, color: idx === 0 ? "FFFFFF" : brand.muted });
    slide.addNotes(`Trainer notes: ${body} Use this slide to connect the concept to Mtendere's daily operations. Ask trainees to identify what role is allowed to perform the action and what data-protection risk must be avoided.`);
  });
  await pptx.writeFile({ fileName: path.join(outDir, "Mtendere_Admin_Training_Presentation.pptx") });
};

const slidesHtml = () => `<!doctype html><html><head><meta charset="utf-8"><style>
@page{size:13.333in 7.5in;margin:0} body{margin:0;font-family:Arial,sans-serif;color:#0F172A}
.slide{width:13.333in;height:7.5in;page-break-after:always;position:relative;box-sizing:border-box;padding:.55in;background:white;overflow:hidden}
.title{background:#166534;color:white}.bar{position:absolute;top:0;left:0;right:0;height:.18in;background:#F2B705}
h1{color:#166534;font-size:34px;margin:.1in 0 .3in}.title h1{color:white;font-size:44px;margin-top:1.3in}
p{font-size:22px;line-height:1.35;max-width:6.0in}.title p{font-size:24px}.img{position:absolute;right:.55in;top:1.15in;width:6.7in;height:5.05in;object-fit:cover;border:1px solid #CBD5E1;border-radius:10px}.foot{position:absolute;bottom:.22in;left:.55in;color:#64748B;font-size:10px}.title .foot{color:white}
</style></head><body>${slideData.map(([title, body, image], idx)=>`<section class="slide ${idx===0?"title":""}"><div class="bar"></div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p>${image&&fs.existsSync(path.join(annotatedDir,image))?`<img class="img" src="${imageDataUri(image)}">`:""}<div class="foot">Mtendere Education Consult · Admin Training · ${idx+1}</div></section>`).join("")}</body></html>`;

const quickReferenceHtml = () => `<!doctype html><html><head><meta charset="utf-8"><style>
@page{size:A4;margin:14mm} body{font-family:Arial,sans-serif;color:#0F172A;line-height:1.35} h1,h2{color:#166534} h1{font-size:28px;border-bottom:4px solid #F2B705;padding-bottom:6px} table{border-collapse:collapse;width:100%;font-size:12px} th{background:#166534;color:white;text-align:left} th,td{border:1px solid #CBD5E1;padding:7px;vertical-align:top}.box{background:#F8FAFC;border-left:5px solid #166534;padding:10px;margin:10px 0}.warn{background:#FEF2F2;border-left:5px solid #DC2626;padding:10px}</style></head><body>
<h1>Mtendere Admin Quick Reference Guide</h1><p><strong>Version ${version}</strong> · ${preparedDate} · Prepared by Chrispine Mndala / Aöthothe Technologies</p>
<h2>Role access at a glance</h2>${roleMatrixHtml()}
<h2>Daily operating flow</h2><ol><li>Sign in.</li><li>Review Dashboard.</li><li>Check Applications and Messages.</li><li>Handle Subscribers/Communications alerts.</li><li>Update urgent Scholarships, Jobs, Events or Blog records.</li><li>Record decisions and escalate technical issues.</li></ol>
<div class="warn"><strong>Security:</strong> MFA is currently disabled for administrator handoff. Re-enable after the next authentication update. Never share accounts or expose credentials, MFA secrets, applicant data or payment information.</div>
<h2>Top troubleshooting</h2><table><tr><th>Issue</th><th>Do this first</th></tr><tr><td>Access denied</td><td>Check assigned role against the manual role matrix.</td></tr><tr><td>Email confirmation/unsubscribe link fails</td><td>Stop sending campaigns; verify public base URL, token route and deployed action page.</td></tr><tr><td>Save fails</td><td>Check required fields, refresh, sign in again, then escalate with sanitized screenshot and timestamp.</td></tr><tr><td>Payment issue</td><td>Do not retry blindly; escalate with transaction reference and timestamp.</td></tr></table>
<h2>Escalation details to capture</h2><div class="box">Page/module, account role, exact action, timestamp, browser, exact error message and screenshot with sensitive information hidden.</div>
</body></html>`;

const auditReport = () => `# Mtendere Admin Documentation Audit Report

Version: ${version}  
Date: ${preparedDate}  
Prepared for: Mtendere Education Consult  
Prepared by: Chrispine Mndala / Aöthothe Technologies

## Modules reviewed

${modules.map((m) => `- ${m[0]} (${m[1]}) — authorized roles: ${m[2]}.`).join("\n")}

## Workflows tested/documented

- Login using seeded demonstration accounts.
- Dashboard and navigation review.
- Role-bound access mapping for Super Admin, Admin, Writer/Content Manager and Viewer from current RBAC source.
- Content management workflow for Scholarships, Job Opportunities, Events, Partners, Blog Posts, Team Members and Media Governance.
- Application review workflow.
- Consultation/message handling workflow.
- Subscriber review workflow.
- Communications/template audit workflow.
- Payments, Analytics, Activity and Settings review.
- Responsive/mobile subscriber view.

## Missing or incomplete features

- MFA is intentionally disabled for the current administrator handoff and should be re-enabled in the next authentication update after recovery and setup procedures are finalized.
- AI Chat Assistant is marked Beta and should be treated as incomplete until production policies and monitoring are confirmed.
- Payment/transaction management is configuration-dependent and requires Stripe/payment environment configuration.
- Export controls are documented only where buttons/routes are available; some export workflows may be role-restricted or incomplete.

## Broken buttons or routes

- The reported email confirmation, unsubscribe and event action links require verification against the deployed public base URL and token handlers. These workflows should be tested before new campaigns are sent.
- Media Governance rendered duplicate React key warnings during capture, indicating duplicate media identifiers that may confuse asset display.

## Permission inconsistencies

- No route-level inconsistency was identified from the current admin RBAC file: Super Admin has Users/Roles/Settings, Admin has operational intelligence/people/payment areas, Writer has content modules, Viewer has Dashboard only.
- Manual role testing used seeded accounts and source-code route boundaries; perform another live production check after deployment configuration changes.

## Security concerns

- MFA is disabled for handoff; this lowers protection and should be temporary.
- Administrator screenshots and exports can expose personal information if not sanitized.
- Email action links must not reveal reusable tokens or redirect to missing routes.
- Shared accounts should be prohibited; named accounts and least privilege should be enforced.

## Recommended platform improvements

1. Re-enable MFA with clear issuer/account labels, backup recovery codes and a documented reset procedure.
2. Add automated tests for confirmation, unsubscribe and event action links.
3. Add a route health check for every link emitted by email templates.
4. Clean duplicate media identifiers and add uniqueness validation.
5. Add explicit disabled/configuration labels for beta, payment and export features.
6. Add end-to-end role tests for Super Admin, Admin, Writer and Viewer.
7. Add admin audit entries for high-risk changes such as role assignment, payment actions, email campaign sends and settings updates.
`;

const main = async () => {
  await annotateScreenshots();
  const html = manualHtml();
  fs.writeFileSync(path.join(outDir, "Mtendere_Admin_User_Manual.html"), html, "utf8");
  await writeDocx(html);
  await writePdfFromHtml(html, path.join(outDir, "Mtendere_Admin_User_Manual.pdf"));
  await writePptx();
  await writePdfFromHtml(slidesHtml(), path.join(outDir, "Mtendere_Admin_Training_Presentation.pdf"), true);
  await writePdfFromHtml(quickReferenceHtml(), path.join(outDir, "Mtendere_Admin_Quick_Reference_Guide.pdf"));
  fs.writeFileSync(path.join(outDir, "Documentation_Audit_Report.md"), auditReport(), "utf8");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
