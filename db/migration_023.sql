-- Migração 023: liga lançamento financeiro ao custo operacional que o gerou
--
-- Assim o sistema sabe quais custos fixos já foram lançados no mês e evita
-- que você pague duas vezes por distração.

ALTER TABLE lancamentos_financeiros ADD COLUMN IF NOT EXISTS custo_operacional_id UUID REFERENCES custos_operacionais(id) ON DELETE SET NULL;
