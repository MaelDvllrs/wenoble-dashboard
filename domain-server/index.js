const express = require('express');
const cors = require('cors');
require('dotenv').config();

const domainRouter = require('./routes/domainRedirect');
const healthRouter = require('./routes/health');
const autoConfigRouter = require('./routes/autoConfig');
const cloudflareRouter = require('./routes/cloudflare');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log des requêtes
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const host = req.get('host') || req.hostname;
  console.log(`[${timestamp}] ${req.method} ${req.url} - Host: ${host} - IP: ${req.ip}`);
  next();
});

// Routes
app.use('/health', healthRouter);
app.use('/api/auto-config', autoConfigRouter);
app.use('/api/cloudflare', cloudflareRouter);
app.use('/', domainRouter); // Route de redirection principale

// Middleware de gestion d'erreurs
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).json({
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur s\'est produite'
  });
});

// Route 404
app.use('*', (req, res) => {
  const host = req.get('host') || req.hostname;
  console.log(`[404] Domaine non trouvé: ${host} - Path: ${req.originalUrl}`);
  res.status(404).json({
    error: 'Domaine non configuré',
    host,
    message: 'Ce domaine n\'est pas autorisé ou configuré'
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`\n🚀 Serveur de redirection des domaines démarré`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Supabase URL: ${process.env.SUPABASE_URL ? '✅ Configuré' : '❌ Non configuré'}`);
  console.log(`☁️  Cloudflare: ${process.env.CLOUDFLARE_ACCOUNT_ID ? '✅ Configuré' : '❌ Non configuré'}`);
  console.log(`\n📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔄 Redirection active pour tous les domaines configurés\n`);
});

module.exports = app;