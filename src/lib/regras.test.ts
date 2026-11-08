import { test } from "node:test";
import assert from "node:assert/strict";
import { cpfValido, maiorDeIdade } from "./cpf.ts";
import { reaisParaCentavos, retornoPotencial } from "./dinheiro.ts";

test("CPF", () => {
  assert.equal(cpfValido("529.982.247-25"), true);
  assert.equal(cpfValido("52998224724"), false);
  assert.equal(cpfValido("111.111.111-11"), false);
  assert.equal(cpfValido("123"), false);
});

test("maioridade", () => {
  const hoje = new Date(2026, 10, 8);
  assert.equal(maiorDeIdade(new Date(2008, 10, 8), hoje), true);
  assert.equal(maiorDeIdade(new Date(2008, 10, 9), hoje), false);
});

test("dinheiro", () => {
  assert.equal(reaisParaCentavos("R$ 1.234,56"), 123456);
  assert.equal(retornoPotencial(1000, [2.1, 3.2]), 6720);
});
