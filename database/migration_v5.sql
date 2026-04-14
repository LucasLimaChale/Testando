-- ─── MIGRAÇÃO V5: Meta Ads — Conexões, Alertas e Relatórios ─────────────────

-- 1. Conexões Meta Ads
CREATE TABLE IF NOT EXISTS meta_connections (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_account_id TEXT NOT NULL UNIQUE,
  access_token  TEXT NOT NULL,
  account_name  TEXT,
  currency      TEXT DEFAULT 'BRL',
  connected_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Alertas
CREATE TABLE IF NOT EXISTS meta_alerts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  type             TEXT NOT NULL DEFAULT 'saldo_minimo' CHECK (type IN ('saldo_minimo', 'erro_conta')),
  ad_account_id    TEXT NOT NULL,
  min_balance      NUMERIC(12,2) NOT NULL DEFAULT 0,
  message_template TEXT NOT NULL DEFAULT 'O saldo da conta <CA> está em <SALDO>',
  whatsapp_phone   TEXT NOT NULL,
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  last_balance     NUMERIC(12,2),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Relatórios agendados
CREATE TABLE IF NOT EXISTS meta_reports (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  ad_account_id  TEXT NOT NULL,
  frequency      TEXT NOT NULL DEFAULT 'diario' CHECK (frequency IN ('diario', 'semanal')),
  period_days    INTEGER NOT NULL DEFAULT 7,
  whatsapp_phone TEXT NOT NULL,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  last_sent_at   TIMESTAMPTZ,
  next_send_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Trigger updated_at para novas tabelas
CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS meta_alerts_updated_at ON meta_alerts;
CREATE TRIGGER meta_alerts_updated_at BEFORE UPDATE ON meta_alerts
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

DROP TRIGGER IF EXISTS meta_reports_updated_at ON meta_reports;
CREATE TRIGGER meta_reports_updated_at BEFORE UPDATE ON meta_reports
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

-- 5. Config para uazapi (envio WhatsApp dos alertas/relatórios)
--    Use a mesma tabela de settings existente se existir, senão ignora
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_settings') THEN
    INSERT INTO app_settings (key, value, description) VALUES
      ('meta_uazapi_instance',   '', 'Nome da instância uazapi para envio de alertas Meta Ads'),
      ('meta_uazapi_token',      '', 'Token da instância uazapi para envio de alertas Meta Ads')
    ON CONFLICT (key) DO NOTHING;
  END IF;
END $$;
