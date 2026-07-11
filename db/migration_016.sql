-- Migração 016: suporte a múltiplos filamentos por pedido (peça com várias cores)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS materiais_usados JSONB NOT NULL DEFAULT '[]'::jsonb;
