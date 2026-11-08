import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase";
import { maquina } from "@/lib/slots";

export async function POST(req: Request) {
  const { maquina: id, aposta } = (await req.json()) as { maquina: string; aposta: number };
  if (!maquina(id) || !Number.isInteger(aposta)) return NextResponse.json({ erro: "Jogada inválida" }, { status: 400 });
  const { data, error } = await supabaseServidor().rpc("jogar_slot", { p_maquina: id, p_aposta: aposta });
  if (error) return NextResponse.json({ erro: error.message }, { status: 422 });
  return NextResponse.json(data);
}
