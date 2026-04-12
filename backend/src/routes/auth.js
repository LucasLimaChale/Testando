const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

function getClientIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha)
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [
      email.toLowerCase().trim(),
    ]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(senha, user.senha)))
      return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = jwt.sign(
      { id: user.id, email: user.email, tipo: user.tipo, nome: user.nome },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Auditoria de login
    pool.query(
      'INSERT INTO login_logs (user_id, ip) VALUES ($1, $2)',
      [user.id, getClientIp(req)]
    ).catch(() => {});

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

// PATCH /auth/me — atualizar próprio email e/ou senha
router.patch('/me', authenticate, async (req, res) => {
  const { email, senha_atual, nova_senha } = req.body;

  if (!email?.trim() && !nova_senha)
    return res.status(400).json({ error: 'Informe o novo email ou nova senha' });

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Se vai trocar senha, exige senha atual
    if (nova_senha) {
      if (!senha_atual)
        return res.status(400).json({ error: 'Informe a senha atual para trocar a senha' });
      const ok = await bcrypt.compare(senha_atual, user.senha);
      if (!ok)
        return res.status(401).json({ error: 'Senha atual incorreta' });
      if (nova_senha.length < 6)
        return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres' });
    }

    const novoEmail = email?.trim().toLowerCase() || user.email;
    const novaHash  = nova_senha ? await bcrypt.hash(nova_senha, 10) : user.senha;

    const { rows: updated } = await pool.query(
      'UPDATE users SET email = $1, senha = $2 WHERE id = $3 RETURNING id, nome, email, tipo',
      [novoEmail, novaHash, req.user.id]
    );

    // Retorna novo token para não deslogar
    const token = jwt.sign(
      { id: updated[0].id, email: updated[0].email, tipo: updated[0].tipo, nome: updated[0].nome },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ user: updated[0], token });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Este email já está em uso' });
    console.error(err);
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
  if (!nome || !email || !senha || !tipo)
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
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
  if (req.params.id === req.user.id)
    return res.status(400).json({ error: 'Não é possível excluir seu próprio usuário' });
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /auth/logs (admin)
router.get('/logs', authenticate, async (req, res) => {
  if (req.user.tipo !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const { limit = 100, user_id } = req.query;
  try {
    const params = [];
    let where = '';
    if (user_id) {
      params.push(user_id);
      where = 'WHERE l.user_id = $1';
    }
    const { rows } = await pool.query(
      `SELECT l.id,
              l.ip,
              l.data_hora_login AS data_hora_login,
              u.nome AS usuario,
              u.email,
              u.tipo
       FROM login_logs l
       LEFT JOIN users u ON l.user_id = u.id
       ${where}
       ORDER BY l.data_hora_login DESC
       LIMIT $${params.length + 1}`,
      [...params, parseInt(limit, 10)]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
