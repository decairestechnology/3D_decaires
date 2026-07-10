-- Migração 002: tipo "reunião" na agenda + categoria nos lançamentos financeiros
-- Roda isso uma vez no SQL Editor do Neon.

ALTER TABLE agenda_eventos DROP CONSTRAINT IF EXISTS agenda_eventos_tipo_check;
ALTER TABLE agenda_eventos ADD CONSTRAINT agenda_eventos_tipo_check
  CHECK (tipo IN ('entrega', 'manutencao', 'reuniao'));

ALTER TABLE lancamentos_financeiros ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'outros';
