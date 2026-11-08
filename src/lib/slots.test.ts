import { test } from "node:test";
import assert from "node:assert/strict";
import { estatisticas, multiplicador } from "./slots.ts";

test("multiplicadores", () => {
  assert.equal(multiplicador(["sete", "sete", "sete"]), 250);
  assert.equal(multiplicador(["cereja", "cereja", "cereja"]), 4);
  assert.equal(multiplicador(["cereja", "limao", "cereja"]), 2);
  assert.equal(multiplicador(["cereja", "limao", "sino"]), 0);
  assert.equal(multiplicador(["sino", "sino", "limao"]), 0);
});

test("retorno teórico ~90,5% e 24% de chance", () => {
  const { retorno, chance } = estatisticas();
  assert.ok(Math.abs(retorno - 0.90455) < 1e-9, String(retorno));
  assert.ok(Math.abs(chance - 0.24004) < 1e-9, String(chance));
});
