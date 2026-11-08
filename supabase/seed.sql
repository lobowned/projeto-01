-- Jogos de exemplo para desenvolvimento
insert into public.eventos (competicao, mandante, visitante, inicio) values
  ('Brasileirão', 'Time Azul', 'Time Vermelho', now() + interval '2 days'),
  ('Brasileirão', 'Time Verde', 'Time Branco', now() + interval '3 days');
insert into public.mercados (evento_id, nome) select id, 'Resultado final' from public.eventos;
insert into public.selecoes (mercado_id, nome, odd)
  select m.id, x.nome, x.odd from public.mercados m
  cross join (values ('Casa', 2.10), ('Empate', 3.20), ('Fora', 3.50)) as x(nome, odd);
