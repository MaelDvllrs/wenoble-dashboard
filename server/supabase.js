const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration pour le serveur (utilise la clé de service)
const supabaseServer = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = { supabaseServer };