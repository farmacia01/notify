import Link from "next/link";
import { Suspense } from "react";

import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top,#26210f_0%,#080808_34%,#000_100%)] px-4 py-10 text-white">
      <div className="w-full max-w-5xl">
        <Link
          className="mb-8 inline-flex text-sm font-medium text-zinc-400 transition hover:text-white"
          href="/dashboard"
        >
          Cakto
        </Link>
        <Suspense>
          <AuthForm mode="register" />
        </Suspense>
      </div>
    </main>
  );
}
