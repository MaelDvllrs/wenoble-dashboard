const express = require('express')
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const cors = require('cors')
const db = require('../db')
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { get } = require('http');


const router = express.Router();

router.use(cors())
router.use(express.json());

require('dotenv').config();
const secretKey = process.env.SECRET_KEY; 



// Fonction pour lire et parser le fichier sitemap
const readSitemap = (sitemapPath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(sitemapPath, (err, data) => {
      if (err) return reject(err);
      xml2js.parseString(data, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  });
};
  
  // Fonction pour écrire dans le fichier sitemap
const writeSitemap = (sitemap) => {
  return new Promise((resolve, reject) => {
    const builder = new xml2js.Builder();
    const xml = builder.buildObject(sitemap);
    fs.writeFile(sitemapPath, xml, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};
  
// Route pour ajouter un nouvel article de blog
router.post('/add-blog', async (req, res) => {
  const { sitemapPath, url, date } = req.body;

  try {
    // Lire le fichier sitemap existant
    const sitemap = await readSitemap(sitemapPath);

    // Ajouter une nouvelle entrée pour l'article de blog
    const newEntry = {
      loc: url,
      lastmod: date,
      changefreq: 'weekly',
      priority: '0.8'
    };
    sitemap.urlset.url.push(newEntry);

    // Écrire les modifications dans le fichier sitemap
    await writeSitemap(sitemap);

    res.status(200).json({ message: 'Article ajouté au sitemap avec succès' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour du sitemap' });
  }
});

module.exports = router;