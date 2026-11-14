-- =====================================================================
-- Migração 025 — DeCaires 3D — códigos por tipo de material
--   Filamento       -> FIL-001, FIL-002...
--   Material extra  -> EXT-001... ou o prefixo que você cadastrar em
--                      Configurações (CHV-001, EMB-001, LED-001, TAG-001...)
-- Idempotente: pode rodar mais de uma vez.
-- =====================================================================

-- Filamentos: troca os MAT-xxx gerados na migração 024 por FIL-xxx
UPDATE materiais
   SET codigo = 'FIL-' || SUBSTRING(codigo FROM 5)
 WHERE codigo ~ '^MAT-[0-9]+$';

-- Materiais extras: cria o código e numera os já cadastrados
ALTER TABLE materiais_extras ADD COLUMN IF NOT EXISTS codigo TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS materiais_extras_codigo_unico
  ON materiais_extras (codigo) WHERE codigo IS NOT NULL AND codigo <> '';

WITH base AS (
  SELECT COALESCE(MAX(SUBSTRING(codigo FROM 5)::int), 0) AS maior
    FROM materiais_extras WHERE codigo ~ '^EXT-[0-9]+$'
), numerados AS (
  SELECT e.id, 'EXT-' || LPAD((b.maior + ROW_NUMBER() OVER (ORDER BY e.nome))::text, 3, '0') AS novo
    FROM materiais_extras e, base b
   WHERE e.codigo IS NULL OR e.codigo = ''
)
UPDATE materiais_extras e SET codigo = n.novo FROM numerados n WHERE e.id = n.id;

-- Tipos de código cadastráveis em Configurações (CHV = Chaveiros, EMB = Embalagem...)
CREATE TABLE IF NOT EXISTS tipos_codigo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefixo TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO tipos_codigo (prefixo, descricao) VALUES ('EXT', 'Material extra (geral)')
ON CONFLICT (prefixo) DO NOTHING;

-- Conferência
SELECT 'filamento' AS tipo, codigo, nome FROM materiais
UNION ALL
SELECT 'extra', codigo, nome FROM materiais_extras
ORDER BY 1, 2;
