const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_TEST_FROM || "Mtendere Education Consult <onboarding@resend.dev>";
const to = process.env.RESEND_TEST_TO || "peterschrispine@gmail.com";
const subject = process.env.RESEND_TEST_SUBJECT || "Mtendere Resend smoke test";
const html =
  process.env.RESEND_TEST_HTML ||
  "<p>Mtendere Education Consult deliverability smoke test.</p><p>If this arrives in your inbox, reply to your deployment checklist with the mailbox provider and placement result.</p>";
const text =
  process.env.RESEND_TEST_TEXT ||
  "Mtendere Education Consult deliverability smoke test. Record the mailbox provider and whether this landed in inbox or spam.";
const messageIdDomain = process.env.RESEND_TEST_MESSAGE_ID_DOMAIN || "notifications.mtendereeducationconsult.com";
const messageId = `<mec-smoke-${Date.now()}-${Math.random().toString(16).slice(2)}@${messageIdDomain}>`;

if (!apiKey || !apiKey.startsWith("re_")) {
  console.error("RESEND_API_KEY is required and must look like a Resend API key.");
  process.exit(1);
}

const response = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from,
    to: to
      .split(",")
      .map((recipient) => recipient.trim())
      .filter(Boolean),
    subject,
    html,
    text,
    headers: {
      "Message-ID": messageId,
      "X-MEC-Smoke-Test": "resend-deliverability",
    },
  }),
});

const bodyText = await response.text();
let body;
try {
  body = bodyText ? JSON.parse(bodyText) : null;
} catch {
  body = bodyText;
}

if (!response.ok) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        status: response.status,
        body,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      provider: "resend",
      id: body?.id,
      to,
      messageId,
      inboxPlacement: "manual_verification_required",
    },
    null,
    2,
  ),
);
