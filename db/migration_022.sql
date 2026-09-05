-- Migração 022: separa custo de produção do preço de venda no catálogo
--
-- "preco_padrao" sempre foi o preço de VENDA (custo × margem). Agora guardamos
-- também o custo de produção calculado, pra ver a margem real de cada produto.

ALTER TABLE catalogo_produtos ADD COLUMN IF NOT EXISTS custo_producao NUMERIC(10,2);
