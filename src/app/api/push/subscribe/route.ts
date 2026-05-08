import { NextRequest } from "next/server";
import { z } from "zod";

import { createAdminClient, getPublicUser } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(4096),
  keys: z.object({
    p256dh: z.string().min(1).max(1024),
    auth: z.string().min(1).max(512),
  }),
});

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await getPublicUser();
  } catch (error) {
    return Response.json({ error: "No public user available" }, { status: 500 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = subscriptionSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid push subscription" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;

  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      user_agent: userAgent,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "endpoint",
    },
  );

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
