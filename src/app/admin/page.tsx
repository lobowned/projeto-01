import { redirect } from "next/navigation";
import { exigirParticipante } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const { sb, perfil } = await exigirParticipante();
  if (!perfil.admin) redirect("/");
  const { data: config } = await sb.from("config").select("codigo_convite, fichas_iniciais").single();

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Painel admin</h1>
      <div className="rounded-lg bg-neutral-900 p-4">
        <p className="text-sm text-neutral-400">Código de convite (mande para os amigos)</p>
        <p className="font-mono text-lg" data-testid="convite">{config?.codigo_convite}</p>
        <p className="mt-2 text-sm text-neutral-400">Cada pessoa nova começa com {config?.fichas_iniciais} fichas.</p>
      </div>
    </section>
  );
}
