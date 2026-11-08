// Configuração das máquinas. Precisa bater com supabase/migrations/0002_slots.sql.

export type Tipo = "classica" | "linha5" | "grade3x3";
export type Simbolo = { id: string; emoji: string; peso: number; pagamentos: number[] };
export type Maquina = {
  id: string; nome: string; tipo: Tipo; descricao: string; cor: string; simbolos: Simbolo[];
};

export const APOSTAS = [5, 10, 25, 50, 100, 500];

export const MAQUINAS: Maquina[] = [
  {
    id: "frutas", nome: "Frutas Clássicas", tipo: "classica", cor: "border-amber-500",
    descricao: "3 rolos. Três iguais ganham, e duas cerejas pagam 2x.",
    simbolos: [
      { id: "cereja", emoji: "🍒", peso: 30, pagamentos: [4] },
      { id: "limao", emoji: "🍋", peso: 25, pagamentos: [8] },
      { id: "sino", emoji: "🔔", peso: 18, pagamentos: [15] },
      { id: "estrela", emoji: "⭐", peso: 12, pagamentos: [40] },
      { id: "diamante", emoji: "💎", peso: 8, pagamentos: [100] },
      { id: "sete", emoji: "7️⃣", peso: 7, pagamentos: [250] },
    ],
  },
  {
    id: "pirata", nome: "Tesouro Pirata", tipo: "linha5", cor: "border-sky-500",
    descricao: "5 rolos. Ganha com 3, 4 ou 5 iguais a partir da esquerda. Prêmio raro, mas grande.",
    simbolos: [
      { id: "moeda", emoji: "🪙", peso: 34, pagamentos: [4, 11, 30] },
      { id: "bussola", emoji: "🧭", peso: 28, pagamentos: [6, 17, 55] },
      { id: "ancora", emoji: "⚓", peso: 20, pagamentos: [11, 43, 145] },
      { id: "bau", emoji: "🧰", peso: 12, pagamentos: [36, 140, 570] },
      { id: "caveira", emoji: "☠️", peso: 6, pagamentos: [115, 570, 2800] },
    ],
  },
  {
    id: "trevo", nome: "Trevo da Sorte", tipo: "grade3x3", cor: "border-emerald-500",
    descricao: "Grade 3×3 com 5 linhas (3 horizontais e 2 diagonais). A aposta é dividida entre as linhas.",
    simbolos: [
      { id: "trevo", emoji: "🍀", peso: 30, pagamentos: [8] },
      { id: "joaninha", emoji: "🐞", peso: 25, pagamentos: [14] },
      { id: "moeda", emoji: "🪙", peso: 20, pagamentos: [25] },
      { id: "pote", emoji: "🍯", peso: 13, pagamentos: [57] },
      { id: "arcoiris", emoji: "🌈", peso: 8, pagamentos: [170] },
      { id: "coroa", emoji: "👑", peso: 4, pagamentos: [700] },
    ],
  },
];

export const LINHAS_GRADE = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 4, 8], [2, 4, 6]];

export function maquina(id: string): Maquina | undefined {
  return MAQUINAS.find((m) => m.id === id);
}

export function qtdRolos(tipo: Tipo): number {
  return tipo === "classica" ? 3 : tipo === "linha5" ? 5 : 9;
}

export function emoji(m: Maquina, simbolo: string): string {
  return m.simbolos.find((s) => s.id === simbolo)?.emoji ?? "❔";
}

/** Mesma regra do banco (slot_multiplicador). */
export function multiplicador(m: Maquina, rolos: string[]): number {
  const pag = (s: string) => m.simbolos.find((x) => x.id === s)?.pagamentos ?? [];
  if (m.tipo === "classica") {
    if (rolos[0] === rolos[1] && rolos[1] === rolos[2]) return pag(rolos[0])[0];
    if (m.id === "frutas" && rolos.filter((r) => r === "cereja").length === 2) return 2;
    return 0;
  }
  if (m.tipo === "linha5") {
    let k = 1;
    while (k < 5 && rolos[k] === rolos[0]) k++;
    return k >= 3 ? pag(rolos[0])[k - 3] : 0;
  }
  let soma = 0;
  for (const [a, b, c] of LINHAS_GRADE) {
    if (rolos[a] === rolos[b] && rolos[b] === rolos[c]) soma += pag(rolos[a])[0];
  }
  return soma / 5;
}

/** Linhas premiadas na grade (para destacar na tela). */
export function linhasPremiadas(rolos: string[]): number[][] {
  return LINHAS_GRADE.filter(([a, b, c]) => rolos[a] === rolos[b] && rolos[b] === rolos[c]);
}

/** Retorno teórico exato (média de fichas devolvidas por ficha apostada). */
export function retornoTeorico(m: Maquina): number {
  const total = m.simbolos.reduce((a, s) => a + s.peso, 0);
  const p = (s: Simbolo) => s.peso / total;
  if (m.tipo === "classica") {
    let r = 0;
    for (const a of m.simbolos) for (const b of m.simbolos) for (const c of m.simbolos) {
      r += p(a) * p(b) * p(c) * multiplicador(m, [a.id, b.id, c.id]);
    }
    return r;
  }
  if (m.tipo === "linha5") {
    return m.simbolos.reduce((r, s) => {
      const q = p(s);
      return r + q ** 3 * (1 - q) * s.pagamentos[0] + q ** 4 * (1 - q) * s.pagamentos[1] + q ** 5 * s.pagamentos[2];
    }, 0);
  }
  // grade: cada linha vale 1/5 da aposta; pela linearidade, retorno = retorno de uma linha
  return m.simbolos.reduce((r, s) => r + p(s) ** 3 * s.pagamentos[0], 0);
}
