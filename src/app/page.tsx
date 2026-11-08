import Link from "next/link";
import { exigirParticipante } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  const { sb, perfil } = await exigirParticipante();
  const { data: eventos } = await sb.from("eventos").select("*").gt("inicio", new Date().toISOString()).order("inicio");

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Próximos jogos</h1>
        {perfil.admin && <Link href="/admin" className="text-sm text-marca">Painel admin</Link>}
      </div>
      {!eventos?.length && <p className="text-neutral-400">Nenhum jogo aberto. {perfil.admin ? "Cadastre um no painel admin." : "Peça ao admin para cadastrar."}</p>}
      {eventos?.map((e) => (
        <Link key={e.id} href={`/evento/${e.id}`} className="block rounded-lg bg-neutral-900 p-4 hover:bg-neutral-800">
          <p className="text-xs text-neutral-400">{e.competicao} · {new Date(e.inicio).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
          <p className="font-medium">{e.mandante} × {e.visitante}</p>
        </Link>
      ))}
    </section>
  );
}
