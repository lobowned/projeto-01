import { exigirParticipante } from "@/lib/sessao";
import { MULT_TRINCA, SIMBOLOS } from "@/lib/slots";
import Maquina from "@/components/Maquina";

export const dynamic = "force-dynamic";

export default async function Slots() {
  const { sb, perfil } = await exigirParticipante();
  const [{ data: eu }, { data: rodadas }] = await Promise.all([
    sb.from("ranking").select("fichas").eq("id", perfil.id).single(),
    sb.from("slot_rodadas").select("id, aposta, rolos, premio").order("id", { ascending: false }).limit(10),
  ]);

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold">Caça-níquel</h1>
      <Maquina saldoInicial={eu?.fichas ?? 0} historicoInicial={rodadas ?? []} />

      <div className="rounded-lg bg-neutral-900 p-4">
        <h2 className="mb-2 font-semibold">Tabela de prêmios</h2>
        <ul className="grid grid-cols-2 gap-1 text-sm">
          {Object.entries(MULT_TRINCA).reverse().map(([s, m]) => (
            <li key={s}>{SIMBOLOS[s].repeat(3)} <strong>{m}x</strong></li>
          ))}
          <li>{SIMBOLOS.cereja}{SIMBOLOS.cereja} + outro <strong>2x</strong></li>
        </ul>
        <p className="mt-2 text-xs text-neutral-400">Retorno médio de 90,5% das fichas apostadas. Sorteio feito no servidor.</p>
      </div>
    </section>
  );
}
