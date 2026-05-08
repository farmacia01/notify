import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { requireEnv } from "@/lib/env";

export function createAdminClient() {
  return createClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

export async function getPublicUser() {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error || !data.users.length) {
    throw new Error("No users found in database to act as public user. Create one first.");
  }
  return data.users[0];
}
