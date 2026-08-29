-- Migração 018: fundação de custo completo
-- (materiais extras, custos operacionais fixos, alerta de estoque em gramas)

-- Insumos que não são filamento: parafuso, ímã, tinta, embalagem...
CREATE TABLE IF NOT EXISTS materiais_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'un',
  quantidade NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantidade_usada NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  alerta_estoque_baixo NUMERIC(12,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Custos fixos do negócio: aluguel, salário, imposto, internet...
CREATE TABLE IF NOT EXISTS custos_operacionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'outros',
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  frequencia TEXT NOT NULL DEFAULT 'mensal',
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Alerta de estoque em gramas (mais prático que só %) e marca do filamento
ALTER TABLE materiais ADD COLUMN IF NOT EXISTS alerta_estoque_g NUMERIC(10,1);
ALTER TABLE materiais ADD COLUMN IF NOT EXISTS marca TEXT;

-- Materiais extras usados em cada peça
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS extras_usados JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE catalogo_produtos ADD COLUMN IF NOT EXISTS extras_padrao JSONB NOT NULL DEFAULT '[]'::jsonb;
