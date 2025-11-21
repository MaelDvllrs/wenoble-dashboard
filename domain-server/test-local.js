const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// Support pour ngrok ou local
const BASE_URL = process.env.NGROK_URL || process.env.TEST_URL || 'http://localhost:3003';

// Affichage de l'URL utilisée
if (process.env.NGROK_URL) {
  log(colors.cyan, `🌐 Mode ngrok: ${BASE_URL}`);
} else {
  log(colors.blue, `🏠 Mode local: ${BASE_URL}`);
}

async function testServerHealth() {
  log(colors.blue, '\n=== Test de Santé du Serveur ===\n');
  
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    log(colors.green, '✅ Serveur actif');
    console.log('   Status:', response.data.status);
    console.log('   URL:', BASE_URL);
    console.log('   Uptime:', Math.floor(response.data.uptime), 'secondes');
    console.log('   Services:', response.data.services);
    return true;
  } catch (error) {
    log(colors.red, '❌ Serveur inaccessible');
    console.log('   Erreur:', error.message);
    return false;
  }
}

async function testDatabaseConnection() {
  log(colors.blue, '\n=== Test de Connexion Base de Données ===\n');
  
  try {
    const response = await axios.get(`${BASE_URL}/health/db`);
    log(colors.green, '✅ Base de données connectée');
    return true;
  } catch (error) {
    log(colors.red, '❌ Erreur base de données');
    console.log('   Erreur:', error.response?.data || error.message);
    return false;
  }
}

async function testDomainRedirect(domain, path = '/') {
  log(colors.blue, `\n=== Test Redirection: ${domain}${path} ===\n`);
  
  try {
    const response = await axios.get(`${BASE_URL}${path}`, {
      headers: {
        'Host': domain
      },
      maxRedirects: 0,
      validateStatus: () => true // Accepter tous les codes de statut
    });
    
    if (response.status === 302) {
      log(colors.green, `✅ Redirection effectuée`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Location: ${response.headers.location}`);
    } else if (response.status === 404) {
      log(colors.yellow, `⚠️  Domaine non trouvé (attendu si domaine pas en DB)`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Message:`, response.data.message);
    } else if (response.status === 403) {
      log(colors.yellow, `⚠️  Custom domain non autorisé`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Reason:`, response.data.message);
    } else {
      log(colors.red, `❌ Réponse inattendue`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Data:`, response.data);
    }
    
  } catch (error) {
    log(colors.red, `❌ Erreur lors du test`);
    console.log('   Erreur:', error.message);
  }
}

async function listWebsitesInDB() {
  log(colors.blue, '\n=== Sites Web en Base de Données ===\n');
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    const { data: websites, error } = await supabase
      .from('websites')
      .select(`
        website_slug,
        website_name,
        folder_project,
        website_subscriptions!inner (
          status,
          subscription_plans!inner (
            name,
            features
          )
        )
      `)
      .eq('website_subscriptions.status', 'active')
      .limit(10);
    
    if (error) {
      log(colors.red, '❌ Erreur lors de la récupération des sites');
      console.log('   Erreur:', error.message);
      return [];
    }
    
    if (!websites || websites.length === 0) {
      log(colors.yellow, '⚠️  Aucun site trouvé');
      return [];
    }
    
    log(colors.green, `✅ ${websites.length} site(s) trouvé(s):`);
    websites.forEach((site, index) => {
      const hasCustomDomain = site.website_subscriptions[0]?.subscription_plans?.features?.custom_domain;
      const customDomainIcon = hasCustomDomain ? '✅' : '❌';
      
      console.log(`   ${index + 1}. ${site.website_slug}`);
      console.log(`      Nom: ${site.website_name}`);
      console.log(`      Folder: ${site.folder || 'non défini'}`);
      console.log(`      Plan: ${site.website_subscriptions[0]?.subscription_plans?.name}`);
      console.log(`      Custom Domain: ${customDomainIcon} ${hasCustomDomain}`);
      console.log('');
    });
    
    return websites;
  } catch (error) {
    log(colors.red, '❌ Erreur lors de la consultation de la DB');
    console.log('   Erreur:', error.message);
    return [];
  }
}

async function runAllTests() {
  log(colors.cyan, '🧪 === TESTS DU SERVEUR DE DOMAINES ===');
  
  // 1. Test de santé
  const serverOk = await testServerHealth();
  if (!serverOk) {
    log(colors.red, '\n❌ Serveur non accessible. Assurez-vous qu\'il tourne avec "npm run dev"');
    return;
  }
  
  // 2. Test DB
  const dbOk = await testDatabaseConnection();
  if (!dbOk) {
    log(colors.red, '\n❌ Base de données non accessible. Vérifiez les variables .env');
    return;
  }
  
  // 3. Lister les sites en DB
  const websites = await listWebsitesInDB();
  
  // 4. Tests de redirection
  log(colors.blue, '\n=== Tests de Redirection ===');
  
  // Test avec un domaine fictif
  await testDomainRedirect('domaine-inexistant.com');
  
  // Test avec les vrais domaines si trouvés
  if (websites.length > 0) {
    const firstSite = websites[0];
    log(colors.cyan, `\n🔄 Test avec le premier site: ${firstSite.website_slug}`);
    await testDomainRedirect(firstSite.website_slug);
    await testDomainRedirect(firstSite.website_slug, '/test-page');
  }
  
  log(colors.cyan, '\n✨ Tests terminés!');
  log(colors.yellow, '\n💡 Pour tester avec un vrai domaine:');
  log(colors.yellow, '   1. Ajoutez une entrée dans votre fichier hosts');
  log(colors.yellow, '   2. Ou utilisez un outil comme ngrok pour exposer le serveur');
}

// Fonction pour tester un domaine spécifique
async function testSpecificDomain() {
  const domain = process.argv[2];
  const path = process.argv[3] || '/';
  
  if (!domain) {
    log(colors.yellow, 'Usage: node test-local.js [domain] [path]');
    log(colors.yellow, 'Exemple: node test-local.js monsite.com /ma-page');
    log(colors.yellow, '\nOu lancez sans paramètres pour tous les tests:');
    log(colors.yellow, 'node test-local.js');
    return;
  }
  
  log(colors.cyan, `🧪 Test spécifique: ${domain}${path}`);
  await testServerHealth();
  await testDomainRedirect(domain, path);
}

// Point d'entrée
if (process.argv[2]) {
  testSpecificDomain();
} else {
  runAllTests();
}

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  log(colors.red, '❌ Erreur non capturée:');
  console.error(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(colors.red, '❌ Promise rejetée non gérée:');
  console.error(reason);
  process.exit(1);
});