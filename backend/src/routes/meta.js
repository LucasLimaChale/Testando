/**
 * /meta — Meta Ads integration (admin only)
 *
 * Conexões, Métricas, Alertas e Relatórios via Facebook Marketing API.
 */

const router = require('express').Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const ADMIN = [authenticate, authorize('admin')];

// ─── Facebook Marketing API helper ───────────────────────────────────────────

const FB_BASE = 'https://graph.facebook.com/v19.0';

async function fbGet(path, token, params = {}) {
  const qs = new URLSearchParams({ access_token: token, ...params }).toString();
  const res = await fetch(`${FB_BASE}${path}?${qs}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || 'Erro na API do Facebook');
  return json;
}

// ─── Conexões ────────────────────────────────────────────────────────────────

// GET /meta/connections
router.get('/connections', ...ADMIN, async (_req, res) => {
  const { rows } = await pool.query(
    'SELECT id, ad_account_id, account_name, currency, connected_at FROM meta_connections ORDER BY account_name ASC'
  );
  res.json(rows);
});

// POST /meta/connections/bm — conecta via Business Manager e importa TODAS as contas
router.post('/connections/bm', ...ADMIN, async (req, res) => {
  const { business_id, access_token } = req.body;
  if (!business_id || !access_token)
    return res.status(400).json({ error: 'business_id e access_token são obrigatórios' });

  try {
    // Valida token buscando info da BM
    const bmInfo = await fbGet(`/${business_id}`, access_token, { fields: 'name,id' });

    // Busca contas próprias
    let allAccounts = [];
    const owned = await fbGet(`/${business_id}/owned_ad_accounts`, access_token, {
      fields: 'name,currency,account_status',
      limit: 200,
    });
    if (owned.data) allAccounts = allAccounts.concat(owned.data);

    // Busca contas de clientes
    try {
      const client = await fbGet(`/${business_id}/client_ad_accounts`, access_token, {
        fields: 'name,currency,account_status',
        limit: 200,
      });
      if (client.data) allAccounts = allAccounts.concat(client.data);
    } catch (_) { /* BM pode não ter acesso a client accounts */ }

    if (!allAccounts.length)
      return res.status(400).json({ error: 'Nenhuma conta de anúncios encontrada nessa BM' });

    // Salva todas as contas com o mesmo token da BM
    const saved = [];
    for (const acc of allAccounts) {
      const accountId = acc.id.startsWith('act_') ? acc.id : `act_${acc.id}`;
      const { rows } = await pool.query(
        `INSERT INTO meta_connections (ad_account_id, access_token, account_name, currency)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (ad_account_id) DO UPDATE
           SET access_token = EXCLUDED.access_token,
               account_name = EXCLUDED.account_name,
               currency     = EXCLUDED.currency,
               connected_at = NOW()
         RETURNING id, ad_account_id, account_name, currency, connected_at`,
        [accountId, access_token, acc.name || accountId, acc.currency || 'BRL']
      );
      saved.push(rows[0]);
    }

    res.status(201).json({ bm_name: bmInfo.name, imported: saved.length, accounts: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /meta/connections — adiciona conta individual (mantido para compatibilidade)
router.post('/connections', ...ADMIN, async (req, res) => {
  const { ad_account_id, access_token } = req.body;
  if (!ad_account_id || !access_token)
    return res.status(400).json({ error: 'ad_account_id e access_token são obrigatórios' });

  const accountId = ad_account_id.startsWith('act_') ? ad_account_id : `act_${ad_account_id}`;

  try {
    const info = await fbGet(`/${accountId}`, access_token, { fields: 'name,currency' });
    const { rows } = await pool.query(
      `INSERT INTO meta_connections (ad_account_id, access_token, account_name, currency)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (ad_account_id) DO UPDATE
         SET access_token = EXCLUDED.access_token,
             account_name = EXCLUDED.account_name,
             currency     = EXCLUDED.currency,
             connected_at = NOW()
       RETURNING id, ad_account_id, account_name, currency, connected_at`,
      [accountId, access_token, info.name || accountId, info.currency || 'BRL']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /meta/connections/:id
router.delete('/connections/:id', ...ADMIN, async (req, res) => {
  await pool.query('DELETE FROM meta_connections WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

// DELETE /meta/connections — remove TODAS as contas
router.delete('/connections', ...ADMIN, async (_req, res) => {
  await pool.query('DELETE FROM meta_connections');
  res.status(204).end();
});

// ─── Métricas ────────────────────────────────────────────────────────────────

// GET /meta/metrics?account_id=act_xxx&since=YYYY-MM-DD&until=YYYY-MM-DD
router.get('/metrics', ...ADMIN, async (req, res) => {
  const { account_id, since, until } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id é obrigatório' });

  try {
    const { rows } = await pool.query(
      'SELECT access_token FROM meta_connections WHERE ad_account_id = $1',
      [account_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Conta não conectada' });

    const token = rows[0].access_token;
    const today = new Date().toISOString().split('T')[0];
    const sinceDate = since || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const untilDate = until || today;

    // Métricas gerais da conta
    const insights = await fbGet(`/${account_id}/insights`, token, {
      fields: 'spend,impressions,clicks,cpm,cpc,actions',
      time_range: JSON.stringify({ since: sinceDate, until: untilDate }),
      level: 'account',
    });

    // Saldo da conta
    const accountInfo = await fbGet(`/${account_id}`, token, {
      fields: 'name,balance,currency,spend_cap,amount_spent',
    });

    // Campanhas com métricas individuais
    const campaigns = await fbGet(`/${account_id}/campaigns`, token, {
      fields: 'name,status,daily_budget,lifetime_budget,insights{spend,impressions,clicks,cpm,cpc,actions}',
      time_range: JSON.stringify({ since: sinceDate, until: untilDate }),
      limit: 50,
    });

    const insightData = insights.data?.[0] || {};
    const leads = extractLeads(insightData.actions);

    res.json({
      period: { since: sinceDate, until: untilDate },
      account: {
        id: account_id,
        name: accountInfo.name,
        balance: parseFloat(accountInfo.balance || 0) / 100,
        currency: accountInfo.currency,
        amount_spent: parseFloat(accountInfo.amount_spent || 0) / 100,
      },
      summary: {
        spend: parseFloat(insightData.spend || 0),
        impressions: parseInt(insightData.impressions || 0),
        clicks: parseInt(insightData.clicks || 0),
        cpm: parseFloat(insightData.cpm || 0),
        cpc: parseFloat(insightData.cpc || 0),
        leads,
      },
      campaigns: (campaigns.data || []).map(c => {
        const ci = c.insights?.data?.[0] || {};
        return {
          id: c.id,
          name: c.name,
          status: c.status,
          daily_budget: c.daily_budget ? parseFloat(c.daily_budget) / 100 : null,
          lifetime_budget: c.lifetime_budget ? parseFloat(c.lifetime_budget) / 100 : null,
          spend: parseFloat(ci.spend || 0),
          impressions: parseInt(ci.impressions || 0),
          clicks: parseInt(ci.clicks || 0),
          cpm: parseFloat(ci.cpm || 0),
          cpc: parseFloat(ci.cpc || 0),
          leads: extractLeads(ci.actions),
        };
      }),
    });
  } catch (err) {
    console.error('[Meta Metrics]', err.message);
    res.status(500).json({ error: err.message });
  }
});

function extractLeads(actions = []) {
  if (!Array.isArray(actions)) return 0;
  const lead = actions.find(a => a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped');
  return lead ? parseInt(lead.value || 0) : 0;
}

// ─── Alertas ─────────────────────────────────────────────────────────────────

// GET /meta/alerts
router.get('/alerts', ...ADMIN, async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM meta_alerts ORDER BY created_at DESC');
  res.json(rows);
});

// POST /meta/alerts
router.post('/alerts', ...ADMIN, async (req, res) => {
  const { name, type, ad_account_id, min_balance, message_template, whatsapp_phone } = req.body;
  if (!name || !ad_account_id || !whatsapp_phone)
    return res.status(400).json({ error: 'name, ad_account_id e whatsapp_phone são obrigatórios' });

  const { rows } = await pool.query(
    `INSERT INTO meta_alerts (name, type, ad_account_id, min_balance, message_template, whatsapp_phone)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [name, type || 'saldo_minimo', ad_account_id, min_balance || 0,
     message_template || 'O saldo da conta <CA> está em <SALDO>', whatsapp_phone]
  );
  res.status(201).json(rows[0]);
});

// PATCH /meta/alerts/:id
router.patch('/alerts/:id', ...ADMIN, async (req, res) => {
  const allowed = ['name', 'type', 'ad_account_id', 'min_balance', 'message_template', 'whatsapp_phone', 'active'];
  const sets = [], vals = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      vals.push(req.body[key]);
      sets.push(`${key} = $${vals.length}`);
    }
  }
  if (!sets.length) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  vals.push(req.params.id);
  const { rows } = await pool.query(
    `UPDATE meta_alerts SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`,
    vals
  );
  if (!rows[0]) return res.status(404).json({ error: 'Alerta não encontrado' });
  res.json(rows[0]);
});

// DELETE /meta/alerts/:id
router.delete('/alerts/:id', ...ADMIN, async (req, res) => {
  await pool.query('DELETE FROM meta_alerts WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

// POST /meta/alerts/check — chamado pelo N8N periodicamente
router.post('/alerts/check', authenticate, async (_req, res) => {
  try {
    const { rows: alerts } = await pool.query(
      "SELECT * FROM meta_alerts WHERE active = TRUE AND type = 'saldo_minimo'"
    );

    const results = [];

    for (const alert of alerts) {
      try {
        const { rows: conn } = await pool.query(
          'SELECT access_token FROM meta_connections WHERE ad_account_id = $1',
          [alert.ad_account_id]
        );
        if (!conn[0]) continue;

        const info = await fbGet(`/${alert.ad_account_id}`, conn[0].access_token, {
          fields: 'name,balance,currency',
        });
        const balance = parseFloat(info.balance || 0) / 100;

        // Atualiza last_balance sempre
        await pool.query('UPDATE meta_alerts SET last_balance = $1 WHERE id = $2', [balance, alert.id]);

        if (balance <= alert.min_balance) {
          // Envia alerta via uazapi
          const msg = alert.message_template
            .replace('<CA>', info.name || alert.ad_account_id)
            .replace('<SALDO>', `R$ ${balance.toFixed(2)}`)
            .replace('<TARGET>', `R$ ${parseFloat(alert.min_balance).toFixed(2)}`);

          await sendWhatsApp(alert.whatsapp_phone, msg);
          await pool.query(
            'UPDATE meta_alerts SET last_triggered_at = NOW() WHERE id = $1',
            [alert.id]
          );
          results.push({ alert_id: alert.id, name: alert.name, triggered: true, balance });
        } else {
          results.push({ alert_id: alert.id, name: alert.name, triggered: false, balance });
        }
      } catch (err) {
        results.push({ alert_id: alert.id, name: alert.name, error: err.message });
      }
    }

    res.json({ checked: results.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Relatórios ──────────────────────────────────────────────────────────────

// GET /meta/reports
router.get('/reports', ...ADMIN, async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM meta_reports ORDER BY created_at DESC');
  res.json(rows);
});

// POST /meta/reports
router.post('/reports', ...ADMIN, async (req, res) => {
  const { name, ad_account_id, frequency, period_days, whatsapp_phone } = req.body;
  if (!name || !ad_account_id || !whatsapp_phone)
    return res.status(400).json({ error: 'name, ad_account_id e whatsapp_phone são obrigatórios' });

  const { rows } = await pool.query(
    `INSERT INTO meta_reports (name, ad_account_id, frequency, period_days, whatsapp_phone)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, ad_account_id, frequency || 'diario', period_days || 7, whatsapp_phone]
  );
  res.status(201).json(rows[0]);
});

// PATCH /meta/reports/:id
router.patch('/reports/:id', ...ADMIN, async (req, res) => {
  const allowed = ['name', 'ad_account_id', 'frequency', 'period_days', 'whatsapp_phone', 'active'];
  const sets = [], vals = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      vals.push(req.body[key]);
      sets.push(`${key} = $${vals.length}`);
    }
  }
  if (!sets.length) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  vals.push(req.params.id);
  const { rows } = await pool.query(
    `UPDATE meta_reports SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`,
    vals
  );
  if (!rows[0]) return res.status(404).json({ error: 'Relatório não encontrado' });
  res.json(rows[0]);
});

// DELETE /meta/reports/:id
router.delete('/reports/:id', ...ADMIN, async (req, res) => {
  await pool.query('DELETE FROM meta_reports WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

// POST /meta/reports/:id/send — envia relatório agora
router.post('/reports/:id/send', ...ADMIN, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM meta_reports WHERE id = $1', [req.params.id]);
    const report = rows[0];
    if (!report) return res.status(404).json({ error: 'Relatório não encontrado' });

    const { rows: conn } = await pool.query(
      'SELECT access_token, account_name FROM meta_connections WHERE ad_account_id = $1',
      [report.ad_account_id]
    );
    if (!conn[0]) return res.status(400).json({ error: 'Conta Meta Ads não conectada' });

    const until = new Date().toISOString().split('T')[0];
    const since = new Date(Date.now() - report.period_days * 86400000).toISOString().split('T')[0];

    const insights = await fbGet(`/${report.ad_account_id}/insights`, conn[0].access_token, {
      fields: 'spend,impressions,clicks,cpm,cpc,actions',
      time_range: JSON.stringify({ since, until }),
      level: 'account',
    });

    const d = insights.data?.[0] || {};
    const leads = extractLeads(d.actions);

    const msg =
      `📊 *${report.name}*\n` +
      `Período: ${since} a ${until}\n\n` +
      `💰 Investimento: R$ ${parseFloat(d.spend || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `👁 Impressões: ${parseInt(d.impressions || 0).toLocaleString('pt-BR')}\n` +
      `🖱 Cliques: ${parseInt(d.clicks || 0).toLocaleString('pt-BR')}\n` +
      `💵 CPM: R$ ${parseFloat(d.cpm || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `💵 CPC: R$ ${parseFloat(d.cpc || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `🎯 Leads: ${leads}\n\n` +
      `_Enviado pelo VideoFlow_`;

    await sendWhatsApp(report.whatsapp_phone, msg);
    await pool.query('UPDATE meta_reports SET last_sent_at = NOW() WHERE id = $1', [report.id]);

    res.json({ sent: true, to: report.whatsapp_phone });
  } catch (err) {
    console.error('[Meta Report Send]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── WhatsApp helper via uazapi ───────────────────────────────────────────────

async function sendWhatsApp(phone, message) {
  const baseUrl = process.env.UAZAPI_BASE_URL;
  const token   = process.env.UAZAPI_META_TOKEN || process.env.UAZAPI_TOKEN;
  const instance = process.env.UAZAPI_META_INSTANCE || process.env.UAZAPI_INSTANCE;

  if (!baseUrl || !token || !instance) {
    console.warn('[Meta WA] uazapi não configurado — mensagem não enviada:', message);
    return;
  }

  const cleanPhone = phone.replace(/\D/g, '');
  const jid = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;

  await fetch(`${baseUrl}/message/sendText/${instance}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', token },
    body: JSON.stringify({ number: jid, text: message }),
  });
}

module.exports = router;
