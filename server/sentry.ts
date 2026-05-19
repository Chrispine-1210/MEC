import * as Sentry from "@sentry/node";
import { env } from "./env";

let sentryEnabled = false;

export const initializeSentry = () => {
  if (!env.SENTRY_DSN) {
    sentryEnabled = false;
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
  });

  sentryEnabled = true;
};

export const isSentryEnabled = () => sentryEnabled;

export const captureServerException = (error: unknown, context?: Record<string, unknown>) => {
  if (!sentryEnabled) return;

  Sentry.withScope((scope) => {
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        scope.setExtra(key, value);
      }
    }
    Sentry.captureException(error);
  });
};
