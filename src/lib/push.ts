import webpush from "web-push";

import type { NotificationType } from "@/lib/database.types";
import { requireEnv } from "@/lib/env";

export const notificationTypes = ["demo", "teste", "real"] as const;

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  image?: string;
  type: NotificationType;
  source?: string;
};

export type StoredPushSubscription = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

let vapidConfigured = false;

export function configureWebPush() {
  if (vapidConfigured) {
    return;
  }

  webpush.setVapidDetails(
    requireEnv("VAPID_SUBJECT"),
    requireEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY"),
    requireEnv("VAPID_PRIVATE_KEY"),
  );

  vapidConfigured = true;
}

export function sanitizeText(value: string, maxLength = 180) {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function isSafeUrl(value: string) {
  try {
    const url = new URL(value, "https://example.com");
    const isRelative = value.startsWith("/");
    return isRelative || url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function sanitizeUrl(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed || !isSafeUrl(trimmed)) {
    return undefined;
  }

  return trimmed.slice(0, 2048);
}

export async function sendPushToSubscriptions(
  subscriptions: StoredPushSubscription[],
  payload: PushPayload,
) {
  configureWebPush();

  let totalSent = 0;
  let totalFailed = 0;
  const invalidEndpoints: string[] = [];

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify(payload),
        );
        totalSent += 1;
      } catch (error) {
        totalFailed += 1;

        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? Number(error.statusCode)
            : undefined;

        if (statusCode === 404 || statusCode === 410) {
          invalidEndpoints.push(subscription.endpoint);
        }
      }
    }),
  );

  return {
    totalSent,
    totalFailed,
    invalidEndpoints,
  };
}
