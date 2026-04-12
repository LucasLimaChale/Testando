-- Migration V2 — rodar em instalações existentes
-- Em instalações novas o init.sql já inclui tudo

-- 1. Novo status LISTA (ponto de entrada no Kanban)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'LISTA'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'video_status')
  ) THEN
    ALTER TYPE video_status ADD VALUE 'LISTA';
  END IF;
END $$;

-- 2. Campo empresa em clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS empresa VARCHAR(255);

-- 3. Tabela de auditoria de login
CREATE TABLE IF NOT EXISTS login_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  data_hora_login TIMESTAMPTZ DEFAULT NOW(),
  ip            VARCHAR(45)
);

CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_data    ON login_logs(data_hora_login DESC);
