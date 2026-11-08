import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = { title: "Projeto 01", description: "Apostas esportivas de quota fixa" };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex flex-col">
        <header className="border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-bold text-marca">Projeto 01</Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/conta">Minha conta</Link>
            <Link href="/jogo-responsavel">Jogo responsável</Link>
          </nav>
        </header>
        <main className="flex-1 w-full max-w-4xl mx-auto p-4">{children}</main>
        <footer className="border-t border-neutral-800 p-4 text-xs text-neutral-400 text-center space-y-1">
          <p><strong>Proibido para menores de 18 anos.</strong> Apostas envolvem risco de perda financeira.</p>
          <p>Jogue com responsabilidade. Precisa de ajuda? Ligue 188 (CVV) ou procure o CAPS da sua cidade.</p>
          <p>Operador autorizado pela SPA/MF — Portaria nº [PREENCHER].</p>
        </footer>
      </body>
    </html>
  );
}
