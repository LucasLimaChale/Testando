-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'cliente', 'editor');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE video_status AS ENUM ('EM_EDICAO', 'AGUARDANDO_APROVACAO', 'REPROVADO', 'APROVADO', 'PUBLICADO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) UNIQUE NOT NULL,
  senha      VARCHAR(255) NOT NULL,
  tipo       user_role NOT NULL DEFAULT 'cliente',
  criado_em  TIMESTAMPTZ DEFAULT NOW()
);

-- Clientes (entidade de negócio, pode ter user vinculado para login)
CREATE TABLE IF NOT EXISTS clientes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  nome       VARCHAR(255) NOT NULL,
  telefone   VARCHAR(30),
  criado_em  TIMESTAMPTZ DEFAULT NOW()
);

-- Videos
CREATE TABLE IF NOT EXISTS videos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id    UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  editor_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  titulo        VARCHAR(255) NOT NULL,
  url           TEXT,
  storage_path  TEXT,
  status        video_status NOT NULL DEFAULT 'AGUARDANDO_APROVACAO',
  versao        INTEGER NOT NULL DEFAULT 1,
  criado_em     TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Feedbacks (histórico de reprovações e comentários)
CREATE TABLE IF NOT EXISTS feedbacks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id    UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  comentario  TEXT NOT NULL,
  tipo        VARCHAR(20) DEFAULT 'reprovacao',
  criado_em   TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: atualiza atualizado_em automaticamente
CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS videos_atualizado_em ON videos;
CREATE TRIGGER videos_atualizado_em
  BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

-- Índices
CREATE INDEX IF NOT EXISTS idx_videos_cliente_id   ON videos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_videos_status        ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_atualizado_em ON videos(atualizado_em);
CREATE INDEX IF NOT EXISTS idx_feedbacks_video_id   ON feedbacks(video_id);
