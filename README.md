# Projeto 01 — Plataforma de apostas de quota fixa

Base em **Next.js 14 + Supabase** para uma casa de apostas esportivas no Brasil.

> ⚠️ Operar apostas com dinheiro real no Brasil **sem autorização da Secretaria de Prêmios e Apostas (SPA/MF)** é ilegal. Este código é a base técnica; a licença, os contratos e a certificação são etapas obrigatórias antes de abrir ao público. Confirme todos os requisitos abaixo com um advogado especializado, porque as portarias mudam com frequência.

## O que já está pronto

| Área | O que faz |
|---|---|
| Cadastro | CPF único e validado, bloqueio de menores de 18 no próprio banco, status de verificação de identidade (KYC) |
| Carteira | Livro-razão em centavos: saldo = soma dos lançamentos, nada de "campo saldo" editável |
| Apostas | Simples e múltiplas, registradas de forma atômica: confere saldo, odd atual, mercado aberto e evento não iniciado |
| Liquidação | Função `liquidar_mercado` (só back-office) paga prêmios automaticamente |
| Jogo responsável | Limites de depósito e de perda (reduzir vale na hora, aumentar só após 24h), pausa e autoexclusão de 1 a 60 meses |
| Pix | Interface para o provedor + webhook com assinatura HMAC, idempotente, que só credita se a conta pagadora for do mesmo CPF |
| Segurança | RLS em todas as tabelas (cada usuário só vê o que é dele; escrita só por funções), cabeçalhos HTTP de segurança |

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha com os dados do seu projeto Supabase
npx supabase db reset        # aplica supabase/migrations e supabase/seed.sql
npm run dev
npm test                     # testes de CPF, maioridade e cálculo de retorno
```

## O que falta (por ordem de prioridade)

1. **Verificação de identidade (KYC)** — integrar provedor de biometria facial + consulta de CPF na Receita. Hoje o campo `kyc` precisa ser aprovado manualmente.
2. **Provedor de pagamentos** — contratar instituição autorizada pelo Banco Central e ajustar `src/lib/pagamentos.ts`. Fazer o fluxo de **saque** e a devolução de Pix vindo de conta de terceiro.
3. **Feed de odds e resultados** — contratar fornecedor (ex.: dados esportivos licenciados) e alimentar `eventos`, `mercados` e `selecoes`.
4. **Back-office** — painel para gestão de mercados, liquidação, aprovação de KYC e relatórios.
5. **Verificação de limite de depósito** no momento de criar a cobrança Pix.
6. **PLD/FT** — monitoramento de transações suspeitas e comunicação ao COAF.
7. **Envio de dados ao SIGAP** (sistema de gestão da SPA) e certificação técnica por laboratório credenciado.
8. **Cadastro de impedidos** — bloquear quem a lei proíbe de apostar (ver checklist).

## Checklist regulatório (resumo — confirmar com advogado)

- [ ] Empresa constituída no Brasil, com sede e administração no país
- [ ] Autorização da SPA/MF (Lei 14.790/2023), com pagamento da outorga de R$ 30 milhões (vale 5 anos)
- [ ] Domínio **`.bet.br`** e marca registrada na autorização
- [ ] Sistema e plataforma certificados por entidade credenciada
- [ ] Pagamentos só por Pix, TED ou cartão de débito; **sem** cartão de crédito, boleto, dinheiro ou cripto
- [ ] Conta de depósito/saque no mesmo CPF do apostador
- [ ] Reconhecimento facial no cadastro e verificações periódicas
- [ ] **Proibido** oferecer bônus de boas-vindas ou adiantamento de saldo
- [ ] Bloquear menores de 18, sócios/funcionários do operador, agentes públicos de fiscalização, pessoas com influência em resultados (atletas, árbitros, dirigentes) e inscritos em cadastros de restrição
- [ ] Publicidade com avisos obrigatórios, sem apelo a menores e sem prometer ganho fácil
- [ ] Programa de jogo responsável, ouvidoria e SAC
- [ ] Política de PLD/FT e cadastro no COAF
- [ ] Tributação: 12% sobre o GGR (receita bruta de jogos) e IR sobre prêmios do apostador — confirmar alíquotas vigentes
- [ ] LGPD: encarregado de dados, política de privacidade e base legal para biometria

Antes de colocar no ar, preencha o número da portaria de autorização no rodapé (`src/app/layout.tsx`).
