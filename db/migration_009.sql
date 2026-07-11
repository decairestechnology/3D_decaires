-- Migração 009: catálogo de produtos (com imagem)
CREATE TABLE IF NOT EXISTS catalogo_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  imagem_url TEXT,
  preco NUMERIC(10,2) NOT NULL DEFAULT 0,
  material TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now()
);
