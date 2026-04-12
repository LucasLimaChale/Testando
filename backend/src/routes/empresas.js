const router = require('express').Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// ─── EMPRESAS ────────────────────────────────────────────────────────────────

// GET /empresas
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT e.*,
             COUNT(c.id)                                  AS total_colaboradores,
             COUNT(c.id) FILTER (WHERE c.ativo = TRUE)   AS colaboradores_ativos
      FROM empresas e
      LEFT JOIN colaboradores c ON c.empresa_id = e.id
      GROUP BY e.id
      ORDER BY e.nome ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /empresas
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { nome } = req.body;
  if (!nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO empresas (nome) VALUES ($1) RETURNING *',
      [nome.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /empresas/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.*,
              COUNT(c.id)                                 AS total_colaboradores,
              COUNT(c.id) FILTER (WHERE c.ativo = TRUE)  AS colaboradores_ativos
       FROM empresas e
       LEFT JOIN colaboradores c ON c.empresa_id = e.id
       WHERE e.id = $1
       GROUP BY e.id`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Empresa não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT /empresas/:id
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { nome } = req.body;
  if (!nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
  try {
    const { rows } = await pool.query(
      'UPDATE empresas SET nome = $1, atualizado_em = NOW() WHERE id = $2 RETURNING *',
      [nome.trim(), req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Empresa não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// DELETE /empresas/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM empresas WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─── COLABORADORES ───────────────────────────────────────────────────────────

// GET /empresas/:id/colaboradores
router.get('/:id/colaboradores', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, u.email
       FROM colaboradores c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.empresa_id = $1
       ORDER BY c.ativo DESC, c.nome ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /empresas/:id/colaboradores
router.post('/:id/colaboradores', authenticate, authorize('admin'), async (req, res) => {
  const { nome, telefone, cargo } = req.body;
  if (!nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
  try {
    const { rows: emp } = await pool.query(
      'SELECT id FROM empresas WHERE id = $1', [req.params.id]
    );
    if (!emp[0]) return res.status(404).json({ error: 'Empresa não encontrada' });

    const { rows } = await pool.query(
      `INSERT INTO colaboradores (empresa_id, nome, telefone, cargo)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, nome.trim(), telefone?.trim() || null, cargo?.trim() || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT /empresas/:empresaId/colaboradores/:id
router.put('/:empresaId/colaboradores/:id', authenticate, authorize('admin'), async (req, res) => {
  const { nome, telefone, cargo, ativo } = req.body;
  if (!nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
  try {
    const { rows } = await pool.query(
      `UPDATE colaboradores
         SET nome = $1, telefone = $2, cargo = $3, ativo = $4, atualizado_em = NOW()
       WHERE id = $5 AND empresa_id = $6
       RETURNING *`,
      [
        nome.trim(),
        telefone?.trim() || null,
        cargo?.trim()    || null,
        ativo !== false,
        req.params.id,
        req.params.empresaId,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Colaborador não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// DELETE /empresas/:empresaId/colaboradores/:id
router.delete('/:empresaId/colaboradores/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM colaboradores WHERE id = $1 AND empresa_id = $2',
      [req.params.id, req.params.empresaId]
    );
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
