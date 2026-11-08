import { notFound } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase";
import Cupom from "@/components/Cupom";

export const dynamic = "force-dynamic";

export default async function Evento({ params }: { params: { id: string } }) {
  const { data: evento } = await supabaseServidor()
    .from("eventos").select("*, mercados(id, nome, status, selecoes(id, nome, odd))")
    .eq("id", params.id).single();
  if (!evento) notFound();

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">{evento.mandante} × {evento.visitante}</h1>
      <Cupom mercados={evento.mercados} />
    </section>
  );
}
