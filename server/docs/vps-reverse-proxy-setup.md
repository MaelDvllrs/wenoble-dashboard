# Configuration du VPS comme Reverse Proxy pour les Domaines Personnalisés

## Architecture

```
Client Browser
    ↓
Client Domain (monsite.com) → DNS A Record → VPS IP
    ↓
VPS (Nginx/Caddy)
    ↓
Cloudflare Worker (routing par Host header)
    ↓
Cloudflare Pages (site correct)
```

## Avantages de cette approche

✅ **Simple pour le client** : Une seule configuration DNS (A Record vers IP VPS)
✅ **Flexible** : Vous contrôlez le routing côté serveur
✅ **SSL automatique** : Avec Caddy ou Certbot
✅ **Centralisé** : Tous les domaines passent par votre VPS
✅ **Monitoring** : Vous pouvez logger et analyser le trafic

---

## Option 1 : Nginx (Traditionnel)

### 1. Installation de Nginx

```bash
# Sur Ubuntu/Debian
sudo apt update
sudo apt install nginx

# Démarrer Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2. Configuration du Reverse Proxy Dynamique

Créez le fichier `/etc/nginx/sites-available/custom-domains` :

```nginx
# Configuration pour tous les domaines personnalisés
server {
    listen 80;
    listen [::]:80;
    
    # Accepter tous les domaines
    server_name _;
    
    # Logs
    access_log /var/log/nginx/custom-domains-access.log;
    error_log /var/log/nginx/custom-domains-error.log;
    
    location / {
        # Proxy vers le Cloudflare Worker
        proxy_pass https://votre-worker.votre-compte.workers.dev;
        
        # Passer le Host header original (important!)
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Augmenter les timeouts si nécessaire
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Suivre les redirections
        proxy_redirect off;
    }
}
```

### 3. Activer la configuration

```bash
sudo ln -s /etc/nginx/sites-available/custom-domains /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. SSL avec Certbot (Let's Encrypt)

```bash
# Installer Certbot
sudo apt install certbot python3-certbot-nginx

# Obtenir un certificat SSL pour un domaine
sudo certbot --nginx -d monsite.com -d www.monsite.com

# Renouvellement automatique
sudo certbot renew --dry-run
```

**Note** : Pour chaque nouveau domaine client, vous devrez exécuter :
```bash
sudo certbot --nginx -d nouveaudomaine.com -d www.nouveaudomaine.com
```

---

## Option 2 : Caddy (Recommandé - Plus Simple)

### 1. Installation de Caddy

```bash
# Ubuntu/Debian
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

### 2. Configuration Automatique

Créez le fichier `/etc/caddy/Caddyfile` :

```caddy
# Configuration ultra-simple avec SSL automatique
{
    # Email pour Let's Encrypt
    email votre-email@example.com
}

# Accepter TOUS les domaines et obtenir automatiquement SSL
:80, :443 {
    # Obtenir automatiquement les certificats SSL pour tous les domaines
    tls {
        on_demand
    }
    
    # Proxy vers Cloudflare Worker
    reverse_proxy https://votre-worker.votre-compte.workers.dev {
        # Passer le Host header original
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }
    
    # Logs
    log {
        output file /var/log/caddy/access.log
    }
}
```

### 3. Démarrer Caddy

```bash
sudo systemctl start caddy
sudo systemctl enable caddy
sudo systemctl status caddy
```

**✨ Avantage Caddy** : SSL automatique pour TOUS les nouveaux domaines sans intervention !

---

## Option 3 : Configuration Dynamique avec Script Node.js

Si vous voulez plus de contrôle, vous pouvez créer un script qui génère automatiquement les configurations Nginx/Caddy quand un domaine est ajouté.

### Script d'auto-configuration

Créez `server/scripts/configure-domain-proxy.js` :

```javascript
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Ajoute un domaine au reverse proxy (Nginx)
 */
async function addDomainToNginx(domain) {
    const nginxConfig = `
server {
    listen 80;
    listen [::]:80;
    server_name ${domain} www.${domain};
    
    location / {
        proxy_pass https://votre-worker.votre-compte.workers.dev;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`;

    // Écrire la configuration
    const configPath = `/etc/nginx/sites-available/${domain}`;
    fs.writeFileSync(configPath, nginxConfig);
    
    // Créer le lien symbolique
    await execPromise(`ln -sf ${configPath} /etc/nginx/sites-enabled/${domain}`);
    
    // Tester la configuration
    await execPromise('nginx -t');
    
    // Recharger Nginx
    await execPromise('systemctl reload nginx');
    
    // Obtenir le certificat SSL
    await execPromise(`certbot --nginx -d ${domain} -d www.${domain} --non-interactive --agree-tos`);
    
    console.log(`✅ Domaine ${domain} configuré avec succès`);
}

/**
 * Ajoute un domaine au reverse proxy (Caddy)
 */
async function addDomainToCaddy(domain) {
    // Avec Caddy + on_demand, pas besoin de configuration par domaine!
    // Le domaine sera automatiquement géré
    console.log(`✅ Domaine ${domain} sera automatiquement géré par Caddy`);
}

module.exports = { addDomainToNginx, addDomainToCaddy };
```

---

## Configuration du Cloudflare Worker

Votre Worker doit router les requêtes vers le bon site Cloudflare Pages en fonction du Host header.

```javascript
// worker.js
export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const hostname = url.hostname;
        
        // Récupérer le mapping domaine → projet depuis KV ou D1
        const projectName = await env.DOMAIN_MAPPING.get(hostname);
        
        if (!projectName) {
            return new Response('Domain not found', { status: 404 });
        }
        
        // Rediriger vers le projet Cloudflare Pages
        const pagesUrl = `https://${projectName}.pages.dev${url.pathname}${url.search}`;
        
        return fetch(pagesUrl, {
            method: request.method,
            headers: request.headers,
            body: request.body,
        });
    }
};
```

---

## Variables d'environnement à ajouter

Dans votre fichier `.env` :

```env
# IP publique du VPS
VPS_IP=123.45.67.89

# URL du Cloudflare Worker
CLOUDFLARE_WORKER_URL=https://votre-worker.votre-compte.workers.dev

# Configuration du reverse proxy
PROXY_TYPE=caddy  # ou 'nginx'
```

---

## Workflow complet

1. **Client configure le domaine** dans l'interface wenoble-dashboard
2. **Backend** :
   - Enregistre le domaine dans la DB (`website_slug`)
   - Configure le domaine sur Cloudflare Pages
   - Retourne les instructions DNS simples (A Record → VPS IP)
3. **Client** ajoute le A Record dans son registraire
4. **VPS** (Nginx/Caddy) :
   - Reçoit les requêtes sur ce domaine
   - Fait un reverse proxy vers le Cloudflare Worker
   - Gère automatiquement le SSL (avec Caddy c'est automatique!)
5. **Cloudflare Worker** :
   - Reçoit la requête avec le Host header original
   - Lookup le domaine dans la DB/KV
   - Redirige vers le bon projet Cloudflare Pages

---

## Recommandation Finale

🏆 **Utilisez Caddy avec `on_demand` TLS** :
- SSL automatique pour tous les nouveaux domaines
- Configuration unique sans modification
- Gestion automatique des certificats
- Beaucoup plus simple que Nginx + Certbot

Avec Caddy, vous n'avez **rien à faire** quand un nouveau domaine est ajouté ! Le client ajoute juste son A Record vers votre VPS et c'est tout. 🎉
