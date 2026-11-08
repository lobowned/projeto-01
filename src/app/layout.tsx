import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = { title: "R4 Bet", description: "Apostas entre amigos valendo fichas" };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex flex-col">
        <header className="border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-bold text-marca">R4 Bet</Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/slots">Slots</Link>
            <Link href="/ranking">Ranking</Link>
            <Link href="/conta">Minhas apostas</Link>
          </nav>
        </header>
        <main className="flex-1 w-full max-w-4xl mx-auto p-4">{children}</main>
        <footer className="border-t border-neutral-800 p-4 text-xs text-neutral-400 text-center">
          Jogo entre amigos valendo fichas. Fichas não têm valor em dinheiro e não podem ser compradas nem trocadas.
        </footer>
      </body>
    </html>
  );
}
