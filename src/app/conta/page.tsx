import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase";
import { formatarReais } from "@/lib/dinheiro";

export const dynamic = "force-dynamic";

export default async function Conta() {
  const sb = supabaseServidor();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: perfil }, { data: saldo }, { data: apostas }] = await Promise.all([
    sb.from("perfis").select("*").eq("id", user.id).single(),
    sb.from("saldos").select("saldo").eq("usuario_id", user.id).maybeSingle(),
    sb.from("apostas").select("*").order("criado_em", { ascending: false }).limit(20),
  ]);

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Minha conta</h1>
      <div className="rounded-lg bg-neutral-900 p-4">
        <p className="text-sm text-neutral-400">Saldo</p>
        <p className="text-2xl font-bold">{formatarReais(saldo?.saldo ?? 0)}</p>
        {perfil?.kyc !== "aprovado" && (
          <p className="mt-2 text-sm text-amber-400">Verificação de identidade pendente: depósitos e apostas liberados após aprovação.</p>
        )}
      </div>
      <h2 className="font-semibold">Últimas apostas</h2>
      <ul className="space-y-2">
        {apostas?.map((a) => (
          <li key={a.id} className="rounded bg-neutral-900 p-3 text-sm flex justify-between">
            <span>{formatarReais(a.valor)} @ {Number(a.odd_total).toFixed(2)}</span>
            <span className="capitalize">{a.status}</span>
          </li>
        ))}
        {!apostas?.length && <p className="text-sm text-neutral-400">Nenhuma aposta ainda.</p>}
      </ul>
    </section>
  );
}
