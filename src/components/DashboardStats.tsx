import { Bell, FlaskConical, Radio, Signal } from "lucide-react";

type DashboardStatsProps = {
  total: number;
  demo: number;
  teste: number;
  real: number;
};

const statItems = [
  {
    key: "total",
    label: "Total",
    icon: Bell,
    tone: "text-white",
  },
  {
    key: "demo",
    label: "Demo",
    icon: FlaskConical,
    tone: "text-sky-200",
  },
  {
    key: "teste",
    label: "Teste",
    icon: Signal,
    tone: "text-amber-200",
  },
  {
    key: "real",
    label: "Real",
    icon: Radio,
    tone: "text-emerald-200",
  },
] as const;

export function DashboardStats(props: DashboardStatsProps) {
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {statItems.map((item) => {
        const Icon = item.icon;

        return (
          <div
            className="rounded-[8px] border border-white/10 bg-zinc-950 p-4"
            key={item.key}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-zinc-400">
                {item.label}
              </p>
              <Icon className={`h-4 w-4 ${item.tone}`} aria-hidden="true" />
            </div>
            <p className="mt-4 text-3xl font-semibold text-white">
              {props[item.key]}
            </p>
          </div>
        );
      })}
    </section>
  );
}
