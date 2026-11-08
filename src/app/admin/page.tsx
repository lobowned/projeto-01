import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirParticipante } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function voltar(erro?: string) {
  revalidatePath("/admin");
  redirect(erro ? `/admin?erro=${encodeURIComponent(erro)}` : "/admin");
}

async function criarJogo(form: FormData) {
  "use server";
  const odd = (k: string) => Number(String(form.get(k)).replace(",", "."));
  const { error } = await supabaseServidor().rpc("criar_evento", {
    p_competicao: String(form.get("competicao")),
    p_mandante: String(form.get("mandante")),
    p_visitante: String(form.get("visitante")),
    // horário digitado é de Brasília
    p_inicio: new Date(`${form.get("inicio")}:00-03:00`).toISOString(),
    p_odd_casa: odd("odd_casa"), p_odd_empate: odd("odd_empate"), p_odd_fora: odd("odd_fora"),
  });
  voltar(error?.message);
}

async function definirResultado(form: FormData) {
  "use server";
  const { error } = await supabaseServidor().rpc("liquidar_mercado", {
    p_mercado: Number(form.get("mercado")), p_vencedora: Number(form.get("vencedora")),
  });
  voltar(error?.message);
}

const campo = "w-full rounded bg-neutral-800 p-2";

export default async function Admin({ searchParams }: { searchParams: { erro?: string } }) {
  const { sb, perfil } = await exigirParticipante();
  if (!perfil.admin) redirect("/");
  const [{ data: config }, { data: pendentes }] = await Promise.all([
    sb.from("config").select("codigo_convite").single(),
    sb.from("mercados").select("id, nome, eventos(mandante, visitante, inicio), selecoes(id, nome)")
      .eq("status", "aberto").order("id"),
  ]);

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold">Painel admin</h1>
      {searchParams.erro && <p className="text-sm text-red-400">{searchParams.erro}</p>}

      <div className="rounded-lg bg-neutral-900 p-4">
        <p className="text-sm text-neutral-400">Código de convite (mande para os amigos)</p>
        <p className="font-mono text-lg">{config?.codigo_convite}</p>
      </div>

      <form action={criarJogo} className="rounded-lg bg-neutral-900 p-4 space-y-2">
        <h2 className="font-semibold">Novo jogo</h2>
        <input name="competicao" required placeholder="Competição (ex.: Brasileirão)" className={campo} />
        <div className="grid grid-cols-2 gap-2">
          <input name="mandante" required placeholder="Mandante" className={campo} />
          <input name="visitante" required placeholder="Visitante" className={campo} />
        </div>
        <label className="block text-xs text-neutral-400">Início (horário de Brasília)
          <input name="inicio" type="datetime-local" required className={campo} />
        </label>
        <div className="grid grid-cols-3 gap-2">
          <input name="odd_casa" required inputMode="decimal" placeholder="Odd casa" className={campo} />
          <input name="odd_empate" required inputMode="decimal" placeholder="Odd empate" className={campo} />
          <input name="odd_fora" required inputMode="decimal" placeholder="Odd fora" className={campo} />
        </div>
        <button className="rounded bg-marca px-4 py-2 font-semibold text-black">Criar jogo</button>
      </form>

      <div className="space-y-2">
        <h2 className="font-semibold">Definir resultados</h2>
        {!pendentes?.length && <p className="text-sm text-neutral-400">Nenhum jogo aguardando resultado.</p>}
        {pendentes?.map((m) => {
          const ev = m.eventos as unknown as { mandante: string; visitante: string; inicio: string };
          return (
            <form key={m.id} action={definirResultado} className="rounded-lg bg-neutral-900 p-4 space-y-2">
              <input type="hidden" name="mercado" value={m.id} />
              <p className="font-medium">{ev.mandante} × {ev.visitante}</p>
              <select name="vencedora" className={campo}>
                {m.selecoes.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
              <button className="rounded bg-amber-500 px-4 py-2 font-semibold text-black">Confirmar resultado e pagar</button>
            </form>
          );
        })}
      </div>
    </section>
  );
}
