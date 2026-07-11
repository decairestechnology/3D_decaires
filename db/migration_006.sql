-- Migração 006: número de pedido, detalhes de produção e vínculo real com material

ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS numero SERIAL;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS material_id UUID REFERENCES materiais(id);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS peso_filamento_g NUMERIC(10,1);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS link_arquivo TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS material_debitado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS produto_gerado BOOLEAN NOT NULL DEFAULT false;
