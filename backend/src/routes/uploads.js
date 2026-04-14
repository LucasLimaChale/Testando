/**
 * /uploads — Links de envio de arquivos para clientes + anexos dos afazeres
 */

const router = require('express').Router();
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const ADMIN   = [authenticate, authorize('admin')];
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

function supabaseClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

async function uploadToSupabase(buffer, mimetype, folder) {
  const sb = supabaseClient();
  const ext = mimetype.split('/')[1]?.replace('jpeg', 'jpg') || 'bin';
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await sb.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET)
    .upload(key, buffer, { contentType: mimetype, upsert: false });

  if (error) throw new Error(error.message);

  const { data } = sb.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET)
    .getPublicUrl(key);

  return { url: data.publicUrl, key };
}

// ─── Admin: listar todos os links ────────────────────────────────────────────

router.get('/', ...ADMIN, async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT ur.id, ur.token, ur.label, ur.created_at,
             u.nome AS criado_por,
             COUNT(uf.id)::int AS total_arquivos
      FROM upload_requests ur
      LEFT JOIN users u ON u.id = ur.created_by
      LEFT JOIN upload_files uf ON uf.request_id = ur.id
      GROUP BY ur.id, u.nome
      ORDER BY ur.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: criar link ───────────────────────────────────────────────────────

router.post('/', ...ADMIN, async (req, res) => {
  const { label } = req.body;
  if (!label?.trim()) return res.status(400).json({ error: 'label obrigatório' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO upload_requests (label, created_by) VALUES ($1, $2) RETURNING *`,
      [label.trim(), req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: deletar link ─────────────────────────────────────────────────────

router.delete('/:id', ...ADMIN, async (req, res) => {
  try {
    await pool.query('DELETE FROM upload_requests WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: listar arquivos de um link ───────────────────────────────────────

router.get('/:id/files', ...ADMIN, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM upload_files WHERE request_id = $1 ORDER BY uploaded_at DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Público: info do link por token ─────────────────────────────────────────

router.get('/public/:token', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, label, created_at FROM upload_requests WHERE token = $1',
      [req.params.token]
    );
    if (!rows.length) return res.status(404).json({ error: 'Link não encontrado ou expirado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Público: cliente envia arquivos via token ────────────────────────────────

router.post('/public/:token', upload.array('files', 20), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id FROM upload_requests WHERE token = $1',
      [req.params.token]
    );
    if (!rows.length) return res.status(404).json({ error: 'Link não encontrado ou expirado' });

    const requestId = rows[0].id;
    const message = req.body?.message || null;
    const results = [];

    for (const file of (req.files || [])) {
      const { url } = await uploadToSupabase(file.buffer, file.mimetype, `envios/${requestId}`);
      const { rows: r } = await pool.query(
        `INSERT INTO upload_files (request_id, original_name, url, message) VALUES ($1, $2, $3, $4) RETURNING *`,
        [requestId, file.originalname, url, message]
      );
      results.push(r[0]);
    }

    res.status(201).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Autenticado: upload de imagem para afazeres ──────────────────────────────

router.post('/file', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'arquivo obrigatório' });
    const { url } = await uploadToSupabase(req.file.buffer, req.file.mimetype, 'afazeres');
    res.json({ url, name: req.file.originalname });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
