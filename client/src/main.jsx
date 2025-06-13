import React from 'react'
import ReactDOM from 'react-dom/client'
import CssBaseline from '@mui/material/CssBaseline';

import App from './App.jsx'
import ThemeHandler from './Theme/themeProvider.jsx'
import './Theme/global.css';

// Configuration du service worker avec gestion d'erreurs
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Attendre que l'application soit complètement chargée
    setTimeout(() => {
      navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        type: 'classic',
        updateViaCache: 'none'
      })
      .then(registration => {
        console.log('Service Worker enregistré avec succès:', registration.scope);
        
        // Mettre en place la gestion des mises à jour
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker == null) return;
          
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('Une nouvelle version est disponible');
                // Vous pouvez afficher une notification à l'utilisateur ici
              } else {
                console.log('Le contenu est mis en cache pour une utilisation hors ligne');
              }
            }
          };
        };
      })
      .catch(error => {
        console.error('Erreur lors de l\'enregistrement du service worker:', error);
      });
    }, 1000); // Attendre 1 seconde pour s'assurer que tout est chargé
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeHandler>
    <CssBaseline />
    <App />
  </ThemeHandler>
)