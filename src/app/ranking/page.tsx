import { exigirParticipante } from "@/lib/sessao";
import { formatarFichas } from "@/lib/fichas";

export const dynamic = "force-dynamic";

export default async function Ranking() {
  const { sb, perfil } = await exigirParticipante();
  const { data: lista } = await sb.from("ranking").select("*").order("fichas", { ascending: false });

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Ranking</h1>
      <ol className="space-y-2">
        {lista?.map((p, i) => (
          <li key={p.id} className={`flex items-center justify-between rounded p-3 ${p.id === perfil.id ? "bg-marca/20" : "bg-neutral-900"}`}>
            <span><strong className="mr-2">{i + 1}º</strong>{p.apelido}</span>
            <span className="text-right text-sm">
              <strong>{formatarFichas(p.fichas)}</strong>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
