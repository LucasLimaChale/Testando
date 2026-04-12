const router = require('express').Router();
const { randomUUID } = require('crypto');
const pool = require('../config/database');
const supabase = require('../config/supabase');
const { authenticate, authorize } = require('../middleware/auth');

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'videos';

const VALID_STATUSES = ['LISTA', 'EM_EDICAO', 'AGUARDANDO_APROVACAO', 'REPROVADO', 'APROVADO', 'PUBLICADO'];

// GET /videos
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, cliente_id, q } = req.query;
    const params = [];
    const conditions = [];

    let base = `
      SELECT v.*, c.nome AS cliente_nome, c.telefone AS cliente_telefone,
             u.nome AS editor_nome
      FROM videos v
      JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN users u ON v.editor_id = u.id
    `;

    if (req.user.tipo === 'cliente') {
      params.push(req.user.id);
      conditions.push(`c.user_id = $${params.length}`);
    }
    if (status)     { params.push(status);     conditions.push(`v.status = $${params.length}`); }
    if (cliente_id) { params.push(cliente_id); conditions.push(`v.cliente_id = $${params.length}`); }
    if (q)          { params.push(`%${q}%`);   conditions.push(`v.titulo ILIKE $${params.length}`); }

    if (conditions.length) base += ' WHERE ' + conditions.join(' AND ');
    base += ' ORDER BY v.atualizado_em DESC';

    const { rows } = await pool.query(base, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /videos/urgent  — aprovados há mais de 2 dias sem publicar
router.get('/urgent', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT v.*, c.nome AS cliente_nome, c.telefone AS cliente_telefone
      FROM videos v
      JOIN clientes c ON v.cliente_id = c.id
      WHERE v.status = 'APROVADO'
        AND v.atualizado_em < NOW() - INTERVAL '2 days'
      ORDER BY v.atualizado_em ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /videos/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT v.*, c.nome AS cliente_nome, c.telefone AS cliente_telefone,
             u.nome AS editor_nome,
        (SELECT json_agg(f ORDER BY f.criado_em DESC)
         FROM feedbacks f WHERE f.video_id = v.id) AS feedbacks
      FROM videos v
      JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN users u ON v.editor_id = u.id
      WHERE v.id = $1
    `, [req.params.id]);

    const video = rows[0];
    if (!video) return res.status(404).json({ error: 'Vídeo não encontrado' });

    if (req.user.tipo === 'cliente') {
      const { rows: check } = await pool.query(
        'SELECT id FROM clientes WHERE id = $1 AND user_id = $2',
        [video.cliente_id, req.user.id]
      );
      if (!check[0]) return res.status(403).json({ error: 'Acesso negado' });
    }

    res.json(video);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /videos/upload-url
router.post('/upload-url', authenticate, authorize('admin', 'editor'), async (req, res) => {
  const { filename, contentType } = req.body;
  if (!filename || !contentType)
    return res.status(400).json({ error: 'filename e contentType são obrigatórios' });

  const ext = filename.split('.').pop().toLowerCase();
  const storagePath = `${randomUUID()}.${ext}`;

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(storagePath);
    if (error) throw error;
    const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
    res.json({ signedUrl: data.signedUrl, storagePath, publicUrl });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar URL de upload: ' + err.message });
  }
});

// POST /videos
router.post('/', authenticate, authorize('admin', 'editor'), async (req, res) => {
  const { cliente_id, titulo, url, storage_path, status } = req.body;
  if (!cliente_id || !titulo)
    return res.status(400).json({ error: 'cliente_id e titulo são obrigatórios' });

  const initialStatus = status && VALID_STATUSES.includes(status) ? status : 'AGUARDANDO_APROVACAO';

  try {
    const { rows } = await pool.query(`
      INSERT INTO videos (cliente_id, editor_id, titulo, url, storage_path, status, versao)
      VALUES ($1, $2, $3, $4, $5, $6, 1)
      RETURNING *
    `, [cliente_id, req.user.id, titulo, url || null, storage_path || null, initialStatus]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PATCH /videos/:id/status  — Kanban drag-and-drop
router.patch('/:id/status', authenticate, authorize('admin', 'editor'), async (req, res) => {
  const { status } = req.body;
  if (!status || !VALID_STATUSES.includes(status))
    return res.status(400).json({ error: 'Status inválido' });
  try {
    const { rows } = await pool.query(
      'UPDATE videos SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Vídeo não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PATCH /videos/:id/approve
router.patch('/:id/approve', authenticate, async (req, res) => {
  if (!['cliente', 'admin'].includes(req.user.tipo))
    return res.status(403).json({ error: 'Acesso negado' });
  try {
    const { rows: vr } = await pool.query('SELECT * FROM videos WHERE id = $1', [req.params.id]);
    if (!vr[0]) return res.status(404).json({ error: 'Vídeo não encontrado' });

    if (req.user.tipo === 'cliente') {
      const { rows } = await pool.query(
        'SELECT id FROM clientes WHERE id = $1 AND user_id = $2',
        [vr[0].cliente_id, req.user.id]
      );
      if (!rows[0]) return res.status(403).json({ error: 'Acesso negado' });
    }

    const { rows } = await pool.query(
      "UPDATE videos SET status = 'APROVADO' WHERE id = $1 RETURNING *",
      [req.params.id]
    );

    triggerWebhook(process.env.N8N_WEBHOOK_APROVADO, {
      evento: 'video_aprovado',
      video: rows[0],
      aprovado_por: { id: req.user.id, nome: req.user.nome, tipo: req.user.tipo },
    });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PATCH /videos/:id/reject
router.patch('/:id/reject', authenticate, async (req, res) => {
  if (!['cliente', 'admin'].includes(req.user.tipo))
    return res.status(403).json({ error: 'Acesso negado' });
  const { comentario } = req.body;
  if (!comentario?.trim())
    return res.status(400).json({ error: 'Comentário é obrigatório para reprovar' });

  try {
    const { rows: vr } = await pool.query('SELECT * FROM videos WHERE id = $1', [req.params.id]);
    if (!vr[0]) return res.status(404).json({ error: 'Vídeo não encontrado' });

    if (req.user.tipo === 'cliente') {
      const { rows } = await pool.query(
        'SELECT id FROM clientes WHERE id = $1 AND user_id = $2',
        [vr[0].cliente_id, req.user.id]
      );
      if (!rows[0]) return res.status(403).json({ error: 'Acesso negado' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        "UPDATE videos SET status = 'REPROVADO' WHERE id = $1 RETURNING *",
        [req.params.id]
      );
      await client.query(
        'INSERT INTO feedbacks (video_id, user_id, comentario, tipo) VALUES ($1, $2, $3, $4)',
        [req.params.id, req.user.id, comentario.trim(), 'reprovacao']
      );
      await client.query('COMMIT');

      triggerWebhook(process.env.N8N_WEBHOOK_REPROVADO, {
        evento: 'video_reprovado',
        video: rows[0],
        reprovado_por: { id: req.user.id, nome: req.user.nome, tipo: req.user.tipo },
        comentario: comentario.trim(),
      });

      res.json(rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PATCH /videos/:id/publish
router.patch('/:id/publish', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      "UPDATE videos SET status = 'PUBLICADO' WHERE id = $1 AND status = 'APROVADO' RETURNING *",
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Vídeo não encontrado ou não está aprovado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /videos/:id/revision
router.post('/:id/revision', authenticate, authorize('admin', 'editor'), async (req, res) => {
  const { url, storage_path, titulo } = req.body;
  try {
    const { rows: vr } = await pool.query('SELECT * FROM videos WHERE id = $1', [req.params.id]);
    if (!vr[0]) return res.status(404).json({ error: 'Vídeo não encontrado' });
    const orig = vr[0];

    const { rows } = await pool.query(`
      INSERT INTO videos (cliente_id, editor_id, titulo, url, storage_path, status, versao)
      VALUES ($1, $2, $3, $4, $5, 'AGUARDANDO_APROVACAO', $6)
      RETURNING *
    `, [orig.cliente_id, req.user.id, titulo || orig.titulo, url || null, storage_path || null, orig.versao + 1]);

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// DELETE /videos/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT storage_path FROM videos WHERE id = $1', [req.params.id]);
    if (rows[0]?.storage_path) {
      await supabase.storage.from(BUCKET).remove([rows[0].storage_path]);
    }
    await pool.query('DELETE FROM videos WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

function triggerWebhook(url, payload) {
  if (!url) return;
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(err => console.error('[Webhook]', url, err.message));
}

module.exports = router;
