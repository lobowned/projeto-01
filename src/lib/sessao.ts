import { redirect } from "next/navigation";
import { supabaseServidor } from "./supabase";

/** Garante que a pessoa fez login e entrou no grupo. */
export async function exigirParticipante() {
  const sb = supabaseServidor();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await sb.from("perfis").select("*").eq("id", user.id).maybeSingle();
  if (!perfil) redirect("/entrar");
  return { sb, perfil };
}
