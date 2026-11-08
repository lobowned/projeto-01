import { notFound } from "next/navigation";
import { exigirParticipante } from "@/lib/sessao";
import Cupom from "@/components/Cupom";

export const dynamic = "force-dynamic";

export default async function Evento({ params }: { params: { id: string } }) {
  const { sb } = await exigirParticipante();
  const { data: evento } = await sb
    .from("eventos").select("*, mercados(id, nome, status, selecoes(id, nome, odd))")
    .eq("id", params.id).single();
  if (!evento) notFound();
  const aberto = new Date(evento.inicio) > new Date();

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">{evento.mandante} × {evento.visitante}</h1>
      {!aberto && <p className="text-sm text-amber-400">O jogo já começou: apostas encerradas.</p>}
      <Cupom mercados={evento.mercados} aberto={aberto} />
    </section>
  );
}
