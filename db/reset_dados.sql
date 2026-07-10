-- ⚠️ APAGA TODOS OS DADOS (clientes, pedidos, materiais, financeiro, agenda, etc.)
-- Use isso só quando quiser começar do zero pra testar de verdade.
-- O CASCADE cuida da ordem das dependências entre tabelas sozinho.

TRUNCATE TABLE
  agenda_eventos,
  lancamentos_financeiros,
  perdas_material,
  produtos_prontos,
  pedidos,
  clientes,
  materiais,
  equipamentos
CASCADE;
