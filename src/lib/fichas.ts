export function formatarFichas(n: number): string {
  return `${n.toLocaleString("pt-BR")} ${Math.abs(n) === 1 ? "ficha" : "fichas"}`;
}

/** Retorno = fichas × produto das odds (arredondado para baixo), igual ao banco. */
export function retornoPotencial(fichas: number, odds: number[]): number {
  const total = Math.round(odds.reduce((acc, o) => acc * o, 1) * 100) / 100;
  return Math.floor(fichas * total);
}
