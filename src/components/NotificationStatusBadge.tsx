import type { NotificationType } from "@/lib/database.types";

const styles: Record<NotificationType, string> = {
  demo: "border-sky-300/20 bg-sky-400/10 text-sky-100",
  teste: "border-amber-300/20 bg-amber-400/10 text-amber-100",
  real: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
};

const labels: Record<NotificationType, string> = {
  demo: "demo",
  teste: "teste",
  real: "real",
};

export function NotificationStatusBadge({
  type,
}: {
  type: NotificationType;
}) {
  return (
    <span
      className={`inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-semibold uppercase ${styles[type]}`}
    >
      {labels[type]}
    </span>
  );
}
