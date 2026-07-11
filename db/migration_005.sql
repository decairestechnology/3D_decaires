-- Migração 005: horário no compromisso da agenda
ALTER TABLE agenda_eventos ADD COLUMN IF NOT EXISTS horario TIME;
