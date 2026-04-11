/**
 * Seed inicial — cria usuários padrão
 * Uso: node database/seed.js
 * Ou:  DATABASE_URL=postgresql://... node database/seed.js
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/video_approval',
});

async function seed() {
  console.log('Iniciando seed...\n');

  const users = [
    { nome: 'Admin', email: 'admin@agencia.com', senha: 'admin123', tipo: 'admin' },
    { nome: 'Sara', email: 'sara@agencia.com', senha: 'sara123', tipo: 'editor' },
    { nome: 'Cliente Demo', email: 'cliente@demo.com', senha: 'cliente123', tipo: 'cliente' },
  ];

  try {
    for (const u of users) {
      const hash = await bcrypt.hash(u.senha, 10);
      const { rows } = await pool.query(
        `INSERT INTO users (nome, email, senha, tipo)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome
         RETURNING id`,
        [u.nome, u.email, hash, u.tipo]
      );

      // Se for cliente, cria registro em clientes vinculado
      if (u.tipo === 'cliente' && rows[0]) {
        await pool.query(
          `INSERT INTO clientes (nome, telefone, user_id)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          ['Cliente Demo', '(11) 99999-9999', rows[0].id]
        );
      }
    }

    console.log('Seed concluído!\n');
    console.log('Credenciais de acesso:');
    console.log('  Admin  : admin@agencia.com   / admin123');
    console.log('  Editor : sara@agencia.com    / sara123');
    console.log('  Cliente: cliente@demo.com    / cliente123');
  } catch (err) {
    console.error('Erro no seed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
