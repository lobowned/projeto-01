import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase";

export async function POST() {
  const { data, error } = await supabaseServidor().rpc("resgatar_bonus_diario");
  if (error) return NextResponse.json({ erro: error.message }, { status: 422 });
  return NextResponse.json({ fichas: data });
}
