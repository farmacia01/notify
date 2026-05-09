import { NextRequest } from "next/server";
import { z } from "zod";

import type { Json } from "@/lib/database.types";
import { configureWebPush, type StoredPushSubscription } from "@/lib/push";
import { createAdminClient, getPublicUser } from "@/lib/supabase/admin";
import webpush from "web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_MESSAGES = [
  "Venda aprovada!",
  "Pix gerado!",
  "Venda aprovada no Pix!",
  "Nova comissão recebida!",
];

const testSchema = z.object({
  quantity: z.number().int().min(1).max(50).default(1),
  min_value: z.number().min(1).max(9999).default(17),
  max_value: z.number().min(1).max(9999).default(97),
  delay_min: z.number().min(0).max(300).default(5),
  delay_max: z.number().min(0).max(300).default(20),
  messages: z.array(z.string().min(1)).min(1).default(DEFAULT_MESSAGES),
  url: z.string().max(2048).default("/dashboard"),
});

// ─── helpers ────────────────────────────────────────────────────────────────

function randomValue(min: number, max: number): string {
  const intPart = Math.floor(Math.random() * (max - min + 1)) + min;
  const cents = Math.floor(Math.random() * 100);
  const value = intPart + cents / 100;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

// ─── route ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await getPublicUser();
  } catch {
    return Response.json({ error: "No public user available" }, { status: 500 });
  }

  const rawBody = await request.json().catch(() => ({}));
  const parsed = testSchema.safeParse(rawBody);

  if (!parsed.success) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { quantity, min_value, max_value, delay_min, delay_max, messages, url } =
    parsed.data;

  const admin = createAdminClient();
  const { data: subscriptions, error: subError } = await admin
    .from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth")
    .eq("user_id", user.id);

  if (subError) {
    return Response.json({ error: subError.message }, { status: 500 });
  }

  if (!subscriptions || subscriptions.length === 0) {
    return Response.json(
      { success: true, quantity_sent: 0, grand_total_sent: 0, grand_total_failed: 0, notifications: [] },
      { status: 200 },
    );
  }

  configureWebPush();

  const results = [];
  let grandTotalSent = 0;
  let grandTotalFailed = 0;
  const invalidEndpoints = new Set<string>();

  for (let i = 0; i < quantity; i++) {
    if (i > 0) {
      await sleep(randomDelay(delay_min, delay_max) * 1000);
    }

    const chosenMessage = randomMessage(messages);
    const chosenValue = randomValue(min_value, max_value);
    const notificationBody = `${chosenMessage}\nSua comissão: ${chosenValue}`;

    let batchSent = 0;
    let batchFailed = 0;

    await Promise.all(
      subscriptions.map(async (sub) => {
        const result = await sendOne(sub, notificationBody, url);
        if (result.ok) {
          batchSent++;
        } else {
          batchFailed++;
          if (result.invalid) invalidEndpoints.add(sub.endpoint);
        }
      }),
    );

    const status = batchSent > 0 ? "sent" : subscriptions.length > 0 ? "failed" : "no_subscriptions";
    await admin.from("notifications").insert({
      user_id: user.id,
      title: chosenMessage,
      body: notificationBody,
      url: url || null,
      type: "teste" as const,
      source: "dashboard",
      status,
      total_sent: batchSent,
      total_failed: batchFailed,
      payload: { message: chosenMessage, value: chosenValue, index: i + 1 } as Json,
    });

    grandTotalSent += batchSent;
    grandTotalFailed += batchFailed;
    results.push({ index: i + 1, message: chosenMessage, value: chosenValue, total_sent: batchSent, total_failed: batchFailed });
  }

  if (invalidEndpoints.size > 0) {
    await admin.from("push_subscriptions").delete().in("endpoint", Array.from(invalidEndpoints));
  }

  return Response.json({
    success: true,
    quantity_sent: results.length,
    grand_total_sent: grandTotalSent,
    grand_total_failed: grandTotalFailed,
    notifications: results,
  });
}
