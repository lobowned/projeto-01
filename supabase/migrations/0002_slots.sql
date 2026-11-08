-- Caça-níquel valendo fichas. O sorteio acontece no banco (o navegador só mostra o resultado).
--
-- Rolos: 3, todos com os mesmos pesos (total 100):
--   cereja 30 · limao 25 · sino 18 · estrela 12 · diamante 8 · sete 7
-- Prêmios (multiplicam a aposta):
--   3 iguais: cereja 4x · limao 8x · sino 15x · estrela 40x · diamante 100x · sete 250x
--   exatamente 2 cerejas: 2x
-- Retorno teórico: 90,5%. Chance de ganhar algo: 24%.

alter type public.tipo_lancamento add value if not exists 'slot';
alter type public.tipo_lancamento add value if not exists 'bonus_diario';

create table public.slot_simbolos (
  simbolo text primary key,
  peso int not null check (peso > 0),
  multiplicador_trinca int not null,
  ordem int not null
);
insert into public.slot_simbolos values
  ('cereja', 30, 4, 1), ('limao', 25, 8, 2), ('sino', 18, 15, 3),
  ('estrela', 12, 40, 4), ('diamante', 8, 100, 5), ('sete', 7, 250, 6);

create table public.slot_rodadas (
  id bigserial primary key,
  usuario_id uuid not null references public.perfis (id) on delete cascade,
  aposta int not null check (aposta between 1 and 500),
  rolos text[] not null,
  multiplicador int not null,
  premio int not null,
  criado_em timestamptz not null default now()
);
create index on public.slot_rodadas (usuario_id, criado_em desc);

-- Número aleatório criptográfico entre 0 e n-1 (sem viés de módulo)
create or replace function public.aleatorio(n int)
returns int language plpgsql volatile set search_path = public as $$
declare v bigint; limite bigint := (4294967296 / n) * n;
begin
  loop
    v := ('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint;
    if v < limite then return (v % n)::int; end if;
  end loop;
end $$;

-- Sorteia um símbolo respeitando os pesos
create or replace function public.sortear_simbolo()
returns text language plpgsql volatile set search_path = public as $$
declare r int; acum int := 0; s record;
begin
  r := public.aleatorio((select sum(peso)::int from public.slot_simbolos));
  for s in select simbolo, peso from public.slot_simbolos order by ordem loop
    acum := acum + s.peso;
    if r < acum then return s.simbolo; end if;
  end loop;
end $$;

-- Calcula o multiplicador de uma combinação (função pura, usada também nos testes)
create or replace function public.slot_multiplicador(p_rolos text[])
returns int language sql stable set search_path = public as $$
  select case
    when p_rolos[1] = p_rolos[2] and p_rolos[2] = p_rolos[3]
      then (select multiplicador_trinca from public.slot_simbolos where simbolo = p_rolos[1])
    when (select count(*) from unnest(p_rolos) x where x = 'cereja') = 2 then 2
    else 0
  end
$$;

-- Joga uma rodada: debita a aposta, sorteia, paga o prêmio
create or replace function public.jogar_slot(p_aposta int)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_usuario uuid := auth.uid();
  v_saldo int;
  v_rolos text[];
  v_mult int;
  v_premio int;
  v_id bigint;
begin
  if v_usuario is null then raise exception 'Não autenticado'; end if;
  if p_aposta is null or p_aposta < 1 or p_aposta > 500 then raise exception 'Aposta entre 1 e 500 fichas'; end if;

  perform 1 from public.perfis where id = v_usuario for update;
  if not found then raise exception 'Entre no grupo primeiro'; end if;

  select coalesce(sum(valor), 0) into v_saldo from public.lancamentos where usuario_id = v_usuario;
  if v_saldo < p_aposta then raise exception 'Fichas insuficientes'; end if;

  v_rolos := array[public.sortear_simbolo(), public.sortear_simbolo(), public.sortear_simbolo()];
  v_mult := public.slot_multiplicador(v_rolos);
  v_premio := p_aposta * v_mult;

  insert into public.slot_rodadas (usuario_id, aposta, rolos, multiplicador, premio)
    values (v_usuario, p_aposta, v_rolos, v_mult, v_premio) returning id into v_id;
  insert into public.lancamentos (usuario_id, tipo, valor, referencia)
    values (v_usuario, 'slot', v_premio - p_aposta, 'slot:' || v_id);

  return json_build_object('rolos', v_rolos, 'multiplicador', v_mult, 'premio', v_premio,
                           'saldo', v_saldo - p_aposta + v_premio);
end $$;

-- Bônus diário: 100 fichas, uma vez por dia (horário de Brasília)
create or replace function public.resgatar_bonus_diario()
returns int language plpgsql security definer set search_path = public as $$
declare v_usuario uuid := auth.uid(); hoje timestamptz;
begin
  if v_usuario is null then raise exception 'Não autenticado'; end if;
  perform 1 from public.perfis where id = v_usuario for update;
  if not found then raise exception 'Entre no grupo primeiro'; end if;
  hoje := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  if exists (select 1 from public.lancamentos where usuario_id = v_usuario
             and tipo = 'bonus_diario' and criado_em >= hoje) then
    raise exception 'Você já pegou o bônus de hoje. Volte amanhã!';
  end if;
  insert into public.lancamentos (usuario_id, tipo, valor) values (v_usuario, 'bonus_diario', 100);
  return 100;
end $$;

alter table public.slot_simbolos enable row level security;
alter table public.slot_rodadas enable row level security;
create policy "tabela de prêmios visível" on public.slot_simbolos for select using (true);
create policy "ver próprias rodadas" on public.slot_rodadas for select using (usuario_id = auth.uid());

revoke execute on function public.jogar_slot, public.resgatar_bonus_diario from anon;
revoke execute on function public.aleatorio, public.sortear_simbolo from public, anon, authenticated;
