"use client";

import { BellRing, CheckCircle2, CircleAlert, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type PushPermissionCardProps = {
  vapidPublicKey: string;
  savedEndpoints: string[];
  subscriptionCount: number;
};

type PermissionStateLabel = "unsupported" | NotificationPermission;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export function PushPermissionCard({
  vapidPublicKey,
  savedEndpoints,
  subscriptionCount,
}: PushPermissionCardProps) {
  const router = useRouter();
  const [permission, setPermission] =
    useState<PermissionStateLabel>("default");
  const [isCurrentDeviceSaved, setIsCurrentDeviceSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const supportStatus = useMemo(() => {
    if (permission === "unsupported") {
      return "Push indisponivel neste navegador";
    }

    if (permission === "granted") {
      return "Permissao ativa";
    }

    if (permission === "denied") {
      return "Permissao bloqueada";
    }

    return "Permissao pendente";
  }, [permission]);

  useEffect(() => {
    async function loadStatus() {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setPermission("unsupported");
        return;
      }

      setPermission(Notification.permission);

      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        const subscription = await registration.pushManager.getSubscription();
        setIsCurrentDeviceSaved(
          Boolean(
            subscription && savedEndpoints.includes(subscription.endpoint),
          ),
        );
      } catch {
        setIsCurrentDeviceSaved(false);
      }
    }

    loadStatus();
  }, [savedEndpoints]);

  async function activatePush() {
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      if (!vapidPublicKey) {
        throw new Error("Configure NEXT_PUBLIC_VAPID_PUBLIC_KEY.");
      }

      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        throw new Error("Este navegador nao suporta Web Push.");
      }

      const nextPermission =
        Notification.permission === "default"
          ? await Notification.requestPermission()
          : Notification.permission;

      setPermission(nextPermission);

      if (nextPermission !== "granted") {
        throw new Error("Permissao de notificacao nao concedida.");
      }

      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      const existingSubscription =
        await registration.pushManager.getSubscription();

      const subscription =
        existingSubscription ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }));

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscription.toJSON()),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Nao foi possivel cadastrar o dispositivo.");
      }

      setIsCurrentDeviceSaved(true);
      setMessage("Dispositivo cadastrado para receber notificacoes.");
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Nao foi possivel ativar notificacoes.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="rounded-[8px] border border-white/10 bg-zinc-950 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Status das notificações
          </h2>
          <p className="mt-1 text-sm leading-6 text-zinc-400">
            As notificações de teste/demo são apenas simulações internas.
          </p>
        </div>
        <BellRing className="h-6 w-6 text-emerald-200" aria-hidden="true" />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[8px] border border-white/10 bg-black p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            {permission === "granted" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-200" />
            ) : (
              <CircleAlert className="h-4 w-4 text-amber-200" />
            )}
            Permissao do navegador
          </div>
          <p className="mt-3 text-xl font-semibold text-white">
            {supportStatus}
          </p>
        </div>

        <div className="rounded-[8px] border border-white/10 bg-black p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Smartphone className="h-4 w-4 text-sky-200" />
            Dispositivo atual
          </div>
          <p className="mt-3 text-xl font-semibold text-white">
            {isCurrentDeviceSaved ? "Cadastrado" : "Nao cadastrado"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {subscriptionCount} dispositivo(s) salvo(s) na conta
          </p>
        </div>
      </div>

      <button
        className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-[8px] bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        type="button"
        onClick={activatePush}
        disabled={isLoading || permission === "unsupported"}
      >
        {isLoading ? "Ativando..." : "Ativar notificacoes"}
      </button>

      {message ? <p className="mt-3 text-sm text-emerald-200">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-200">{error}</p> : null}
    </section>
  );
}
