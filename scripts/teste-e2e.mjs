// Teste de ponta a ponta contra um Supabase local real (npx supabase start) e o app rodando em :3000.
// Uso: node scripts/teste-e2e.mjs
// Faz login por link mágico (lido no Mailpit), entra no grupo, pega o bônus e joga as 3 máquinas.
import { execSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const APP = process.env.APP_URL ?? "http://127.0.0.1:3000";
const MAILPIT = "http://127.0.0.1:54324";
const DB = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const FOTOS = process.env.FOTOS;

const sql = (q) => execSync(`psql "${DB}" -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
let falhas = 0;
function confere(cond, texto) {
  console.log(`${cond ? "✓" : "✗"} ${texto}`);
  if (!cond) falhas++;
}

async function linkDoEmail(email) {
  for (let i = 0; i < 30; i++) {
    const lista = await (await fetch(`${MAILPIT}/api/v1/search?query=to:${encodeURIComponent(email)}`)).json();
    if (lista.messages?.length) {
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${lista.messages[0].ID}`)).json();
      const link = (msg.HTML || msg.Text).match(/href="([^"]*verify[^"]*)"/)?.[1] ?? msg.Text.match(/(http\S*verify\S*)/)?.[1];
      if (link) return link.replace(/&amp;/g, "&");
    }
    await new Promise((ok) => setTimeout(ok, 500));
  }
  throw new Error("e-mail de login não chegou");
}

async function entrar(navegador, email, apelido) {
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", (e) => erros.push(e.message));

  await p.goto(`${APP}/slots`);
  confere(p.url().endsWith("/login"), `${apelido}: sem login é mandado para /login`);
  await p.fill("input[type=email]", email);
  await p.click("text=Receber link");
  await p.waitForSelector("text=Enviamos um link");
  await p.goto(await linkDoEmail(email));
  await p.waitForURL("**/entrar");
  confere(true, `${apelido}: link do e-mail abriu a sessão e levou para /entrar`);

  await p.fill("input[name=apelido]", apelido);
  await p.fill("input[name=codigo]", "codigo-errado");
  await p.click("button:has-text('Entrar')");
  await p.waitForSelector("text=Código de convite inválido");
  confere(true, `${apelido}: código de convite errado é recusado`);

  await p.fill("input[name=apelido]", apelido);
  await p.fill("input[name=codigo]", sql("select codigo_convite from config"));
  await p.click("button:has-text('Entrar')");
  await p.waitForURL(`${APP}/slots`);
  confere(true, `${apelido}: entrou no grupo`);
  return { p, erros };
}

const saldoTela = async (p) => Number((await p.textContent("[data-testid=saldo]")).replace(/\D/g, ""));
const saldoBanco = (apelido) => Number(sql(`select fichas from ranking where apelido = '${apelido}'`));

const navegador = await chromium.launch();

// ---------- Jogadora 1 (vira admin) ----------
const ana = await entrar(navegador, "ana@r4.test", "Ana");
confere(saldoBanco("Ana") === 1000, "Ana começa com 1.000 fichas");
confere(sql("select admin from perfis where apelido = 'Ana'") === "t", "primeira a entrar virou admin");

const p = ana.p;
await p.goto(`${APP}/admin`);
confere((await p.textContent("[data-testid=convite]")) === sql("select codigo_convite from config"), "admin vê o código de convite");
await p.goto(`${APP}/slots`);
confere((await p.locator("a[href^='/slots/']").count()) === 3, "saguão mostra as 3 máquinas");
await p.click("text=Bônus diário");
await p.waitForSelector("[data-testid=msg-bonus]");
confere(saldoBanco("Ana") === 1100, "bônus diário creditou 100 fichas");
await p.click("text=Bônus diário");
await p.waitForSelector("text=Você já pegou o bônus de hoje");
confere(saldoBanco("Ana") === 1100, "segundo bônus no mesmo dia é recusado");
if (FOTOS) await p.screenshot({ path: `${FOTOS}/real-saguao.png` });

for (const [id, simbolos] of [["frutas", 3], ["pirata", 5], ["trevo", 9]]) {
  await p.goto(`${APP}/slots/${id}`);
  await p.click("button:text-is('25')");
  let consistente = true;
  for (let i = 0; i < 10; i++) {
    const antes = await saldoTela(p);
    await p.click("button:has-text('Girar')");
    await p.waitForSelector("button:has-text('Girar (')", { timeout: 15000 });
    const depois = await saldoTela(p);
    const msg = await p.textContent("[data-testid=mensagem]");
    const ganho = msg.startsWith("Ganhou") ? Number(msg.match(/Ganhou ([\d.]+)/)[1].replace(/\./g, "")) : 0;
    if (depois !== antes - 25 + ganho || (await p.locator("[data-testid=rolos] > div").count()) !== simbolos) consistente = false;
  }
  const rodadas = Number(sql(`select count(*) from slot_rodadas r join perfis p on p.id = r.usuario_id where p.apelido = 'Ana' and maquina = '${id}'`));
  confere(consistente && rodadas === 10, `${id}: 10 giros com ${simbolos} símbolos, saldo da tela certo a cada giro e 10 rodadas gravadas`);
  confere((await saldoTela(p)) === saldoBanco("Ana"), `${id}: saldo da tela = saldo no banco (${saldoBanco("Ana")})`);
  if (FOTOS) await p.screenshot({ path: `${FOTOS}/real-${id}.png`, fullPage: true });
}

const somaRodadas = Number(sql("select coalesce(sum(premio - aposta),0) from slot_rodadas r join perfis p on p.id = r.usuario_id where p.apelido = 'Ana'"));
confere(saldoBanco("Ana") === 1100 + somaRodadas, "livro de fichas fecha: 1.000 + 100 de bônus + resultado dos giros");

const r = await p.evaluate(() => fetch("/api/slots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ maquina: "pirata", aposta: 501 }) }).then((x) => x.json()));
confere(r.erro === "Aposta entre 1 e 500 fichas", "aposta acima de 500 recusada pelo servidor");

// ---------- Jogador 2 ----------
const beto = await entrar(navegador, "beto@r4.test", "Beto");
confere(sql("select admin from perfis where apelido = 'Beto'") === "f", "segundo jogador não é admin");
await beto.p.goto(`${APP}/admin`);
confere(!beto.p.url().endsWith("/admin"), "não-admin não acessa /admin");
// tenta gastar mais fichas do que tem chamando a API direto
const tudo = await beto.p.evaluate(async () => {
  const out = [];
  for (let i = 0; i < 3; i++) out.push(await fetch("/api/slots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ maquina: "frutas", aposta: 500 }) }).then((x) => x.json()));
  return out;
});
confere(saldoBanco("Beto") >= 0, `saldo nunca fica negativo (Beto: ${saldoBanco("Beto")}; respostas: ${tudo.map((t) => t.erro ?? "ok").join(", ")})`);
await beto.p.goto(`${APP}/ranking`);
const ranking = await beto.p.textContent("main");
confere(ranking.includes("Ana") && ranking.includes("Beto"), "ranking mostra os dois jogadores");
if (FOTOS) await beto.p.screenshot({ path: `${FOTOS}/real-ranking.png` });

confere(ana.erros.length === 0 && beto.erros.length === 0, `nenhum erro de JavaScript no navegador`);
await navegador.close();
console.log(falhas ? `\n${falhas} FALHA(S)` : "\nTudo certo.");
process.exit(falhas ? 1 : 0);
