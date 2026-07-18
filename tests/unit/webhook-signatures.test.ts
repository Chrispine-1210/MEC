import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { Webhook } from "svix";
import { verifyResendWebhook } from "../../server/webhook-signatures";

const makeSignedWebhook = () => {
  const signingSecret = `whsec_${randomBytes(32).toString("base64")}`;
  const id = "msg_resend_webhook_test";
  const timestamp = new Date();
  const rawBody = Buffer.from(JSON.stringify({
    type: "email.delivered",
    data: {
      email_id: "email_resend_test",
      to: ["student@example.test"],
    },
  }));
  const signature = new Webhook(signingSecret).sign(id, timestamp, rawBody);
  return {
    signingSecret,
    id,
    timestamp: String(Math.floor(timestamp.getTime() / 1_000)),
    rawBody,
    signature,
  };
};

test("Resend webhook verification accepts an authentic Svix request", () => {
  const signed = makeSignedWebhook();
  const result = verifyResendWebhook(signed);

  assert.equal(result.valid, true);
  if (!result.valid) return;
  assert.equal(result.providerEventId, signed.id);
  assert.deepEqual(result.payload, JSON.parse(signed.rawBody.toString("utf8")));
});

test("Resend webhook verification rejects body tampering and incomplete requests", () => {
  const signed = makeSignedWebhook();
  const tampered = verifyResendWebhook({
    ...signed,
    rawBody: Buffer.from(signed.rawBody.toString("utf8").replace("delivered", "bounced")),
  });
  assert.deepEqual(tampered, { valid: false, reason: "invalid_signature" });

  const missingHeaders = verifyResendWebhook({
    signingSecret: signed.signingSecret,
    rawBody: signed.rawBody,
  });
  assert.deepEqual(missingHeaders, { valid: false, reason: "missing_headers" });

  const missingConfiguration = verifyResendWebhook({
    rawBody: signed.rawBody,
    id: signed.id,
    timestamp: signed.timestamp,
    signature: signed.signature,
  });
  assert.deepEqual(missingConfiguration, { valid: false, reason: "missing_configuration" });
});
