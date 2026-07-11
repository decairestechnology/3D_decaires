-- Migração 017: múltiplos materiais/cores por produto do catálogo
ALTER TABLE catalogo_produtos ADD COLUMN IF NOT EXISTS materiais_padrao JSONB NOT NULL DEFAULT '[]'::jsonb;
