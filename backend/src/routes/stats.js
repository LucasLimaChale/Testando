const router = require('express').Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * GET /stats
 * Métricas de desempenho por editor (somente admin).
 *
 * Para calcular os tempos, usamos os timestamps de atualização dos vídeos.
 * Como não temos log de transição de status, aproximamos:
 *   - "Tempo na fila"    = intervalo entre criado_em e quando saiu de LISTA/EM_EDICAO
 *                          → (primeira atualização após criação)
 *   - "Tempo de edição"  = criado_em até atualizado_em nos vídeos que já passaram de EM_EDICAO
 *
 * O que temos com certeza no banco:
 *   - criado_em  : quando o vídeo foi criado (chegou na fila)
 *   - atualizado_em : última vez que o status mudou
 *   - editor_id, versao, status
 *
 * Métricas entregues:
 *   1. Por editor: total de vídeos, média de horas do criado_em até AGUARDANDO_APROVACAO
 *      (proxy: atualizado_em de vídeos em status >= AGUARDANDO_APROVACAO com versao = 1)
 *   2. Total geral: distribuição de status, urgentes
 *   3. Histórico semanal: vídeos criados por semana (últimas 8 semanas)
 */
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    // ── 1. Desempenho por editor ──────────────────────────────────────────────
    const { rows: editorStats } = await pool.query(`
      SELECT
        u.id                                                     AS editor_id,
        u.nome                                                   AS editor_nome,
        COUNT(v.id)                                              AS total_videos,
        COUNT(v.id) FILTER (WHERE v.status = 'PUBLICADO')        AS publicados,
        COUNT(v.id) FILTER (WHERE v.status = 'APROVADO')         AS aprovados,
        COUNT(v.id) FILTER (WHERE v.status = 'REPROVADO')        AS reprovados,
        COUNT(v.id) FILTER (
          WHERE v.status NOT IN ('LISTA','EM_EDICAO')
        )                                                        AS concluidos,

        -- Tempo médio de edição: criado_em → atualizado_em (vídeos que saíram da edição)
        ROUND(
          AVG(
            EXTRACT(EPOCH FROM (v.atualizado_em - v.criado_em)) / 3600.0
          ) FILTER (
            WHERE v.status NOT IN ('LISTA','EM_EDICAO')
          )::numeric, 2
        )                                                        AS media_horas_edicao,

        -- Mediana do tempo de edição
        PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (v.atualizado_em - v.criado_em)) / 3600.0
        ) FILTER (
          WHERE v.status NOT IN ('LISTA','EM_EDICAO')
        )                                                        AS mediana_horas_edicao,

        -- Menor e maior tempo de edição
        ROUND(
          MIN(
            EXTRACT(EPOCH FROM (v.atualizado_em - v.criado_em)) / 3600.0
          ) FILTER (
            WHERE v.status NOT IN ('LISTA','EM_EDICAO')
          )::numeric, 2
        )                                                        AS min_horas_edicao,
        ROUND(
          MAX(
            EXTRACT(EPOCH FROM (v.atualizado_em - v.criado_em)) / 3600.0
          ) FILTER (
            WHERE v.status NOT IN ('LISTA','EM_EDICAO')
          )::numeric, 2
        )                                                        AS max_horas_edicao

      FROM users u
      LEFT JOIN videos v ON v.editor_id = u.id
      WHERE u.tipo IN ('editor','admin')
      GROUP BY u.id, u.nome
      ORDER BY concluidos DESC, total_videos DESC
    `);

    // ── 2. Vídeos ainda em edição (tempo parado na fila) ─────────────────────
    const { rows: emEdicao } = await pool.query(`
      SELECT
        v.id,
        v.titulo,
        v.status,
        v.criado_em,
        v.atualizado_em,
        u.nome                                                  AS editor_nome,
        col.nome                                                AS colaborador_nome,
        e.nome                                                  AS empresa_nome,
        ROUND(
          EXTRACT(EPOCH FROM (NOW() - v.criado_em)) / 3600.0
        ::numeric, 1)                                          AS horas_na_fila
      FROM videos v
      LEFT JOIN users u        ON v.editor_id      = u.id
      LEFT JOIN colaboradores col ON v.colaborador_id = col.id
      LEFT JOIN empresas e     ON col.empresa_id   = e.id
      WHERE v.status IN ('LISTA','EM_EDICAO')
      ORDER BY v.criado_em ASC
    `);

    // ── 3. Tempo médio que vídeos ficam parados sem editor ───────────────────
    const { rows: filaStats } = await pool.query(`
      SELECT
        ROUND(AVG(
          EXTRACT(EPOCH FROM (atualizado_em - criado_em)) / 3600.0
        )::numeric, 2)                                         AS media_horas_fila,
        COUNT(*)                                               AS total_na_fila
      FROM videos
      WHERE status IN ('LISTA','EM_EDICAO')
    `);

    // ── 4. Totais gerais por status ───────────────────────────────────────────
    const { rows: totais } = await pool.query(`
      SELECT status, COUNT(*) AS total
      FROM videos
      GROUP BY status
      ORDER BY status
    `);

    // ── 5. Histórico semanal (últimas 8 semanas) ──────────────────────────────
    const { rows: semanal } = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('week', criado_em AT TIME ZONE 'America/Sao_Paulo'), 'DD/MM') AS semana,
        COUNT(*) AS total
      FROM videos
      WHERE criado_em >= NOW() - INTERVAL '8 weeks'
      GROUP BY DATE_TRUNC('week', criado_em AT TIME ZONE 'America/Sao_Paulo')
      ORDER BY DATE_TRUNC('week', criado_em AT TIME ZONE 'America/Sao_Paulo')
    `);

    res.json({
      editores:   editorStats,
      em_edicao:  emEdicao,
      fila:       filaStats[0] || {},
      totais,
      semanal,
    });
  } catch (err) {
    console.error('[Stats]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
