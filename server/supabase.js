const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();



// Configuration pour le serveur (utilise la clé de service)
function supabaseServer(token) {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY, // Utilise la clé ANON pour les requêtes utilisateur
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

module.exports = { supabaseServer };