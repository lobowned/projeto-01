import { exigirParticipante } from "@/lib/sessao";
import { formatarFichas } from "@/lib/fichas";

export const dynamic = "force-dynamic";

export default async function Conta() {
  const { sb, perfil } = await exigirParticipante();
  const [{ data: eu }, { data: apostas }] = await Promise.all([
    sb.from("ranking").select("fichas").eq("id", perfil.id).single(),
    sb.from("apostas")
      .select("*, apostas_selecoes(odd_no_momento, selecoes(nome, mercados(eventos(mandante, visitante))))")
      .order("criado_em", { ascending: false }).limit(30),
  ]);

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Olá, {perfil.apelido}</h1>
      <div className="rounded-lg bg-neutral-900 p-4">
        <p className="text-sm text-neutral-400">Suas fichas</p>
        <p className="text-2xl font-bold">{formatarFichas(eu?.fichas ?? 0)}</p>
      </div>
      <h2 className="font-semibold">Minhas apostas</h2>
      <ul className="space-y-2">
        {apostas?.map((a) => {
          const s = a.apostas_selecoes[0];
          const ev = s?.selecoes?.mercados?.eventos;
          return (
            <li key={a.id} className="rounded bg-neutral-900 p-3 text-sm">
              <div className="flex justify-between">
                <span>{ev ? `${ev.mandante} × ${ev.visitante}` : "Aposta"}</span>
                <span className="capitalize">{a.status}</span>
              </div>
              <p className="text-neutral-400">
                {s?.selecoes?.nome} @ {Number(a.odd_total).toFixed(2)} · {formatarFichas(a.valor)} → {formatarFichas(a.retorno_potencial)}
              </p>
            </li>
          );
        })}
        {!apostas?.length && <p className="text-sm text-neutral-400">Nenhuma aposta ainda.</p>}
      </ul>
    </section>
  );
}
