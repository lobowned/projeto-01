# R4 Bet

Apostas esportivas e caça-níqueis entre amigos **valendo fichas** (sem dinheiro). Feito com Next.js 14 + Supabase.

Fichas não podem ser compradas, vendidas nem trocadas por dinheiro dentro do app. Se o grupo quiser um prêmio para o 1º do ranking, combinem por fora.

## Como funciona

1. Cada amigo faz login pelo e-mail (link mágico) e entra no grupo com o **código de convite**.
2. Todo mundo começa com **1.000 fichas**.
3. O **admin** (o primeiro a entrar no grupo) cadastra os jogos com as odds de casa, empate e fora.
4. Os amigos apostam até o horário de início do jogo.
5. Depois do jogo, o admin informa o resultado e o app paga as apostas vencedoras.
6. Nos **caça-níqueis** (`/slots`) há 3 máquinas, com apostas de 5 a 500 fichas.
7. Todo dia cada um pode pegar **100 fichas de bônus**.
8. O **ranking** mostra quem tem mais fichas e quantas apostas cada um acertou.

## Caça-níqueis

São 3 máquinas. Todas devolvem, em média, cerca de 90% das fichas apostadas. O sorteio é feito no banco de dados com números aleatórios criptográficos, então ninguém consegue manipular pelo navegador.

| Máquina | Como ganha | Retorno | Prêmio em | Maior prêmio |
|---|---|---|---|---|
| 🍒 Frutas Clássicas | 3 rolos, 3 iguais (ou 2 cerejas = 2x) | 90,5% | 24% das rodadas | 250x |
| ☠️ Tesouro Pirata | 5 rolos, 3/4/5 iguais a partir da esquerda | 90,1% | 7% das rodadas | 2.800x |
| 🍀 Trevo da Sorte | grade 3×3, 5 linhas; aposta dividida entre as linhas | 89,2% | 23% das rodadas | 700x |

Os números foram conferidos em 150 mil giros simulados por máquina, e o cálculo de prêmio do banco foi comparado com o do app em 6 mil resultados (nenhuma diferença). Para mudar pesos ou prêmios, edite a tabela `slot_simbolos` **e** `src/lib/slots.ts` — o `npm test` avisa se o retorno sair da faixa de 89% a 91%.

## Telas

| Rota | O que tem |
|---|---|
| `/` | Próximos jogos |
| `/evento/[id]` | Odds e cupom de aposta |
| `/conta` | Suas fichas e suas apostas |
| `/slots` | Escolha da máquina e bônus diário |
| `/slots/[maquina]` | Jogo (`frutas`, `pirata` ou `trevo`) |
| `/ranking` | Classificação do grupo |
| `/admin` | Código de convite, criar jogos, definir resultados (só admin) |

## Colocando no ar

1. Crie um projeto grátis em [supabase.com](https://supabase.com).
2. No **SQL Editor** do Supabase, cole e rode `supabase/migrations/0001_schema_inicial.sql` e depois `0002_slots.sql`.
3. Em **Authentication → URL Configuration**, coloque a URL do site (ex.: `https://r4bet.vercel.app`).
4. Publique na [Vercel](https://vercel.com) importando este repositório e configure as variáveis do `.env.example`.
5. Entre primeiro com o seu e-mail para virar admin. O código de convite aparece em `/admin`.

## Desenvolvimento

```bash
npm install
cp .env.example .env.local
npx supabase db reset   # aplica o esquema e os jogos de exemplo (supabase/seed.sql)
npm run dev
npm test
```

Para trocar o código de convite ou as fichas iniciais, rode no SQL Editor:

```sql
update config set codigo_convite = 'novo-codigo', fichas_iniciais = 1000;
```
