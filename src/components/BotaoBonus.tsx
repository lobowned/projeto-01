"use client";
import { useState } from "react";
import { formatarFichas } from "@/lib/fichas";

export default function BotaoBonus({ saldoInicial }: { saldoInicial: number }) {
  const [saldo, setSaldo] = useState(saldoInicial);
  const [msg, setMsg] = useState<string | null>(null);

  async function pegar() {
    const r = await fetch("/api/bonus", { method: "POST" });
    const j = await r.json();
    if (r.ok) { setSaldo((s) => s + j.fichas); setMsg(`+${formatarFichas(j.fichas)} de bônus!`); }
    else setMsg(j.erro);
  }

  return (
    <div className="flex items-center justify-between rounded-lg bg-neutral-900 p-4">
      <div>
        <p className="text-sm text-neutral-400">Suas fichas</p>
        <p className="text-2xl font-bold" data-testid="saldo">{formatarFichas(saldo)}</p>
        {msg && <p className="text-sm text-amber-400" data-testid="msg-bonus">{msg}</p>}
      </div>
      <button onClick={pegar} className="rounded border border-marca px-3 py-2 text-sm text-marca">Bônus diário</button>
    </div>
  );
}
