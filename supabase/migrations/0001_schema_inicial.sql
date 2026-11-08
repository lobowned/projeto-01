-- Esquema inicial da plataforma de apostas de quota fixa.
-- Valores em centavos (bigint) para evitar erro de arredondamento.

create extension if not exists pgcrypto;

-- =========================================================
-- Apostadores
-- =========================================================
create type kyc_status as enum ('pendente', 'em_analise', 'aprovado', 'reprovado');

create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome_completo text not null,
  cpf char(11) not null unique,
  data_nascimento date not null,
  kyc kyc_status not null default 'pendente',
  pessoa_exposta_politicamente boolean not null default false,
  -- Jogo responsável
  limite_deposito_diario bigint,
  limite_deposito_mensal bigint,
  limite_perda_diaria bigint,
  autoexcluido_ate timestamptz,
  pausa_ate timestamptz,
  criado_em timestamptz not null default now(),
  constraint maior_de_18 check (data_nascimento <= (current_date - interval '18 years'))
);

-- Histórico de alterações de limite: aumentar só vale após 24h (reduzir vale na hora)
create table public.alteracoes_limite (
  id bigserial primary key,
  usuario_id uuid not null references public.perfis (id),
  campo text not null check (campo in ('limite_deposito_diario','limite_deposito_mensal','limite_perda_diaria')),
  valor_novo bigint,
  vale_a_partir_de timestamptz not null,
  aplicado boolean not null default false,
  criado_em timestamptz not null default now()
);

-- =========================================================
-- Carteira (livro-razão: saldo = soma dos lançamentos)
-- =========================================================
create type tipo_lancamento as enum ('deposito', 'saque', 'aposta', 'premio', 'estorno', 'ajuste');

create table public.lancamentos (
  id bigserial primary key,
  usuario_id uuid not null references public.perfis (id),
  tipo tipo_lancamento not null,
  valor bigint not null, -- positivo = crédito, negativo = débito
  referencia text,       -- id da aposta ou do pagamento
  criado_em timestamptz not null default now()
);
create index on public.lancamentos (usuario_id, criado_em);

create view public.saldos as
  select usuario_id, coalesce(sum(valor), 0)::bigint as saldo
  from public.lancamentos group by usuario_id;

-- Pagamentos Pix (entrada e saída). Conta de origem/destino deve ser do próprio CPF.
create type status_pagamento as enum ('criado', 'pago', 'falhou', 'cancelado');

create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfis (id),
  direcao text not null check (direcao in ('entrada','saida')),
  valor bigint not null check (valor > 0),
  status status_pagamento not null default 'criado',
  id_externo text unique,
  cpf_titular_conta char(11),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- =========================================================
-- Eventos, mercados e odds
-- =========================================================
create type status_mercado as enum ('aberto', 'suspenso', 'fechado', 'liquidado', 'cancelado');

create table public.eventos (
  id bigserial primary key,
  esporte text not null,
  competicao text not null,
  mandante text not null,
  visitante text not null,
  inicio timestamptz not null,
  id_externo text unique
);

create table public.mercados (
  id bigserial primary key,
  evento_id bigint not null references public.eventos (id) on delete cascade,
  nome text not null,
  status status_mercado not null default 'aberto'
);

create table public.selecoes (
  id bigserial primary key,
  mercado_id bigint not null references public.mercados (id) on delete cascade,
  nome text not null,
  odd numeric(8,2) not null check (odd > 1),
  vencedora boolean
);

-- =========================================================
-- Apostas
-- =========================================================
create type status_aposta as enum ('aberta', 'ganha', 'perdida', 'cancelada');

create table public.apostas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfis (id),
  valor bigint not null check (valor > 0),
  odd_total numeric(12,2) not null,
  retorno_potencial bigint not null,
  status status_aposta not null default 'aberta',
  criado_em timestamptz not null default now(),
  liquidado_em timestamptz
);

create table public.apostas_selecoes (
  aposta_id uuid not null references public.apostas (id) on delete cascade,
  selecao_id bigint not null references public.selecoes (id),
  odd_no_momento numeric(8,2) not null,
  primary key (aposta_id, selecao_id)
);

-- =========================================================
-- Regras: pode apostar/depositar?
-- =========================================================
create or replace function public.verificar_bloqueios(p_usuario uuid)
returns void language plpgsql security definer set search_path = public as $$
declare p public.perfis;
begin
  select * into p from public.perfis where id = p_usuario;
  if not found then raise exception 'Perfil não encontrado'; end if;
  if p.kyc <> 'aprovado' then raise exception 'Verificação de identidade pendente'; end if;
  if p.autoexcluido_ate is not null and p.autoexcluido_ate > now() then
    raise exception 'Conta em autoexclusão até %', p.autoexcluido_ate;
  end if;
  if p.pausa_ate is not null and p.pausa_ate > now() then
    raise exception 'Conta em pausa até %', p.pausa_ate;
  end if;
end $$;

-- Registrar aposta de forma atômica (valida saldo, odds, mercado e limites)
create or replace function public.registrar_aposta(p_selecoes bigint[], p_odds numeric[], p_valor bigint)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_usuario uuid := auth.uid();
  v_saldo bigint;
  v_odd_total numeric := 1;
  v_aposta uuid;
  v_perda_hoje bigint;
  v_limite bigint;
  s record;
  i int;
begin
  if v_usuario is null then raise exception 'Não autenticado'; end if;
  if p_valor < 100 then raise exception 'Aposta mínima de R$ 1,00'; end if;
  if array_length(p_selecoes, 1) is null or array_length(p_selecoes, 1) <> array_length(p_odds, 1) then
    raise exception 'Seleções inválidas';
  end if;
  perform public.verificar_bloqueios(v_usuario);

  -- trava o usuário para evitar apostas simultâneas gastando o mesmo saldo
  perform 1 from public.perfis where id = v_usuario for update;

  select coalesce(sum(valor), 0) into v_saldo from public.lancamentos where usuario_id = v_usuario;
  if v_saldo < p_valor then raise exception 'Saldo insuficiente'; end if;

  -- limite de perda diária
  select limite_perda_diaria into v_limite from public.perfis where id = v_usuario;
  if v_limite is not null then
    select coalesce(-sum(valor), 0) into v_perda_hoje from public.lancamentos
      where usuario_id = v_usuario and tipo in ('aposta','premio','estorno')
        and criado_em >= date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
    if v_perda_hoje + p_valor > v_limite then raise exception 'Limite de perda diária atingido'; end if;
  end if;

  for i in 1 .. array_length(p_selecoes, 1) loop
    select se.odd, m.status, e.inicio, m.evento_id into s
      from public.selecoes se join public.mercados m on m.id = se.mercado_id
      join public.eventos e on e.id = m.evento_id
      where se.id = p_selecoes[i] for share of se;
    if not found then raise exception 'Seleção % não existe', p_selecoes[i]; end if;
    if s.status <> 'aberto' or s.inicio <= now() then raise exception 'Mercado indisponível'; end if;
    if s.odd <> p_odds[i] then raise exception 'A odd mudou, confira o cupom'; end if;
    v_odd_total := v_odd_total * s.odd;
  end loop;

  if (select count(distinct m.evento_id) from public.selecoes se join public.mercados m on m.id = se.mercado_id
      where se.id = any(p_selecoes)) <> array_length(p_selecoes, 1) then
    raise exception 'Não é permitido combinar seleções do mesmo evento';
  end if;

  insert into public.apostas (usuario_id, valor, odd_total, retorno_potencial)
    values (v_usuario, p_valor, round(v_odd_total, 2), floor(p_valor * round(v_odd_total, 2)))
    returning id into v_aposta;
  insert into public.apostas_selecoes (aposta_id, selecao_id, odd_no_momento)
    select v_aposta, unnest(p_selecoes), unnest(p_odds);
  insert into public.lancamentos (usuario_id, tipo, valor, referencia)
    values (v_usuario, 'aposta', -p_valor, v_aposta::text);
  return v_aposta;
end $$;

-- Liquidar mercado (uso interno/back-office, chamado com service role)
create or replace function public.liquidar_mercado(p_mercado bigint, p_vencedora bigint)
returns void language plpgsql security definer set search_path = public as $$
declare a record;
begin
  update public.selecoes set vencedora = (id = p_vencedora) where mercado_id = p_mercado;
  update public.mercados set status = 'liquidado' where id = p_mercado;

  for a in
    select ap.* from public.apostas ap
    where ap.status = 'aberta'
      and exists (select 1 from public.apostas_selecoes x join public.selecoes s on s.id = x.selecao_id
                  where x.aposta_id = ap.id and s.mercado_id = p_mercado)
    for update
  loop
    if exists (select 1 from public.apostas_selecoes x join public.selecoes s on s.id = x.selecao_id
               where x.aposta_id = a.id and s.vencedora = false) then
      update public.apostas set status = 'perdida', liquidado_em = now() where id = a.id;
    elsif not exists (select 1 from public.apostas_selecoes x join public.selecoes s on s.id = x.selecao_id
                      where x.aposta_id = a.id and s.vencedora is null) then
      update public.apostas set status = 'ganha', liquidado_em = now() where id = a.id;
      insert into public.lancamentos (usuario_id, tipo, valor, referencia)
        values (a.usuario_id, 'premio', a.retorno_potencial, a.id::text);
    end if;
  end loop;
end $$;
revoke execute on function public.liquidar_mercado from public, anon, authenticated;

-- Autoexclusão (não pode ser desfeita antes do prazo)
create or replace function public.autoexcluir(p_meses int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_meses not between 1 and 60 then raise exception 'Prazo entre 1 e 60 meses'; end if;
  update public.perfis
    set autoexcluido_ate = greatest(coalesce(autoexcluido_ate, now()), now() + make_interval(months => p_meses))
    where id = auth.uid();
end $$;

-- Alterar limite: reduzir vale na hora; aumentar/remover vale após 24h
create or replace function public.alterar_limite(p_campo text, p_valor bigint)
returns void language plpgsql security definer set search_path = public as $$
declare atual bigint;
begin
  if p_campo not in ('limite_deposito_diario','limite_deposito_mensal','limite_perda_diaria') then
    raise exception 'Campo inválido';
  end if;
  execute format('select %I from public.perfis where id = $1', p_campo) into atual using auth.uid();
  -- criar limite ou reduzir: vale na hora
  if p_valor is not null and (atual is null or p_valor <= atual) then
    execute format('update public.perfis set %I = $1 where id = $2', p_campo) using p_valor, auth.uid();
    return;
  end if;
  insert into public.alteracoes_limite (usuario_id, campo, valor_novo, vale_a_partir_de)
    values (auth.uid(), p_campo, p_valor, now() + interval '24 hours');
end $$;

-- =========================================================
-- Segurança (RLS): cada um só vê o que é seu; escrita só via funções
-- =========================================================
alter table public.perfis enable row level security;
alter table public.lancamentos enable row level security;
alter table public.pagamentos enable row level security;
alter table public.apostas enable row level security;
alter table public.apostas_selecoes enable row level security;
alter table public.alteracoes_limite enable row level security;
alter table public.eventos enable row level security;
alter table public.mercados enable row level security;
alter table public.selecoes enable row level security;

create policy "ver próprio perfil" on public.perfis for select using (id = auth.uid());
create policy "ver próprios lançamentos" on public.lancamentos for select using (usuario_id = auth.uid());
create policy "ver próprios pagamentos" on public.pagamentos for select using (usuario_id = auth.uid());
create policy "ver próprias apostas" on public.apostas for select using (usuario_id = auth.uid());
create policy "ver seleções das próprias apostas" on public.apostas_selecoes for select
  using (exists (select 1 from public.apostas a where a.id = aposta_id and a.usuario_id = auth.uid()));
create policy "ver próprias alterações" on public.alteracoes_limite for select using (usuario_id = auth.uid());
create policy "eventos públicos" on public.eventos for select using (true);
create policy "mercados públicos" on public.mercados for select using (true);
create policy "seleções públicas" on public.selecoes for select using (true);

alter view public.saldos set (security_invoker = true);
