const express = require('express');
const router = express.Router();
const WebsiteScraper = require('./scraper');
const path = require('path');
const fs = require('fs-extra');
const { supabaseServerAdmin } = require('../supabase');

// Endpoint pour démarrer le scraping d'un site
router.post('/scrape', async (req, res) => {
  try {
    const { websiteId } = req.body;

    if (!websiteId) {
      return res.status(400).json({ 
        error: 'websiteId est requis' 
      });
    }

    console.log(`Démarrage du scraping pour le site ID: ${websiteId}`);

    // Récupérer l'URL de preview depuis la base de données
    const supabase = supabaseServerAdmin();
    const { data: website, error } = await supabase
      .from('websites')
      .select('website_preview, website_name')
      .eq('id', websiteId)
      .single();

    if (error || !website) {
      return res.status(404).json({ 
        error: 'Site web non trouvé' 
      });
    }

    if (!website.website_preview) {
      return res.status(400).json({ 
        error: 'URL de preview non configurée pour ce site' 
      });
    }

    // Générer un ID unique pour le site
    const siteId = `site_${websiteId}`;

    // Démarrer le scraping
    const scraper = new WebsiteScraper(website.website_preview, siteId);
    const result = await scraper.scrape();

    // Sauvegarder les informations dans la base de données
    const { error: updateError } = await supabase
      .from('websites')
      .update({
        website_scraped_path: result.path,
        website_last_scrape: new Date().toISOString()
      })
      .eq('id', websiteId);

    if (updateError) {
      console.error('Erreur lors de la mise à jour de la base de données:', updateError);
    }

    res.json({
      success: true,
      message: 'Scraping terminé avec succès',
      siteId: result.siteId,
      localUrl: `/static-sites/${siteId}/index.html`
    });

  } catch (error) {
    console.error('Erreur lors du scraping:', error);
    res.status(500).json({ 
      error: 'Erreur lors du scraping du site',
      details: error.message 
    });
  }
});

// Endpoint pour vérifier si un site a déjà été scrapé
router.get('/status/:websiteId', async (req, res) => {
  try {
    const { websiteId } = req.params;

    const supabase = supabaseServerAdmin();
    const { data: website, error } = await supabase
      .from('websites')
      .select('website_scraped_path, website_last_scrape')
      .eq('id', websiteId)
      .single();

    if (error || !website) {
      return res.status(404).json({ 
        error: 'Site web non trouvé' 
      });
    }

    const siteId = `site_${websiteId}`;
    const sitePath = path.join(__dirname, 'sites', siteId);
    const exists = await fs.pathExists(sitePath);

    res.json({
      scraped: exists,
      lastScrape: website.website_last_scrape,
      siteId: siteId,
      localUrl: exists ? `/static-sites/${siteId}/index.html` : null
    });

  } catch (error) {
    console.error('Erreur lors de la vérification du statut:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la vérification du statut' 
    });
  }
});

// Endpoint pour rescraper un site (forcer le refresh)
router.post('/rescrape/:websiteId', async (req, res) => {
  try {
    const { websiteId } = req.params;

    // Supprimer l'ancien dossier s'il existe
    const siteId = `site_${websiteId}`;
    const sitePath = path.join(__dirname, 'sites', siteId);
    
    if (await fs.pathExists(sitePath)) {
      await fs.remove(sitePath);
      console.log(`Ancien site supprimé: ${siteId}`);
    }

    // Relancer le scraping
    req.body = { websiteId };
    return router.handle(req, res);

  } catch (error) {
    console.error('Erreur lors du rescraping:', error);
    res.status(500).json({ 
      error: 'Erreur lors du rescraping du site' 
    });
  }
});

// Endpoint pour sauvegarder les modifications d'un site
router.post('/save', async (req, res) => {
  try {
    const { websiteId, htmlContent } = req.body;

    if (!websiteId || !htmlContent) {
      return res.status(400).json({ 
        error: 'websiteId et htmlContent sont requis' 
      });
    }

    const siteId = `site_${websiteId}`;
    const sitePath = path.join(__dirname, 'sites', siteId);
    const indexPath = path.join(sitePath, 'index.html');

    // Vérifier que le site existe
    if (!await fs.pathExists(sitePath)) {
      return res.status(404).json({ 
        error: 'Site non trouvé. Veuillez d\'abord scraper le site.' 
      });
    }

    // Sauvegarder le HTML modifié
    await fs.writeFile(indexPath, htmlContent, 'utf8');

    res.json({
      success: true,
      message: 'Modifications sauvegardées avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la sauvegarde des modifications' 
    });
  }
});

// Endpoint pour servir le HTML en mode édition (avec scripts bloqués)
router.get('/edit-mode/:websiteId/*', async (req, res) => {
  try {
    const { websiteId } = req.params;
    const filePath = req.params[0] || 'index.html';
    
    const siteId = `site_${websiteId}`;
    const sitePath = path.join(__dirname, 'sites', siteId);
    const htmlPath = path.join(sitePath, filePath);

    // Vérifier que le fichier existe
    if (!await fs.pathExists(htmlPath)) {
      return res.status(404).send('Page non trouvée');
    }

    // Lire le HTML
    let htmlContent = await fs.readFile(htmlPath, 'utf8');

    // Injecter un script pour bloquer les scripts inline au début du <head>
    const blockScriptTag = `
      <script id="wenoble-blocker">
        (function() {
          // Faire remonter les console.log vers le parent
          const originalLog = console.log;
          const originalError = console.error;
          const originalWarn = console.warn;
          
          console.log = function(...args) {
            originalLog.apply(console, ['[IFRAME]', ...args]);
            try {
              window.parent.postMessage({ type: 'console', level: 'log', args: args }, '*');
            } catch(e) {}
          };
          
          console.error = function(...args) {
            originalError.apply(console, ['[IFRAME ERROR]', ...args]);
            try {
              window.parent.postMessage({ type: 'console', level: 'error', args: args }, '*');
            } catch(e) {}
          };
          
          console.warn = function(...args) {
            originalWarn.apply(console, ['[IFRAME WARN]', ...args]);
            try {
              window.parent.postMessage({ type: 'console', level: 'warn', args: args }, '*');
            } catch(e) {}
          };
          
          console.log('Script de blocage Webflow chargé');
          
          // Patcher Webflow dès que possible
          let webflowPatched = false;
          
          // Méthode 1: Intercepter window.Webflow dès sa création
          Object.defineProperty(window, 'Webflow', {
            get: function() {
              return this._webflow;
            },
            set: function(value) {
              console.log('Webflow détecté, application du patch...');
              this._webflow = value;
              
              // Patcher dès que Webflow est défini
              if (!webflowPatched && value) {
                webflowPatched = true;
                patchWebflow();
              }
            },
            configurable: true
          });
          
          function patchWebflow() {
            console.log('Début du patch Webflow');
            
            // Méthode 1: Patcher require pour bloquer ix2 dès qu'il est chargé
            if (window.Webflow && window.Webflow.require) {
              const originalRequire = window.Webflow.require.bind(window.Webflow);
              window.Webflow.require = function(moduleName) {
                const module = originalRequire(moduleName);
                
                if (moduleName === 'ix2' && module) {
                  console.log('ix2 intercepté, application du patch');
                  
                  // Empêcher l'initialisation
                  module.init = function() {
                    console.log('ix2.init bloqué');
                    return;
                  };
                  
                  module.destroy = function() {
                    console.log('ix2.destroy bloqué');
                    return;
                  };
                  
                  // Bloquer aussi les événements
                  if (module.on) {
                    module.on = function() { return; };
                  }
                }
                
                return module;
              };
              
              console.log('Webflow.require patché');
            }
            
            // Méthode 2: Attendre que require soit disponible et patcher ix2
            const checkRequire = setInterval(function() {
              if (window.Webflow && window.Webflow.require) {
                clearInterval(checkRequire);
                console.log('Webflow.require disponible');
                
                try {
                  const ix2 = window.Webflow.require('ix2');
                  if (ix2) {
                    console.log('ix2 trouvé, application du patch');
                    
                    // Sauvegarder les originaux
                    const originalInit = ix2.init;
                    const originalDestroy = ix2.destroy;
                    
                    // Empêcher l'initialisation des animations
                    ix2.init = function() {
                      console.log('Webflow ix2.init bloqué en mode édition');
                      // Ne rien faire
                      return;
                    };
                    
                    // Empêcher le destroy
                    ix2.destroy = function() {
                      console.log('Webflow ix2.destroy bloqué en mode édition');
                      // Ne rien faire
                      return;
                    };
                    
                    console.log('Patch Webflow ix2 appliqué avec succès');
                  }
                } catch(e) {
                  console.error('Erreur lors du patch Webflow ix2:', e);
                }
              }
            }, 100);
            
            // Timeout après 10 secondes
            setTimeout(function() {
              clearInterval(checkRequire);
              console.log('Timeout du patch Webflow');
            }, 10000);
          }

          // Désactiver toutes les animations CSS pour éviter les transitions
          const style = document.createElement('style');
          style.textContent = \`
            /* Bloquer toutes les animations et transitions */
            *, *::before, *::after {
              animation: none !important;
              animation-duration: 0s !important;
              animation-delay: 0s !important;
              transition: none !important;
              transition-duration: 0s !important;
              transition-delay: 0s !important;
            }
            
            /* Forcer l'affichage de tous les éléments cachés par Webflow */
            [data-w-id] {
              opacity: 1 !important;
              transform: none !important;
              visibility: visible !important;
            }
            
            /* Empêcher Webflow de modifier l'opacité */
            .w-richtext, .w-container, .w-section {
              opacity: 1 !important;
            }
          \`;
          
          // Ajouter le style dès que possible
          if (document.head) {
            document.head.appendChild(style);
          } else {
            document.addEventListener('DOMContentLoaded', function() {
              document.head.appendChild(style);
            });
          }
          
          console.log('Style anti-animation injecté');
        })();
      </script>
    `;

    // Injecter IMMÉDIATEMENT après <!DOCTYPE html> pour être le tout premier script
    const htmlStart = htmlContent.match(/<!DOCTYPE[^>]*>/i);
    if (htmlStart) {
      htmlContent = htmlContent.replace(htmlStart[0], htmlStart[0] + blockScriptTag);
    } else {
      // Si pas de DOCTYPE, injecter au début
      htmlContent = blockScriptTag + htmlContent;
    }

    // Désactiver tous les scripts inline existants SAUF notre script de blocage et les WebFont
    // On ne peut pas utiliser une simple regex car on doit vérifier le contenu du script
    const scriptRegex = /<script(?!\s+id="wenoble-blocker")(?!\s+src)([^>]*)>([\s\S]*?)<\/script>/gi;
    htmlContent = htmlContent.replace(scriptRegex, (match, attributes, content) => {
      // Ne pas désactiver les scripts qui chargent les fonts
      if (content.includes('WebFont.load')) {
        return match; // Garder le script tel quel
      }
      // Désactiver tous les autres scripts inline
      return `<script type="text/plain"${attributes}>${content}</script>`;
    });

    console.log('HTML modifié pour mode édition:');
    console.log('- Contient balise base:', htmlContent.includes('<base href='));
    console.log('- Contient script de blocage:', htmlContent.includes('Script de blocage Webflow'));
    console.log('- Scripts inline désactivés:', htmlContent.includes('type="text/plain"'));

    // Configurer les headers pour permettre l'accès depuis l'iframe
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Important: pas de X-Frame-Options ou Content-Security-Policy qui bloqueraient l'iframe
    res.removeHeader('X-Frame-Options');
    
    res.send(htmlContent);

  } catch (error) {
    console.error('Erreur lors de la lecture du fichier:', error);
    res.status(500).send('Erreur serveur');
  }
});

// Endpoint pour récupérer la liste des pages HTML d'un site
router.get('/pages/:websiteId', async (req, res) => {
  try {
    const { websiteId } = req.params;
    
    const siteId = `site_${websiteId}`;
    const sitePath = path.join(__dirname, 'sites', siteId);

    // Vérifier que le site existe
    if (!await fs.pathExists(sitePath)) {
      return res.status(404).json({ 
        error: 'Site non trouvé' 
      });
    }

    // Lire tous les fichiers HTML du dossier
    const files = await fs.readdir(sitePath);
    const htmlFiles = files.filter(file => file.endsWith('.html'));

    res.json({
      success: true,
      pages: htmlFiles.length > 0 ? htmlFiles : ['index.html']
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des pages:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des pages' 
    });
  }
});

module.exports = router;
