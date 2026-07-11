-- Migração 012: imagem do produto no catálogo (por link)
ALTER TABLE catalogo_produtos ADD COLUMN IF NOT EXISTS imagem_url TEXT;
