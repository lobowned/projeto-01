"use client";
import { useEffect, useRef, useState } from "react";
import { APOSTAS, SIMBOLOS } from "@/lib/slots";
import { formatarFichas } from "@/lib/fichas";

type Rodada = { id?: number; aposta: number; rolos: string[]; premio: number };
const NOMES = Object.keys(SIMBOLOS);
const aleatorio = () => NOMES[Math.floor(Math.random() * NOMES.length)];

export default function Maquina({ saldoInicial, historicoInicial }: { saldoInicial: number; historicoInicial: Rodada[] }) {
  const [saldo, setSaldo] = useState(saldoInicial);
  const [aposta, setAposta] = useState(10);
  const [rolos, setRolos] = useState(["sete", "sete", "sete"]);
  const [girando, setGirando] = useState([false, false, false]);
  const [msg, setMsg] = useState<string | null>(null);
  const [historico, setHistorico] = useState<Rodada[]>(historicoInicial);
  const timer = useRef<ReturnType<typeof setInterval>>();
  const ocupado = girando.some(Boolean);

  useEffect(() => () => clearInterval(timer.current), []);

  async function girar() {
    if (ocupado) return;
    setMsg(null);
    setGirando([true, true, true]);
    setSaldo((s) => s - aposta);
    // embaralha enquanto espera o servidor
    timer.current = setInterval(() => setRolos([aleatorio(), aleatorio(), aleatorio()]), 80);

    const inicio = Date.now();
    const r = await fetch("/api/slots", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aposta }),
    });
    const j = await r.json();
    await new Promise((ok) => setTimeout(ok, Math.max(0, 600 - (Date.now() - inicio))));

    if (!r.ok) {
      clearInterval(timer.current);
      setGirando([false, false, false]);
      setSaldo((s) => s + aposta);
      setMsg(j.erro);
      return;
    }
    // para um rolo de cada vez
    for (let i = 0; i < 3; i++) {
      await new Promise((ok) => setTimeout(ok, 350));
      setGirando((g) => g.map((v, k) => (k <= i ? false : v)));
      setRolos((atual) => atual.map((v, k) => (k <= i ? j.rolos[k] : v)));
    }
    clearInterval(timer.current);
    setRolos(j.rolos);
    setSaldo(j.saldo);
    setMsg(j.premio > 0 ? `Ganhou ${formatarFichas(j.premio)}! (${j.multiplicador}x)` : "Não foi dessa vez.");
    setHistorico((h) => [{ aposta, rolos: j.rolos, premio: j.premio }, ...h].slice(0, 10));
  }

  async function bonus() {
    const r = await fetch("/api/bonus", { method: "POST" });
    const j = await r.json();
    if (r.ok) { setSaldo((s) => s + j.fichas); setMsg(`+${formatarFichas(j.fichas)} de bônus!`); }
    else setMsg(j.erro);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg bg-neutral-900 p-4">
        <div>
          <p className="text-sm text-neutral-400">Suas fichas</p>
          <p className="text-2xl font-bold" data-testid="saldo">{formatarFichas(saldo)}</p>
        </div>
        <button onClick={bonus} className="rounded border border-marca px-3 py-2 text-sm text-marca">Bônus diário</button>
      </div>

      <div className="rounded-2xl border-4 border-amber-500 bg-gradient-to-b from-neutral-900 to-black p-4">
        <div className="grid grid-cols-3 gap-2" data-testid="rolos">
          {rolos.map((s, i) => (
            <div key={i} className={`flex aspect-square items-center justify-center rounded-lg bg-white text-5xl sm:text-6xl ${girando[i] ? "blur-[1px]" : ""}`}>
              {SIMBOLOS[s]}
            </div>
          ))}
        </div>
        <p className="mt-3 h-6 text-center font-semibold text-amber-400" data-testid="mensagem">{msg}</p>
      </div>

      <div className="grid grid-cols-6 gap-1">
        {APOSTAS.map((v) => (
          <button key={v} disabled={ocupado} onClick={() => setAposta(v)}
            className={`rounded py-2 text-sm ${aposta === v ? "bg-amber-500 text-black font-bold" : "bg-neutral-800"}`}>{v}</button>
        ))}
      </div>
      <button onClick={girar} disabled={ocupado || saldo < aposta}
        className="w-full rounded-lg bg-marca py-3 text-lg font-bold text-black disabled:opacity-40">
        {ocupado ? "Girando..." : `Girar (${formatarFichas(aposta)})`}
      </button>
      {saldo < aposta && !ocupado && <p className="text-center text-sm text-neutral-400">Sem fichas para essa aposta. Pegue o bônus diário ou diminua a aposta.</p>}

      {historico.length > 0 && (
        <div>
          <h2 className="mb-2 font-semibold">Últimas rodadas</h2>
          <ul className="space-y-1 text-sm">
            {historico.map((h, i) => (
              <li key={h.id ?? `n${i}`} className="flex justify-between rounded bg-neutral-900 px-3 py-2">
                <span>{h.rolos.map((r) => SIMBOLOS[r]).join(" ")}</span>
                <span className={h.premio > 0 ? "text-marca" : "text-neutral-400"}>
                  {h.premio > 0 ? `+${h.premio}` : `-${h.aposta}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
