import { enqueueEmail, type EmailCategory } from "./email";
import { env } from "./env";
import { storage } from "./storage";

type NotificationChannel = "email" | "admin_email" | "sms" | "whatsapp" | "push";
type NotificationPriority = "critical" | "high" | "medium" | "low";
type AdminRole = "viewer" | "writer" | "editor" | "admin" | "super_admin";

const adminRoles: AdminRole[] = ["viewer", "writer", "editor", "admin", "super_admin"];

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

type AdminRoleEmailNotification = {
  channel: "admin_email";
  roles?: AdminRole[];
  subject: string;
  html: string;
  text: string;
  title?: string;
  message?: string;
  category: EmailCategory;
  metadata?: Record<string, unknown>;
  headers?: Record<string, string>;
  priority?: NotificationPriority;
  awaitDelivery?: boolean;
};

type FutureNotification = {
  channel: Exclude<NotificationChannel, "email" | "admin_email">;
  to: string;
  message: string;
  metadata?: Record<string, unknown>;
  priority?: NotificationPriority;
};

export type NotificationRequest = EmailNotification | AdminRoleEmailNotification | FutureNotification;

type ProviderDelivery = {
  status: "sent" | "failed" | "unsupported_channel";
  channel: Exclude<NotificationChannel, "email" | "admin_email">;
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

type AdminRoleEmailRecipient = {
  role: AdminRole;
  email: string;
  userId?: number | null;
  source: "database" | "environment" | "fallback";
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

const parseEmailList = (value?: string | null) =>
  Array.from(
    new Set(
      String(value || "")
        .split(/[,\n;]/)
        .map((item) => item.trim().match(/<([^<>]+)>/)?.[1] || item.trim())
        .map((item) => item.toLowerCase())
        .filter((item) => /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(item)),
    ),
  );

const normalizeAdminRoles = (roles?: AdminRole[]) => {
  const requested = roles?.length ? roles : adminRoles;
  const normalized = requested.filter((role): role is AdminRole => adminRoles.includes(role));
  return Array.from(new Set(normalized));
};

const getAdminRoleEnvEmails = (role: AdminRole) => {
  const values: Record<AdminRole, string | undefined> = {
    viewer: env.ADMIN_VIEWER_EMAILS,
    writer: env.ADMIN_WRITER_EMAILS,
    editor: env.ADMIN_EDITOR_EMAILS,
    admin: env.ADMIN_ADMIN_EMAILS,
    super_admin: env.ADMIN_SUPER_ADMIN_EMAILS,
  };
  return parseEmailList(values[role]);
};

export const resolveAdminRoleEmailRecipients = async (
  roles?: AdminRole[],
): Promise<AdminRoleEmailRecipient[]> => {
  const targetRoles = normalizeAdminRoles(roles);
  const recipients = new Map<string, AdminRoleEmailRecipient>();

  for (const role of targetRoles) {
    for (const email of getAdminRoleEnvEmails(role)) {
      recipients.set(`${role}:${email}`, { role, email, source: "environment" });
    }
  }

  try {
    const users = await storage.getUsersByRoles(targetRoles, true);
    for (const user of users) {
      const role = user.role as AdminRole;
      if (!targetRoles.includes(role)) continue;
      const email = String(user.email || "").trim().toLowerCase();
      if (!parseEmailList(email).length) continue;
      recipients.set(`${role}:${email}`, { role, email, userId: user.id, source: "database" });
    }
  } catch (error) {
    console.warn("Admin role email recipient lookup skipped:", getErrorMessage(error));
  }

  if (recipients.size === 0) {
    for (const email of parseEmailList(env.ADMIN_NOTIFICATION_EMAIL || env.EMAIL_FROM)) {
      recipients.set(`fallback:${email}`, {
        role: "admin",
        email,
        source: "fallback",
      });
    }
  }

  return Array.from(recipients.values());
};

export const getAdminRoleEmailDiagnostics = async () => {
  const roles = adminRoles.map((role) => ({
    role,
    configuredInboxCount: getAdminRoleEnvEmails(role).length,
  }));
  const recipients = await resolveAdminRoleEmailRecipients(adminRoles);
  return {
    roles,
    recipientCount: recipients.length,
    recipientsByRole: adminRoles.reduce<Record<AdminRole, number>>((acc, role) => {
      acc[role] = recipients.filter((recipient) => recipient.role === role).length;
      return acc;
    }, {} as Record<AdminRole, number>),
    fallbackConfigured: parseEmailList(env.ADMIN_NOTIFICATION_EMAIL || env.EMAIL_FROM).length > 0,
  };
};

const postJsonProvider = async (
  provider: string,
  channel: Exclude<NotificationChannel, "email" | "admin_email">,
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

const sendAdminRoleEmailNotification = async (notification: AdminRoleEmailNotification) => {
  const recipients = await resolveAdminRoleEmailRecipients(notification.roles);
  const uniqueRecipients = recipients.filter((recipient, index, all) =>
    all.findIndex((candidate) => candidate.email === recipient.email) === index,
  );

  if (uniqueRecipients.length === 0) {
    return {
      status: "failed" as const,
      channel: "admin_email" as const,
      providerMessageId: null,
      message: "No admin role email recipients are configured.",
      recipients: [],
    };
  }

  const deliveries = [];
  for (const recipient of uniqueRecipients) {
    if (recipient.userId) {
      await storage.createNotification({
        userId: recipient.userId,
        channel: "admin_email",
        title: notification.title || notification.subject,
        message: notification.message || notification.text,
        status: "unread",
        metadata: {
          ...(notification.metadata || {}),
          adminRole: recipient.role,
          emailRecipient: recipient.email,
          source: recipient.source,
        },
      }).catch((error) => {
        console.warn("Admin role notification persistence skipped:", getErrorMessage(error));
      });
    }

    const delivery = await enqueueEmail(
      {
        to: recipient.email,
        subject: notification.subject,
        html: notification.html,
        text: notification.text,
        category: notification.category,
        metadata: {
          ...(notification.metadata || {}),
          notificationChannel: "admin_email",
          adminRole: recipient.role,
          recipientSource: recipient.source,
        },
        headers: notification.headers,
        priority: priorityToEmailRank[notification.priority || "high"],
      },
      { awaitDelivery: notification.awaitDelivery },
    );
    deliveries.push({ ...delivery, recipient: recipient.email, role: recipient.role, source: recipient.source });
  }

  const accepted = deliveries.filter((delivery) => delivery.status !== "failed");
  return {
    status: accepted.length > 0 ? "sent" as const : "failed" as const,
    channel: "admin_email" as const,
    provider: "email_queue",
    providerMessageId: null,
    message:
      accepted.length > 0
        ? `Queued admin role email alert for ${accepted.length} recipient(s).`
        : "All admin role email deliveries failed.",
    recipients: uniqueRecipients.map(({ email, role, source }) => ({ email, role, source })),
    deliveries,
  };
};

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

  if (notification.channel === "admin_email") {
    return sendAdminRoleEmailNotification(notification);
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
