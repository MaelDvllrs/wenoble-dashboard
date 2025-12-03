const express = require('express');
const router = express.Router();

// Route de health check
router.get('/', async (req, res) => {
  try {
    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      env: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      services: {
        supabase: process.env.SUPABASE_URL ? 'configured' : 'not_configured',
        cloudflare: process.env.CLOUDFLARE_ACCOUNT_ID ? 'configured' : 'not_configured'
      }
    };

    res.json(healthData);
  } catch (error) {
    console.error('Erreur health check:', error);
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Test de connectivité base de données
router.get('/db', async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return res.status(500).json({
        status: 'ERROR',
        message: 'Configuration Supabase manquante'
      });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Test simple de connexion
    const { data, error } = await supabase
      .from('websites')
      .select('count', { count: 'exact', head: true })
      .limit(1);

    if (error) throw error;

    res.json({
      status: 'OK',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erreur test DB:', error);
    res.status(500).json({
      status: 'ERROR',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;