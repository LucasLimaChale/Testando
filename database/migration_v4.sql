-- ─── MIGRAÇÃO V4: Timestamps de Upload, Aprovação e Reprovação ──────────────

-- 1. Adicionar colunas de timestamp
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS upload_em     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS aprovado_em   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reprovado_em  TIMESTAMPTZ;

-- 2. Retroalimentar upload_em com criado_em para vídeos existentes
UPDATE videos
SET upload_em = criado_em
WHERE upload_em IS NULL;

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_videos_upload_em    ON videos(upload_em);
CREATE INDEX IF NOT EXISTS idx_videos_aprovado_em  ON videos(aprovado_em);
CREATE INDEX IF NOT EXISTS idx_videos_reprovado_em ON videos(reprovado_em);
