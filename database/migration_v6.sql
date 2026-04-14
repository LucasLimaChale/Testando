-- ─── Upload Requests ────────────────────────────────────────────────────────
-- Links que o admin cria e envia para clientes enviarem imagens/arquivos

CREATE TABLE IF NOT EXISTS upload_requests (
  id         SERIAL PRIMARY KEY,
  token      TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(12), 'hex'),
  label      TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Upload Files ────────────────────────────────────────────────────────────
-- Arquivos enviados pelos clientes via link público

CREATE TABLE IF NOT EXISTS upload_files (
  id            SERIAL PRIMARY KEY,
  request_id    INTEGER REFERENCES upload_requests(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  url           TEXT NOT NULL,
  uploaded_at   TIMESTAMPTZ DEFAULT NOW()
);
