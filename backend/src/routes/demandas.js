const router  = require('express').Router();
const multer  = require('multer');
const { createClient } = require('@supabase/supabase-js');
const pool    = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const ADMIN  = [authenticate, authorize('admin')];
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

function sb() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

async function uploadFile(buffer, mimetype, folder) {
  const client = sb();
  const ext = mimetype.split('/')[1]?.replace('jpeg','jpg') || 'bin';
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await client.storage.from(process.env.SUPABASE_STORAGE_BUCKET).upload(key, buffer, { contentType: mimetype, upsert: false });
  if (error) throw new Error(error.message);
  const { data } = client.storage.from(process.env.SUPABASE_STORAGE_BUCKET).getPublicUrl(key);
  return data.publicUrl;
}

// ─── Admin: links ─────────────────────────────────────────────────────────────

router.get('/links', ...ADMIN, async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT dl.*, u.nome AS criado_por,
           COUNT(ds.id)::int AS total_demandas,
           COUNT(ds.id) FILTER (WHERE ds.status='NOVO')::int AS novas
    FROM demanda_links dl
    LEFT JOIN users u ON u.id = dl.created_by
    LEFT JOIN demanda_submissions ds ON ds.link_id = dl.id
    GROUP BY dl.id, u.nome ORDER BY dl.created_at DESC
  `);
  res.json(rows);
});

router.post('/links', ...ADMIN, async (req, res) => {
  const { label } = req.body;
  if (!label?.trim()) return res.status(400).json({ error: 'label obrigatório' });
  const { rows } = await pool.query(
    'INSERT INTO demanda_links (label, created_by) VALUES ($1,$2) RETURNING *',
    [label.trim(), req.user.id]
  );
  res.status(201).json(rows[0]);
});

router.delete('/links/:id', ...ADMIN, async (req, res) => {
  await pool.query('DELETE FROM demanda_links WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

// ─── Admin: kanban ────────────────────────────────────────────────────────────

router.get('/', ...ADMIN, async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT ds.*, dl.label AS link_label,
           json_agg(json_build_object('id',df.id,'url',df.url,'original_name',df.original_name,'file_type',df.file_type) ORDER BY df.id) FILTER (WHERE df.id IS NOT NULL) AS files
    FROM demanda_submissions ds
    JOIN demanda_links dl ON dl.id = ds.link_id
    LEFT JOIN demanda_files df ON df.submission_id = ds.id
    GROUP BY ds.id, dl.label ORDER BY ds.created_at DESC
  `);
  res.json(rows);
});

router.patch('/:id', ...ADMIN, async (req, res) => {
  const { status } = req.body;
  const { rows } = await pool.query(
    'UPDATE demanda_submissions SET status=$1 WHERE id=$2 RETURNING *',
    [status, req.params.id]
  );
  res.json(rows[0]);
});

router.delete('/:id', ...ADMIN, async (req, res) => {
  await pool.query('DELETE FROM demanda_submissions WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

// ─── Público: info do link ────────────────────────────────────────────────────

router.get('/public/:token', async (req, res) => {
  const { rows } = await pool.query('SELECT id, label FROM demanda_links WHERE token=$1', [req.params.token]);
  if (!rows.length) return res.status(404).json({ error: 'Link não encontrado' });
  res.json(rows[0]);
});

// ─── Público: corretor envia demanda ─────────────────────────────────────────

router.post('/public/:token', upload.array('files', 30), async (req, res) => {
  const { rows } = await pool.query('SELECT id FROM demanda_links WHERE token=$1', [req.params.token]);
  if (!rows.length) return res.status(404).json({ error: 'Link não encontrado' });

  const linkId     = rows[0].id;
  const senderName = req.body?.sender_name?.trim() || 'Anônimo';
  const message    = req.body?.message?.trim() || null;

  const { rows: sub } = await pool.query(
    'INSERT INTO demanda_submissions (link_id, sender_name, message) VALUES ($1,$2,$3) RETURNING *',
    [linkId, senderName, message]
  );
  const subId = sub[0].id;

  const files = [];
  for (const file of (req.files || [])) {
    const fileType = file.mimetype.startsWith('video/') ? 'video' : 'image';
    const url = await uploadFile(file.buffer, file.mimetype, `demandas/${subId}`);
    const { rows: f } = await pool.query(
      'INSERT INTO demanda_files (submission_id, original_name, url, file_type) VALUES ($1,$2,$3,$4) RETURNING *',
      [subId, file.originalname, url, fileType]
    );
    files.push(f[0]);
  }

  res.status(201).json({ ...sub[0], files });
});

// ─── Tarefas pessoais ────────────────────────────────────────────────────────

router.get('/tarefas', ...ADMIN, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM tarefas WHERE user_id=$1 ORDER BY done ASC, created_at DESC',
    [req.user.id]
  );
  res.json(rows);
});

router.post('/tarefas', ...ADMIN, async (req, res) => {
  const { titulo, descricao } = req.body;
  if (!titulo?.trim()) return res.status(400).json({ error: 'titulo obrigatório' });
  const { rows } = await pool.query(
    'INSERT INTO tarefas (user_id, titulo, descricao) VALUES ($1,$2,$3) RETURNING *',
    [req.user.id, titulo.trim(), descricao?.trim() || null]
  );
  res.status(201).json(rows[0]);
});

router.patch('/tarefas/:id', ...ADMIN, async (req, res) => {
  const { done, descricao } = req.body;
  let rows;
  if (done !== undefined) {
    ({ rows } = await pool.query(
      'UPDATE tarefas SET done=$1 WHERE id=$2 AND user_id=$3 RETURNING *',
      [done, req.params.id, req.user.id]
    ));
  } else {
    ({ rows } = await pool.query(
      'UPDATE tarefas SET descricao=$1 WHERE id=$2 AND user_id=$3 RETURNING *',
      [descricao ?? null, req.params.id, req.user.id]
    ));
  }
  res.json(rows[0]);
});

router.delete('/tarefas/:id', ...ADMIN, async (req, res) => {
  await pool.query('DELETE FROM tarefas WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.status(204).end();
});

module.exports = router;
