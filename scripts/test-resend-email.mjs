const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_TEST_FROM || "Mtendere Education Consult <onboarding@resend.dev>";
const to = process.env.RESEND_TEST_TO || "peterschrispine@gmail.com";
const subject = process.env.RESEND_TEST_SUBJECT || "Mtendere Resend smoke test";
const html =
  process.env.RESEND_TEST_HTML ||
  "<p>Congrats on sending your <strong>first email</strong>!</p>";

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
    },
    null,
    2,
  ),
);
