const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');


const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const router = express.Router();

router.use(cors());
router.use(express.json());

require('dotenv').config();

// URL de l'API de génération (à définir dans .env)
const GENERATOR_API_URL = process.env.GENERATOR_API_URL || 'http://localhost:3000/api/generate/site';

// Fonction pour extraire le type de template (dernière partie du slug)
// Fonction pour extraire correctement le type de template à partir d'une URL
function extractTemplateType(slug) {
    try {
        let pathSegments;
        if (slug.startsWith('http://') || slug.startsWith('https://')) {
            const url = new URL(slug);
            pathSegments = url.pathname.split('/').filter(Boolean);
        } else {
            pathSegments = slug.split('/').filter(Boolean);
        }
        if (pathSegments.length > 0) {
            return pathSegments[pathSegments.length - 1];
        }
        return 'realisations';
    } catch (error) {
        console.error('Erreur lors de l\'extraction du type de template:', error);
        return 'realisations';
    }
}

const { supabaseServer } = require('../supabase');

router.post('/generateSite', async (req, res) => {
  const user_id = req.user.idUser;
  if (!user_id) {
    return res.status(400).send({ error: 'Le paramètre user_id est requis.' });
  }

  try {
    // 1. Récupérer le chemin du dossier projet depuis la table users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('folder_project')
      .eq('id', user_id)
      .maybeSingle();
    if (userError) throw userError;
    if (!userData || !userData.folder_project) {
      return res.status(404).send({ error: 'Utilisateur ou chemin projet non trouvé.' });
    }
    const siteDir = userData.folder_project;

    // 2. Récupérer les collections de l'utilisateur
    const { data: collections, error: collectionsError } = await supabase
      .from('collection')
      .select('id, collection_slug')
      .eq('user_id', user_id)
      .not('collection_slug', 'is', null);
    if (collectionsError) throw collectionsError;

    const templateTypes = {};
    let templateSlugs = [];

    if (!collections || collections.length === 0) {
      await generateSite(siteDir, templateSlugs, templateTypes);
      return;
    }

    // 3. Pour chaque collection, extraire le type et récupérer les pages publiées
    for (const collection of collections) {
      const blogType = extractTemplateType(collection.collection_slug);
      // Récupérer les slugs des pages publiées de cette collection
      const { data: pages, error: pagesError } = await supabase
        .from('collection_element')
        .select('collection_element_slug')
        .eq('collection_id', collection.id)
        .eq('collection_element_status', 1);
      if (pagesError) throw pagesError;
      for (const page of pages) {
        if (page.collection_element_slug) {
          templateSlugs.push(page.collection_element_slug);
          if (blogType !== 'realisations') {
            templateTypes[page.collection_element_slug] = blogType;
          }
        }
      }
    }

    // 4. Construire l'objet siteConfig et lancer la génération
    await generateSite(siteDir, templateSlugs, templateTypes);
    // Ancien code SQL/MySQL supprimé car tout est géré via Supabase ci-dessus
    return res.status(200).send({ success: true, message: 'Génération statique lancée.' });
    async function generateSite(siteDir, templateSlugs, templateTypes) {
      const siteConfig = {
        siteDir,
        templateSlugs,
        templateTypes
      };
      console.log('🚀 Démarrage de la génération du site avec configuration:', siteConfig);
      try {
        const response = await axios.post(GENERATOR_API_URL, siteConfig);
        if (response.data.success) {
          console.log('✅ Génération réussie!');
          console.log(`📊 ${response.data.pageResults.length} pages standards générées`);
          console.log(`📊 ${response.data.templateResults.length} pages de templates générées`);
          res.json({
            success: true,
            message: response.data.message,
            pageCount: response.data.pageResults.length,
            templateCount: response.data.templateResults.length,
            config: siteConfig
          });
        } else {
          console.error('❌ Erreur lors de la génération:', response.data.message);
          res.status(500).json({
            success: false,
            message: response.data.message,
            config: siteConfig
          });
        }
      } catch (error) {
        console.error('❌ Erreur lors de la génération:', error.message);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la génération du site',
          error: error.message,
          config: siteConfig
        });
      }
    }
  } catch (err) {
    console.error('Erreur lors de la génération du site:', err);
    res.status(500).send({ error: err.message });
  }
});

module.exports = router;