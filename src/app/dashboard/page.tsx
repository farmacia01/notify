import { AlertTriangle, PlugZap } from "lucide-react";
import { redirect } from "next/navigation";

import { DashboardStats } from "@/components/DashboardStats";
import { NotificationHistory } from "@/components/NotificationHistory";
import { PushPermissionCard } from "@/components/PushPermissionCard";
import { TestNotificationButton } from "@/components/TestNotificationButton";
import { getEnv } from "@/lib/env";
import { getPublicUser, createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createAdminClient();
  const user = await getPublicUser();

  const [
    notificationsResult,
    subscriptionsResult,
    totalResult,
    demoResult,
    testeResult,
    realResult,
  ] = await Promise.all([
    supabase
      .from("notifications")
      .select(
        "id,title,body,url,type,source,status,total_sent,total_failed,created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("push_subscriptions")
      .select("id,endpoint,user_agent,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("type", "demo"),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("type", "teste"),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("type", "real"),
  ]);

  const notifications = notificationsResult.data ?? [];
  const subscriptions = subscriptionsResult.data ?? [];

  return (
    <main className="min-h-dvh bg-black text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-200">
              Cakto
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-white sm:text-4xl">
              Painel de notificações de vendas
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Ambiente de teste para simular alertas de venda e preparar uma
              integração futura via webhook real da Cakto.
            </p>
          </div>
        </header>

        <div className="rounded-[8px] border border-amber-300/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              As notificações de teste/demo são apenas simulações internas.
              Use o tipo real somente quando a automação estiver conectada a um
              evento confiável de produção.
            </p>
          </div>
        </div>

        <DashboardStats
          total={totalResult.count ?? 0}
          demo={demoResult.count ?? 0}
          teste={testeResult.count ?? 0}
          real={realResult.count ?? 0}
        />

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <PushPermissionCard
              vapidPublicKey={getEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY")}
              savedEndpoints={subscriptions.map(
                (subscription) => subscription.endpoint,
              )}
              subscriptionCount={subscriptions.length}
            />

            <section className="rounded-[8px] border border-white/10 bg-zinc-950 p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Disparo local
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    Envia uma notificação do tipo teste para os dispositivos
                    cadastrados na sua conta.
                  </p>
                </div>
                <PlugZap className="h-6 w-6 text-amber-200" />
              </div>
              <TestNotificationButton />
            </section>
          </div>

          <aside className="rounded-[8px] border border-white/10 bg-zinc-950 p-5">
            <h2 className="text-lg font-semibold text-white">n8n endpoint</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              O n8n deve chamar a rota abaixo com o header Authorization Bearer.
              Sem user_id, o envio é feito para todos os usuários com
              dispositivos cadastrados.
            </p>
            <code className="mt-4 block rounded-[8px] border border-white/10 bg-black p-3 text-xs leading-6 text-emerald-100">
              POST /api/push/send
            </code>
            <div className="mt-5 space-y-2 text-sm text-zinc-400">
              <p>Usuário: Acesso Público</p>
              <p>Dispositivos salvos: {subscriptions.length}</p>
              <p>Tipo padrão: demo</p>
            </div>
          </aside>
        </div>

        <NotificationHistory notifications={notifications} />
      </div>
    </main>
  );
}
