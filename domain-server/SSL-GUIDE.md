# Guide SSL pour Domain Redirection Server

## Option 1: SSL Cloudflare (Recommandé Production)

### Avantages
- Certificats gratuits et automatiques
- Renouvellement automatique
- Performance optimale (CDN)
- Protection DDoS incluse

### Configuration
1. **Ajouter le domaine à Cloudflare**
   - Créer un compte Cloudflare
   - Ajouter `testwenoble.fr` comme site
   - Changer les nameservers chez votre registrar

2. **Configuration DNS dans Cloudflare**
   ```
   Type: CNAME
   Nom: @
   Valeur: 74763f344144.ngrok-free.app
   Proxy: ✅ (Orange Cloud activé)
   ```

3. **SSL Mode dans Cloudflare**
   - SSL/TLS → Overview → "Flexible" (pour ngrok gratuit)
   - Ou "Full" si vous avez SSL sur ngrok aussi

### Flow avec Cloudflare
```
testwenoble.fr → Cloudflare SSL → ngrok → domain-server → redirect 302 → Cloudflare Pages
```

---

## Option 2: SSL ngrok (Limité version gratuite)

### Version gratuite ngrok
- HTTPS automatique sur *.ngrok-free.app
- Pas de custom domain SSL gratuit
- Avertissement browser toujours présent

### Version payante ngrok ($8/mois)
- Custom domain avec SSL automatique
- Pas d'avertissement browser
- Configuration:
  ```bash
  ngrok http 3003 --domain=testwenoble.fr
  ```

---

## Option 3: SSL Let's Encrypt + Reverse Proxy

### Pour VPS en production
```nginx
# nginx.conf
server {
    listen 443 ssl;
    server_name testwenoble.fr;
    
    ssl_certificate /etc/letsencrypt/live/testwenoble.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/testwenoble.fr/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Installation automatique
```bash
# Installation certbot
sudo apt install certbot python3-certbot-nginx

# Génération certificat
sudo certbot --nginx -d testwenoble.fr

# Renouvellement automatique
sudo crontab -e
# Ajouter: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## Recommandations par cas d'usage

### 🧪 **Développement/Test (Actuel)**
- **Utilisez**: ngrok gratuit avec avertissement
- **URL test**: `https://testwenoble.fr?ngrok-skip-browser-warning=true`
- **Certificat**: Auto-géré par ngrok

### 🚀 **Production avec budget minimal**
- **Utilisez**: Cloudflare (gratuit) + VPS
- **Certificat**: Cloudflare automatic SSL
- **Performance**: CDN global inclus

### 💼 **Production avec budget**
- **Utilisez**: ngrok payant ($8/mois)
- **Certificat**: Auto-géré par ngrok
- **Avantage**: Setup le plus simple

### 🏗️ **Production self-hosted**
- **Utilisez**: Let's Encrypt + nginx
- **Certificat**: Gratuit, renouvellement auto
- **Contrôle**: Maximum

---

## Configuration recommandée pour votre cas

### Étape 1: Test immédiat (maintenant)
Continuez avec ngrok gratuit + paramètre de contournement

### Étape 2: Production (recommandé)
1. **Cloudflare gratuit** pour SSL + CDN
2. **VPS** pour héberger domain-server
3. **Let's Encrypt** sur le VPS
4. **nginx** comme reverse proxy

### Code domain-server compatible SSL
```javascript
// Dans index.js - déjà compatible
app.use((req, res, next) => {
  // Support X-Forwarded-Proto pour reverse proxy
  if (req.headers['x-forwarded-proto'] === 'https') {
    req.secure = true;
    req.protocol = 'https';
  }
  next();
});
```