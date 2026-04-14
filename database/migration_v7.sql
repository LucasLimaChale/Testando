-- ─── Tarefas pessoais do admin ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tarefas (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  titulo     TEXT NOT NULL,
  done       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
