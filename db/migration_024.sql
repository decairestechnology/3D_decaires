-- =====================================================================
-- Migração 024 — DeCaires 3D
-- (a) Permitir excluir materiais já usados em pedidos/perdas/catálogo
-- (b) Código de referência no cadastro de materiais
-- Idempotente: pode rodar quantas vezes quiser.
-- =====================================================================

-- ---------------------------------------------------------------------
-- (b) Código de referência do material (ex.: MAT-001)
-- ---------------------------------------------------------------------
ALTER TABLE materiais ADD COLUMN IF NOT EXISTS codigo TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS materiais_codigo_unico
  ON materiais (codigo) WHERE codigo IS NOT NULL AND codigo <> '';

-- Preenche o código dos materiais já cadastrados, na ordem de cadastro
WITH numerados AS (
  SELECT id, 'MAT-' || LPAD(ROW_NUMBER() OVER (ORDER BY id)::text, 3, '0') AS novo
    FROM materiais
   WHERE codigo IS NULL OR codigo = ''
)
UPDATE materiais m
   SET codigo = n.novo
  FROM numerados n
 WHERE m.id = n.id;

-- ---------------------------------------------------------------------
-- (a) Toda chave estrangeira que aponta para "materiais" passa a
--     ON DELETE SET NULL. Varre o schema, não depende de adivinhar
--     nomes de tabela/constraint.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  fk      RECORD;
  cols    TEXT;
  nome_c  TEXT;
BEGIN
  FOR fk IN
    SELECT con.conname                     AS nome,
           con.conrelid::regclass::text    AS tabela,
           con.conkey                      AS colunas,
           con.confdeltype                 AS acao
      FROM pg_constraint con
     WHERE con.contype = 'f'
       AND con.confrelid = 'materiais'::regclass
  LOOP
    CONTINUE WHEN fk.acao = 'n';   -- 'n' = SET NULL, já está correto

    SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY a.attnum)
      INTO cols
      FROM pg_attribute a
     WHERE a.attrelid = fk.tabela::regclass
       AND a.attnum = ANY (fk.colunas);

    -- a coluna precisa aceitar NULL para o SET NULL funcionar
    FOR nome_c IN
      SELECT a.attname
        FROM pg_attribute a
       WHERE a.attrelid = fk.tabela::regclass
         AND a.attnum = ANY (fk.colunas)
         AND a.attnotnull
    LOOP
      EXECUTE format('ALTER TABLE %s ALTER COLUMN %I DROP NOT NULL', fk.tabela, nome_c);
    END LOOP;

    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', fk.tabela, fk.nome);
    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%s) REFERENCES materiais(id) ON DELETE SET NULL',
      fk.tabela, fk.nome, cols);

    RAISE NOTICE 'Corrigida: % em % (%)', fk.nome, fk.tabela, cols;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- Conferência: todas devem aparecer com delete_rule = SET NULL
-- ---------------------------------------------------------------------
SELECT con.conrelid::regclass::text AS tabela,
       con.conname                  AS constraint_nome,
       CASE con.confdeltype WHEN 'n' THEN 'SET NULL'
                            WHEN 'a' THEN 'NO ACTION'
                            WHEN 'r' THEN 'RESTRICT'
                            WHEN 'c' THEN 'CASCADE'
                            WHEN 'd' THEN 'SET DEFAULT' END AS ao_excluir
  FROM pg_constraint con
 WHERE con.contype = 'f'
   AND con.confrelid = 'materiais'::regclass
 ORDER BY 1;
