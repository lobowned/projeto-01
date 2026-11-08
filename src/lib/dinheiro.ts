/** Valores são guardados em centavos. */
export function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function reaisParaCentavos(texto: string): number {
  const limpo = texto.replace(/[^\d,.]/g, "").replace(/\./g, "").replace(",", ".");
  const valor = Math.round(Number(limpo) * 100);
  return Number.isFinite(valor) ? valor : 0;
}

/** Retorno = valor × produto das odds (arredondado para baixo, em centavos). */
export function retornoPotencial(centavos: number, odds: number[]): number {
  const total = odds.reduce((acc, o) => acc * o, 1);
  return Math.floor(centavos * Math.round(total * 100) / 100);
}
