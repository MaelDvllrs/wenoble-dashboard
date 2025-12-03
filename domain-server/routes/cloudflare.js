const express = require('express');
const CloudflareDomainsManager = require('../utils/cloudflareDomainsManager');

const router = express.Router();
const cloudflare = new CloudflareDomainsManager();

/**
 * Créer un nouveau projet Cloudflare Pages
 * Appelé lors de la création d'un nouveau site web
 */
router.post('/create-project', async (req, res) => {
  try {
    const { project_name, website_id } = req.body;

    if (!project_name) {
      return res.status(400).json({
        success: false,
        error: 'Le nom du projet est requis'
      });
    }

    console.log(`[Cloudflare] Création du projet Pages: ${project_name}`);

    // Créer le projet via l'API Cloudflare
    const result = await cloudflare.createPagesProject(project_name);

    if (result.success) {
      return res.json({
        success: true,
        message: `Projet ${project_name} créé avec succès`,
        project_name,
        website_id,
        pages_url: `${project_name}.pages.dev`
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'Erreur lors de la création du projet',
        details: result.details
      });
    }

  } catch (error) {
    console.error('[Cloudflare] Erreur création projet:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur interne lors de la création du projet'
    });
  }
});

/**
 * Vérifier si un projet existe
 */
router.get('/project-exists/:projectName', async (req, res) => {
  try {
    const { projectName } = req.params;

    const exists = await cloudflare.projectExists(projectName);

    return res.json({
      success: true,
      exists,
      project_name: projectName
    });

  } catch (error) {
    console.error('[Cloudflare] Erreur vérification projet:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
