-- Migração 011: catálogo de produtos com código de referência (reutilizável em Pedido/Orçamento)
CREATE TABLE IF NOT EXISTS catalogo_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  material_id UUID REFERENCES materiais(id),
  peso_padrao_g NUMERIC(10,1),
  tempo_impressao_h NUMERIC(6,1),
  preco_padrao NUMERIC(10,2),
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now()
);
