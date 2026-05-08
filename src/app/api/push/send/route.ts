import { NextRequest } from "next/server";
import { z } from "zod";

import type { Json, NotificationType } from "@/lib/database.types";
import {
  isSafeUrl,
  notificationTypes,
  sanitizeText,
  sanitizeUrl,
  sendPushToSubscriptions,
  type StoredPushSubscription,
} from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sendSchema = z.object({
  user_id: z.string().uuid().optional(),
  title: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .transform((value) => sanitizeText(value, 160)),
  body: z
    .string()
    .trim()
    .min(1)
    .max(320)
    .transform((value) => sanitizeText(value, 320)),
  url: z
    .string()
    .trim()
    .max(2048)
    .optional()
    .refine((value) => !value || isSafeUrl(value), "Invalid URL")
    .transform((value) => sanitizeUrl(value)),
  image: z.string().trim().max(2048).optional(),
  type: z.enum(notificationTypes).default("demo"),
});

export async function POST(request: NextRequest) {
  const secret = process.env.N8N_SECRET_TOKEN;

  if (!secret) {
    return Response.json(
      { error: "N8N_SECRET_TOKEN is not configured" },
      { status: 500 },
    );
  }

  const authorization = request.headers.get("authorization");

  if (authorization !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const admin = createAdminClient();
  const query = admin
    .from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth");

  const { data: subscriptions, error } = parsed.data.user_id
    ? await query.eq("user_id", parsed.data.user_id)
    : await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const groupedSubscriptions = groupByUser(subscriptions ?? []);
  const targetUserIds = parsed.data.user_id
    ? [parsed.data.user_id]
    : Array.from(groupedSubscriptions.keys());

  let totalSent = 0;
  let totalFailed = 0;
  const invalidEndpoints = new Set<string>();
  const payload = {
    title: parsed.data.title,
    body: parsed.data.body,
    url: parsed.data.url,
    image: parsed.data.image,
    type: parsed.data.type as NotificationType,
    source: "n8n",
  };

  for (const userId of targetUserIds) {
    const userSubscriptions = groupedSubscriptions.get(userId) ?? [];
    const result =
      userSubscriptions.length > 0
        ? await sendPushToSubscriptions(userSubscriptions, payload)
        : { totalSent: 0, totalFailed: 0, invalidEndpoints: [] };

    totalSent += result.totalSent;
    totalFailed += result.totalFailed;
    result.invalidEndpoints.forEach((endpoint) => invalidEndpoints.add(endpoint));

    const { error: historyError } = await admin.from("notifications").insert({
      user_id: userId,
      title: payload.title,
      body: payload.body,
      url: payload.url ?? null,
      type: payload.type,
      source: "n8n",
      status:
        result.totalSent > 0
          ? "sent"
          : userSubscriptions.length > 0
            ? "failed"
            : "no_subscriptions",
      total_sent: result.totalSent,
      total_failed: result.totalFailed,
      payload: payload as Json,
    });

    if (historyError) {
      return Response.json({ error: historyError.message }, { status: 500 });
    }
  }

  if (invalidEndpoints.size > 0) {
    await admin
      .from("push_subscriptions")
      .delete()
      .in("endpoint", Array.from(invalidEndpoints));
  }

  return Response.json({
    success: true,
    total_sent: totalSent,
    total_failed: totalFailed,
  });
}

function groupByUser(subscriptions: StoredPushSubscription[]) {
  const groups = new Map<string, StoredPushSubscription[]>();

  subscriptions.forEach((subscription) => {
    const current = groups.get(subscription.user_id) ?? [];
    current.push(subscription);
    groups.set(subscription.user_id, current);
  });

  return groups;
}
