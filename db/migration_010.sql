-- Migração 010: corrige exclusão de pedido travando por causa de vínculos automáticos
-- (produto pronto gerado, lançamento financeiro, evento de agenda) — agora ao excluir
-- o pedido, esses registros ficam órfãos (sem o vínculo) em vez de travar a exclusão.

ALTER TABLE produtos_prontos DROP CONSTRAINT IF EXISTS produtos_prontos_pedido_origem_id_fkey;
ALTER TABLE produtos_prontos ADD CONSTRAINT produtos_prontos_pedido_origem_id_fkey
  FOREIGN KEY (pedido_origem_id) REFERENCES pedidos(id) ON DELETE SET NULL;

ALTER TABLE lancamentos_financeiros DROP CONSTRAINT IF EXISTS lancamentos_financeiros_pedido_id_fkey;
ALTER TABLE lancamentos_financeiros ADD CONSTRAINT lancamentos_financeiros_pedido_id_fkey
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL;

ALTER TABLE agenda_eventos DROP CONSTRAINT IF EXISTS agenda_eventos_pedido_id_fkey;
ALTER TABLE agenda_eventos ADD CONSTRAINT agenda_eventos_pedido_id_fkey
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL;

ALTER TABLE agenda_eventos DROP CONSTRAINT IF EXISTS agenda_eventos_equipamento_id_fkey;
ALTER TABLE agenda_eventos ADD CONSTRAINT agenda_eventos_equipamento_id_fkey
  FOREIGN KEY (equipamento_id) REFERENCES equipamentos(id) ON DELETE SET NULL;
