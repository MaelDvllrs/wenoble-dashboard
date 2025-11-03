const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('../middleware/authToken');



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


router.post('/generateSite', authenticateToken, async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  const websiteId = req.body.websiteId;
  const status = req.body.status || 'publish';
  const customDomainRequested = req.body.publishCustomDomain;
  const supabase = supabaseServer(token);

  console.log(req.body);
  
  console.log('Démarrage de la génération statique pour le site:', websiteId);

  if (!websiteId) {
    return res.status(400).send({ error: 'Le paramètre websiteId est requis.' });
  }

  console.log('Vérification des autorisations pour le custom_domain:', customDomainRequested);

  // Vérification du droit custom_domain si demandé (on ne bloque pas ici, mais on retient l'autorisation)
  let customDomainNotAllowed = false;
  if (customDomainRequested) {
    try {
      const protocol = req.protocol || 'http';
      const host = req.get('host');
      const url = `${protocol}://${host}/custom-domain-authorisation/${websiteId}`;
      const axiosConfig = { headers: { Authorization: req.headers['authorization'] } };
      const authRes = await axios.get(url, axiosConfig);
      if (!authRes.data?.authorisation) {
        customDomainNotAllowed = true;
      }
    } catch (err) {
      console.error('Erreur lors de la vérification du custom_domain:', err?.response?.data || err.message);
      customDomainNotAllowed = true;
    }
  }

  try {
    // 1. Récupérer le chemin du dossier projet depuis la table websites
    const { data: websiteData, error: websiteError } = await supabase
      .from('websites')
      .select('folder_project')
      .eq('id', websiteId)
      .maybeSingle();
    if (websiteError) throw websiteError;
    if (!websiteData || !websiteData.folder_project) {
      return res.status(404).send({ error: 'Site web ou chemin projet non trouvé.' });
    }
    const siteDir = websiteData.folder_project;

    // 2. Récupérer les collections du site web
    const { data: collections, error: collectionsError } = await supabase
      .from('collection')
      .select('id, collection_slug')
      .eq('website_id', websiteId)
      .not('collection_slug', 'is', null);
    if (collectionsError) throw collectionsError;

    const templateTypes = {};
    let templateSlugs = [];

    if (!collections || collections.length === 0) {
      const result = await generateSite(siteDir, templateSlugs, templateTypes);
      if (result.success) {
        return res.status(200).json(result);
      }
      return res.status(500).json(result);
    }

    // 3. Pour chaque collection, extraire le type et récupérer les pages publiées
    for (const collection of collections) {
      const blogType = extractTemplateType(collection.collection_slug);
      // Récupérer les slugs des pages publiées de cette collection
      // Try to use the new text column if present, fallback to numeric status column if not.
      let pages = null;
      try {
        if (status === 'all') {
          // include queued pages (status 'wait' / numeric 2) as well as published
          const { data: pagesData, error: pagesError } = await supabase
            .from('collection_element')
            .select('collection_element_slug')
            .eq('collection_id', collection.id)
            .or('collection_element_status_text.eq.publish,collection_element_status_text.eq.wait');
          if (pagesError) throw pagesError;
          pages = pagesData;
        } else {
          const { data: pagesData, error: pagesError } = await supabase
            .from('collection_element')
            .select('collection_element_slug')
            .eq('collection_id', collection.id)
            .eq('collection_element_status_text', 'publish');
          if (pagesError) throw pagesError;
          pages = pagesData;
        }
      } catch (err) {
        // Fallback: older schema without text column
        const inStatuses = status === 'all' ? [1, 2] : [1];
        const { data: pagesData, error: pagesError } = await supabase
          .from('collection_element')
          .select('collection_element_slug')
          .eq('collection_id', collection.id)
          .in('collection_element_status', inStatuses);
        if (pagesError) throw pagesError;
        pages = pagesData;
      }
      // If we're publishing "all", convert queued ('wait') items to 'publish' so they
      // are treated as published during generation and in the DB.
      if (status === 'all' && pages && pages.length > 0) {
        try {
          const dateNow = new Date();
          const localISOTime = dateNow.toISOString().slice(0, 19).replace('T', ' ');
          const updateFields = {
            collection_element_status_text: 'publish',
            collection_element_publish_date: localISOTime,
            collection_element_update_date: localISOTime,
            published_by: req.user?.idUser || null,
            updated_by: req.user?.idUser || null
          };
          // Update rows that are currently 'wait' (text) OR numeric status 2
          const { error: bulkUpdateError } = await supabase
            .from('collection_element')
            .update(updateFields)
            .eq('collection_id', collection.id)
            .eq('collection_element_status_text','wait');
          if (bulkUpdateError) {
            console.warn('Warning: bulk update of queued pages failed for collection', collection.id, bulkUpdateError);
          } else {
            // After updating, refresh the pages list to ensure we include newly published rows
            const { data: refreshedPages, error: refreshedError } = await supabase
              .from('collection_element')
              .select('collection_element_slug')
              .eq('collection_id', collection.id)
              .or('collection_element_status_text.eq.publish,collection_element_status_text.eq.wait');
            if (!refreshedError && refreshedPages) {
              pages = refreshedPages;
            }
          }
        } catch (err) {
          console.error('Error updating queued pages to publish for collection', collection.id, err);
        }
      }

      for (const page of pages) {
        if (page.collection_element_slug) {
          templateSlugs.push(page.collection_element_slug);
          if (blogType !== 'realisations') {
            templateTypes[page.collection_element_slug] = blogType;
          }
        }
      }
    }

    console.log(`Pages à générer pour le site ${websiteId} :`, templateSlugs);
    console.log(`Domaine personnalisé demandé :`, customDomainRequested);
    console.log('customDomainNotAllowed:', customDomainNotAllowed); 

      // 4. Construire l'objet siteConfig et lancer la génération (seulement si autorisé)
      if (!customDomainRequested || customDomainNotAllowed) {
        // Ne pas générer le site, mais indiquer que les éléments en attente ont bien été publiés
        return res.status(200).json({
          success: true,
          message: `Site publié sur la preview`,
          pageCount: templateSlugs.length,
          templateCount: Object.keys(templateTypes).length,
          config: { siteDir, templateSlugs, templateTypes }
        });
      }
      const result = await generateSite(siteDir, templateSlugs, templateTypes);
      if (result.success) {
        return res.status(200).json(result);
      }
      return res.status(500).json(result);

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
          return {
            success: true,
            message: response.data.message,
            pageCount: response.data.pageResults.length,
            templateCount: response.data.templateResults.length,
            config: siteConfig
          };
        } else {
          console.error('❌ Erreur lors de la génération:', response.data.message);
          return {
            success: false,
            message: response.data.message,
            config: siteConfig
          };
        }
      } catch (error) {
        console.error('❌ Erreur lors de la génération:', error.message);
        return {
          success: false,
          message: 'Erreur lors de la génération du site',
          error: error.message,
          config: siteConfig
        };
      }
    }
  } catch (err) {
    console.error('Erreur lors de la génération du site:', err);
    res.status(500).send({ error: err.message });
  }
});

module.exports = router;