"use client";

import { Send, Clock, Zap, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

const DEFAULT_MESSAGES = [
  "Venda aprovada!",
  "Pix gerado!",
  "Venda aprovada no Pix!",
  "Nova comissão recebida!",
];

type NotificationResult = {
  index: number;
  message: string;
  value: string;
  total_sent: number;
  total_failed: number;
};

export function TestNotificationButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    quantity_sent: number;
    grand_total_sent: number;
    grand_total_failed: number;
    notifications: NotificationResult[];
  } | null>(null);
  const [error, setError] = useState("");

  // ── form state ──
  const [quantity, setQuantity] = useState(3);
  const [minValue, setMinValue] = useState(17);
  const [maxValue, setMaxValue] = useState(97);
  const [delayMin, setDelayMin] = useState(5);
  const [delayMax, setDelayMax] = useState(20);
  const [messagesText, setMessagesText] = useState(DEFAULT_MESSAGES.join("\n"));
  const [countdown, setCountdown] = useState<number | null>(null);
  const [delayBefore, setDelayBefore] = useState(0);

  const executeSend = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    setError("");

    const messages = messagesText
      .split("\n")
      .map((m) => m.trim())
      .filter(Boolean);

    try {
      const response = await fetch("/api/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_N8N_TOKEN ?? ""}`,
        },
        body: JSON.stringify({
          quantity,
          min_value: minValue,
          max_value: maxValue,
          delay_min: delayMin,
          delay_max: delayMax,
          messages,
          url: "/dashboard",
          type: "demo",
        }),
      });

      // Fallback: dashboard uses /api/push/test endpoint which doesn't need the Bearer
      if (response.status === 401) {
        const res2 = await fetch("/api/push/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quantity,
            min_value: minValue,
            max_value: maxValue,
            delay_min: delayMin,
            delay_max: delayMax,
            messages,
          }),
        });
        const d2 = await res2.json();
        if (!res2.ok) throw new Error(d2.error ?? "Erro ao enviar.");
        setFeedback(d2);
        router.refresh();
        return;
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Erro ao enviar.");
      setFeedback(data);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Erro ao enviar notificação.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [quantity, minValue, maxValue, delayMin, delayMax, messagesText, router]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      executeSend();
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, executeSend]);

  function handleSchedule() {
    if (delayBefore > 0) {
      setCountdown(delayBefore);
    } else {
      executeSend();
    }
  }

  const isDisabled = isLoading || countdown !== null;

  return (
    <div className="space-y-5">

      {/* Quantity */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
          <Zap className="h-3 w-3" />
          Quantidade de notificações
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={50}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            disabled={isDisabled}
            className="flex-1 accent-emerald-400"
          />
          <span className="w-8 text-right text-sm font-semibold text-white">
            {quantity}
          </span>
        </div>
      </div>

      {/* Value Range */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
          <TrendingUp className="h-3 w-3" />
          Faixa de valor (R$)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-xs text-zinc-600">Mínimo</span>
            <input
              type="number"
              min={1}
              max={maxValue}
              value={minValue}
              onChange={(e) => setMinValue(Number(e.target.value))}
              disabled={isDisabled}
              className="w-full rounded-[6px] border border-white/10 bg-black px-3 py-1.5 text-sm text-white focus:border-emerald-500/50 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-zinc-600">Máximo</span>
            <input
              type="number"
              min={minValue}
              max={9999}
              value={maxValue}
              onChange={(e) => setMaxValue(Number(e.target.value))}
              disabled={isDisabled}
              className="w-full rounded-[6px] border border-white/10 bg-black px-3 py-1.5 text-sm text-white focus:border-emerald-500/50 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Delay between notifications */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
          <Clock className="h-3 w-3" />
          Delay entre notificações (segundos)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-xs text-zinc-600">Mínimo</span>
            <input
              type="number"
              min={0}
              max={delayMax}
              value={delayMin}
              onChange={(e) => setDelayMin(Number(e.target.value))}
              disabled={isDisabled}
              className="w-full rounded-[6px] border border-white/10 bg-black px-3 py-1.5 text-sm text-white focus:border-emerald-500/50 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-zinc-600">Máximo</span>
            <input
              type="number"
              min={delayMin}
              max={300}
              value={delayMax}
              onChange={(e) => setDelayMax(Number(e.target.value))}
              disabled={isDisabled}
              className="w-full rounded-[6px] border border-white/10 bg-black px-3 py-1.5 text-sm text-white focus:border-emerald-500/50 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Mensagens (uma por linha)
        </label>
        <textarea
          value={messagesText}
          onChange={(e) => setMessagesText(e.target.value)}
          rows={4}
          disabled={isDisabled}
          className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none"
        />
      </div>

      {/* Pre-launch delay */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Atraso antes do início
        </label>
        <select
          value={delayBefore}
          onChange={(e) => setDelayBefore(Number(e.target.value))}
          disabled={isDisabled}
          className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-2.5 text-sm text-white focus:border-emerald-500/50 focus:outline-none"
        >
          <option value={0}>Imediato</option>
          <option value={5}>5 segundos</option>
          <option value={10}>10 segundos</option>
          <option value={30}>30 segundos</option>
          <option value={60}>1 minuto</option>
        </select>
      </div>

      {/* CTA */}
      <button
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-emerald-400 px-4 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
        type="button"
        onClick={handleSchedule}
        disabled={isDisabled}
      >
        <Send className="h-4 w-4" aria-hidden="true" />
        {countdown !== null
          ? `Iniciando em ${countdown}s…`
          : isLoading
            ? `Disparando ${quantity} notificações…`
            : delayBefore > 0
              ? `Agendar ${quantity} disparos`
              : `Disparar ${quantity} notificações`}
      </button>

      {/* Results */}
      {feedback && (
        <div className="space-y-2 rounded-[8px] border border-emerald-400/20 bg-emerald-400/5 p-4">
          <p className="text-sm font-medium text-emerald-300">
            ✓ {feedback.quantity_sent} notificações enviadas &middot; {feedback.grand_total_sent} dispositivos alcançados
          </p>
          <div className="space-y-1">
            {feedback.notifications?.map((n) => (
              <p key={n.index} className="text-xs text-zinc-400">
                <span className="text-zinc-500">#{n.index}</span>{" "}
                {n.message} · {n.value}
              </p>
            ))}
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
