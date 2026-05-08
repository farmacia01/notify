import type { Database } from "@/lib/database.types";
import { NotificationStatusBadge } from "@/components/NotificationStatusBadge";

type NotificationRow = Pick<
  Database["public"]["Tables"]["notifications"]["Row"],
  | "id"
  | "title"
  | "body"
  | "url"
  | "type"
  | "source"
  | "status"
  | "total_sent"
  | "total_failed"
  | "created_at"
>;

type NotificationHistoryProps = {
  notifications: NotificationRow[];
};

const formatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function NotificationHistory({
  notifications,
}: NotificationHistoryProps) {
  return (
    <section className="rounded-[8px] border border-white/10 bg-zinc-950">
      <div className="border-b border-white/10 p-5">
        <h2 className="text-lg font-semibold text-white">
          Últimas notificações
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Histórico salvo no Supabase para o usuário atual.
        </p>
      </div>

      {notifications.length === 0 ? (
        <div className="p-5 text-sm text-zinc-400">
          Nenhuma notificação enviada ainda.
        </div>
      ) : (
        <div className="divide-y divide-white/10">
          {notifications.map((notification) => (
            <article className="p-5" key={notification.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-white">
                    {notification.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    {notification.body}
                  </p>
                </div>
                <NotificationStatusBadge type={notification.type} />
              </div>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-500">
                <span>{formatter.format(new Date(notification.created_at))}</span>
                <span>Origem: {notification.source ?? "n8n"}</span>
                <span>Status: {notification.status ?? "sent"}</span>
                <span>Enviadas: {notification.total_sent ?? 0}</span>
                <span>Falhas: {notification.total_failed ?? 0}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
