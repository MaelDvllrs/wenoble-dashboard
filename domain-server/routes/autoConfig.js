const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const CloudflareDomainsManager = require('../utils/cloudflareDomainsManager');
const DNSConfigurationGenerator = require('../utils/dnsConfigGenerator');

const router = express.Router();

// Initialiser Supabase et Cloudflare
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const cloudflare = new CloudflareDomainsManager();

/**
 * Webhook/Route pour auto-configuration des custom domains
 * Appelée lors de la création d'un nouveau website
 */
router.post('/auto-configure', async (req, res) => {
  try {
    const { website_slug, folder_project, workspace_id } = req.body;

    console.log(`[Auto-Config] Demande configuration pour: ${website_slug}`);

    // Vérifier si c'est un domaine custom
    if (!cloudflare.isCustomDomain(website_slug)) {
      return res.json({
        success: false,
        message: 'Domaine non éligible pour configuration automatique',
        domain: website_slug
      });
    }

    // Configurer automatiquement dans Cloudflare Pages
    const result = await cloudflare.addCustomDomain(folder_project, website_slug);

    if (result.success) {
      // Générer les instructions DNS personnalisées
      const dnsInstructions = DNSConfigurationGenerator.generateInstructions(
        website_slug,
        `${folder_project}.pages.dev`,
        req.get('User-Agent') || ''
      );

      // Mettre à jour la base de données
      const { error: updateError } = await supabase
        .from('websites')
        .update({
          cloudflare_configured: true,
          dns_instructions: dnsInstructions,
          updated_at: new Date().toISOString()
        })
        .eq('website_slug', website_slug)
        .eq('workspace_id', workspace_id);

      if (updateError) {
        console.error('[Auto-Config] Erreur mise à jour DB:', updateError);
      }

      return res.json({
        success: true,
        message: `Custom domain ${website_slug} configuré automatiquement`,
        domain: website_slug,
        project: folder_project,
        dns_instructions: dnsInstructions,
        html_instructions: DNSConfigurationGenerator.generateHTML(dnsInstructions)
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Erreur lors de la configuration Cloudflare',
        domain: website_slug,
        errors: result.errors || result.error
      });
    }

  } catch (error) {
    console.error('[Auto-Config] Erreur:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne lors de la configuration',
      error: error.message
    });
  }
});

/**
 * Vérifier le statut d'un domaine
 */
router.get('/status/:domain', async (req, res) => {
  try {
    const { domain } = req.params;

    // Récupérer les infos du website
    const { data: website, error } = await supabase
      .from('websites')
      .select('folder_project, cloudflare_configured')
      .eq('website_slug', domain)
      .single();

    if (error || !website) {
      return res.status(404).json({
        success: false,
        message: 'Website non trouvé'
      });
    }

    // Vérifier le statut dans Cloudflare
    const status = await cloudflare.checkDomainStatus(website.folder_project, domain);

    return res.json({
      success: true,
      domain,
      cloudflare_status: status,
      db_configured: website.cloudflare_configured
    });

  } catch (error) {
    console.error('[Status Check] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Endpoint pour re-configurer un domaine manuellement
 */
router.post('/reconfigure/:domain', async (req, res) => {
  try {
    const { domain } = req.params;

    // Récupérer les infos du website
    const { data: website, error } = await supabase
      .from('websites')
      .select('folder_project, workspace_id')
      .eq('website_slug', domain)
      .single();

    if (error || !website) {
      return res.status(404).json({
        success: false,
        message: 'Website non trouvé'
      });
    }

    // Re-configurer
    const result = await cloudflare.autoConfigureWebsite(website);

    return res.json(result);

  } catch (error) {
    console.error('[Reconfigure] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Endpoint pour supprimer un domaine de Cloudflare
 */
router.delete('/remove-domain', async (req, res) => {
  try {
    const { folder_project, domain } = req.body;

    if (!folder_project || !domain) {
      return res.status(400).json({
        success: false,
        message: 'folder_project et domain sont requis'
      });
    }

    console.log(`[Remove Domain] Suppression de ${domain} du projet ${folder_project}`);

    const result = await cloudflare.removeCustomDomain(folder_project, domain);

    if (result.success) {
      return res.json({
        success: true,
        message: `Domaine ${domain} supprimé avec succès`,
        domain,
        project: folder_project
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Erreur lors de la suppression du domaine',
        error: result.error
      });
    }

  } catch (error) {
    console.error('[Remove Domain] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;