-- Dados iniciais pra rodar no SQL Editor do Neon, depois do schema.sql.
-- Sem isso o sistema abre com as telas vazias (ou caindo no modo "dados de exemplo" do front).

INSERT INTO clientes (nome, contato) VALUES
  ('Marcos Silva', '(16) 99123-4567'),
  ('Ateliê Flora', '(16) 98877-2211'),
  ('João Petri', '(16) 99654-1122'),
  ('Carla Nunes', '(16) 99321-8890');

INSERT INTO materiais (nome, preco_kg, estoque_g, capacidade_g) VALUES
  ('PLA Branco', 79.90, 180, 1000),
  ('PETG Preto', 94.90, 120, 1000),
  ('PLA Vermelho', 79.90, 820, 1000),
  ('ABS Cinza', 84.90, 450, 1000);

INSERT INTO pedidos (cliente_id, peca, material, valor, prazo, status)
SELECT id, 'Suporte celular (x3)', 'PETG', 90.00, '2026-07-12'::date, 'producao' FROM clientes WHERE nome = 'Marcos Silva'
UNION ALL
SELECT id, 'Vaso decorativo', 'PLA', 145.00, '2026-07-18'::date, 'orcamento' FROM clientes WHERE nome = 'Ateliê Flora'
UNION ALL
SELECT id, 'Peça reposição drone', 'PLA', 60.00, '2026-07-10'::date, 'pronto' FROM clientes WHERE nome = 'João Petri'
UNION ALL
SELECT id, 'Miniatura personalizada', 'PLA', 210.00, '2026-07-05'::date, 'entregue' FROM clientes WHERE nome = 'Carla Nunes';

INSERT INTO produtos_prontos (nome, material, quantidade, custo_unitario, preco_venda) VALUES
  ('Suporte de celular', 'PETG Preto', 6, 8.50, 22.00),
  ('Vaso decorativo P', 'PLA Vermelho', 3, 14.20, 39.90),
  ('Case Raspberry Pi', 'ABS Cinza', 4, 9.80, 28.00),
  ('Miniatura personalizada', 'PLA Vermelho', 1, 11.00, 45.00);

INSERT INTO lancamentos_financeiros (data, descricao, tipo, valor) VALUES
  ('2026-07-08', 'Venda — Marcos Silva', 'receita', 90.00),
  ('2026-07-07', 'Compra filamento PETG', 'despesa', 189.80),
  ('2026-07-05', 'Venda — Carla Nunes', 'receita', 210.00),
  ('2026-07-02', 'Energia elétrica (rateio)', 'despesa', 65.00);

INSERT INTO perdas_material (material_id, peso_perdido_g, motivo, custo, data)
SELECT id, 65, 'Descolou da mesa', 6.17, '2026-07-06'::date FROM materiais WHERE nome = 'PETG Preto'
UNION ALL
SELECT id, 30, 'Warping', 2.40, '2026-07-02'::date FROM materiais WHERE nome = 'PLA Vermelho';

INSERT INTO equipamentos (nome, tipo, valor, aquisicao, status) VALUES
  ('Bambu Lab A1', 'impressora', 2899.00, '2026-03-12', 'Funcionando'),
  ('Ender 3 V2', 'impressora', 1150.00, '2025-11-05', 'Manutenção pendente'),
  ('Espátula removedora', 'ferramenta', 25.00, '2026-03-01', 'OK'),
  ('Kit chaves allen', 'ferramenta', 45.00, '2026-03-01', 'OK'),
  ('Paquímetro digital', 'ferramenta', 89.00, '2026-04-01', 'OK'),
  ('Alicate de corte', 'ferramenta', 32.00, '2026-03-01', 'Desgastado');

INSERT INTO agenda_eventos (data, titulo, descricao, tipo) VALUES
  ('2026-07-08', 'Entrega — Rafael Costa', 'Case Raspberry Pi', 'entrega'),
  ('2026-07-10', 'Entrega — João Petri', 'Peça reposição drone', 'entrega'),
  ('2026-07-12', 'Entrega — Marcos Silva', 'Suporte celular (x3)', 'entrega'),
  ('2026-07-18', 'Entrega — Ateliê Flora', 'Vaso decorativo', 'entrega'),
  ('2026-07-20', 'Manutenção — Bambu Lab A1', 'Limpeza de bicos', 'manutencao');
