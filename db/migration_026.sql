-- =====================================================================
-- Migração 026 — DeCaires 3D — Financeiro completo
--   1. Investimentos (aplicar, resgatar, rendimento, atualizar saldo)
--   2. Categorias financeiras cadastráveis
--   3. Forma de pagamento em cada lançamento
--   4. Contas a pagar / a receber (status + vencimento) e parcelamento
-- Idempotente: pode rodar mais de uma vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Investimentos
--    Dinheiro investido NÃO é despesa: é transferência do caixa para o
--    investimento. Por isso fica em tabela própria e não entra no lucro.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS investimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  banco TEXT,
  tipo TEXT NOT NULL DEFAULT 'outro',   -- cdb, tesouro, poupanca, caixinha, fundo, acoes, outro
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- aplicacao  -> + investimento (- caixa se afeta_caixa)
-- resgate    -> - investimento (+ caixa se afeta_caixa)
-- rendimento -> + investimento (pode ser negativo; caixa não muda)
CREATE TABLE IF NOT EXISTS investimento_movimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investimento_id UUID NOT NULL REFERENCES investimentos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('aplicacao', 'resgate', 'rendimento')),
  valor NUMERIC(12,2) NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  afeta_caixa BOOLEAN NOT NULL DEFAULT true,
  descricao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS investimento_movimentos_inv_idx ON investimento_movimentos (investimento_id, data);

-- ---------------------------------------------------------------------
-- 2. Categorias financeiras
--    "chave" é o que fica gravado no lançamento (vendas, materiais...).
--    As de sistema são usadas pelas automações e não podem ser excluídas.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'ambos' CHECK (tipo IN ('receita', 'despesa', 'ambos')),
  sistema BOOLEAN NOT NULL DEFAULT false,
  ordem INT NOT NULL DEFAULT 100,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO categorias_financeiras (chave, nome, tipo, sistema, ordem) VALUES
  ('vendas',            'Vendas',                   'receita', true,  1),
  ('servicos',          'Serviços de impressão',    'receita', false, 2),
  ('outras_receitas',   'Outras receitas',          'receita', false, 3),
  ('materiais',         'Materiais',                'despesa', true,  10),
  ('embalagem',         'Embalagem',                'despesa', false, 11),
  ('frete',             'Frete / envio',            'despesa', false, 12),
  ('taxas_marketplace', 'Taxas de marketplace',     'despesa', false, 13),
  ('anuncios',          'Anúncios / marketing',     'despesa', false, 14),
  ('energia',           'Energia',                  'despesa', false, 15),
  ('manutencao',        'Manutenção',               'despesa', false, 16),
  ('equipamentos',      'Equipamentos',             'despesa', false, 17),
  ('assinaturas',       'Assinaturas / software',   'despesa', false, 18),
  ('impostos',          'Impostos (DAS / MEI)',     'despesa', false, 19),
  ('prolabore',         'Pró-labore / retirada',    'despesa', false, 20),
  ('outros',            'Outros',                   'ambos',   true,  99)
ON CONFLICT (chave) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3 e 4. Lançamentos: forma de pagamento, status, vencimento, parcelas
--    Tudo que já existe fica como "pago", então nada muda nos números.
-- ---------------------------------------------------------------------
ALTER TABLE lancamentos_financeiros ADD COLUMN IF NOT EXISTS forma_pagamento TEXT;
ALTER TABLE lancamentos_financeiros ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pago';
ALTER TABLE lancamentos_financeiros ADD COLUMN IF NOT EXISTS vencimento DATE;
ALTER TABLE lancamentos_financeiros ADD COLUMN IF NOT EXISTS parcela_num INT;
ALTER TABLE lancamentos_financeiros ADD COLUMN IF NOT EXISTS parcela_total INT;
ALTER TABLE lancamentos_financeiros ADD COLUMN IF NOT EXISTS grupo_parcela UUID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lancamentos_status_check') THEN
    ALTER TABLE lancamentos_financeiros
      ADD CONSTRAINT lancamentos_status_check CHECK (status IN ('pago', 'pendente'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS lancamentos_pendentes_idx
  ON lancamentos_financeiros (vencimento) WHERE status = 'pendente';

-- Conferência
SELECT 'categorias' AS item, COUNT(*)::text AS total FROM categorias_financeiras
UNION ALL SELECT 'investimentos', COUNT(*)::text FROM investimentos
UNION ALL SELECT 'lançamentos (todos pagos)', COUNT(*)::text FROM lancamentos_financeiros WHERE status = 'pago';
