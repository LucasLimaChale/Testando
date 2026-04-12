const router = require('express').Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /clients
router.get('/', authenticate, async (req, res) => {
  const { q } = req.query;
  try {
    const params = [];
    let where = '';

    if (req.user.tipo === 'cliente') {
      params.push(req.user.id);
      where = 'WHERE c.user_id = $1';
    } else if (q) {
      params.push(`%${q}%`);
      where = `WHERE c.nome ILIKE $1`;
    }

    const { rows } = await pool.query(
      `SELECT c.*, u.email
       FROM clientes c
       LEFT JOIN users u ON c.user_id = u.id
       ${where}
       ORDER BY c.nome ASC`,
      params
    );
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

// POST /clients
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { nome, telefone, empresa, user_id } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO clientes (nome, telefone, empresa, user_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nome, telefone || null, empresa || null, user_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT /clients/:id
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { nome, telefone, empresa, user_id } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE clientes SET nome=$1, telefone=$2, empresa=$3, user_id=$4
       WHERE id=$5 RETURNING *`,
      [nome, telefone || null, empresa || null, user_id || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// DELETE /clients/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM clientes WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
