-- ─── MIGRAÇÃO V3: Empresas + Colaboradores ───────────────────────────────────
-- Substitui a estrutura plana de "clientes" por Empresa → Colaboradores

-- 1. Tabela de empresas
CREATE TABLE IF NOT EXISTS empresas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          VARCHAR(255) NOT NULL,
  criado_em     TIMESTAMPTZ  DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ  DEFAULT NOW()
);

-- 2. Tabela de colaboradores
CREATE TABLE IF NOT EXISTS colaboradores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID         NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  user_id       UUID         REFERENCES users(id) ON DELETE SET NULL,
  nome          VARCHAR(255) NOT NULL,
  telefone      VARCHAR(30),
  cargo         VARCHAR(100),
  ativo         BOOLEAN      NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ  DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ  DEFAULT NOW()
);

-- 3. Migrar clientes existentes → empresas + colaboradores
--    Cada cliente com empresa=X vira colaborador dentro da empresa X
--    Clientes sem empresa ficam numa empresa com o próprio nome
DO $$
DECLARE
  cli      RECORD;
  emp_id   UUID;
  emp_nome TEXT;
BEGIN
  FOR cli IN SELECT * FROM clientes ORDER BY criado_em LOOP
    emp_nome := COALESCE(NULLIF(TRIM(cli.empresa), ''), cli.nome);

    SELECT id INTO emp_id
    FROM empresas
    WHERE LOWER(nome) = LOWER(emp_nome)
    LIMIT 1;

    IF emp_id IS NULL THEN
      INSERT INTO empresas (nome) VALUES (emp_nome) RETURNING id INTO emp_id;
    END IF;

    -- Preservar o mesmo UUID do cliente → FKs de vídeos continuam funcionando
    INSERT INTO colaboradores (id, empresa_id, user_id, nome, telefone, criado_em)
    VALUES (cli.id, emp_id, cli.user_id, cli.nome, cli.telefone, cli.criado_em)
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

-- 4. Adicionar colaborador_id em videos
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS colaborador_id UUID
  REFERENCES colaboradores(id) ON DELETE SET NULL;

-- 5. cliente_id passa a ser nullable (novos vídeos só usarão colaborador_id)
ALTER TABLE videos ALTER COLUMN cliente_id DROP NOT NULL;

-- 6. Retroalimentar colaborador_id = cliente_id (UUIDs preservados)
UPDATE videos
SET colaborador_id = cliente_id
WHERE colaborador_id IS NULL
  AND cliente_id IS NOT NULL;

-- 7. Índices
CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa_id ON colaboradores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_user_id    ON colaboradores(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_colaborador_id    ON videos(colaborador_id);
