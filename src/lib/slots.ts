export const SIMBOLOS: Record<string, string> = {
  cereja: "🍒", limao: "🍋", sino: "🔔", estrela: "⭐", diamante: "💎", sete: "7️⃣",
};

export const APOSTAS = [5, 10, 25, 50, 100, 500];

/** Mesma regra do banco (slot_multiplicador). Usada para mostrar e testar a tabela. */
export const MULT_TRINCA: Record<string, number> = {
  cereja: 4, limao: 8, sino: 15, estrela: 40, diamante: 100, sete: 250,
};
export const PESOS: Record<string, number> = {
  cereja: 30, limao: 25, sino: 18, estrela: 12, diamante: 8, sete: 7,
};

export function multiplicador(rolos: string[]): number {
  if (rolos[0] === rolos[1] && rolos[1] === rolos[2]) return MULT_TRINCA[rolos[0]] ?? 0;
  return rolos.filter((r) => r === "cereja").length === 2 ? 2 : 0;
}

/** Retorno teórico e chance de prêmio, calculados exatamente. */
export function estatisticas() {
  const nomes = Object.keys(PESOS);
  const total = nomes.reduce((a, n) => a + PESOS[n], 0);
  let retorno = 0, chance = 0;
  for (const a of nomes) for (const b of nomes) for (const c of nomes) {
    const p = (PESOS[a] * PESOS[b] * PESOS[c]) / total ** 3;
    const m = multiplicador([a, b, c]);
    retorno += p * m;
    if (m > 0) chance += p;
  }
  return { retorno, chance };
}
