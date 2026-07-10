-- Migração 003: campos extras no cadastro de cliente
-- Roda isso uma vez no SQL Editor do Neon.

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS observacoes TEXT;
