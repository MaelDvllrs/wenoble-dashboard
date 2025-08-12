const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const keys = require('./southern-ring-447310-p8-0d053790b9ef'); 
const { supabaseServer } = require('../supabase');
const { authenticateToken } = require('../middleware/authToken');
const { checkUserWebsiteAccess } = require('../website/website');
const dayjs = require('dayjs');

const router = express.Router();
router.use(cors());
router.use(express.json());


function getDateRange(period) {
  let startDate, endDate;
  switch (period) {
    case 'today':
      startDate = dayjs().format('YYYY-MM-DD');
      endDate = dayjs().format('YYYY-MM-DD');
      break;
    case 'yesterday':
      startDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
      endDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
      break;
    case 'last7days':
      startDate = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
      endDate = dayjs().format('YYYY-MM-DD');
      break;
    case 'last14days':
      startDate = dayjs().subtract(14, 'day').format('YYYY-MM-DD');
      endDate = dayjs().format('YYYY-MM-DD');
      break;
    case 'last30days':
      startDate = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
      endDate = dayjs().format('YYYY-MM-DD');
      break;
    case 'last90days':
      startDate = dayjs().subtract(90, 'day').format('YYYY-MM-DD');
      endDate = dayjs().format('YYYY-MM-DD');
      break;
    case 'last365days':
      startDate = dayjs().subtract(365, 'day').format('YYYY-MM-DD');
      endDate = dayjs().format('YYYY-MM-DD');
      break;
    default:
      startDate = '2020-03-31';
      endDate = dayjs().format('YYYY-MM-DD');
      break;
  }
  return { startDate, endDate };
}

// Correction de la fonction pour être asynchrone et utiliser les bons paramètres
async function getSearchConsoleClient() {
  const jwtClient = new google.auth.JWT({
    email: keys.client_email,
    key: keys.private_key,
    scopes: ['https://www.googleapis.com/auth/webmasters'],
  });
  await jwtClient.authorize();
  return google.searchconsole({ version: 'v1', auth: jwtClient });
}

router.get('/getSearchConsoleData', authenticateToken, async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  const supabase = supabaseServer(token);
  const userId = req.user.idUser;
  const websiteId = req.query.websiteId;
  const period = req.query.period || 'last7days';
  const metric = req.query.metric || 'clicks';

  if (!websiteId) {
    return res.status(400).json({ error: 'websiteId is required' });
  }

  // Vérifier l'accès de l'utilisateur au site web
  const hasAccess = await checkUserWebsiteAccess(supabase, userId, websiteId);
  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied to this website' });
  }

  // Récupère l'URL du site web depuis la table websites
  const { data, error } = await supabase
    .from('websites')
    .select('website_slug')
    .eq('id', websiteId)
    .single();
  if (error || !data) {
    return res.status(404).send('Site web non trouvé');
  }
  // Utilisation dynamique du siteUrl depuis la BDD
  let siteUrl = data.website_slug;
  // Si la propriété Search Console est de type "Domaine", il faut utiliser le format sc-domain:example.com
  // On détecte si c'est un domaine nu (pas d'http, pas de slash)
  if (siteUrl && !siteUrl.startsWith('http')) {
    siteUrl = `sc-domain:${siteUrl.replace(/\/$/, '')}`;
  } else if (siteUrl) {
    // Pour les propriétés préfixe d'URL, on s'assure qu'il y a un slash final
    if (!siteUrl.endsWith('/')) siteUrl += '/';
  }
  // Dates dynamiques via getDateRange
  const { startDate, endDate } = getDateRange(period);
  try {
    const searchconsole = await getSearchConsoleClient();
    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["date"],
        metrics: [metric],
        rowLimit: 1000
      }
    });
    res.json(response.data);
  } catch (err) {
    console.error('Erreur Search Console:', err);
    res.status(500).send('Erreur Search Console');
  }
});

// Route pour les requêtes (queries) Search Console
router.get('/getSearchConsoleQueries', authenticateToken, async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  const supabase = supabaseServer(token);
  const userId = req.user.idUser;
  const websiteId = req.query.websiteId;
  const period = req.query.period || 'last7days';

  if (!websiteId) {
    return res.status(400).json({ error: 'websiteId is required' });
  }

  // Vérifier l'accès de l'utilisateur au site web
  const hasAccess = await checkUserWebsiteAccess(supabase, userId, websiteId);
  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied to this website' });
  }

  // Récupère l'URL du site web depuis la table websites
  const { data, error } = await supabase
    .from('websites')
    .select('website_slug')
    .eq('id', websiteId)
    .single();
  if (error || !data) {
    return res.status(404).send('Site web non trouvé');
  }
  let siteUrl = data.website_slug;
  if (siteUrl && !siteUrl.startsWith('http')) {
    siteUrl = `sc-domain:${siteUrl.replace(/\/$/, '')}`;
  } else if (siteUrl) {
    if (!siteUrl.endsWith('/')) siteUrl += '/';
  }
  const { startDate, endDate } = getDateRange(period);
  try {
    const searchconsole = await getSearchConsoleClient();
    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["query"],
        metrics: ["clicks", "impressions", "ctr", "position"],
        rowLimit: 1000
      }
    });
    res.json(response.data);
  } catch (err) {
    console.error('Erreur Search Console (queries):', err);
    res.status(500).send('Erreur Search Console (queries)');
  }
});

// Route pour les pages Search Console
router.get('/getSearchConsolePages', authenticateToken, async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  const supabase = supabaseServer(token);
  const userId = req.user.idUser;
  const websiteId = req.query.websiteId;
  const period = req.query.period || 'last7days';

  if (!websiteId) {
    return res.status(400).json({ error: 'websiteId is required' });
  }

  // Vérifier l'accès de l'utilisateur au site web
  const hasAccess = await checkUserWebsiteAccess(supabase, userId, websiteId);
  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied to this website' });
  }

  // Récupère l'URL du site web depuis la table websites
  const { data, error } = await supabase
    .from('websites')
    .select('website_slug')
    .eq('id', websiteId)
    .single();
  if (error || !data) {
    return res.status(404).send('Site web non trouvé');
  }
  let siteUrl = data.website_slug;
  if (siteUrl && !siteUrl.startsWith('http')) {
    siteUrl = `sc-domain:${siteUrl.replace(/\/$/, '')}`;
  } else if (siteUrl) {
    if (!siteUrl.endsWith('/')) siteUrl += '/';
  }
  const { startDate, endDate } = getDateRange(period);
  try {
    const searchconsole = await getSearchConsoleClient();
    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["page"],
        metrics: ["clicks", "impressions", "ctr", "position"],
        rowLimit: 1000
      }
    });
    res.json(response.data);
  } catch (err) {
    console.error('Erreur Search Console (pages):', err);
    res.status(500).send('Erreur Search Console (pages)');
  }
});

module.exports = router;