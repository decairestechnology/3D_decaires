-- Schema pro Neon (Postgres) — DeCaires 3D Gestão
-- Rode isso no SQL editor do Neon (ou via psql) pra criar as tabelas.

CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  contato TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  preco_kg NUMERIC(10,2) NOT NULL,
  estoque_g NUMERIC(10,1) NOT NULL DEFAULT 0,
  capacidade_g NUMERIC(10,1) NOT NULL DEFAULT 1000,
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  peca TEXT NOT NULL,
  material TEXT,
  peso_g NUMERIC(10,1),
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  prazo DATE,
  status TEXT NOT NULL DEFAULT 'orcamento' CHECK (status IN ('orcamento','producao','pronto','entregue')),
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE produtos_prontos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  material TEXT,
  quantidade INTEGER NOT NULL DEFAULT 0,
  custo_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  preco_venda NUMERIC(10,2) NOT NULL DEFAULT 0,
  pedido_origem_id UUID REFERENCES pedidos(id),
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lancamentos_financeiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  descricao TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita','despesa')),
  valor NUMERIC(10,2) NOT NULL,
  pedido_id UUID REFERENCES pedidos(id),
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE perdas_material (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES materiais(id),
  peso_perdido_g NUMERIC(10,1) NOT NULL,
  motivo TEXT,
  custo NUMERIC(10,2),
  data DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('impressora','ferramenta')),
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  aquisicao DATE,
  status TEXT NOT NULL DEFAULT 'OK'
);

CREATE TABLE agenda_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrega','manutencao')),
  pedido_id UUID REFERENCES pedidos(id),
  equipamento_id UUID REFERENCES equipamentos(id)
);

-- Habilita geração de UUID (necessário rodar uma vez por banco)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
