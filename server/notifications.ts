import { enqueueEmail, type EmailCategory } from "./email";
import { env } from "./env";

type NotificationChannel = "email" | "sms" | "whatsapp" | "push";
type NotificationPriority = "critical" | "high" | "medium" | "low";

const priorityToEmailRank: Record<NotificationPriority, number> = {
  critical: 10,
  high: 30,
  medium: 70,
  low: 120,
};

type EmailNotification = {
  channel: "email";
  to: string;
  subject: string;
  html: string;
  text: string;
  category: EmailCategory;
  metadata?: Record<string, unknown>;
  headers?: Record<string, string>;
  priority?: NotificationPriority;
  awaitDelivery?: boolean;
};

type FutureNotification = {
  channel: Exclude<NotificationChannel, "email">;
  to: string;
  message: string;
  metadata?: Record<string, unknown>;
  priority?: NotificationPriority;
};

export type NotificationRequest = EmailNotification | FutureNotification;

type ProviderDelivery = {
  status: "sent" | "failed" | "unsupported_channel";
  channel: Exclude<NotificationChannel, "email">;
  provider?: string;
  providerMessageId?: string | null;
  httpStatus?: number;
  message?: string;
  error?: string;
};

type FutureProvider = {
  name: string;
  isConfigured: () => boolean;
  send: (notification: FutureNotification) => Promise<ProviderDelivery>;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const bearerHeaders = (token?: string): Record<string, string> => {
  if (!token) return {};
  return { Authorization: token.toLowerCase().startsWith("bearer ") ? token : `Bearer ${token}` };
};

const parseProviderResponse = async (response: Response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
};

const extractProviderMessageId = (body: Record<string, unknown>) => {
  const direct = body.id || body.messageId || body.message_id || body.sid;
  if (typeof direct === "string") return direct;

  const messages = body.messages;
  if (Array.isArray(messages)) {
    const first = messages[0];
    if (first && typeof first === "object") {
      const id = (first as Record<string, unknown>).id;
      if (typeof id === "string") return id;
    }
  }

  return null;
};

const postJsonProvider = async (
  provider: string,
  channel: Exclude<NotificationChannel, "email">,
  url: string,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): Promise<ProviderDelivery> => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const parsed = await parseProviderResponse(response);
  return {
    status: response.ok ? "sent" : "failed",
    channel,
    provider,
    providerMessageId: extractProviderMessageId(parsed),
    httpStatus: response.status,
    message: response.ok ? "Notification accepted by provider" : "Provider rejected notification",
    error: response.ok ? undefined : JSON.stringify(parsed),
  };
};

const twilioRequest = async (
  provider: string,
  channel: "sms" | "whatsapp",
  from: string,
  to: string,
  message: string,
): Promise<ProviderDelivery> => {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
  const body = new URLSearchParams({
    From: from,
    To: channel === "whatsapp" && !to.startsWith("whatsapp:") ? `whatsapp:${to}` : to,
    Body: message,
  });
  const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const parsed = await parseProviderResponse(response);
  return {
    status: response.ok ? "sent" : "failed",
    channel,
    provider,
    providerMessageId: extractProviderMessageId(parsed),
    httpStatus: response.status,
    message: response.ok ? "Notification accepted by Twilio" : "Twilio rejected notification",
    error: response.ok ? undefined : JSON.stringify(parsed),
  };
};

const smsProviders: FutureProvider[] = [
  {
    name: "twilio_sms",
    isConfigured: () => Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_SMS_FROM),
    send: (notification) =>
      twilioRequest("twilio_sms", "sms", env.TWILIO_SMS_FROM!, notification.to, notification.message),
  },
  {
    name: "custom_sms",
    isConfigured: () => Boolean(env.SMS_API_URL),
    send: (notification) =>
      postJsonProvider(
        "custom_sms",
        "sms",
        env.SMS_API_URL!,
        {
          to: notification.to,
          from: env.SMS_API_FROM,
          message: notification.message,
          metadata: notification.metadata || {},
          priority: notification.priority || "medium",
        },
        bearerHeaders(env.SMS_API_KEY),
      ),
  },
];

const normalizeWhatsappCloudRecipient = (to: string) =>
  to.replace(/^whatsapp:/i, "").replace(/[^\d]/g, "");

const whatsappProviders: FutureProvider[] = [
  {
    name: "whatsapp_cloud",
    isConfigured: () => Boolean(env.WHATSAPP_CLOUD_ACCESS_TOKEN && env.WHATSAPP_CLOUD_PHONE_NUMBER_ID),
    send: (notification) =>
      postJsonProvider(
        "whatsapp_cloud",
        "whatsapp",
        `https://graph.facebook.com/v20.0/${env.WHATSAPP_CLOUD_PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: "whatsapp",
          to: normalizeWhatsappCloudRecipient(notification.to),
          type: "text",
          text: {
            preview_url: false,
            body: notification.message,
          },
        },
        bearerHeaders(env.WHATSAPP_CLOUD_ACCESS_TOKEN),
      ),
  },
  {
    name: "twilio_whatsapp",
    isConfigured: () => Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM),
    send: (notification) =>
      twilioRequest("twilio_whatsapp", "whatsapp", env.TWILIO_WHATSAPP_FROM!, notification.to, notification.message),
  },
  {
    name: "custom_whatsapp",
    isConfigured: () => Boolean(env.WHATSAPP_API_URL),
    send: (notification) =>
      postJsonProvider(
        "custom_whatsapp",
        "whatsapp",
        env.WHATSAPP_API_URL!,
        {
          to: notification.to,
          from: env.WHATSAPP_API_FROM,
          message: notification.message,
          metadata: notification.metadata || {},
          priority: notification.priority || "medium",
        },
        bearerHeaders(env.WHATSAPP_API_KEY),
      ),
  },
];

const sendViaProviders = async (
  notification: FutureNotification,
  providers: FutureProvider[],
): Promise<ProviderDelivery> => {
  const configured = providers.filter((provider) => provider.isConfigured());
  if (configured.length === 0) {
    return {
      status: "unsupported_channel",
      channel: notification.channel,
      message: `${notification.channel} notifications are not enabled yet. Configure a provider to activate delivery.`,
    };
  }

  let lastFailure: ProviderDelivery | null = null;
  for (const provider of configured) {
    try {
      const result = await provider.send(notification);
      if (result.status === "sent") return result;
      lastFailure = result;
    } catch (error) {
      lastFailure = {
        status: "failed",
        channel: notification.channel,
        provider: provider.name,
        error: getErrorMessage(error),
      };
    }
  }

  return lastFailure || {
    status: "failed",
    channel: notification.channel,
    message: "No configured provider accepted the notification",
  };
};

export const getNotificationProviderDiagnostics = () => ({
  email: { configured: true, provider: "email_queue" },
  sms: {
    configured: smsProviders.some((provider) => provider.isConfigured()),
    providers: smsProviders.map((provider) => ({ name: provider.name, configured: provider.isConfigured() })),
  },
  whatsapp: {
    configured: whatsappProviders.some((provider) => provider.isConfigured()),
    providers: whatsappProviders.map((provider) => ({ name: provider.name, configured: provider.isConfigured() })),
  },
  push: { configured: false, providers: [] },
});

export const sendNotification = async (notification: NotificationRequest) => {
  if (notification.channel === "sms") {
    return sendViaProviders(notification, smsProviders);
  }

  if (notification.channel === "whatsapp") {
    return sendViaProviders(notification, whatsappProviders);
  }

  if (notification.channel === "push") {
    return {
      status: "unsupported_channel" as const,
      channel: notification.channel,
      message: "Push notifications are not enabled yet. The platform is ready for provider integration.",
    };
  }

  const emailNotification = notification as EmailNotification;
  return enqueueEmail(
    {
      to: emailNotification.to,
      subject: emailNotification.subject,
      html: emailNotification.html,
      text: emailNotification.text,
      category: emailNotification.category,
      metadata: {
        ...(emailNotification.metadata || {}),
        notificationChannel: "email",
      },
      headers: emailNotification.headers,
      priority: priorityToEmailRank[emailNotification.priority || "medium"],
    },
    { awaitDelivery: emailNotification.awaitDelivery },
  );
};
