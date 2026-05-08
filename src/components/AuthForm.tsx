"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type AuthFormProps = {
  mode: "login" | "register";
};

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  try {
    const url = new URL(value, "https://cakto.local");
    const path = `${url.pathname}${url.search}${url.hash}`;

    if (url.origin !== "https://cakto.local") {
      return "/dashboard";
    }

    if (url.pathname === "/login" || url.pathname === "/register") {
      return "/dashboard";
    }

    return path;
  } catch {
    return "/dashboard";
  }
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = getSafeNextPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const copy = useMemo(
    () =>
      mode === "login"
        ? {
            title: "Entrar",
            subtitle: "Acesse o painel de simulacao de alertas de venda.",
            button: "Entrar no painel",
            switchText: "Ainda nao tem conta?",
            switchHref: "/register",
            switchLabel: "Criar conta",
          }
        : {
            title: "Criar conta",
            subtitle: "Cadastre-se para testar push notifications no PWA.",
            button: "Criar acesso",
            switchText: "Ja tem conta?",
            switchHref: "/login",
            switchLabel: "Entrar",
          },
    [mode],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      const supabase = createClient();

      if (mode === "login") {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        router.replace(next);
        router.refresh();
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      setMessage("Conta criada. Confirme seu email antes de entrar.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Nao foi possivel completar a autenticacao.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-[8px] border border-white/10 bg-zinc-950/80 p-6 shadow-2xl shadow-black/30 backdrop-blur">
      <div className="mb-8">
        <div className="mb-4 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-emerald-200">
          Cakto
        </div>
        <h1 className="text-3xl font-semibold text-white">{copy.title}</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{copy.subtitle}</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-200">
            Email
          </span>
          <input
            className="h-12 w-full rounded-[8px] border border-white/10 bg-black px-4 text-base text-white outline-none transition focus:border-emerald-300/70 focus:ring-2 focus:ring-emerald-300/20"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-200">
            Senha
          </span>
          <input
            className="h-12 w-full rounded-[8px] border border-white/10 bg-black px-4 text-base text-white outline-none transition focus:border-emerald-300/70 focus:ring-2 focus:ring-emerald-300/20"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {error ? (
          <p className="rounded-[8px] border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        {message ? (
          <p className="rounded-[8px] border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {message}
          </p>
        ) : null}

        <button
          className="flex h-12 w-full items-center justify-center rounded-[8px] bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? "Processando..." : copy.button}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-400">
        {copy.switchText}{" "}
        <Link className="font-medium text-emerald-200" href={copy.switchHref}>
          {copy.switchLabel}
        </Link>
      </p>
    </div>
  );
}
