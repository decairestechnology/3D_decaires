-- Migração 007: vida útil do equipamento (pra calcular depreciação)
ALTER TABLE equipamentos ADD COLUMN IF NOT EXISTS vida_util_anos INTEGER NOT NULL DEFAULT 3;
