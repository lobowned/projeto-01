import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase";

async function entrar(form: FormData) {
  "use server";
  const { error } = await supabaseServidor().rpc("entrar_no_grupo", {
    p_codigo: String(form.get("codigo") ?? "").trim(),
    p_apelido: String(form.get("apelido") ?? "").trim(),
  });
  if (error) redirect(`/entrar?erro=${encodeURIComponent(error.message)}`);
  redirect("/");
}

export default async function Entrar({ searchParams }: { searchParams: { erro?: string } }) {
  const sb = supabaseServidor();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await sb.from("perfis").select("id").eq("id", user.id).maybeSingle();
  if (perfil) redirect("/");

  return (
    <form action={entrar} className="mx-auto max-w-sm space-y-3">
      <h1 className="text-xl font-semibold">Entrar no grupo</h1>
      <input name="apelido" required minLength={2} maxLength={20} placeholder="Seu apelido" className="w-full rounded bg-neutral-800 p-2" />
      <input name="codigo" required placeholder="Código de convite" className="w-full rounded bg-neutral-800 p-2" />
      <button className="w-full rounded bg-marca p-2 font-semibold text-black">Entrar</button>
      {searchParams.erro && <p className="text-sm text-red-400">{searchParams.erro}</p>}
    </form>
  );
}
