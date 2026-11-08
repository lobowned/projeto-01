import { test } from "node:test";
import assert from "node:assert/strict";
import { MAQUINAS, maquina, multiplicador, retornoTeorico, linhasPremiadas } from "./slots.ts";

const frutas = maquina("frutas")!;
const pirata = maquina("pirata")!;
const trevo = maquina("trevo")!;

test("Frutas Clássicas", () => {
  assert.equal(multiplicador(frutas, ["sete", "sete", "sete"]), 250);
  assert.equal(multiplicador(frutas, ["cereja", "cereja", "cereja"]), 4);
  assert.equal(multiplicador(frutas, ["cereja", "limao", "cereja"]), 2);
  assert.equal(multiplicador(frutas, ["sino", "sino", "limao"]), 0);
});

test("Tesouro Pirata", () => {
  assert.equal(multiplicador(pirata, ["caveira", "caveira", "caveira", "caveira", "caveira"]), 2800);
  assert.equal(multiplicador(pirata, ["bau", "bau", "bau", "bau", "moeda"]), 140);
  assert.equal(multiplicador(pirata, ["moeda", "moeda", "moeda", "bau", "moeda"]), 4);
  assert.equal(multiplicador(pirata, ["moeda", "moeda", "bau", "moeda", "moeda"]), 0);
  assert.equal(multiplicador(pirata, ["bau", "moeda", "moeda", "moeda", "moeda"]), 0);
});

test("Trevo da Sorte", () => {
  const g = ["trevo", "trevo", "trevo", "coroa", "trevo", "moeda", "pote", "moeda", "trevo"];
  // linha de cima (8) + diagonal 1-5-9 (8) = 16 / 5
  assert.equal(multiplicador(trevo, g), 3.2);
  assert.equal(linhasPremiadas(g).length, 2);
  const tudo = Array(9).fill("coroa");
  assert.equal(multiplicador(trevo, tudo), 700);
});

test("retorno teórico de todas as máquinas fica entre 89% e 91%", () => {
  const esperado: Record<string, number> = { frutas: 0.90455, pirata: 0.900594448, trevo: 0.891819 };
  for (const m of MAQUINAS) {
    const r = retornoTeorico(m);
    assert.ok(Math.abs(r - esperado[m.id]) < 1e-6, `${m.id}: ${r}`);
    assert.ok(r > 0.89 && r < 0.91, `${m.id}: ${r}`);
  }
});
