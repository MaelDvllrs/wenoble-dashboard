# 🌐 Système de Domaines Personnalisés - Architecture Complète

## 📋 Vue d'ensemble

Le système permet aux clients de configurer leur propre domaine en **une seule étape DNS simple** : pointer leur domaine vers l'IP du VPS.

**Infrastructure** : VPS avec Nginx (remplace Apache) + PM2 pour Node.js + Reverse proxy vers Cloudflare Worker

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ 1. monsite.com
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DNS CONFIGURATION                             │
│  A Record: @ → VPS_IP (ex: 123.45.67.89)                        │
│  A Record: www → VPS_IP                                          │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ 2. Résolution DNS
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   VPS REVERSE PROXY                              │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Caddy / Nginx                                            │  │
│  │  - Reçoit la requête HTTP/HTTPS                          │  │
│  │  - Génère automatiquement le certificat SSL (Caddy)      │  │
│  │  - Passe le Host header original                         │  │
│  │  - Proxy vers Cloudflare Worker                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ 3. Proxy avec Host: monsite.com
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CLOUDFLARE WORKER                              │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Router Worker                                            │  │
│  │  1. Lit le Host header                                    │  │
│  │  2. Lookup dans DB/KV: monsite.com → project-xyz         │  │
│  │  3. Proxy vers project-xyz.pages.dev                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ 4. Fetch content
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CLOUDFLARE PAGES                               │
│                                                                   │
│  project-xyz.pages.dev                                          │
│  - Contenu statique du site                                     │
│  - HTML, CSS, JS, images                                        │
└─────────────────────────────────────────────────────────────────┘
```

## ✨ Avantages

### Pour le client :
- ✅ **Configuration ultra-simple** : Seulement 2 enregistrements DNS (A Record)
- ✅ **Pas de compte Cloudflare requis**
- ✅ **SSL automatique** sans aucune action
- ✅ **Temps de configuration** : 5-30 minutes (propagation DNS)

### Pour vous (admin) :
- ✅ **Centralisation** : Tous les domaines passent par votre VPS
- ✅ **Contrôle total** : Monitoring, logs, rate limiting
- ✅ **Automatisation** : Avec Caddy, SSL automatique pour tous les domaines
- ✅ **Flexibilité** : Changement de provider (Cloudflare → autre) sans impact client

## 📝 Configuration Client (Vue utilisateur)

Quand un client configure son domaine dans l'interface, il voit :

```
✅ Domaine configuré avec succès !

🎯 Enregistrements DNS à ajouter :

┌────────────────────────────────────────┐
│ Type  : A                              │
│ Nom   : @                              │
│ Valeur: 123.45.67.89 📋               │
│ TTL   : 3600 secondes                  │
│ 💡 Domaine racine (monsite.com)       │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ Type  : A                              │
│ Nom   : www                            │
│ Valeur: 123.45.67.89 📋               │
│ TTL   : 3600 secondes                  │
│ 💡 Sous-domaine www                    │
└────────────────────────────────────────┘

📝 Étapes à suivre :
1. Connectez-vous à votre registraire (OVH, Gandi, etc.)
2. Accédez à la zone DNS
3. Ajoutez l'enregistrement A : @ → 123.45.67.89
4. Ajoutez l'enregistrement A : www → 123.45.67.89
5. Supprimez tout autre enregistrement conflictuel
6. Sauvegardez

⏱️ La propagation DNS prend 5-30 minutes
```

## 🔧 Configuration Technique

### 1. Variables d'environnement

Ajoutez dans `.env` :

```env
# IP publique du VPS
VPS_IP=123.45.67.89

# URL du Cloudflare Worker (router)
CLOUDFLARE_WORKER_URL=https://domain-router.votre-compte.workers.dev

# Type de reverse proxy (caddy recommandé)
PROXY_TYPE=caddy
```

### 2. Installation du Reverse Proxy

#### Option A : Caddy (Recommandé)

```bash
# Installation
sudo apt install caddy

# Configuration (/etc/caddy/Caddyfile)
{
    email votre-email@example.com
}

:80, :443 {
    tls {
        on_demand
    }
    
    reverse_proxy https://domain-router.votre-compte.workers.dev {
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }
}

# Redémarrer
sudo systemctl restart caddy
```

**✨ Avec Caddy, chaque nouveau domaine obtient automatiquement son certificat SSL !**

#### Option B : Nginx

Voir `docs/vps-reverse-proxy-setup.md` pour la configuration Nginx complète.

### 3. Configuration du Cloudflare Worker

Créez un Worker qui route les requêtes vers le bon projet :

```javascript
// domain-router worker
export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const hostname = url.hostname;
        
        // Lookup dans D1 database
        const result = await env.DB.prepare(
            'SELECT folder_project FROM websites WHERE website_slug = ?'
        ).bind(hostname).first();
        
        if (!result) {
            return new Response('Domain not configured', { status: 404 });
        }
        
        // Proxy vers Cloudflare Pages
        const pagesUrl = `https://${result.folder_project}.pages.dev${url.pathname}${url.search}`;
        
        return fetch(pagesUrl, {
            method: request.method,
            headers: request.headers,
            body: request.body,
        });
    }
};
```

## 🔄 Workflow Complet

### Côté Client (Interface)

1. Client va dans **Paramètres du site** → **Domaine personnalisé**
2. Entre son domaine : `monsite.com`
3. Clique sur **"Configurer"**
4. Voit les instructions DNS avec l'IP à configurer
5. Configure les DNS chez son registraire
6. Attend 5-30 minutes
7. ✅ Son site est accessible sur `monsite.com` avec HTTPS !

### Côté Backend

1. **POST /configure-custom-domain/:websiteId**
   - Vérifie l'autorisation premium
   - Récupère `folder_project` du site
   - Appelle Cloudflare API pour ajouter le domaine au projet Pages
   - Enregistre `website_slug = monsite.com` en DB
   - Retourne les instructions DNS (A Record → VPS_IP)

2. **VPS** (optionnel avec Nginx)
   - Si `PROXY_TYPE=nginx`, peut auto-configurer Nginx + Certbot
   - Si `PROXY_TYPE=caddy`, rien à faire (automatique)

3. **Cloudflare Worker**
   - Reçoit les requêtes avec `Host: monsite.com`
   - Lookup `monsite.com` → trouve `folder_project`
   - Proxy vers `folder_project.pages.dev`
   - Retourne le contenu

## 🛠️ Scripts Utilitaires

### Configurer manuellement un domaine sur le VPS

```bash
node scripts/configure-domain-vps.js monsite.com add
```

### Supprimer un domaine du VPS

```bash
node scripts/configure-domain-vps.js monsite.com remove
```

### Vérifier la configuration d'un domaine

```bash
node scripts/configure-domain-vps.js monsite.com verify
```

## 📊 Monitoring et Logs

### Caddy
```bash
# Logs
sudo journalctl -u caddy -f

# Status
sudo systemctl status caddy

# Certificats SSL
sudo caddy list-certificates
```

### Nginx
```bash
# Logs
sudo tail -f /var/log/nginx/custom-domains-access.log
sudo tail -f /var/log/nginx/custom-domains-error.log

# Status
sudo systemctl status nginx

# Certificats SSL
sudo certbot certificates
```

## 🔐 Sécurité

- ✅ **SSL automatique** : Let's Encrypt via Caddy/Certbot
- ✅ **Rate limiting** : Configurable dans Caddy/Nginx
- ✅ **Firewall** : Seuls ports 80 et 443 ouverts
- ✅ **Headers sécurisés** : X-Frame-Options, CSP, etc.
- ✅ **Logs centralisés** : Pour détecter les abus

## 🚀 Scalabilité

- Caddy peut gérer **des milliers de domaines** avec SSL on-demand
- Le VPS peut être **load-balancé** avec plusieurs instances
- Cloudflare Worker handle le trafic (pas de limite pratique)
- Base de données optimisée avec index sur `website_slug`

## 📚 Documentation Complémentaire

- `docs/vps-reverse-proxy-setup.md` - Guide détaillé VPS
- `docs/dns-configuration-guide.md` - Guide DNS complet
- `docs/user-guide-custom-domain.md` - Guide utilisateur final
- `scripts/configure-domain-vps.js` - Script d'automatisation

## ❓ FAQ

**Q: Pourquoi ne pas pointer directement vers Cloudflare ?**
R: Configuration DNS trop complexe pour un client lambda. Avec le VPS, c'est juste une IP.

**Q: Le VPS ne va-t-il pas être un goulot d'étranglement ?**
R: Non, il ne fait que du proxy. Caddy est très performant. On peut aussi load-balancer.

**Q: Que se passe-t-il si le VPS tombe ?**
R: Les domaines sont inaccessibles. Mettre en place un système de failover (DNS secondaire).

**Q: Combien de domaines Caddy peut gérer ?**
R: Des milliers, voire dizaines de milliers avec l'option on_demand.

**Q: Les certificats SSL expirent ?**
R: Non, Caddy les renouvelle automatiquement (Let's Encrypt 90 jours).
