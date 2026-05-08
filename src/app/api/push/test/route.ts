import { NextRequest } from "next/server";

import type { Json } from "@/lib/database.types";
import { sendPushToSubscriptions } from "@/lib/push";
import { createAdminClient, getPublicUser } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await getPublicUser();
  } catch (error) {
    return Response.json({ error: "No public user available" }, { status: 500 });
  }

  const admin = createAdminClient();
  const { data: subscriptions, error } = await admin
    .from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth")
    .eq("user_id", user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  
  const payload = {
    title: body.title || "Cakto",
    body: body.body || "Nova venda aprovada\nMentoria Premium\nR$ 97,00",
    url: new URL("/dashboard", request.url).toString(),
    image: body.image || "/logo-cakto.png",
    type: "teste" as const,
    source: "dashboard",
  };

  const result =
    subscriptions && subscriptions.length > 0
      ? await sendPushToSubscriptions(subscriptions, payload)
      : { totalSent: 0, totalFailed: 0, invalidEndpoints: [] };

  if (result.invalidEndpoints.length > 0) {
    await admin
      .from("push_subscriptions")
      .delete()
      .in("endpoint", result.invalidEndpoints);
  }

  const { error: historyError } = await admin.from("notifications").insert({
    user_id: user.id,
    title: payload.title,
    body: payload.body,
    url: payload.url,
    type: payload.type,
    source: payload.source,
    status:
      result.totalSent > 0
        ? "sent"
        : subscriptions && subscriptions.length > 0
          ? "failed"
          : "no_subscriptions",
    total_sent: result.totalSent,
    total_failed: result.totalFailed,
    payload: payload as Json,
  });

  if (historyError) {
    return Response.json({ error: historyError.message }, { status: 500 });
  }

  return Response.json({
    success: true,
    total_sent: result.totalSent,
    total_failed: result.totalFailed,
  });
}
