# Bloquer l'indexation de l'URL .pages.dev par Google

## Problématique

Lorsqu'un site Cloudflare Pages est créé, il reçoit automatiquement une URL `.pages.dev` (ex: `site-mon-site-1234567890123.pages.dev`). Cette URL de prévisualisation ne doit pas être indexée par Google pour éviter :

- **Contenu dupliqué** : Le même contenu accessible via le domaine personnalisé ET l'URL .pages.dev
- **Pénalités SEO** : Google peut pénaliser les sites avec du contenu dupliqué
- **Confusion utilisateurs** : Les visiteurs peuvent atterrir sur l'URL de développement au lieu du domaine principal

## Solutions à implémenter

### 1. ✅ Robots.txt (Méthode principale)

Créer un fichier `robots.txt` qui bloque tous les crawlers sur l'URL `.pages.dev` mais autorise sur le domaine personnalisé.

**Implémentation recommandée** : Génération dynamique basée sur le domaine :

```javascript
// Dans le build ou à la racine du site déployé
// public/robots.txt ou généré dynamiquement

// Détecter si on est sur .pages.dev
if (window.location.hostname.endsWith('.pages.dev')) {
  // Bloquer tous les robots
  const robotsTxt = `User-agent: *
Disallow: /`;
} else {
  // Autoriser sur le domaine personnalisé
  const robotsTxt = `User-agent: *
Allow: /
Sitemap: https://${window.location.hostname}/sitemap.xml`;
}
```

**Option statique dans Cloudflare Pages** :
```txt
# public/robots.txt
User-agent: *
Disallow: /
```

Puis dans les **Headers Cloudflare**, ajouter une règle pour servir un autre robots.txt sur le domaine personnalisé.

### 2. ✅ Meta Robots (Méthode de sécurité)

Ajouter une balise meta `noindex` dans le `<head>` uniquement sur `.pages.dev` :

```html
<!-- Ajouté dynamiquement via JavaScript -->
<meta name="robots" content="noindex, nofollow">
```

**Implémentation dans le système actuel** :

Modifier le template HTML ou ajouter un script global :

```javascript
// Dans le fichier HTML principal ou dans un script de setup
(function() {
  if (window.location.hostname.endsWith('.pages.dev')) {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
  }
})();
```

### 3. ✅ X-Robots-Tag Header

Configurer Cloudflare Pages pour ajouter un header HTTP qui bloque l'indexation.

**Dans `_headers` (à la racine du projet Cloudflare)** :

```
# _headers

# Sur .pages.dev, bloquer l'indexation
https://*.pages.dev/*
  X-Robots-Tag: noindex, nofollow

# Sur le domaine personnalisé, autoriser
https://votre-domaine.com/*
  X-Robots-Tag: index, follow
```

### 4. ✅ Canonical URL

Toujours pointer vers le domaine personnalisé avec une balise canonical :

```html
<link rel="canonical" href="https://votre-domaine.com/page-actuelle">
```

**Déjà implémenté dans** :
- `server/public/collection-template-loader.js` (ligne 215-220)

S'assurer que le canonical pointe TOUJOURS vers le domaine personnalisé, même depuis `.pages.dev`.

### 5. ✅ Redirections (Méthode la plus efficace)

Rediriger automatiquement `.pages.dev` vers le domaine personnalisé si un custom domain est configuré.

**Dans `_redirects` (à la racine du projet Cloudflare)** :

```
# _redirects

# Si un domaine personnalisé existe, rediriger depuis .pages.dev
https://site-*-*.pages.dev/* https://domaine-personnalise.com/:splat 301
```

**Via Cloudflare Workers** (plus flexible) :

```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    // Si on est sur .pages.dev ET qu'un custom domain existe
    if (url.hostname.endsWith('.pages.dev')) {
      // Récupérer le custom domain depuis la configuration
      const customDomain = await getCustomDomain(url.hostname);
      
      if (customDomain) {
        // Rediriger vers le domaine personnalisé
        return Response.redirect(
          `https://${customDomain}${url.pathname}${url.search}`,
          301
        );
      }
    }
    
    // Sinon, continuer normalement
    return fetch(request);
  }
};
```

### 6. ✅ Google Search Console

Une fois le domaine personnalisé configuré :

1. **Ajouter le domaine personnalisé** dans Google Search Console
2. **Ne PAS ajouter** l'URL `.pages.dev`
3. **Demander la suppression** de l'URL `.pages.dev` si elle est déjà indexée :
   - Aller dans Search Console
   - **Suppressions** > **Nouvelle demande**
   - Supprimer l'URL `.pages.dev`

### 7. ✅ Cloudflare Pages Settings

Dans les paramètres du projet Cloudflare Pages :

1. **Access Policies** : Limiter l'accès public si nécessaire
2. **Branch Deployments** : Désactiver les previews automatiques pour les branches
3. **Custom Domains** : S'assurer que le domaine principal est bien configuré

## Implémentation recommandée dans le système actuel

### Étape 1 : Script anti-indexation automatique

Créer un fichier qui sera inclus dans tous les builds :

```javascript
// server/public/noindex-pages-dev.js
(function() {
  'use strict';
  
  // Détecter si on est sur une URL .pages.dev
  if (window.location.hostname.endsWith('.pages.dev')) {
    console.warn('⚠️ Site accédé via .pages.dev - Indexation bloquée');
    
    // 1. Ajouter meta noindex
    const metaRobots = document.createElement('meta');
    metaRobots.name = 'robots';
    metaRobots.content = 'noindex, nofollow';
    document.head.appendChild(metaRobots);
    
    // 2. Retirer le sitemap si présent
    const sitemapLinks = document.querySelectorAll('link[rel="sitemap"]');
    sitemapLinks.forEach(link => link.remove());
    
    // 3. Ajouter un avertissement visible (optionnel, pour les admins)
    if (sessionStorage.getItem('admin-view')) {
      const warning = document.createElement('div');
      warning.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ff9800;color:#000;padding:8px;text-align:center;z-index:99999;font-size:12px;';
      warning.textContent = '⚠️ Site en mode preview (.pages.dev) - Non indexé par Google';
      document.body.prepend(warning);
    }
  }
})();
```

**Inclure ce script dans le HTML généré** :

```html
<script src="/noindex-pages-dev.js"></script>
```

### Étape 2 : Générer robots.txt dynamique

Modifier le processus de build pour créer un `robots.txt` adapté :

```javascript
// server/modification/generationStatic.js
// Lors de la génération du site statique

const generateRobotsTxt = (isPagesDev, customDomain, hasSitemap) => {
  if (isPagesDev) {
    // Version pour .pages.dev : tout bloquer
    return `User-agent: *
Disallow: /

# Site preview - Not for indexing
# Main site: ${customDomain || 'Configuration en cours'}`;
  } else {
    // Version pour domaine personnalisé : tout autoriser
    return `User-agent: *
Allow: /

${hasSitemap ? `Sitemap: https://${customDomain}/sitemap.xml` : ''}

# Generated by Wenoble
# ${new Date().toISOString()}`;
  }
};

// Lors de la génération du site
const robotsTxtContent = generateRobotsTxt(
  false, // On génère toujours la version "autorisée" car le custom domain sera configuré
  websiteData.website_slug,
  true // hasSitemap
);

fs.writeFileSync(
  path.join(buildDir, 'robots.txt'),
  robotsTxtContent
);
```

### Étape 3 : Ajouter le fichier _headers

Créer un template `_headers` qui sera copié lors du build :

```javascript
// server/public/_headers
# Cloudflare Pages Headers Configuration

# Protection contre l'indexation des previews .pages.dev
/*.pages.dev/*
  X-Robots-Tag: noindex, nofollow
  X-Frame-Options: SAMEORIGIN

# Domaines personnalisés
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
```

Copier ce fichier lors de la génération :

```javascript
// Dans generationStatic.js
fs.copyFileSync(
  path.join(__dirname, '../public/_headers'),
  path.join(buildDir, '_headers')
);
```

### Étape 4 : Redirection automatique (optionnel)

Si vous voulez forcer la redirection de `.pages.dev` vers le custom domain :

```javascript
// server/public/_redirects
# Cloudflare Pages Redirects

# Si custom domain configuré, rediriger .pages.dev
# NOTE: À activer uniquement quand le custom domain est vérifié
# https://site-*-*.pages.dev/* https://votre-domaine.com/:splat 301
```

**⚠️ Attention** : N'activez cette redirection qu'une fois le custom domain complètement configuré et vérifié, sinon vous créerez une boucle infinie.

## Vérification

### Test 1 : robots.txt
```bash
curl https://site-test-123.pages.dev/robots.txt
# Devrait retourner : Disallow: /

curl https://votre-domaine.com/robots.txt
# Devrait retourner : Allow: /
```

### Test 2 : Meta robots
```bash
curl -s https://site-test-123.pages.dev | grep -i "robots"
# Devrait afficher : <meta name="robots" content="noindex, nofollow">
```

### Test 3 : Headers HTTP
```bash
curl -I https://site-test-123.pages.dev
# Devrait afficher : X-Robots-Tag: noindex, nofollow
```

### Test 4 : Google Search Console
```
site:site-test-123.pages.dev
```
Aucun résultat ne devrait apparaître après quelques semaines.

## Résumé des priorités

### 🔴 Priorité 1 (À implémenter immédiatement)
1. **Meta robots dynamique** : Ajouter `<meta name="robots" content="noindex, nofollow">` sur `.pages.dev`
2. **robots.txt** : Bloquer tous les crawlers avec `Disallow: /`
3. **Canonical URL** : Toujours pointer vers le domaine personnalisé

### 🟡 Priorité 2 (Recommandé)
4. **X-Robots-Tag header** : Via fichier `_headers`
5. **Script de vérification** : Inclure `noindex-pages-dev.js` dans les builds

### 🟢 Priorité 3 (Avancé)
6. **Redirection 301** : De `.pages.dev` vers custom domain (après vérification)
7. **Google Search Console** : Demande de suppression si déjà indexé

## Automatisation dans le workflow

Intégrer ces vérifications dans le processus de création/déploiement :

```javascript
// Dans website.js lors de createWebsite
const seoConfig = {
  block_pages_dev: true, // Bloquer l'indexation de .pages.dev
  custom_domain: null,   // Sera rempli lors de la configuration du domaine
  canonical_url: null    // Sera rempli automatiquement
};

// Stocker dans la BDD
await supabase
  .from('websites')
  .insert({
    // ... autres champs
    seo_config: seoConfig
  });
```

Lors de la génération du site, utiliser cette configuration pour ajuster robots.txt, meta tags, etc.

## Conclusion

La combinaison de **robots.txt**, **meta robots**, et **X-Robots-Tag header** offre une protection triple contre l'indexation de l'URL `.pages.dev`. Une fois le custom domain configuré, vous pouvez ajouter une redirection 301 pour une protection maximale.

**Temps de mise en œuvre estimé** : 
- Priorité 1 : 30 minutes
- Priorité 2 : 1 heure
- Priorité 3 : 2 heures

**Impact SEO** : Positif - Élimine le contenu dupliqué et concentre le référencement sur le domaine principal.
