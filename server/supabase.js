const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration avec la clé de service pour les opérations privilégiées
function supabaseServerAdmin() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY, // Clé SERVICE pour les opérations administratives
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      }
    }
  );
}

// Configuration pour le serveur (utilise la clé ANON avec token utilisateur)
function supabaseServer(token) {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY, // Utilise la clé ANON pour les requêtes utilisateur
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

module.exports = { supabaseServer, supabaseServerAdmin };