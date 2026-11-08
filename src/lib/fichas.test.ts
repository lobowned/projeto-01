import { test } from "node:test";
import assert from "node:assert/strict";
import { formatarFichas, retornoPotencial } from "./fichas.ts";

test("retorno potencial", () => {
  assert.equal(retornoPotencial(100, [2.1]), 210);
  assert.equal(retornoPotencial(10, [2.1, 3.2]), 67);
});

test("formatação", () => {
  assert.equal(formatarFichas(1), "1 ficha");
  assert.equal(formatarFichas(1500), "1.500 fichas");
});
