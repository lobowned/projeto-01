"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatarFichas, retornoPotencial } from "@/lib/fichas";

type Selecao = { id: number; nome: string; odd: number };
type Mercado = { id: number; nome: string; status: string; selecoes: Selecao[] };

export default function Cupom({ mercados, aberto }: { mercados: Mercado[]; aberto: boolean }) {
  const router = useRouter();
  const [escolhida, setEscolhida] = useState<Selecao | null>(null);
  const [valor, setValor] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const fichas = Math.floor(Number(valor.replace(/\D/g, "")) || 0);

  async function apostar() {
    if (!escolhida) return;
    setEnviando(true); setMsg(null);
    const r = await fetch("/api/apostas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selecoes: [{ id: escolhida.id, odd: Number(escolhida.odd) }], valor: fichas }),
    });
    const j = await r.json();
    setMsg(r.ok ? "Aposta registrada!" : j.erro);
    setEnviando(false);
    if (r.ok) { setValor(""); router.refresh(); }
  }

  return (
    <div className="space-y-4">
      {mercados.map((m) => (
        <div key={m.id} className="rounded-lg bg-neutral-900 p-4">
          <p className="mb-2 text-sm text-neutral-400">{m.nome}</p>
          <div className="grid grid-cols-3 gap-2">
            {m.selecoes.map((s) => (
              <button key={s.id} disabled={!aberto || m.status !== "aberto"} onClick={() => setEscolhida(s)}
                className={`rounded p-2 text-sm ${escolhida?.id === s.id ? "bg-marca text-black" : "bg-neutral-800"} disabled:opacity-40`}>
                {s.nome}<br /><strong>{Number(s.odd).toFixed(2)}</strong>
              </button>
            ))}
          </div>
        </div>
      ))}
      {escolhida && (
        <div className="rounded-lg border border-neutral-700 p-4 space-y-2">
          <p>{escolhida.nome} @ {Number(escolhida.odd).toFixed(2)}</p>
          <input inputMode="numeric" placeholder="Quantas fichas?" value={valor} onChange={(e) => setValor(e.target.value)}
            className="w-full rounded bg-neutral-800 p-2" />
          <p className="text-sm text-neutral-400">Retorno potencial: {formatarFichas(retornoPotencial(fichas, [Number(escolhida.odd)]))}</p>
          <button onClick={apostar} disabled={enviando || fichas < 1}
            className="w-full rounded bg-marca p-2 font-semibold text-black disabled:opacity-40">Confirmar aposta</button>
          {msg && <p className="text-sm">{msg}</p>}
        </div>
      )}
    </div>
  );
}
