-- R4 Bet: apostas entre amigos valendo fichas (sem dinheiro real).
-- Fichas são números inteiros e não podem ser compradas nem sacadas.

create extension if not exists pgcrypto;

-- =========================================================
-- Configuração do grupo
-- =========================================================
create table public.config (
  id boolean primary key default true check (id), -- só uma linha
  codigo_convite text not null,
  fichas_iniciais int not null default 1000 check (fichas_iniciais > 0)
);
insert into public.config (codigo_convite) values (encode(gen_random_bytes(6), 'hex'));

-- =========================================================
-- Participantes
-- =========================================================
create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  apelido text not null unique check (char_length(apelido) between 2 and 20),
  admin boolean not null default false,
  criado_em timestamptz not null default now()
);

-- Carteira de fichas: saldo = soma dos lançamentos
create type tipo_lancamento as enum ('inicial', 'aposta', 'premio', 'estorno', 'bonus');

create table public.lancamentos (
  id bigserial primary key,
  usuario_id uuid not null references public.perfis (id) on delete cascade,
  tipo tipo_lancamento not null,
  valor int not null,
  referencia text,
  criado_em timestamptz not null default now()
);
create index on public.lancamentos (usuario_id);

-- =========================================================
-- Jogos, mercados e odds
-- =========================================================
create type status_mercado as enum ('aberto', 'suspenso', 'liquidado', 'cancelado');

create table public.eventos (
  id bigserial primary key,
  competicao text not null,
  mandante text not null,
  visitante text not null,
  inicio timestamptz not null
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
  usuario_id uuid not null references public.perfis (id) on delete cascade,
  valor int not null check (valor > 0),
  odd_total numeric(12,2) not null,
  retorno_potencial int not null,
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
-- Ranking (visível para todos do grupo)
-- =========================================================
create view public.ranking as
  select p.id, p.apelido,
         coalesce((select sum(l.valor) from public.lancamentos l where l.usuario_id = p.id), 0)::int as fichas,
         (select count(*) from public.apostas a where a.usuario_id = p.id and a.status = 'ganha')::int as acertos,
         (select count(*) from public.apostas a where a.usuario_id = p.id and a.status in ('ganha','perdida'))::int as finalizadas
  from public.perfis p;

-- =========================================================
-- Funções
-- =========================================================
create or replace function public.eh_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select admin from public.perfis where id = auth.uid()), false)
$$;

-- Entrar no grupo com o código de convite. O primeiro a entrar vira admin.
create or replace function public.entrar_no_grupo(p_codigo text, p_apelido text)
returns void language plpgsql security definer set search_path = public as $$
declare c public.config; primeiro boolean;
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  select * into c from public.config;
  if p_codigo is distinct from c.codigo_convite then raise exception 'Código de convite inválido'; end if;
  if exists (select 1 from public.perfis where id = auth.uid()) then raise exception 'Você já está no grupo'; end if;
  lock table public.perfis in share row exclusive mode;
  primeiro := not exists (select 1 from public.perfis);
  insert into public.perfis (id, apelido, admin) values (auth.uid(), trim(p_apelido), primeiro);
  insert into public.lancamentos (usuario_id, tipo, valor) values (auth.uid(), 'inicial', c.fichas_iniciais);
end $$;

-- Registrar aposta (simples ou múltipla) de forma atômica
create or replace function public.registrar_aposta(p_selecoes bigint[], p_odds numeric[], p_valor int)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_usuario uuid := auth.uid();
  v_saldo int;
  v_odd_total numeric := 1;
  v_aposta uuid;
  s record;
  i int;
begin
  if v_usuario is null then raise exception 'Não autenticado'; end if;
  if p_valor < 1 then raise exception 'Aposte pelo menos 1 ficha'; end if;
  if array_length(p_selecoes, 1) is null or array_length(p_selecoes, 1) <> array_length(p_odds, 1) then
    raise exception 'Seleções inválidas';
  end if;

  -- trava o participante para evitar duas apostas gastando o mesmo saldo
  perform 1 from public.perfis where id = v_usuario for update;
  if not found then raise exception 'Entre no grupo primeiro'; end if;

  select coalesce(sum(valor), 0) into v_saldo from public.lancamentos where usuario_id = v_usuario;
  if v_saldo < p_valor then raise exception 'Fichas insuficientes'; end if;

  for i in 1 .. array_length(p_selecoes, 1) loop
    select se.odd, m.status, e.inicio into s
      from public.selecoes se join public.mercados m on m.id = se.mercado_id
      join public.eventos e on e.id = m.evento_id
      where se.id = p_selecoes[i];
    if not found then raise exception 'Seleção % não existe', p_selecoes[i]; end if;
    if s.status <> 'aberto' or s.inicio <= now() then raise exception 'Apostas encerradas para esse jogo'; end if;
    if s.odd <> p_odds[i] then raise exception 'A odd mudou, confira o cupom'; end if;
    v_odd_total := v_odd_total * s.odd;
  end loop;

  if (select count(distinct m.evento_id) from public.selecoes se join public.mercados m on m.id = se.mercado_id
      where se.id = any(p_selecoes)) <> array_length(p_selecoes, 1) then
    raise exception 'Não dá para combinar duas seleções do mesmo jogo';
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

-- Admin: criar jogo com mercado "Resultado final" (casa / empate / fora)
create or replace function public.criar_evento(
  p_competicao text, p_mandante text, p_visitante text, p_inicio timestamptz,
  p_odd_casa numeric, p_odd_empate numeric, p_odd_fora numeric)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_evento bigint; v_mercado bigint;
begin
  if not public.eh_admin() then raise exception 'Só o admin pode criar jogos'; end if;
  insert into public.eventos (competicao, mandante, visitante, inicio)
    values (p_competicao, p_mandante, p_visitante, p_inicio) returning id into v_evento;
  insert into public.mercados (evento_id, nome) values (v_evento, 'Resultado final') returning id into v_mercado;
  insert into public.selecoes (mercado_id, nome, odd) values
    (v_mercado, p_mandante, p_odd_casa), (v_mercado, 'Empate', p_odd_empate), (v_mercado, p_visitante, p_odd_fora);
  return v_evento;
end $$;

-- Admin: definir o resultado e pagar as apostas
create or replace function public.liquidar_mercado(p_mercado bigint, p_vencedora bigint)
returns void language plpgsql security definer set search_path = public as $$
declare a record;
begin
  if not public.eh_admin() then raise exception 'Só o admin pode definir resultados'; end if;
  if not exists (select 1 from public.selecoes where id = p_vencedora and mercado_id = p_mercado) then
    raise exception 'Seleção não pertence a esse mercado';
  end if;
  if (select status from public.mercados where id = p_mercado) = 'liquidado' then
    raise exception 'Resultado já definido';
  end if;
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

-- =========================================================
-- Segurança (RLS): leitura liberada para o grupo; escrita só pelas funções
-- =========================================================
alter table public.config enable row level security;
alter table public.perfis enable row level security;
alter table public.lancamentos enable row level security;
alter table public.apostas enable row level security;
alter table public.apostas_selecoes enable row level security;
alter table public.eventos enable row level security;
alter table public.mercados enable row level security;
alter table public.selecoes enable row level security;

create policy "admin vê config" on public.config for select using (public.eh_admin());
create policy "grupo vê perfis" on public.perfis for select using (auth.uid() is not null);
create policy "ver próprios lançamentos" on public.lancamentos for select using (usuario_id = auth.uid());
create policy "ver próprias apostas" on public.apostas for select using (usuario_id = auth.uid());
create policy "ver seleções das próprias apostas" on public.apostas_selecoes for select
  using (exists (select 1 from public.apostas a where a.id = aposta_id and a.usuario_id = auth.uid()));
create policy "eventos visíveis" on public.eventos for select using (true);
create policy "mercados visíveis" on public.mercados for select using (true);
create policy "seleções visíveis" on public.selecoes for select using (true);

revoke all on public.ranking from anon;
revoke execute on function public.entrar_no_grupo, public.registrar_aposta, public.criar_evento, public.liquidar_mercado from anon;
