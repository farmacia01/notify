"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignOut() {
    setIsLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-white/10 px-3 text-sm font-medium text-zinc-200 transition hover:bg-white/10 disabled:opacity-50"
      type="button"
      onClick={handleSignOut}
      disabled={isLoading}
      title="Sair"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      Sair
    </button>
  );
}
