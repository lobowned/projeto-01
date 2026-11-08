import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase";

/** Recebe o link mágico do e-mail, troca o código por uma sessão e segue para o grupo. */
export async function GET(req: Request) {
  // usa o endereço que o navegador pediu (req.url pode vir como "localhost" atrás de proxy)
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  const origem = host ? `${proto}://${host}` : new URL(req.url).origin;

  const code = new URL(req.url).searchParams.get("code");
  if (code) {
    const { error } = await supabaseServidor().auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origem}/entrar`);
  }
  return NextResponse.redirect(`${origem}/login?erro=link`);
}
