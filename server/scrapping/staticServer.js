const express = require('express');
const path = require('path');
const fs = require('fs-extra');

const app = express();
const PORT = 3003;

// Middleware pour gérer les URLs sans extension
app.use('/static-sites/:siteId', async (req, res, next) => {
  const { siteId } = req.params;
  const requestPath = req.path.replace(`/static-sites/${siteId}`, '');
  const sitePath = path.join(__dirname, 'sites', siteId);
  
  // Si la requête se termine déjà par .html, laisser passer
  if (requestPath.endsWith('.html') || requestPath.endsWith('.css') || requestPath.endsWith('.js') || requestPath.includes('.')) {
    return next();
  }

  // Essayer différentes variantes
  const possiblePaths = [
    path.join(sitePath, requestPath + '.html'),
    path.join(sitePath, requestPath, 'index.html'),
    path.join(sitePath, requestPath),
  ];

  for (const filePath of possiblePaths) {
    if (await fs.pathExists(filePath)) {
      const stats = await fs.stat(filePath);
      if (stats.isFile()) {
        return res.sendFile(filePath);
      }
    }
  }

  next();
});

// Servir les fichiers statiques
app.use('/static-sites', express.static(path.join(__dirname, 'sites')));

// Route par défaut
app.get('/', (req, res) => {
  res.send('Serveur de sites statiques actif');
});

app.listen(PORT, () => {
  console.log(`Serveur de sites statiques lancé sur le port ${PORT}`);
});

module.exports = app;
