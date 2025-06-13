// Cette première ligne assure que ce fichier est traité comme JavaScript
// Content-Type: application/javascript

// Point d'injection important pour VitePWA - Ne pas supprimer
// LIGNE D'INJECTION CRITIQUE - NE PAS MODIFIER OU SUPPRIMER
self.__WB_MANIFEST;

const CACHE_NAME = 'wenoble-dashboard-cache-v5';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/logo.png',
  '/screenshot1.png'
];

// Ressources additionnelles à mettre en cache (CSS, JS, images principales)
const RESOURCES_TO_CACHE = [
  // CSS et JS principaux
  '/assets/index-*.js',
  '/assets/index-*.css',
  // Autres ressources importantes
  '/assets/*.js',
  '/assets/*.css'
];

// Installation du service worker
self.addEventListener('install', (event) => {
  // Attendre que l'installation soit terminée
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache APP_SHELL ouvert');
        // Mise en cache de l'app shell (critique pour le fonctionnement offline)
        return cache.addAll(APP_SHELL)
          .then(() => {
            console.log('App Shell mis en cache avec succès');
            // Mise en cache des ressources additionnelles (non critiques)
            return cache.addAll(RESOURCES_TO_CACHE);
          });
      })
      .then(() => {
        // Force l'activation immédiate du nouveau service worker
        return self.skipWaiting();
      })
  );
});

// Récupération des ressources mises en cache
self.addEventListener('fetch', (event) => {  // Ne pas intercepter les requêtes qui ne peuvent pas être mises en cache
  const url = new URL(event.request.url);
  const isChromeExtension = url.protocol === 'chrome-extension:';
  const isUnsupportedProtocol = !['http:', 'https:'].includes(url.protocol);
  
  if (isChromeExtension || isUnsupportedProtocol) {
    console.log('Ignoring unsupported URL:', event.request.url);
    return; // Ne pas intercepter cette requête
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Si trouvé dans le cache, retourner la réponse mise en cache
        if (response) {
          return response;
        }
        
        // Important: faire une copie de la requête
        // Car une requête est un flux qui ne peut être consommé qu'une fois
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then((response) => {
            // Vérifier si la réponse est valide
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            try {
              // Important: faire une copie de la réponse
              // Car une réponse est un flux qui ne peut être consommé qu'une fois
              const responseToCache = response.clone();
  
              // Mettre en cache la nouvelle ressource
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                })
                .catch(error => {
                  console.error('Erreur lors de la mise en cache:', error);
                });
            } catch (error) {
              console.error('Erreur lors du traitement de la réponse:', error);
            }

            return response;
          })
          .catch(error => {
            console.error('Erreur fetch:', error);
            // Retourner une réponse d'erreur ou fallback si disponible
            return new Response('Erreur réseau', { status: 503, statusText: 'Service non disponible' });
          });
      })
  );
});

// Nettoyage des anciens caches et activation
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Suppression de l\'ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('Service Worker activé');
      // Permet au service worker de prendre le contrôle immédiat
      return self.clients.claim();
    })
  );
});
