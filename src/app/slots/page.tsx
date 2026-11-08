import Link from "next/link";
import { exigirParticipante } from "@/lib/sessao";
import { MAQUINAS, retornoTeorico } from "@/lib/slots";
import { formatarFichas } from "@/lib/fichas";
import BotaoBonus from "@/components/BotaoBonus";

export const dynamic = "force-dynamic";

export default async function Cassino() {
  const { sb, perfil } = await exigirParticipante();
  const { data: eu } = await sb.from("ranking").select("fichas").eq("id", perfil.id).single();

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Caça-níqueis</h1>
      <BotaoBonus saldoInicial={eu?.fichas ?? 0} />
      <div className="grid gap-3 sm:grid-cols-3">
        {MAQUINAS.map((m) => (
          <Link key={m.id} href={`/slots/${m.id}`} className={`block rounded-xl border-2 ${m.cor} bg-neutral-900 p-4 hover:bg-neutral-800`}>
            <p className="text-3xl">{m.simbolos.slice(-3).map((s) => s.emoji).join("")}</p>
            <p className="mt-2 font-semibold">{m.nome}</p>
            <p className="text-sm text-neutral-400">{m.descricao}</p>
            <p className="mt-2 text-xs text-neutral-500">
              Retorno médio {(retornoTeorico(m) * 100).toFixed(1).replace(".", ",")}% · Maior prêmio {formatarFichas(Math.max(...m.simbolos.map((s) => s.pagamentos.at(-1)!)))} por ficha{m.tipo === "grade3x3" ? " de linha" : ""}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
