const router = require('express').Router();
const { randomUUID } = require('crypto');
const pool = require('../config/database');
const supabase = require('../config/supabase');
const { authenticate, authorize } = require('../middleware/auth');

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'videos';

// GET /videos
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, cliente_id } = req.query;
    const params = [];
    let where = 'WHERE 1=1';

    let query;
    if (req.user.tipo === 'cliente') {
      query = `
        SELECT v.*, c.nome AS cliente_nome
        FROM videos v
        JOIN clientes c ON v.cliente_id = c.id
        WHERE c.user_id = $1
      `;
      params.push(req.user.id);
      if (status) { params.push(status); where += ` AND v.status = $${params.length}`; }
      query += where.replace('WHERE 1=1', '');
    } else {
      query = `
        SELECT v.*, c.nome AS cliente_nome, u.nome AS editor_nome
        FROM videos v
        JOIN clientes c ON v.cliente_id = c.id
        LEFT JOIN users u ON v.editor_id = u.id
        WHERE 1=1
      `;
      if (cliente_id) { params.push(cliente_id); query += ` AND v.cliente_id = $${params.length}`; }
      if (status)     { params.push(status);     query += ` AND v.status = $${params.length}`; }
    }

    query += ' ORDER BY v.criado_em DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /videos/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT v.*, c.nome AS cliente_nome, u.nome AS editor_nome,
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

// POST /videos/upload-url — gera URL assinada para upload direto no Supabase Storage
router.post('/upload-url', authenticate, authorize('admin', 'editor'), async (req, res) => {
  const { filename, contentType } = req.body;
  if (!filename || !contentType) {
    return res.status(400).json({ error: 'filename e contentType são obrigatórios' });
  }
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
    console.error(err);
    res.status(500).json({ error: 'Erro ao gerar URL de upload: ' + err.message });
  }
});

// POST /videos — cria registro após upload
router.post('/', authenticate, authorize('admin', 'editor'), async (req, res) => {
  const { cliente_id, titulo, url, storage_path } = req.body;
  if (!cliente_id || !titulo) {
    return res.status(400).json({ error: 'cliente_id e titulo são obrigatórios' });
  }
  try {
    const { rows } = await pool.query(`
      INSERT INTO videos (cliente_id, editor_id, titulo, url, storage_path, status, versao)
      VALUES ($1, $2, $3, $4, $5, 'AGUARDANDO_APROVACAO', 1)
      RETURNING *
    `, [cliente_id, req.user.id, titulo, url || null, storage_path || null]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PATCH /videos/:id/approve
router.patch('/:id/approve', authenticate, async (req, res) => {
  if (!['cliente', 'admin'].includes(req.user.tipo)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
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
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PATCH /videos/:id/reject
router.patch('/:id/reject', authenticate, async (req, res) => {
  if (!['cliente', 'admin'].includes(req.user.tipo)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  const { comentario } = req.body;
  if (!comentario?.trim()) {
    return res.status(400).json({ error: 'Comentário é obrigatório para reprovar' });
  }
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
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PATCH /videos/:id/publish (admin)
router.patch('/:id/publish', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      "UPDATE videos SET status = 'PUBLICADO' WHERE id = $1 AND status = 'APROVADO' RETURNING *",
      [req.params.id]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'Vídeo não encontrado ou não está aprovado' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /videos/:id/revision (nova versão)
router.post('/:id/revision', authenticate, authorize('admin', 'editor'), async (req, res) => {
  const { url, storage_path, titulo } = req.body;
  try {
    const { rows: vr } = await pool.query('SELECT * FROM videos WHERE id = $1', [req.params.id]);
    if (!vr[0]) return res.status(404).json({ error: 'Vídeo não encontrado' });
    const original = vr[0];

    const { rows } = await pool.query(`
      INSERT INTO videos (cliente_id, editor_id, titulo, url, storage_path, status, versao)
      VALUES ($1, $2, $3, $4, $5, 'AGUARDANDO_APROVACAO', $6)
      RETURNING *
    `, [
      original.cliente_id,
      req.user.id,
      titulo || original.titulo,
      url || null,
      storage_path || null,
      original.versao + 1,
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// DELETE /videos/:id (admin)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT storage_path FROM videos WHERE id = $1',
      [req.params.id]
    );
    if (rows[0]?.storage_path) {
      await supabase.storage.from(BUCKET).remove([rows[0].storage_path]);
    }
    await pool.query('DELETE FROM videos WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─── Helper ─────────────────────────────────────────────────────────────────

function triggerWebhook(url, payload) {
  if (!url) return;
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(err => console.error('[Webhook] Erro ao chamar', url, err.message));
}

module.exports = router;
