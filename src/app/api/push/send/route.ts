import { NextRequest } from "next/server";
import webpush from "web-push";
import { z } from "zod";

import type { Json } from "@/lib/database.types";
import { configureWebPush, type StoredPushSubscription } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── helpers ─────────────────────────────────────────────────────────────────

function randomValue(min: number, max: number): string {
  const intPart = Math.floor(Math.random() * (max - min + 1)) + min;
  const cents = Math.floor(Math.random() * 100);
  return (intPart + cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── schemas ──────────────────────────────────────────────────────────────────

/** Formato antigo: disparo único com body pronto */
const singleSchema = z.object({
  user_id: z.string().uuid().optional(),
  title: z.string().max(160).optional(),
  body: z.string().max(320),
  url: z.string().max(2048).optional(),
  type: z.enum(["demo", "teste", "real"]).default("real"),
});

const DEFAULT_MESSAGES = [
  "Venda aprovada!",
  "Pix gerado!",
  "Venda aprovada no Pix!",
  "Nova comissão recebida!",
];

/** Formato novo: múltiplos disparos com geração aleatória */
const multiSchema = z.object({
  quantity: z.number().int().min(1).max(100),
  user_id: z.string().uuid().optional(),
  min_value: z.number().min(0).max(99999).default(17),
  max_value: z.number().min(0).max(99999).default(97),
  delay_min: z.number().min(0).max(300).default(5),
  delay_max: z.number().min(0).max(300).default(25),
  messages: z.array(z.string().min(1).max(200)).min(1).default(DEFAULT_MESSAGES),
  url: z.string().max(2048).default("/dashboard"),
  type: z.enum(["demo", "teste", "real"]).default("real"),
});

// ─── send a single push to one subscription ───────────────────────────────────

async function sendOne(
  subscription: StoredPushSubscription,
  body: string,
  url: string,
): Promise<{ ok: boolean; invalid: boolean }> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify({ body, url }),
    );
    return { ok: true, invalid: false };
  } catch (error) {
    const statusCode =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number((error as { statusCode: unknown }).statusCode)
        : undefined;
    return { ok: false, invalid: statusCode === 404 || statusCode === 410 };
  }
}

function groupByUser(subscriptions: StoredPushSubscription[]) {
  const groups = new Map<string, StoredPushSubscription[]>();
  subscriptions.forEach((sub) => {
    const list = groups.get(sub.user_id) ?? [];
    list.push(sub);
    groups.set(sub.user_id, list);
  });
  return groups;
}

// ─── route ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth
  const secret = process.env.N8N_SECRET_TOKEN;
  if (!secret) {
    return Response.json({ error: "N8N_SECRET_TOKEN is not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  if (!rawBody || typeof rawBody !== "object") {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // ── Detect format and parse ──────────────────────────────────────────────
  const isMulti = rawBody.quantity !== undefined && rawBody.quantity !== null;

  if (isMulti) {
    // ── FORMATO NOVO: múltiplos disparos ─────────────────────────────────
    const parsed = multiSchema.safeParse(rawBody);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid multi-shot body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { quantity, user_id, min_value, max_value, delay_min, delay_max, messages, url, type } =
      parsed.data;

    configureWebPush();
    const admin = createAdminClient();
    const query = admin.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth");
    const { data: subscriptions, error: subError } = user_id
      ? await query.eq("user_id", user_id)
      : await query;

    if (subError) return Response.json({ error: subError.message }, { status: 500 });
    if (!subscriptions || subscriptions.length === 0) {
      return Response.json({ success: true, message: "No subscriptions found", quantity_sent: 0, grand_total_sent: 0, grand_total_failed: 0 });
    }

    const grouped = groupByUser(subscriptions);
    const targetUserIds = user_id ? [user_id] : Array.from(grouped.keys());
    const invalidEndpoints = new Set<string>();
    let grandTotalSent = 0;
    let grandTotalFailed = 0;
    const results = [];

    for (let i = 0; i < quantity; i++) {
      if (i > 0) await sleep(randomDelay(delay_min, delay_max) * 1000);

      const chosenMessage = randomMessage(messages);
      const chosenValue = randomValue(min_value, max_value);
      const notificationBody = `${chosenMessage}\nSua comissão: ${chosenValue}`;

      let batchSent = 0;
      let batchFailed = 0;

      await Promise.all(
        targetUserIds.map(async (userId) => {
          const userSubs = grouped.get(userId) ?? [];
          let userSent = 0;
          let userFailed = 0;

          await Promise.all(
            userSubs.map(async (sub) => {
              const result = await sendOne(sub, notificationBody, url);
              if (result.ok) { userSent++; } else {
                userFailed++;
                if (result.invalid) invalidEndpoints.add(sub.endpoint);
              }
            }),
          );

          const status = userSent > 0 ? "sent" : userSubs.length > 0 ? "failed" : "no_subscriptions";
          await admin.from("notifications").insert({
            user_id: userId,
            title: chosenMessage,
            body: notificationBody,
            url: url || null,
            type,
            source: "n8n",
            status,
            total_sent: userSent,
            total_failed: userFailed,
            payload: { message: chosenMessage, value: chosenValue, index: i + 1, quantity } as Json,
          });

          batchSent += userSent;
          batchFailed += userFailed;
        }),
      );

      grandTotalSent += batchSent;
      grandTotalFailed += batchFailed;
      results.push({ index: i + 1, message: chosenMessage, value: chosenValue, total_sent: batchSent, total_failed: batchFailed, delay_used_ms: i === 0 ? 0 : randomDelay(delay_min, delay_max) * 1000 });
    }

    if (invalidEndpoints.size > 0) {
      await admin.from("push_subscriptions").delete().in("endpoint", Array.from(invalidEndpoints));
    }

    return Response.json({
      success: true,
      quantity_sent: results.length,
      grand_total_sent: grandTotalSent,
      grand_total_failed: grandTotalFailed,
      invalid_endpoints_removed: invalidEndpoints.size,
      notifications: results,
    });
  }

  // ── FORMATO ANTIGO: disparo único ───────────────────────────────────────
  const parsed = singleSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { user_id, body: notificationBody, url, type } = parsed.data;

  configureWebPush();
  const admin = createAdminClient();
  const query = admin.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth");
  const { data: subscriptions, error: subError } = user_id
    ? await query.eq("user_id", user_id)
    : await query;

  if (subError) return Response.json({ error: subError.message }, { status: 500 });

  const grouped = groupByUser(subscriptions ?? []);
  const targetUserIds = user_id ? [user_id] : Array.from(grouped.keys());
  const invalidEndpoints = new Set<string>();
  let totalSent = 0;
  let totalFailed = 0;

  for (const userId of targetUserIds) {
    const userSubs = grouped.get(userId) ?? [];
    let userSent = 0;
    let userFailed = 0;

    await Promise.all(
      userSubs.map(async (sub) => {
        const result = await sendOne(sub, notificationBody, url ?? "/dashboard");
        if (result.ok) { userSent++; } else {
          userFailed++;
          if (result.invalid) invalidEndpoints.add(sub.endpoint);
        }
      }),
    );

    const status = userSent > 0 ? "sent" : userSubs.length > 0 ? "failed" : "no_subscriptions";
    const { error: histError } = await admin.from("notifications").insert({
      user_id: userId,
      title: parsed.data.title ?? "",
      body: notificationBody,
      url: url ?? null,
      type,
      source: "n8n",
      status,
      total_sent: userSent,
      total_failed: userFailed,
      payload: { body: notificationBody, url } as Json,
    });

    if (histError) return Response.json({ error: histError.message }, { status: 500 });

    totalSent += userSent;
    totalFailed += userFailed;
  }

  if (invalidEndpoints.size > 0) {
    await admin.from("push_subscriptions").delete().in("endpoint", Array.from(invalidEndpoints));
  }

  return Response.json({ success: true, total_sent: totalSent, total_failed: totalFailed });
}
