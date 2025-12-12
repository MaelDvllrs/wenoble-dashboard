const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');
const { URL } = require('url');

class WebsiteScraper {
  constructor(baseUrl, siteId) {
    // Ajouter https:// si le protocole n'est pas présent
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'https://' + baseUrl;
    }
    this.baseUrl = baseUrl;
    this.siteId = siteId;
    this.sitePath = path.join(__dirname, 'sites', siteId);
    this.visitedUrls = new Set();
    this.downloadedAssets = new Set();
  }

  async scrape() {
    try {
      console.log(`Démarrage du scraping de ${this.baseUrl}...`);
      
      // Créer le dossier du site
      await fs.ensureDir(this.sitePath);
      await fs.ensureDir(path.join(this.sitePath, 'pages'));

      // Scraper la page principale
      await this.scrapePage(this.baseUrl, 'index.html');

      console.log(`Scraping terminé pour ${this.baseUrl}`);
      console.log(`Pages scrapées: ${this.visitedUrls.size}`);
      return {
        success: true,
        path: this.sitePath,
        siteId: this.siteId
      };
    } catch (error) {
      console.error('Erreur lors du scraping:', error);
      throw error;
    }
  }

  isInternalUrl(url) {
    try {
      const urlObj = new URL(url);
      const baseUrlObj = new URL(this.baseUrl);
      return urlObj.hostname === baseUrlObj.hostname;
    } catch (error) {
      return false;
    }
  }

  getPageFilename(url) {
    try {
      const urlObj = new URL(url);
      let pathname = urlObj.pathname;
      
      // Page d'accueil
      if (pathname === '/' || pathname === '') {
        return 'index.html';
      }
      
      // Enlever le slash de début
      pathname = pathname.replace(/^\//, '');
      
      // Si c'est un fichier HTML
      if (pathname.endsWith('.html')) {
        return pathname;
      }
      
      // Si c'est un dossier, ajouter index.html
      if (pathname.endsWith('/')) {
        return pathname + 'index.html';
      }
      
      // Sinon, ajouter .html
      return pathname.replace(/\/$/, '') + '.html';
    } catch (error) {
      return 'page_' + Date.now() + '.html';
    }
  }

  async scrapePage(url, filename = 'index.html') {
    if (this.visitedUrls.has(url)) return;
    this.visitedUrls.add(url);

    try {
      console.log(`Scraping de la page: ${url}`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Ne pas télécharger les CSS, JS et images - laisser les CDN Webflow
      // Juste scraper les liens internes pour les autres pages

      // Trouver et scraper les liens internes
      await this.scrapeInternalLinks($, url);

      // Modifier les liens internes pour pointer vers le serveur static
      this.updateInternalLinks($);

      // Supprimer les scripts qui appellent api-wenoble.wenoble.fr
      this.removeWenobleScripts($);

      // Sauvegarder le HTML
      const modifiedHtml = $.html();
      await fs.writeFile(path.join(this.sitePath, filename), modifiedHtml, 'utf8');

      console.log(`Page sauvegardée: ${filename}`);
    } catch (error) {
      console.error(`Erreur lors du scraping de ${url}:`, error.message);
    }
  }

  async scrapeInternalLinks($, currentUrl) {
    const links = $('a[href]');
    
    for (let i = 0; i < links.length; i++) {
      const link = $(links[i]);
      const href = link.attr('href');
      
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        continue;
      }

      try {
        // Convertir en URL absolue
        const absoluteUrl = new URL(href, currentUrl).href;
        
        // Vérifier si c'est un lien interne
        if (this.isInternalUrl(absoluteUrl)) {
          const urlObj = new URL(absoluteUrl);
          let pathname = urlObj.pathname;
          
          // Garder le lien original sans .html pour le HTML
          // Le serveur gérera la résolution
          if (pathname === '/' || pathname === '') {
            link.attr('href', '/');
          } else {
            // Enlever le trailing slash si présent
            pathname = pathname.replace(/\/$/, '');
            link.attr('href', pathname);
          }
          
          // Scraper la page si pas encore visitée
          if (!this.visitedUrls.has(absoluteUrl)) {
            const filename = this.getPageFilename(absoluteUrl);
            
            // Créer les sous-dossiers si nécessaire
            const dir = path.dirname(path.join(this.sitePath, filename));
            await fs.ensureDir(dir);
            
            // Scraper la page
            await this.scrapePage(absoluteUrl, filename);
          }
        }
      } catch (error) {
        console.error(`Erreur lors du traitement du lien ${href}:`, error.message);
      }
    }
  }

  updateInternalLinks($) {
    const links = $('a[href]');
    
    for (let i = 0; i < links.length; i++) {
      const link = $(links[i]);
      const href = link.attr('href');
      
      // Ignorer les ancres, mailto, tel, et liens externes
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http')) {
        continue;
      }

      // Convertir les liens internes pour pointer vers le serveur static
      // /realisation -> /static-sites/site_X/realisation
      const staticPath = `/static-sites/${this.siteId}${href}`;
      link.attr('href', staticPath);
    }
  }

  removeWenobleScripts($) {
    // Supprimer tous les scripts qui appellent api-wenoble.wenoble.fr
    $('script[src]').each((i, elem) => {
      const src = $(elem).attr('src');
      if (src && src.includes('api-wenoble.wenoble.fr')) {
        $(elem).remove();
        console.log(`Script Wenoble supprimé: ${src}`);
      }
    });

    // Supprimer également les scripts inline qui contiennent des appels à l'API
    $('script:not([src])').each((i, elem) => {
      const content = $(elem).html();
      if (content && content.includes('api-wenoble.wenoble.fr')) {
        $(elem).remove();
        console.log('Script inline Wenoble supprimé');
      }
    });
  }

  async downloadAssets($, selector, attribute, type) {
    const elements = $(selector);
    
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      let assetUrl;

      if (attribute === 'style') {
        const style = $(element).attr('style');
        const match = style?.match(/background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/);
        if (match) assetUrl = match[1];
      } else {
        assetUrl = $(element).attr(attribute);
      }

      if (!assetUrl) continue;

      try {
        // Convertir l'URL relative en absolue
        const fullUrl = new URL(assetUrl, this.baseUrl).href;
        
        if (this.downloadedAssets.has(fullUrl)) {
          // Déjà téléchargé, juste mettre à jour l'URL
          const filename = this.getAssetFilename(fullUrl);
          const localPath = `./${type}/${filename}`;
          
          if (attribute === 'style') {
            const style = $(element).attr('style');
            const newStyle = style.replace(/url\(['"]?[^'")\s]+['"]?\)/, `url('${localPath}')`);
            $(element).attr('style', newStyle);
          } else {
            $(element).attr(attribute, localPath);
          }
          continue;
        }

        // Télécharger l'asset
        const response = await axios.get(fullUrl, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        const filename = this.getAssetFilename(fullUrl);
        const filePath = path.join(this.sitePath, type, filename);
        
        await fs.writeFile(filePath, response.data);
        this.downloadedAssets.add(fullUrl);

        // Mettre à jour l'URL dans le HTML
        const localPath = `./${type}/${filename}`;
        
        if (attribute === 'style') {
          const style = $(element).attr('style');
          const newStyle = style.replace(/url\(['"]?[^'")\s]+['"]?\)/, `url('${localPath}')`);
          $(element).attr('style', newStyle);
        } else {
          $(element).attr(attribute, localPath);
        }

        console.log(`Asset téléchargé: ${filename}`);
      } catch (error) {
        console.error(`Erreur lors du téléchargement de ${assetUrl}:`, error.message);
      }
    }
  }

  async downloadFonts($) {
    const styles = $('style').toArray();
    
    for (const style of styles) {
      const content = $(style).html();
      if (!content) continue;

      const fontUrls = content.match(/url\(['"]?([^'")\s]+\.(?:woff2?|ttf|eot|otf))['"]?\)/gi);
      
      if (fontUrls) {
        for (const fontUrlMatch of fontUrls) {
          const urlMatch = fontUrlMatch.match(/url\(['"]?([^'")\s]+)['"]?\)/);
          if (!urlMatch) continue;

          const fontUrl = urlMatch[1];
          
          try {
            const fullUrl = new URL(fontUrl, this.baseUrl).href;
            
            if (this.downloadedAssets.has(fullUrl)) continue;

            const response = await axios.get(fullUrl, {
              responseType: 'arraybuffer',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });

            const filename = this.getAssetFilename(fullUrl);
            const filePath = path.join(this.sitePath, 'fonts', filename);
            
            await fs.writeFile(filePath, response.data);
            this.downloadedAssets.add(fullUrl);

            // Remplacer l'URL dans le contenu du style
            const newContent = $(style).html().replace(fontUrl, `./fonts/${filename}`);
            $(style).html(newContent);

            console.log(`Font téléchargée: ${filename}`);
          } catch (error) {
            console.error(`Erreur lors du téléchargement de la font ${fontUrl}:`, error.message);
          }
        }
      }
    }
  }

  updateAssetUrls($) {
    // Nettoyer les URLs absolues restantes
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.startsWith(this.baseUrl)) {
        $(el).attr('href', '#');
      }
    });

    // Ajouter une balise base pour gérer les chemins relatifs
    if (!$('base').length) {
      $('head').prepend('<base href="/">');
    }
  }

  getAssetFilename(url) {
    try {
      const urlObj = new URL(url);
      let filename = path.basename(urlObj.pathname);
      
      // Si pas d'extension, essayer de deviner depuis le content-type
      if (!path.extname(filename)) {
        filename += '.css'; // Par défaut pour les fichiers Webflow sans extension
      }
      
      // Nettoyer le nom de fichier
      filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      
      return filename;
    } catch (error) {
      return `asset_${Date.now()}.file`;
    }
  }
}

module.exports = WebsiteScraper;
