-- Migração 015: categoria no catálogo + vínculo pedido↔produto (pra contar uso de verdade)
ALTER TABLE catalogo_produtos ADD COLUMN IF NOT EXISTS categoria TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS catalogo_produto_id UUID REFERENCES catalogo_produtos(id) ON DELETE SET NULL;
