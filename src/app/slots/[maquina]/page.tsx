import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirParticipante } from "@/lib/sessao";
import { maquina, retornoTeorico } from "@/lib/slots";
import Maquina from "@/components/Maquina";

export const dynamic = "force-dynamic";

export default async function Jogo({ params }: { params: { maquina: string } }) {
  const m = maquina(params.maquina);
  if (!m) notFound();
  const { sb, perfil } = await exigirParticipante();
  const [{ data: eu }, { data: rodadas }] = await Promise.all([
    sb.from("ranking").select("fichas").eq("id", perfil.id).single(),
    sb.from("slot_rodadas").select("id, aposta, rolos, premio").eq("maquina", m.id).order("id", { ascending: false }).limit(10),
  ]);

  const titulos = m.tipo === "linha5" ? ["3 iguais", "4 iguais", "5 iguais"] : ["Trinca"];
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{m.nome}</h1>
        <Link href="/slots" className="text-sm text-neutral-400">← Outras máquinas</Link>
      </div>
      <Maquina id={m.id} saldoInicial={eu?.fichas ?? 0} historicoInicial={rodadas ?? []} />

      <div className="rounded-lg bg-neutral-900 p-4">
        <h2 className="mb-2 font-semibold">Tabela de prêmios</h2>
        <p className="mb-2 text-sm text-neutral-400">{m.descricao}</p>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-neutral-400"><th>Símbolo</th>{titulos.map((t) => <th key={t}>{t}</th>)}</tr></thead>
          <tbody>
            {[...m.simbolos].reverse().map((s) => (
              <tr key={s.id}><td className="text-xl">{s.emoji}</td>{s.pagamentos.map((p, i) => <td key={i}><strong>{p}x</strong></td>)}</tr>
            ))}
          </tbody>
        </table>
        {m.id === "frutas" && <p className="mt-1 text-sm">🍒🍒 + outro símbolo: <strong>2x</strong></p>}
        {m.tipo === "grade3x3" && <p className="mt-1 text-sm">Cada linha completa paga o valor acima × aposta ÷ 5.</p>}
        <p className="mt-2 text-xs text-neutral-400">
          Retorno médio de {(retornoTeorico(m) * 100).toFixed(1).replace(".", ",")}% das fichas apostadas. Sorteio feito no servidor.
        </p>
      </div>
    </section>
  );
}
