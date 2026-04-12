require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes     = require('./routes/auth');
const videoRoutes    = require('./routes/videos');
const clientRoutes   = require('./routes/clients');
const empresaRoutes  = require('./routes/empresas');
const statsRoutes    = require('./routes/stats');
const webhookRoutes  = require('./routes/webhooks');
const { startCleanupJob } = require('./jobs/cleanup');

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : true;

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Captura IP real por trás de proxy (Traefik/nginx)
app.set('trust proxy', 1);

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

app.use('/auth',      authRoutes);
app.use('/videos',   videoRoutes);
app.use('/clients',  clientRoutes);
app.use('/empresas', empresaRoutes);
app.use('/stats',    statsRoutes);
app.use('/webhook',  webhookRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  startCleanupJob();
});

module.exports = app;
