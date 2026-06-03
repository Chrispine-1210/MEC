import { enqueueEmail, type EmailCategory } from "./email";

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

export const sendNotification = async (notification: NotificationRequest) => {
  if (notification.channel !== "email") {
    return {
      status: "unsupported_channel" as const,
      channel: notification.channel,
      message: `${notification.channel} notifications are not enabled yet. The platform is ready for provider integration.`,
    };
  }

  return enqueueEmail(
    {
      to: notification.to,
      subject: notification.subject,
      html: notification.html,
      text: notification.text,
      category: notification.category,
      metadata: {
        ...(notification.metadata || {}),
        notificationChannel: "email",
      },
      headers: notification.headers,
      priority: priorityToEmailRank[notification.priority || "medium"],
    },
    { awaitDelivery: notification.awaitDelivery },
  );
};

