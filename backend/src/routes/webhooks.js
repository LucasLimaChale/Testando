/**
 * Endpoints de webhook para integração com n8n.
 *
 * O n8n pode:
 *  - Chamar POST /webhook/video-aprovado  para ser notificado de aprovações
 *  - Chamar POST /webhook/video-reprovado para ser notificado de reprovações
 *
 * Estes endpoints também podem receber callbacks do n8n com ações adicionais.
 */

const router = require('express').Router();
const pool = require('../config/database');

// POST /webhook/video-aprovado
router.post('/video-aprovado', async (req, res) => {
  const { video_id } = req.body;
  if (!video_id) return res.status(400).json({ error: 'video_id é obrigatório' });

  try {
    const { rows } = await pool.query(`
      SELECT v.*, c.nome AS cliente_nome, c.telefone AS cliente_telefone,
             u.email AS cliente_email
      FROM videos v
      JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE v.id = $1
    `, [video_id]);

    if (!rows[0]) return res.status(404).json({ error: 'Vídeo não encontrado' });

    res.json({
      status: 'ok',
      evento: 'video_aprovado',
      video: rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /webhook/video-reprovado
router.post('/video-reprovado', async (req, res) => {
  const { video_id } = req.body;
  if (!video_id) return res.status(400).json({ error: 'video_id é obrigatório' });

  try {
    const { rows } = await pool.query(`
      SELECT v.*, c.nome AS cliente_nome, c.telefone AS cliente_telefone,
             u.email AS cliente_email,
             (SELECT json_agg(f ORDER BY f.criado_em DESC)
              FROM feedbacks f WHERE f.video_id = v.id) AS feedbacks
      FROM videos v
      JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE v.id = $1
    `, [video_id]);

    if (!rows[0]) return res.status(404).json({ error: 'Vídeo não encontrado' });

    res.json({
      status: 'ok',
      evento: 'video_reprovado',
      video: rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
