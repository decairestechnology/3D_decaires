-- Migração 008: catálogo de tipos e cores de material
CREATE TABLE IF NOT EXISTS opcoes_material (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT NOT NULL CHECK (categoria IN ('tipo', 'cor')),
  nome TEXT NOT NULL,
  UNIQUE (categoria, nome)
);

INSERT INTO opcoes_material (categoria, nome) VALUES
  ('tipo', 'PLA'), ('tipo', 'PETG'), ('tipo', 'ABS'), ('tipo', 'TPU'), ('tipo', 'Nylon'),
  ('cor', 'Branco'), ('cor', 'Preto'), ('cor', 'Vermelho'), ('cor', 'Azul'),
  ('cor', 'Verde'), ('cor', 'Amarelo'), ('cor', 'Cinza'), ('cor', 'Transparente')
ON CONFLICT DO NOTHING;
