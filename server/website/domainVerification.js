const express = require('express');
const dns = require('dns').promises;
const { supabaseServer, supabaseServerAdmin } = require('../supabase');
const { authenticateToken } = require('../middleware/authToken');
const { checkUserWebsiteAccess } = require('./website');

const router = express.Router();

require('dotenv').config();

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
