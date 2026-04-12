const cron = require('node-cron');
const pool = require('../config/database');
const { deleteFiles } = require('../config/storage');

async function cleanupOldVideos() {
  console.log('[Cleanup] Iniciando limpeza de vídeos antigos...');

  try {
    // Busca vídeos APROVADO ou PUBLICADO com mais de 15 dias e que ainda têm arquivo no storage
    const { rows: videos } = await pool.query(`
      SELECT id, storage_path, titulo
      FROM videos
      WHERE status IN ('APROVADO', 'PUBLICADO')
        AND storage_path IS NOT NULL
        AND atualizado_em < NOW() - INTERVAL '15 days'
    `);

    if (videos.length === 0) {
      console.log('[Cleanup] Nenhum vídeo para limpar.');
      return;
    }

    console.log(`[Cleanup] ${videos.length} vídeo(s) para remover do storage.`);

    const paths = videos.map(v => v.storage_path);

    await deleteFiles(paths);

    // Atualiza DB: zera url e storage_path, mantém histórico
    const ids = videos.map(v => v.id);
    await pool.query(
      `UPDATE videos SET url = NULL, storage_path = NULL WHERE id = ANY($1::uuid[])`,
      [ids]
    );

    console.log(`[Cleanup] ${videos.length} arquivo(s) removido(s) do storage com sucesso.`);
    videos.forEach(v => console.log(`  - [${v.id}] ${v.titulo}`));
  } catch (err) {
    console.error('[Cleanup] Erro inesperado:', err.message);
  }
}

function startCleanupJob() {
  // Roda todo dia à meia-noite no horário de Brasília
  cron.schedule('0 0 * * *', cleanupOldVideos, {
    timezone: 'America/Sao_Paulo',
  });
  console.log('[Cleanup] Job agendado: diariamente à meia-noite (America/Sao_Paulo).');
}

module.exports = { startCleanupJob, cleanupOldVideos };
