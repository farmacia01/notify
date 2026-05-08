export function getEnv(name: string) {
  if (name === "NEXT_PUBLIC_SUPABASE_URL") return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (name === "NEXT_PUBLIC_SUPABASE_ANON_KEY") return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (name === "SUPABASE_SERVICE_ROLE_KEY") return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (name === "NEXT_PUBLIC_VAPID_PUBLIC_KEY") return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  if (name === "VAPID_PRIVATE_KEY") return process.env.VAPID_PRIVATE_KEY ?? "";
  return process.env[name] ?? "";
}

export function requireEnv(name: string) {
  const value = getEnv(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
