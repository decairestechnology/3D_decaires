-- Migração 021: liga produto pronto ao catálogo
--
-- Antes o produto pronto era um texto solto. Agora ele aponta pro item do catálogo,
-- então a venda de uma peça de estoque também conta no "Vendidos" do catálogo.

ALTER TABLE produtos_prontos ADD COLUMN IF NOT EXISTS catalogo_produto_id UUID REFERENCES catalogo_produtos(id) ON DELETE SET NULL;
