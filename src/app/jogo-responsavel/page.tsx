import { revalidatePath } from "next/cache";
import { supabaseServidor } from "@/lib/supabase";
import { reaisParaCentavos } from "@/lib/dinheiro";

async function definirLimite(form: FormData) {
  "use server";
  const campo = String(form.get("campo"));
  const texto = String(form.get("valor") ?? "").trim();
  await supabaseServidor().rpc("alterar_limite", { p_campo: campo, p_valor: texto ? reaisParaCentavos(texto) : null });
  revalidatePath("/jogo-responsavel");
}

async function autoexcluir(form: FormData) {
  "use server";
  await supabaseServidor().rpc("autoexcluir", { p_meses: Number(form.get("meses")) });
  revalidatePath("/jogo-responsavel");
}

export default function JogoResponsavel() {
  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold">Jogo responsável</h1>
      <p className="text-sm text-neutral-300">
        Aposta é entretenimento, não fonte de renda. Defina limites, faça pausas e peça ajuda se sentir que perdeu o controle.
      </p>

      <form action={definirLimite} className="rounded-lg bg-neutral-900 p-4 space-y-2">
        <h2 className="font-semibold">Limites</h2>
        <select name="campo" className="w-full rounded bg-neutral-800 p-2">
          <option value="limite_deposito_diario">Depósito diário</option>
          <option value="limite_deposito_mensal">Depósito mensal</option>
          <option value="limite_perda_diaria">Perda diária</option>
        </select>
        <input name="valor" inputMode="decimal" placeholder="Valor em R$ (vazio remove)" className="w-full rounded bg-neutral-800 p-2" />
        <p className="text-xs text-neutral-400">Reduções valem na hora. Aumentos e remoções valem após 24 horas.</p>
        <button className="rounded bg-marca px-4 py-2 font-semibold text-black">Salvar</button>
      </form>

      <form action={autoexcluir} className="rounded-lg border border-red-900 p-4 space-y-2">
        <h2 className="font-semibold text-red-400">Autoexclusão</h2>
        <p className="text-xs text-neutral-400">Sua conta fica bloqueada pelo prazo escolhido e não pode ser reaberta antes.</p>
        <select name="meses" className="w-full rounded bg-neutral-800 p-2">
          {[1, 3, 6, 12, 24, 60].map((m) => <option key={m} value={m}>{m} {m === 1 ? "mês" : "meses"}</option>)}
        </select>
        <button className="rounded bg-red-700 px-4 py-2 font-semibold">Confirmar autoexclusão</button>
      </form>
    </section>
  );
}
