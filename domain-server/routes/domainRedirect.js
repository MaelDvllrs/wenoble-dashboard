const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const router = express.Router();

// Initialiser Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Récupère les informations du site web par son domaine (slug)
 */
async function getWebsiteByDomain(domain) {
  try {
    const { data, error } = await supabase
      .from('websites')
      .select(`
        id,
        website_name,
        website_slug,
        folder_project,
        workspace_id,
        cloudflare_configured,
        website_subscriptions!inner (
          status,
          subscription_plans!inner (
            name,
            features
          )
        )
      `)
      .eq('website_slug', domain)
      .eq('cloudflare_configured', true)
      .maybeSingle();

    if (error) {
      console.error(`[DB Error] Erreur lors de la récupération du domaine ${domain}:`, error);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`[DB Error] Exception lors de la récupération du domaine ${domain}:`, error);
    return null;
  }
}

/**
 * Vérifie si le domaine a la feature custom_domain activée
 */
function hasCustomDomainFeature(website) {
  if (!website || !website.website_subscriptions || !website.website_subscriptions[0]) {
    return false;
  }

  const subscription = website.website_subscriptions[0];
  const features = subscription.subscription_plans?.features || {};
  
  return features.custom_domain === true;
}

/**
 * Génère l'URL du worker Cloudflare pour un site
 */
function generateWorkerURL(website) {
  // Utiliser le folder comme nom de projet Cloudflare Pages
  const folder = website.folder_project || website.website_slug;
  
  // Format standard des URLs Cloudflare Pages
  // Ex: https://mon-site.pages.dev
  return `https://${folder}.pages.dev`;
}

/**
 * Route principale de redirection
 * Capture toutes les requêtes et redirige vers le bon worker
 */
router.all('*', async (req, res) => {
  try {
    const host = req.get('host') || req.hostname;
    const path = req.originalUrl;
    
    // Détecter le protocole original (HTTPS si derrière Apache ou Cloudflare)
    const protocol = req.get('x-forwarded-proto') || 
                     req.get('cf-visitor')?.includes('https') ? 'https' : req.protocol || 
                     'https';
    
    console.log(`\n========================================`);
    console.log(`[Redirect] 🎯 ROUTE EXÉCUTÉE`);
    console.log(`[Redirect] Requête reçue - Host: ${host}, Path: ${path}, Method: ${req.method}`);
    console.log(`[Redirect] Protocole détecté: ${protocol}`);
    console.log(`[Redirect] Headers:`, JSON.stringify(req.headers, null, 2));

    // Ne pas rediriger les domaines API (ex: api-wenoble.wenoble.fr)
    if (host.startsWith('api-') || host.startsWith('api.')) {
      console.log(`[Redirect] ⏭️ Domaine API détecté, on laisse Apache gérer: ${host}`);
      return next(); // Passe au prochain middleware (Apache handle)
    }

    // Redirection automatique du domaine racine vers www
    // Ex: testwenoble.fr → www.testwenoble.fr
    if (!host.startsWith('www.') && !host.includes('.pages.dev') && !host.includes('ngrok')) {
      const wwwHost = `www.${host}`;
      const redirectURL = `${protocol}://${wwwHost}${path}`;
      console.log(`[Redirect] 🔄 Redirection root → www: ${host} → ${wwwHost}`);
      return res.redirect(301, redirectURL);
    }

    // Récupérer les informations du site web
    console.log(`[Redirect] 🔍 Recherche du domaine dans la BD: ${host}`);
    const website = await getWebsiteByDomain(host);

    if (!website) {
      console.log(`[Redirect] ❌ Domaine non trouvé dans la BD: ${host}`);
      console.log(`[Redirect] 💡 Vérifiez que le domaine existe dans la table 'websites' avec website_slug = '${host}' et cloudflare_configured = true`);
      console.log(`========================================\n`);
      return res.status(404).json({
        error: 'Domaine non configuré',
        domain: host,
        message: 'Ce domaine n\'est pas enregistré dans le système'
      });
    }
    
    console.log(`[Redirect] ✅ Domaine trouvé:`, {
      id: website.id,
      name: website.website_name,
      slug: website.website_slug,
      folder: website.folder_project
    });

    // Vérifier si le custom domain est autorisé
    if (!hasCustomDomainFeature(website)) {
      console.log(`[Redirect] ❌ Custom domain non autorisé pour: ${host} (Plan: ${website.website_subscriptions[0]?.subscription_plans?.name || 'unknown'})`);
      return res.status(403).json({
        error: 'Custom domain non autorisé',
        domain: host,
        message: 'Votre plan ne permet pas l\'utilisation de domaines personnalisés',
        plan: website.website_subscriptions[0]?.subscription_plans?.name || 'unknown'
      });
    }

    // Générer l'URL de destination
    const targetURL = generateWorkerURL(website);
    const fullTargetURL = `${targetURL}${path}`;

    console.log(`[Redirect] ✅ Redirection: ${host}${path} → ${fullTargetURL}`);
    console.log(`========================================\n`);

    // Pour les requêtes GET, faire une redirection HTTP
    if (req.method === 'GET') {
      console.log(`[Redirect] 🔀 Redirection GET vers: ${fullTargetURL}`);
      return res.redirect(302, fullTargetURL);
    }

    // Pour les autres méthodes (POST, PUT, DELETE), faire un proxy
    try {
      const proxyResponse = await axios({
        method: req.method.toLowerCase(),
        url: fullTargetURL,
        data: req.body,
        headers: {
          ...req.headers,
          host: undefined, // Enlever le header host original
          'x-forwarded-host': host,
          'x-forwarded-proto': req.protocol,
          'x-original-url': req.originalUrl
        },
        timeout: 30000 // 30 secondes
      });

      // Transférer la réponse
      res.status(proxyResponse.status);
      
      // Transférer les headers (sauf certains)
      Object.keys(proxyResponse.headers).forEach(key => {
        if (!['connection', 'transfer-encoding'].includes(key.toLowerCase())) {
          res.set(key, proxyResponse.headers[key]);
        }
      });

      return res.send(proxyResponse.data);

    } catch (proxyError) {
      console.error(`[Proxy Error] Erreur lors du proxy vers ${fullTargetURL}:`, proxyError.message);
      
      return res.status(502).json({
        error: 'Erreur de proxy',
        target: targetURL,
        message: 'Impossible de joindre le service de destination'
      });
    }

  } catch (error) {
    console.error('[Redirect] Erreur lors de la redirection:', error);
    
    return res.status(500).json({
      error: 'Erreur interne',
      message: 'Une erreur s\'est produite lors du traitement de la requête'
    });
  }
});

module.exports = router;