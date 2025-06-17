// Service worker minimal pour PWA, sans gestion du mode hors ligne

self.addEventListener('install', event => {
  // Activation immédiate du service worker
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Prend le contrôle des pages ouvertes
  self.clients.claim();
});

// Aucun fetch handler : pas de gestion du mode hors ligne