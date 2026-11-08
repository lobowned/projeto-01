-- Caça-níqueis valendo fichas. O sorteio acontece no banco (o navegador só mostra o resultado).
-- Três máquinas, todas com retorno médio próximo de 90%:
--   frutas  · 3 rolos, paga trinca (e 2 cerejas = 2x)          · retorno 90,5% · prêmio em 24% das rodadas
--   pirata  · 5 rolos, paga 3/4/5 iguais a partir da esquerda  · retorno 90,1% · prêmio em 7% (alta volatilidade)
--   trevo   · grade 3x3, 5 linhas (3 horizontais + 2 diagonais); aposta dividida entre as linhas
--             · retorno 89,2% · prêmio em ~23%
-- Se mudar pesos ou prêmios aqui, mude também src/lib/slots.ts (os testes conferem os números).

alter type public.tipo_lancamento add value if not exists 'slot';
alter type public.tipo_lancamento add value if not exists 'bonus_diario';

create table public.slot_maquinas (
  id text primary key,
  nome text not null,
  tipo text not null check (tipo in ('classica', 'linha5', 'grade3x3')),
  ordem int not null
);
insert into public.slot_maquinas values
  ('frutas', 'Frutas Clássicas', 'classica', 1),
  ('pirata', 'Tesouro Pirata', 'linha5', 2),
  ('trevo', 'Trevo da Sorte', 'grade3x3', 3);

-- pagamentos: classica/grade3x3 = {trinca}; linha5 = {3 iguais, 4 iguais, 5 iguais}
create table public.slot_simbolos (
  maquina text not null references public.slot_maquinas (id) on delete cascade,
  simbolo text not null,
  peso int not null check (peso > 0),
  pagamentos int[] not null,
  ordem int not null,
  primary key (maquina, simbolo)
);
insert into public.slot_simbolos values
  ('frutas', 'cereja',   30, '{4}',   1),
  ('frutas', 'limao',    25, '{8}',   2),
  ('frutas', 'sino',     18, '{15}',  3),
  ('frutas', 'estrela',  12, '{40}',  4),
  ('frutas', 'diamante',  8, '{100}', 5),
  ('frutas', 'sete',      7, '{250}', 6),
  ('pirata', 'moeda',    34, '{4,11,30}',      1),
  ('pirata', 'bussola',  28, '{6,17,55}',      2),
  ('pirata', 'ancora',   20, '{11,43,145}',    3),
  ('pirata', 'bau',      12, '{36,140,570}',   4),
  ('pirata', 'caveira',   6, '{115,570,2800}', 5),
  ('trevo', 'trevo',     30, '{8}',   1),
  ('trevo', 'joaninha',  25, '{14}',  2),
  ('trevo', 'moeda',     20, '{25}',  3),
  ('trevo', 'pote',      13, '{57}',  4),
  ('trevo', 'arcoiris',   8, '{170}', 5),
  ('trevo', 'coroa',      4, '{700}', 6);

create table public.slot_rodadas (
  id bigserial primary key,
  usuario_id uuid not null references public.perfis (id) on delete cascade,
  maquina text not null references public.slot_maquinas (id),
  aposta int not null check (aposta between 1 and 500),
  rolos text[] not null,
  multiplicador numeric(10,2) not null,
  premio int not null,
  criado_em timestamptz not null default now()
);
create index on public.slot_rodadas (usuario_id, maquina, id desc);

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

-- Sorteia um símbolo da máquina respeitando os pesos
create or replace function public.sortear_simbolo(p_maquina text)
returns text language plpgsql volatile set search_path = public as $$
declare r int; acum int := 0; s record;
begin
  r := public.aleatorio((select sum(peso)::int from public.slot_simbolos where maquina = p_maquina));
  for s in select simbolo, peso from public.slot_simbolos where maquina = p_maquina order by ordem loop
    acum := acum + s.peso;
    if r < acum then return s.simbolo; end if;
  end loop;
end $$;

-- Multiplicador de um resultado (quanto a aposta é multiplicada). Função pura.
create or replace function public.slot_multiplicador(p_maquina text, p_rolos text[])
returns numeric language plpgsql stable set search_path = public as $$
declare
  v_tipo text := (select tipo from public.slot_maquinas where id = p_maquina);
  v_pag int[];
  k int := 1;
  soma int := 0;
  linha int[];
  linhas int[][] := array[[1,2,3],[4,5,6],[7,8,9],[1,5,9],[3,5,7]];
begin
  if v_tipo = 'classica' then
    if p_rolos[1] = p_rolos[2] and p_rolos[2] = p_rolos[3] then
      return (select pagamentos[1] from public.slot_simbolos where maquina = p_maquina and simbolo = p_rolos[1]);
    end if;
    if p_maquina = 'frutas' and (select count(*) from unnest(p_rolos) x where x = 'cereja') = 2 then return 2; end if;
    return 0;

  elsif v_tipo = 'linha5' then
    while k < 5 and p_rolos[k + 1] = p_rolos[1] loop k := k + 1; end loop;
    if k < 3 then return 0; end if;
    select pagamentos into v_pag from public.slot_simbolos where maquina = p_maquina and simbolo = p_rolos[1];
    return v_pag[k - 2];

  elsif v_tipo = 'grade3x3' then
    foreach linha slice 1 in array linhas loop
      if p_rolos[linha[1]] = p_rolos[linha[2]] and p_rolos[linha[2]] = p_rolos[linha[3]] then
        soma := soma + (select pagamentos[1] from public.slot_simbolos where maquina = p_maquina and simbolo = p_rolos[linha[1]]);
      end if;
    end loop;
    return soma / 5.0; -- aposta dividida entre as 5 linhas
  end if;
  raise exception 'Máquina desconhecida';
end $$;

-- Joga uma rodada: debita a aposta, sorteia, paga o prêmio
create or replace function public.jogar_slot(p_maquina text, p_aposta int)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_usuario uuid := auth.uid();
  v_tipo text;
  v_saldo int;
  v_rolos text[] := '{}';
  v_mult numeric;
  v_premio int;
  v_id bigint;
begin
  if v_usuario is null then raise exception 'Não autenticado'; end if;
  select tipo into v_tipo from public.slot_maquinas where id = p_maquina;
  if not found then raise exception 'Máquina não existe'; end if;
  if p_aposta is null or p_aposta < 1 or p_aposta > 500 then raise exception 'Aposta entre 1 e 500 fichas'; end if;

  perform 1 from public.perfis where id = v_usuario for update;
  if not found then raise exception 'Entre no grupo primeiro'; end if;

  select coalesce(sum(valor), 0) into v_saldo from public.lancamentos where usuario_id = v_usuario;
  if v_saldo < p_aposta then raise exception 'Fichas insuficientes'; end if;

  for i in 1 .. case v_tipo when 'classica' then 3 when 'linha5' then 5 else 9 end loop
    v_rolos := v_rolos || public.sortear_simbolo(p_maquina);
  end loop;
  v_mult := public.slot_multiplicador(p_maquina, v_rolos);
  v_premio := floor(p_aposta * v_mult);

  insert into public.slot_rodadas (usuario_id, maquina, aposta, rolos, multiplicador, premio)
    values (v_usuario, p_maquina, p_aposta, v_rolos, v_mult, v_premio) returning id into v_id;
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

alter table public.slot_maquinas enable row level security;
alter table public.slot_simbolos enable row level security;
alter table public.slot_rodadas enable row level security;
create policy "máquinas visíveis" on public.slot_maquinas for select using (true);
create policy "tabela de prêmios visível" on public.slot_simbolos for select using (true);
create policy "ver próprias rodadas" on public.slot_rodadas for select using (usuario_id = auth.uid());

revoke execute on function public.jogar_slot, public.resgatar_bonus_diario from anon;
revoke execute on function public.aleatorio, public.sortear_simbolo from public, anon, authenticated;
