-- Migração 019: pedido com vários itens + controle de pagamento
--
-- O pedido deixa de ser "uma peça só" e passa a ter uma lista de itens.
-- Cada item pode vir do catálogo (produzir), do estoque de produtos prontos
-- (pronta entrega) ou ser digitado na mão.
--
-- Os campos antigos (peca, valor, material_id, peso_filamento_g, materiais_usados)
-- continuam existindo pra não quebrar pedidos já cadastrados — o sistema lê os
-- itens novos quando existem e cai nos campos antigos quando não existem.

ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS itens JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Controle de pagamento
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS status_pagamento TEXT NOT NULL DEFAULT 'pendente';
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS forma_pagamento TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS valor_pago NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS data_pagamento DATE;

-- Marca se o pedido entregue já virou receita no Financeiro (evita lançar duas vezes)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS receita_lancada BOOLEAN NOT NULL DEFAULT false;

-- Marca se os produtos prontos vendidos já foram baixados do estoque
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS estoque_pronto_baixado BOOLEAN NOT NULL DEFAULT false;
