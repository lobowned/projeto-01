"use client";
import { useEffect, useRef, useState } from "react";
import { APOSTAS, emoji, linhasPremiadas, maquina, qtdRolos } from "@/lib/slots";
import { formatarFichas } from "@/lib/fichas";

type Rodada = { id?: number; aposta: number; rolos: string[]; premio: number };

export default function Maquina({ id, saldoInicial, historicoInicial }: { id: string; saldoInicial: number; historicoInicial: Rodada[] }) {
  const m = maquina(id)!;
  const n = qtdRolos(m.tipo);
  const nomes = m.simbolos.map((s) => s.id);
  const aleatorio = () => nomes[Math.floor(Math.random() * nomes.length)];
  const topo = nomes[nomes.length - 1];

  const [saldo, setSaldo] = useState(saldoInicial);
  const [aposta, setAposta] = useState(10);
  const [rolos, setRolos] = useState<string[]>(Array(n).fill(topo));
  const [girando, setGirando] = useState<boolean[]>(Array(n).fill(false));
  const [destaque, setDestaque] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);
  const [historico, setHistorico] = useState<Rodada[]>(historicoInicial);
  const timer = useRef<ReturnType<typeof setInterval>>();
  const ocupado = girando.some(Boolean);
  // a grade para por coluna (3 colunas); os outros param rolo a rolo
  const colunas = m.tipo === "grade3x3" ? 3 : n;
  const coluna = (i: number) => (m.tipo === "grade3x3" ? i % 3 : i);

  useEffect(() => () => clearInterval(timer.current), []);

  async function girar() {
    if (ocupado) return;
    setMsg(null); setDestaque(new Set());
    setGirando(Array(n).fill(true));
    setSaldo((s) => s - aposta);
    timer.current = setInterval(() => setRolos((r) => r.map((v, i) => (girandoRef.current[i] ? aleatorio() : v))), 80);

    const inicio = Date.now();
    const r = await fetch("/api/slots", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ maquina: m.id, aposta }),
    });
    const j = await r.json();
    await new Promise((ok) => setTimeout(ok, Math.max(0, 600 - (Date.now() - inicio))));

    if (!r.ok) {
      clearInterval(timer.current);
      atualizarGirando(Array(n).fill(false));
      setSaldo((s) => s + aposta);
      setMsg(j.erro);
      return;
    }
    for (let c = 0; c < colunas; c++) {
      await new Promise((ok) => setTimeout(ok, 300));
      atualizarGirando(girandoRef.current.map((v, i) => (coluna(i) <= c ? false : v)));
      setRolos((atual) => atual.map((v, i) => (coluna(i) <= c ? j.rolos[i] : v)));
    }
    clearInterval(timer.current);
    setRolos(j.rolos);
    setSaldo(j.saldo);
    if (m.tipo === "grade3x3") setDestaque(new Set(linhasPremiadas(j.rolos).flat()));
    else if (j.premio > 0) setDestaque(new Set(m.tipo === "linha5" ? premiadosLinha(j.rolos) : premiadosClassica(j.rolos)));
    const mult = Number(j.multiplicador).toLocaleString("pt-BR");
    setMsg(j.premio > 0 ? `Ganhou ${formatarFichas(j.premio)}! (${mult}x)` : "Não foi dessa vez.");
    setHistorico((h) => [{ aposta, rolos: j.rolos, premio: j.premio }, ...h].slice(0, 10));
  }

  // ref espelhando "girando" para o intervalo ler o valor atual
  const girandoRef = useRef(girando);
  function atualizarGirando(v: boolean[]) { girandoRef.current = v; setGirando(v); }
  useEffect(() => { girandoRef.current = girando; }, [girando]);

  const tamanho = m.tipo === "linha5" ? "text-3xl sm:text-5xl" : m.tipo === "grade3x3" ? "text-4xl sm:text-5xl" : "text-5xl sm:text-6xl";
  const grade = m.tipo === "linha5" ? "grid-cols-5" : "grid-cols-3";

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-neutral-900 p-4">
        <p className="text-sm text-neutral-400">Suas fichas</p>
        <p className="text-2xl font-bold" data-testid="saldo">{formatarFichas(saldo)}</p>
      </div>

      <div className={`rounded-2xl border-4 ${m.cor} bg-gradient-to-b from-neutral-900 to-black p-3`}>
        <div className={`grid ${grade} gap-2`} data-testid="rolos">
          {rolos.map((s, i) => (
            <div key={i} data-simbolo={s}
              className={`flex aspect-square items-center justify-center rounded-lg ${tamanho} transition
                ${destaque.has(i) ? "bg-amber-300 ring-4 ring-amber-500" : "bg-white"} ${girando[i] ? "blur-[1px]" : ""}`}>
              {emoji(m, s)}
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
      {saldo < aposta && !ocupado && (
        <p className="text-center text-sm text-neutral-400">Sem fichas para essa aposta. Pegue o bônus diário em Slots ou diminua a aposta.</p>
      )}

      {historico.length > 0 && (
        <div>
          <h2 className="mb-2 font-semibold">Últimas rodadas</h2>
          <ul className="space-y-1 text-sm">
            {historico.map((h, i) => (
              <li key={h.id ?? `n${i}`} className="flex justify-between gap-2 rounded bg-neutral-900 px-3 py-2">
                <span className="truncate">{h.rolos.map((r) => emoji(m, r)).join("")}</span>
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

function premiadosLinha(rolos: string[]): number[] {
  let k = 1;
  while (k < 5 && rolos[k] === rolos[0]) k++;
  return Array.from({ length: k }, (_, i) => i);
}

function premiadosClassica(rolos: string[]): number[] {
  if (rolos[0] === rolos[1] && rolos[1] === rolos[2]) return [0, 1, 2];
  return rolos.flatMap((r, i) => (r === "cereja" ? [i] : []));
}
