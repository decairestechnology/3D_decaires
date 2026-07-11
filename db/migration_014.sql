-- Migração 014: link do arquivo de impressão no catálogo
ALTER TABLE catalogo_produtos ADD COLUMN IF NOT EXISTS link_arquivo TEXT;
