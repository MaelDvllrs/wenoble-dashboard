const express = require('express');
const dns = require('dns').promises;
const axios = require('axios');
const { supabaseServer, supabaseServerAdmin } = require('../supabase');
const { authenticateToken } = require('../middleware/authToken');
const { checkUserWebsiteAccess } = require('./website');

const router = express.Router();

require('dotenv').config();

// URL du domain-server (local ou production)
const DOMAIN_SERVER_URL = process.env.DOMAIN_SERVER_URL || 'http://localhost:3003';

/**
 * Configure un domaine personnalisé dans Cloudflare Pages
 * Étape 1: Ajouter le domaine avec www à Cloudflare
 */
router.post('/configure-custom-domain/:websiteId', authenticateToken, async (req, res) => {
  const { websiteId } = req.params;
  const { customDomain } = req.body;
  const userId = req.user.idUser;
  const token = req.headers['authorization']?.split(' ')[1];
  const supabase = supabaseServer(token);
  const supabaseAdmin = supabaseServerAdmin();

  try {
    // Vérifier l'accès
    const { hasAccess } = await checkUserWebsiteAccess(supabase, userId, websiteId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Vous n\'avez pas accès à ce site web' });
    }

    // Récupérer les infos du website
    const { data: website, error: websiteError } = await supabaseAdmin
      .from('websites')
      .select('folder_project, workspace_id, website_slug')
      .eq('id', websiteId)
      .single();

    if (websiteError || !website) {
      return res.status(404).json({ error: 'Site web introuvable' });
    }

    console.log(`[Domain Config] Configuration de ${customDomain} pour ${website.folder_project}`);

    // Appeler le domain-server pour configurer dans Cloudflare
    // On configure directement www.domain.com au lieu du domain root
    const wwwDomain = customDomain.startsWith('www.') ? customDomain : `www.${customDomain}`;
    const rootDomain = customDomain.replace('www.', '');

    // Vérifier que le nouveau slug n'existe pas déjà (si différent de l'actuel)
    if (wwwDomain !== website.website_slug) {
      const { data: existingWebsite, error: checkError } = await supabaseAdmin
        .from('websites')
        .select('id, website_name')
        .eq('website_slug', wwwDomain)
        .neq('id', websiteId)
        .maybeSingle();

      if (checkError) {
        console.error('[Domain Config] Erreur vérification slug:', checkError);
      }

      if (existingWebsite) {
        return res.status(400).json({
          success: false,
          error: 'Ce domaine est déjà utilisé par un autre site',
          details: `Le domaine ${wwwDomain} est déjà utilisé par "${existingWebsite.website_name}"`
        });
      }

      // Supprimer l'ancien domaine de Cloudflare si un domaine personnalisé existait
      if (website.website_slug && website.website_slug !== `${website.folder_project}.pages.dev`) {
        try {
          console.log(`[Domain Config] Suppression de l'ancien domaine ${website.website_slug}`);
          await axios.delete(`${DOMAIN_SERVER_URL}/api/auto-config/remove-domain`, {
            data: {
              folder_project: website.folder_project,
              domain: website.website_slug
            },
            timeout: 15000
          });
          console.log(`[Domain Config] Ancien domaine ${website.website_slug} supprimé`);
        } catch (deleteError) {
          console.error('[Domain Config] Erreur suppression ancien domaine:', deleteError.message);
          // On continue quand même pour configurer le nouveau domaine
        }
      }
    }

    try {
      const response = await axios.post(`${DOMAIN_SERVER_URL}/api/auto-config/auto-configure`, {
        website_slug: wwwDomain,
        folder_project: website.folder_project,
        workspace_id: website.workspace_id
      }, {
        timeout: 30000
      });

      if (response.data.success) {
        // Mettre à jour la BDD avec le domaine www via supabaseAdmin
        // (on utilise le service role pour bypasser RLS)
        const { error: updateError } = await supabaseAdmin
          .from('websites')
          .update({
            website_slug: wwwDomain,
            cloudflare_configured: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', websiteId);

        if (updateError) {
          console.error('[Domain Config] Erreur mise à jour BDD:', updateError);
          // On continue quand même car le domaine est configuré dans Cloudflare
        }

        // Retourner les instructions DNS
        return res.json({
          success: true,
          message: `Domaine ${wwwDomain} configuré dans Cloudflare Pages`,
          domain: wwwDomain,
          rootDomain: rootDomain,
          project: website.folder_project,
          dns_records: [
            {
              type: 'A',
              name: '@',
              value: process.env.VPS_IP || '77.37.51.201',
              ttl: 300,
              description: 'Pointe le domaine racine vers le VPS pour redirection'
            },
            {
              type: 'CNAME',
              name: 'www',
              value: `${website.folder_project}.pages.dev`,
              ttl: 300,
              description: 'Pointe www vers Cloudflare Pages'
            }
          ],
          instructions: response.data.dns_instructions,
          cloudflare_status: 'pending',
          next_step: 'Configurez les enregistrements DNS chez votre registrar'
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Erreur lors de la configuration Cloudflare',
          details: response.data.errors || response.data.message
        });
      }

    } catch (domainServerError) {
      console.error('[Domain Config] Erreur domain-server:', domainServerError.message);
      
      return res.status(502).json({
        success: false,
        error: 'Impossible de contacter le serveur de domaine',
        details: domainServerError.response?.data || domainServerError.message
      });
    }

  } catch (error) {
    console.error('[Domain Config] Erreur:', error);
    res.status(500).json({ 
      error: error.message || 'Erreur lors de la configuration du domaine'
    });
  }
});

/**
 * Vérifie si un domaine pointe vers le VPS
 */
router.get('/verify-custom-domain/:websiteId', authenticateToken, async (req, res) => {
  const { websiteId } = req.params;
  const userId = req.user.idUser;
  const token = req.headers['authorization']?.split(' ')[1];
  const supabase = supabaseServer(token);
  const supabaseAdmin = supabaseServerAdmin();

  try {
    // Vérifier l'accès
    const { hasAccess } = await checkUserWebsiteAccess(supabase, userId, websiteId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Vous n\'avez pas accès à ce site web' });
    }

    // Récupérer le domaine personnalisé
    const { data: website } = await supabaseAdmin
      .from('websites')
      .select('website_slug')
      .eq('id', websiteId)
      .single();

    if (!website || !website.website_slug) {
      return res.json({ 
        configured: false,
        message: 'Aucun domaine personnalisé configuré'
      });
    }

    const domain = website.website_slug;
    const vpsIP = process.env.VPS_IP || '77.37.51.201';

    // Déterminer si c'est un domaine www ou root
    const isWWW = domain.startsWith('www.');
    const rootDomain = isWWW ? domain.replace('www.', '') : domain;
    const wwwDomain = isWWW ? domain : `www.${domain}`;

    console.log(`[DNS Verify] Vérification du domaine ${domain}...`);

    const verificationResult = {
      configured: true,
      domain: domain,
      rootDomain: rootDomain,
      wwwDomain: wwwDomain,
      checks: {
        rootA: { status: 'pending', message: '' },
        wwwCNAME: { status: 'pending', message: '' }
      },
      allConfigured: false
    };

    // 1. Vérifier l'enregistrement A du domaine racine
    try {
      const addresses = await dns.resolve4(rootDomain);
      console.log(`[DNS Verify] ${rootDomain} pointe vers:`, addresses);

      if (addresses.includes(vpsIP)) {
        verificationResult.checks.rootA = {
          status: 'success',
          message: `${rootDomain} pointe correctement vers ${vpsIP}`,
          currentIP: addresses[0]
        };
      } else {
        verificationResult.checks.rootA = {
          status: 'error',
          message: `${rootDomain} pointe vers ${addresses[0]} au lieu de ${vpsIP}`,
          currentIP: addresses[0],
          expectedIP: vpsIP
        };
      }
    } catch (dnsError) {
      verificationResult.checks.rootA = {
        status: 'error',
        message: `${rootDomain} non résolu (DNS non propagé)`,
        error: dnsError.code
      };
    }

    // 2. Vérifier l'enregistrement CNAME de www
    try {
      // Résoudre le CNAME
      const cnameRecords = await dns.resolveCname(wwwDomain);
      console.log(`[DNS Verify] ${wwwDomain} CNAME vers:`, cnameRecords);

      const expectedCNAME = `${website.folder_project || 'attique-test'}.pages.dev`;
      
      if (cnameRecords.some(record => record.includes('pages.dev'))) {
        verificationResult.checks.wwwCNAME = {
          status: 'success',
          message: `${wwwDomain} pointe correctement vers ${cnameRecords[0]}`,
          currentCNAME: cnameRecords[0],
          expectedCNAME: expectedCNAME
        };
      } else {
        verificationResult.checks.wwwCNAME = {
          status: 'warning',
          message: `${wwwDomain} pointe vers ${cnameRecords[0]} (vérifié via CNAME)`,
          currentCNAME: cnameRecords[0],
          expectedCNAME: expectedCNAME
        };
      }
    } catch (cnameError) {
      // Si pas de CNAME, essayer de résoudre en A
      try {
        const wwwAddresses = await dns.resolve4(wwwDomain);
        console.log(`[DNS Verify] ${wwwDomain} (A record) pointe vers:`, wwwAddresses);
        
        // Vérifier si c'est une IP Cloudflare
        if (wwwAddresses.some(ip => ip.startsWith('188.114.') || ip.startsWith('172.66.'))) {
          verificationResult.checks.wwwCNAME = {
            status: 'success',
            message: `${wwwDomain} pointe vers Cloudflare (via A record)`,
            currentIP: wwwAddresses[0],
            note: 'CNAME Flattening détecté'
          };
        } else {
          verificationResult.checks.wwwCNAME = {
            status: 'error',
            message: `${wwwDomain} ne pointe pas vers Cloudflare Pages`,
            currentIP: wwwAddresses[0]
          };
        }
      } catch (aError) {
        verificationResult.checks.wwwCNAME = {
          status: 'error',
          message: `${wwwDomain} non résolu (DNS non propagé)`,
          error: aError.code
        };
      }
    }

    // Déterminer si tout est configuré
    verificationResult.allConfigured = 
      verificationResult.checks.rootA.status === 'success' &&
      verificationResult.checks.wwwCNAME.status === 'success';

    verificationResult.verified = verificationResult.allConfigured;
    verificationResult.status = verificationResult.allConfigured ? 'active' : 'pending';

    return res.json(verificationResult);

  } catch (error) {
    console.error('[DNS Verify] Erreur:', error);
    res.status(500).json({ 
      error: error.message || 'Erreur lors de la vérification du domaine'
    });
  }
});

/**
 * Vérifie si un domaine pointe vers le VPS (OLD VERSION - à supprimer)
 */
router.get('/verify-custom-domain-old/:websiteId', authenticateToken, async (req, res) => {
  const { websiteId } = req.params;
  const userId = req.user.idUser;
  const token = req.headers['authorization']?.split(' ')[1];
  const supabase = supabaseServer(token);
  const supabaseAdmin = supabaseServerAdmin();

  try {
    // Vérifier l'accès
    const { hasAccess } = await checkUserWebsiteAccess(supabase, userId, websiteId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Vous n\'avez pas accès à ce site web' });
    }

    // Récupérer le domaine personnalisé
    const { data: website } = await supabaseAdmin
      .from('websites')
      .select('website_slug')
      .eq('id', websiteId)
      .single();

    if (!website || !website.website_slug) {
      return res.json({ 
        configured: false,
        message: 'Aucun domaine personnalisé configuré'
      });
    }

    const domain = website.website_slug;
    const vpsIP = process.env.VPS_IP || 'VOTRE_IP_VPS';

    console.log(`[DNS Verify] Vérification du domaine ${domain}...`);

    // Résoudre le domaine
    try {
      const addresses = await dns.resolve4(domain);
      console.log(`[DNS Verify] ${domain} pointe vers:`, addresses);

      // Vérifier si l'IP correspond au VPS
      const pointsToVPS = addresses.includes(vpsIP);

      // Vérifier aussi le sous-domaine www
      let wwwPointsToVPS = false;
      try {
        const wwwAddresses = await dns.resolve4(`www.${domain}`);
        wwwPointsToVPS = wwwAddresses.includes(vpsIP);
        console.log(`[DNS Verify] www.${domain} pointe vers:`, wwwAddresses);
      } catch (wwwError) {
        console.log(`[DNS Verify] www.${domain} non configuré ou erreur:`, wwwError.message);
      }

      if (pointsToVPS) {
        return res.json({
          configured: true,
          verified: true,
          domain: domain,
          currentIP: addresses[0],
          expectedIP: vpsIP,
          wwwConfigured: wwwPointsToVPS,
          message: 'Le domaine pointe correctement vers le VPS',
          status: 'active'
        });
      } else {
        return res.json({
          configured: true,
          verified: false,
          domain: domain,
          currentIP: addresses[0],
          expectedIP: vpsIP,
          wwwConfigured: wwwPointsToVPS,
          message: `Le domaine pointe vers ${addresses[0]} mais devrait pointer vers ${vpsIP}`,
          status: 'misconfigured'
        });
      }

    } catch (dnsError) {
      console.log(`[DNS Verify] Erreur DNS pour ${domain}:`, dnsError.message);

      if (dnsError.code === 'ENOTFOUND' || dnsError.code === 'ENODATA') {
        return res.json({
          configured: true,
          verified: false,
          domain: domain,
          expectedIP: vpsIP,
          message: 'Le domaine n\'est pas encore résolu (DNS non propagé ou non configuré)',
          status: 'not_propagated'
        });
      }

      throw dnsError;
    }

  } catch (error) {
    console.error('[DNS Verify] Erreur:', error);
    res.status(500).json({ 
      error: error.message || 'Erreur lors de la vérification du domaine'
    });
  }
});

/**
 * Fonction utilitaire pour vérifier un domaine (peut être appelée depuis d'autres modules)
 */
async function verifyDomainDNS(domain, expectedIP) {
  try {
    const addresses = await dns.resolve4(domain);
    const pointsToExpectedIP = addresses.includes(expectedIP);

    // Vérifier aussi le sous-domaine www
    let wwwPointsToExpectedIP = false;
    try {
      const wwwAddresses = await dns.resolve4(`www.${domain}`);
      wwwPointsToExpectedIP = wwwAddresses.includes(expectedIP);
    } catch (wwwError) {
      // www non configuré, ce n'est pas grave
    }

    return {
      success: true,
      verified: pointsToExpectedIP,
      currentIP: addresses[0],
      expectedIP: expectedIP,
      wwwConfigured: wwwPointsToExpectedIP,
      status: pointsToExpectedIP ? 'active' : 'misconfigured'
    };

  } catch (dnsError) {
    if (dnsError.code === 'ENOTFOUND' || dnsError.code === 'ENODATA') {
      return {
        success: false,
        verified: false,
        expectedIP: expectedIP,
        status: 'not_propagated',
        error: 'DNS non propagé ou non configuré'
      };
    }

    return {
      success: false,
      verified: false,
      expectedIP: expectedIP,
      status: 'error',
      error: dnsError.message
    };
  }
}

module.exports = { 
  router,
  verifyDomainDNS 
};
