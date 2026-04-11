const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [
      email.toLowerCase().trim(),
    ]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(senha, user.senha))) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, tipo: user.tipo, nome: user.nome },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: { id: user.id, nome: user.nome, email: user.email, tipo: user.tipo },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nome, email, tipo, criado_em FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /auth/users (admin)
router.get('/users', authenticate, async (req, res) => {
  if (req.user.tipo !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  try {
    const { rows } = await pool.query(
      'SELECT id, nome, email, tipo, criado_em FROM users ORDER BY criado_em DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /auth/users (admin)
router.post('/users', authenticate, async (req, res) => {
  if (req.user.tipo !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const { nome, email, senha, tipo } = req.body;
  if (!nome || !email || !senha || !tipo) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }
  try {
    const hash = await bcrypt.hash(senha, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (nome, email, senha, tipo)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nome, email, tipo`,
      [nome, email.toLowerCase().trim(), hash, tipo]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email já cadastrado' });
    res.status(500).json({ error: 'Erro interno' });
  }
});

// DELETE /auth/users/:id (admin)
router.delete('/users/:id', authenticate, async (req, res) => {
  if (req.user.tipo !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Não é possível excluir seu próprio usuário' });
  }
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
