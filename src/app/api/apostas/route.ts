import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase";

export async function POST(req: Request) {
  const { selecoes, valor } = (await req.json()) as { selecoes: { id: number; odd: number }[]; valor: number };
  if (!Array.isArray(selecoes) || !selecoes.length || !Number.isInteger(valor)) {
    return NextResponse.json({ erro: "Cupom inválido" }, { status: 400 });
  }
  const sb = supabaseServidor();
  const { data, error } = await sb.rpc("registrar_aposta", {
    p_selecoes: selecoes.map((s) => s.id),
    p_odds: selecoes.map((s) => s.odd),
    p_valor: valor,
  });
  if (error) return NextResponse.json({ erro: error.message }, { status: 422 });
  return NextResponse.json({ apostaId: data });
}
