"use client";

import { Send, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

export function TestNotificationButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  
  const [template, setTemplate] = useState("venda");
  const [customTitle, setCustomTitle] = useState("Cakto");
  const [customBody, setCustomBody] = useState("");
  const [delaySeconds, setDelaySeconds] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  const executeSend = useCallback(async () => {
    setIsLoading(true);
    setFeedback("");
    setError("");

    let finalTitle = "Cakto";
    let finalBody = "";

    if (template === "venda") {
      finalBody = "Nova venda aprovada\nMentoria Premium\nR$ 197,00";
    } else if (template === "pix") {
      finalBody = "Pix confirmado\nR$ 97,00";
    } else if (template === "upsell") {
      finalBody = "Upsell aprovado\n+ R$ 47,00";
    } else {
      finalTitle = customTitle || "Cakto";
      finalBody = customBody || "Nova venda aprovada";
    }

    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: finalTitle, body: finalBody }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Nao foi possivel enviar o teste.");
      }

      setFeedback(
        `Enviadas: ${data.total_sent} | Falhas: ${data.total_failed}`,
      );
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
  }, [template, customTitle, customBody, router]);

  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown <= 0) {
      setCountdown(null);
      executeSend();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, executeSend]);

  function handleSchedule() {
    if (delaySeconds > 0) {
      setCountdown(delaySeconds);
    } else {
      executeSend();
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">Tipo</label>
        <select
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-2.5 text-sm text-white transition focus:border-emerald-500/50 focus:outline-none"
          disabled={countdown !== null}
        >
          <option value="venda">Nova venda aprovada</option>
          <option value="pix">Pix confirmado</option>
          <option value="upsell">Upsell aprovado</option>
          <option value="custom">Personalizada</option>
        </select>
      </div>

      {template === "custom" && (
        <div className="space-y-3 rounded-[8px] border border-white/5 bg-black/50 p-3">
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Título</label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Cakto"
              className="w-full rounded-[6px] border border-white/10 bg-black px-3 py-1.5 text-sm text-white transition focus:border-emerald-500/50 focus:outline-none"
              disabled={countdown !== null}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Mensagem</label>
            <textarea
              value={customBody}
              onChange={(e) => setCustomBody(e.target.value)}
              placeholder="Nova venda aprovada&#10;Produto: ...&#10;R$ ..."
              rows={3}
              className="w-full rounded-[6px] border border-white/10 bg-black px-3 py-1.5 text-sm text-white transition focus:border-emerald-500/50 focus:outline-none"
              disabled={countdown !== null}
            />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
          <Clock className="h-3 w-3" />
          Atraso
        </label>
        <select
          value={delaySeconds}
          onChange={(e) => setDelaySeconds(Number(e.target.value))}
          className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-2.5 text-sm text-white transition focus:border-emerald-500/50 focus:outline-none"
          disabled={countdown !== null}
        >
          <option value={0}>Imediato</option>
          <option value={5}>5 segundos</option>
          <option value={10}>10 segundos</option>
          <option value={30}>30 segundos</option>
          <option value={60}>1 minuto</option>
        </select>
      </div>

      <button
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-emerald-400 px-4 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
        type="button"
        onClick={handleSchedule}
        disabled={isLoading || countdown !== null}
      >
        <Send className="h-4 w-4" aria-hidden="true" />
        {countdown !== null
          ? `Enviando em ${countdown}s`
          : isLoading
            ? "Enviando..."
            : delaySeconds > 0
              ? "Agendar envio"
              : "Enviar agora"}
      </button>

      {feedback ? <p className="text-sm text-emerald-300">{feedback}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
