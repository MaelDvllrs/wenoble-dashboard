const express = require('express');
const cors = require('cors');
const db = require('../db');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

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
      // Gestion des URL complètes (avec https:// etc.)
      let pathSegments;
      console.log('slug', slug)
    
      if (slug.startsWith('http://') || slug.startsWith('https://')) {
        // Pour les URLs complètes, utiliser l'objet URL
        const url = new URL(slug);
        pathSegments = url.pathname.split('/').filter(Boolean);
      } else {
        // Pour les chemins simples
        pathSegments = slug.split('/').filter(Boolean);
      }

      // Si nous avons des segments de chemin, prendre le premier
      // (qui sera typiquement "real", "blog", etc.)
      if (pathSegments.length > 0) {
        return pathSegments[0];
      }

      // Valeur par défaut si aucun segment n'est trouvé
      return 'realisations';
    } catch (error) {
      console.error('Erreur lors de l\'extraction du type de template:', error);
      return 'realisations'; // Valeur par défaut en cas d'erreur
    }
}

router.post('/generateSite', (req, res) => {
  const id_user  = req.user.idUser;

  if (!id_user) {
    return res.status(400).send({ error: 'Le paramètre id_user est requis.' });
  }

  
  // 1. Récupérer le chemin du dossier projet depuis la table users
  const SQL = 'SELECT folder_project FROM users WHERE id_user = ?';
  const Values = [id_user];

  db.query(SQL, Values, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).send({ error: err });
    }

    if (!results || results.length === 0) {
      return res.status(404).send({ error: 'Utilisateur non trouvé.' });
    }

    const siteDir = results[0].folder_project;

    if (!siteDir) {
      return res.status(400).send({ error: 'Le chemin du projet n\'est pas défini pour cet utilisateur.' });
    }

    // 2. Récupérer les blogs de l'utilisateur
    const SQL_BLOGS = 'SELECT id_blog, slug_blog FROM blog WHERE id_user = ? AND slug_blog IS NOT NULL';
    const Values_BLOGS = [id_user];

    db.query(SQL_BLOGS, Values_BLOGS, (err, blogResults) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).send({ error: err });
      }

      // Initialiser les objets pour stocker les types et les slugs
      const templateTypes = {};
      let templateSlugs = [];
      let processedBlogs = 0;

      // Si aucun blog n'a été trouvé, continuer avec un tableau vide
      if (!blogResults || blogResults.length === 0) {
        generateSite(siteDir, templateSlugs, templateTypes);
        return;
      }

      // 3. Pour chaque blog, extraire le type et récupérer les pages
      blogResults.forEach((blog) => {
        // Extraire le type de template
        const blogType = extractTemplateType(blog.slug_blog);
        console.log(`Type de blog extrait: ${blogType} pour le blog ${blog.slug_blog}`);

        // Récupérer les slugs des pages de ce blog
        const SQL_PAGES = 'SELECT page_blog_slug FROM blog_page WHERE id_blog = ? AND status = 1';
        const Values_PAGES = [blog.id_blog];

        console.log(`Récupération des pages pour le blog: ${blog.slug_blog} (${blogType})`); 

        

        db.query(SQL_PAGES, Values_PAGES, (err, pageResults) => {
          if (err) {
            console.error('Database query error:', err);
            return res.status(500).send({ error: err });
          }

          console.log(`Traitement du blog: ${blog.slug_blog} (${blogType})`);

          // Pour chaque page, ajouter le slug et définir son type
          pageResults.forEach((page) => {
            if (page.page_blog_slug) {
              templateSlugs.push(page.page_blog_slug);

              console.log(`Ajout du slug de page: ${page.page_blog_slug} pour le blog ${blog.slug_blog}`);
              
              // Si ce n'est pas le type par défaut, l'ajouter au mapping
              if (blogType !== 'realisations') {
                templateTypes[page.page_blog_slug] = blogType;
                console.log(`Ajout du type de template: ${blogType} pour le slug: ${page.page_blog_slug}`);
              }
            }
          });

          // Incrémenter le compteur de blogs traités
          processedBlogs++;

          // Vérifier si tous les blogs ont été traités
          if (processedBlogs === blogResults.length) {
            // 4. Construire l'objet siteConfig et lancer la génération
            generateSite(siteDir, templateSlugs, templateTypes);
          }
        });
      });

      // Fonction pour générer le site avec les données récupérées
      function generateSite(siteDir, templateSlugs, templateTypes) {
        const siteConfig = {
          siteDir,
          templateSlugs,
          templateTypes
        };
        
        console.log('🚀 Démarrage de la génération du site avec configuration:', siteConfig);
        
        // Appeler l'API de génération avec les informations récupérées
        axios.post(GENERATOR_API_URL, siteConfig)
          .then(response => {
            // Vérifier si la génération a réussi
            if (response.data.success) {
              console.log('✅ Génération réussie!');
              console.log(`📊 ${response.data.pageResults.length} pages standards générées`);
              console.log(`📊 ${response.data.templateResults.length} pages de templates générées`);
              
              // Renvoyer les résultats
              res.json({
                success: true,
                message: response.data.message,
                pageCount: response.data.pageResults.length,
                templateCount: response.data.templateResults.length,
                config: siteConfig // Inclure la configuration pour le débogage
              });
            } else {
              console.error('❌ Erreur lors de la génération:', response.data.message);
              res.status(500).json({
                success: false,
                message: response.data.message,
                config: siteConfig
              });
            }
          })
          .catch(error => {
            console.error('❌ Erreur lors de la génération:', error.message);
            res.status(500).json({
              success: false,
              message: 'Erreur lors de la génération du site',
              error: error.message,
              config: siteConfig
            });
          });
      }
    });
  });
});

module.exports = router;