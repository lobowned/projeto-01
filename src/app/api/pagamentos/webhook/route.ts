import { NextResponse } from "next/server";
import { assinaturaValida } from "@/lib/pagamentos";
import { supabaseAdmin } from "@/lib/supabase";

/** Recebe a confirmação do Pix e credita o saldo (uma única vez por pagamento). */
export async function POST(req: Request) {
  const corpo = await req.text();
  if (!assinaturaValida(corpo, req.headers.get("x-assinatura"))) {
    return NextResponse.json({ erro: "assinatura inválida" }, { status: 401 });
  }
  const evento = JSON.parse(corpo) as { idExterno: string; status: "pago" | "falhou"; cpfPagador: string };
  const sb = supabaseAdmin();

  const { data: pag } = await sb.from("pagamentos").select("*, perfis(cpf)").eq("id_externo", evento.idExterno).single();
  if (!pag) return NextResponse.json({ erro: "pagamento desconhecido" }, { status: 404 });
  if (pag.status !== "criado") return NextResponse.json({ ok: true }); // já processado

  // Conta pagadora precisa ser do próprio apostador
  const mesmoTitular = evento.cpfPagador === (pag.perfis as { cpf: string }).cpf;
  const novoStatus = evento.status === "pago" && mesmoTitular ? "pago" : "falhou";

  const { data: atualizado } = await sb.from("pagamentos")
    .update({ status: novoStatus, cpf_titular_conta: evento.cpfPagador, atualizado_em: new Date().toISOString() })
    .eq("id", pag.id).eq("status", "criado").select().single();

  if (atualizado && novoStatus === "pago" && pag.direcao === "entrada") {
    await sb.from("lancamentos").insert({ usuario_id: pag.usuario_id, tipo: "deposito", valor: pag.valor, referencia: pag.id });
  }
  // TODO: se o titular for diferente, devolver o valor à conta de origem.
  return NextResponse.json({ ok: true });
}
