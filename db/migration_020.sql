-- Migração 020: potência da impressora (pra calcular energia em kWh de verdade)
--
-- Antes o sistema pedia "custo de energia por hora", o que obrigava você a fazer
-- a conta de cabeça. Agora ele calcula: potência (W) × tempo (h) ÷ 1000 × tarifa (R$/kWh).

ALTER TABLE equipamentos ADD COLUMN IF NOT EXISTS potencia_w NUMERIC(10,1);
