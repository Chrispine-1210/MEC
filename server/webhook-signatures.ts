import { Webhook } from "svix";

export type ResendWebhookVerificationResult =
  | { valid: true; payload: unknown; providerEventId: string }
  | { valid: false; reason: "missing_configuration" | "missing_raw_body" | "missing_headers" | "invalid_signature" };

export const verifyResendWebhook = (input: {
  rawBody?: Buffer;
  signingSecret?: string;
  id?: string;
  timestamp?: string;
  signature?: string;
}): ResendWebhookVerificationResult => {
  const signingSecret = input.signingSecret?.trim();
  if (!signingSecret) {
    return { valid: false, reason: "missing_configuration" };
  }

  if (!input.rawBody) {
    return { valid: false, reason: "missing_raw_body" };
  }

  const id = input.id?.trim();
  const timestamp = input.timestamp?.trim();
  const signature = input.signature?.trim();
  if (!id || !timestamp || !signature) {
    return { valid: false, reason: "missing_headers" };
  }

  try {
    const payload = new Webhook(signingSecret).verify(input.rawBody, {
      "svix-id": id,
      "svix-timestamp": timestamp,
      "svix-signature": signature,
    });
    return { valid: true, payload, providerEventId: id };
  } catch {
    return { valid: false, reason: "invalid_signature" };
  }
};
