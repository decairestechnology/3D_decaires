-- Migração 004: orçamentos salvos (pra depois virar pedido)
-- Roda isso uma vez no SQL Editor do Neon.

CREATE TABLE IF NOT EXISTS orcamentos_salvos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id),
  itens JSONB NOT NULL,
  margem NUMERIC(6,2) NOT NULL DEFAULT 0,
  custo_energia_hora NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  convertido BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ DEFAULT now()
);
