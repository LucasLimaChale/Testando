const router = require('express').Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /clients
router.get('/', authenticate, async (req, res) => {
  try {
    let query, params;
    if (req.user.tipo === 'admin' || req.user.tipo === 'editor') {
      query = `
        SELECT c.*, u.email
        FROM clientes c
        LEFT JOIN users u ON c.user_id = u.id
        ORDER BY c.criado_em DESC
      `;
      params = [];
    } else {
      query = `
        SELECT c.*, u.email
        FROM clientes c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.user_id = $1
      `;
      params = [req.user.id];
    }
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /clients/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, u.email FROM clientes c LEFT JOIN users u ON c.user_id = u.id WHERE c.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /clients (admin)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { nome, telefone, user_id } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO clientes (nome, telefone, user_id) VALUES ($1, $2, $3) RETURNING *`,
      [nome, telefone || null, user_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT /clients/:id (admin)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { nome, telefone, user_id } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE clientes SET nome = $1, telefone = $2, user_id = $3 WHERE id = $4 RETURNING *`,
      [nome, telefone || null, user_id || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// DELETE /clients/:id (admin)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM clientes WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
