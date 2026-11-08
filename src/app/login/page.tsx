"use client";
import { useState } from "react";
import { supabaseNavegador } from "@/lib/supabase-navegador";

export default function Login() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabaseNavegador().auth.signInWithOtp({
      email, options: { emailRedirectTo: `${location.origin}/conta` },
    });
    setMsg(error ? error.message : "Enviamos um link de acesso para seu e-mail.");
  }

  return (
    <form onSubmit={entrar} className="mx-auto max-w-sm space-y-3">
      <h1 className="text-xl font-semibold">Entrar</h1>
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder="seu@email.com" className="w-full rounded bg-neutral-800 p-2" />
      <button className="w-full rounded bg-marca p-2 font-semibold text-black">Receber link</button>
      {msg && <p className="text-sm">{msg}</p>}
    </form>
  );
}
