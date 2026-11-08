import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase";

export async function POST(req: Request) {
  const { aposta } = (await req.json()) as { aposta: number };
  if (!Number.isInteger(aposta)) return NextResponse.json({ erro: "Aposta inválida" }, { status: 400 });
  const { data, error } = await supabaseServidor().rpc("jogar_slot", { p_aposta: aposta });
  if (error) return NextResponse.json({ erro: error.message }, { status: 422 });
  return NextResponse.json(data);
}
