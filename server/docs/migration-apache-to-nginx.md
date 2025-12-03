# 🔄 Migration Apache → Nginx (Sans Interruption)

## 📋 Situation Actuelle

**Apache gère actuellement :**
- Dashboard Client (frontend React)
- Dashboard Server (backend Node.js)
- Sites clients (domaines personnalisés)

**Objectif :**
- Migrer vers Nginx comme serveur principal et reverse proxy
- **Sans interruption de service**
- Configuration progressive et sécurisée

---

## 🎯 Stratégie de Migration

### Phase 1 : Installation Nginx en parallèle
- Installer Nginx sur un port différent (8080)
- Configurer et tester sans toucher à Apache
- Nginx écoute temporairement sur le port 8080

### Phase 2 : Migration du Dashboard
- Transférer le dashboard client sur Nginx
- Transférer le dashboard server (reverse proxy Node.js)
- Tester et valider

### Phase 3 : Migration des domaines clients
- Configurer Nginx pour les domaines personnalisés
- Basculer les domaines un par un
- Monitoring et validation

### Phase 4 : Basculement final
- Arrêter Apache sur port 80/443
- Basculer Nginx sur port 80/443
- Désinstaller Apache

---

## 📦 Phase 1 : Installation Nginx en Parallèle

### 1. Installation de Nginx

```bash
# Mise à jour
sudo apt update

# Installation
sudo apt install nginx

# Vérifier qu'Apache tourne toujours
sudo systemctl status apache2

# Nginx ne doit PAS démarrer sur 80/443 (conflit avec Apache)
sudo systemctl stop nginx
```

### 2. Configuration Nginx sur port temporaire (8080)

Éditez `/etc/nginx/nginx.conf` :

```nginx
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 768;
}

http {
    # Configuration de base
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logs
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    # Inclure les configurations de sites
    include /etc/nginx/sites-enabled/*;
}
```

### 3. Démarrer Nginx sur port 8080

```bash
# Démarrer Nginx
sudo systemctl start nginx

# Vérifier qu'il tourne
sudo systemctl status nginx
sudo netstat -tulnp | grep nginx

# Tester
curl -I http://localhost:8080
```

---

## 🖥️ Phase 2 : Migration du Dashboard

### Étape 2.1 : Configuration du Dashboard Client (React)

Créez `/etc/nginx/sites-available/dashboard-client` :

```nginx
# Dashboard Client - Port 8080 (temporaire)
server {
    listen 8080;
    server_name votre-domaine-dashboard.com;

    root /chemin/vers/wenoble-dashboard/client/dist;
    index index.html;

    # Logs spécifiques
    access_log /var/log/nginx/dashboard-client-access.log;
    error_log /var/log/nginx/dashboard-client-error.log;

    # Gestion du routing React (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache pour les assets statiques
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy vers le backend Node.js
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Étape 2.2 : Build du Client React

```bash
cd /chemin/vers/wenoble-dashboard/client

# Installer les dépendances (si nécessaire)
npm install

# Build de production
npm run build

# Le dossier dist/ contient les fichiers statiques
ls -la dist/
```

### Étape 2.3 : Configuration du Backend Node.js avec PM2

```bash
# Installer PM2 (si pas déjà installé)
sudo npm install -g pm2

# Aller dans le dossier server
cd /chemin/vers/wenoble-dashboard/server

# Démarrer le serveur avec PM2
pm2 start index.js --name "wenoble-server"

# Sauvegarder la configuration PM2
pm2 save

# Configurer PM2 pour démarrer au boot
pm2 startup

# Vérifier que le serveur tourne
pm2 status
curl http://localhost:3000/health
```

### Étape 2.4 : Activer la configuration Nginx

```bash
# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/dashboard-client /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx

# Tester l'accès
curl -I http://localhost:8080
curl -I http://votre-domaine-dashboard.com:8080
```

### Étape 2.5 : Tester le Dashboard

```bash
# Tester frontend
curl -I http://votre-domaine-dashboard.com:8080

# Tester backend via Nginx
curl -I http://votre-domaine-dashboard.com:8080/api/health

# Tester dans le navigateur
firefox http://votre-domaine-dashboard.com:8080
```

**✅ Validation** : Le dashboard doit fonctionner sur le port 8080 via Nginx

---

## 🌐 Phase 3 : Migration des Domaines Clients

### Étape 3.1 : Configuration Nginx pour les domaines clients

Créez `/etc/nginx/sites-available/client-domains` :

```nginx
# Configuration pour TOUS les domaines clients
server {
    listen 8080;
    server_name _;  # Accepte tous les domaines

    # Logs
    access_log /var/log/nginx/client-domains-access.log;
    error_log /var/log/nginx/client-domains-error.log;

    location / {
        # Proxy vers le Cloudflare Worker
        proxy_pass https://domain-router.votre-compte.workers.dev;
        
        # Headers importants
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        # Configuration proxy
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Suivre les redirections
        proxy_redirect off;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
}
```

### Étape 3.2 : Activer et tester

```bash
# Activer la configuration
sudo ln -s /etc/nginx/sites-available/client-domains /etc/nginx/sites-enabled/

# Tester
sudo nginx -t

# Recharger
sudo systemctl reload nginx

# Tester avec un domaine client (sur port 8080)
curl -H "Host: domaine-client-test.com" http://localhost:8080
```

### Étape 3.3 : Test avec un seul domaine client

**Modifier temporairement un DNS client pour pointer vers VPS:8080**

1. Ajouter temporairement le port 8080 au DNS
2. Vérifier que le site fonctionne
3. Si OK, passer au basculement final

---

## 🔄 Phase 4 : Basculement Final (Port 80/443)

### Étape 4.1 : Obtenir les certificats SSL avec Certbot

```bash
# Installer Certbot pour Nginx
sudo apt install certbot python3-certbot-nginx

# Obtenir les certificats pour le dashboard
sudo certbot --nginx -d votre-domaine-dashboard.com

# Les certificats sont automatiquement configurés dans Nginx
```

### Étape 4.2 : Reconfigurer Nginx sur ports 80/443

Modifiez `/etc/nginx/sites-available/dashboard-client` :

```nginx
# Dashboard Client - HTTP (redirect to HTTPS)
server {
    listen 80;
    server_name votre-domaine-dashboard.com;
    
    # Redirection HTTPS
    return 301 https://$server_name$request_uri;
}

# Dashboard Client - HTTPS
server {
    listen 443 ssl http2;
    server_name votre-domaine-dashboard.com;

    # Certificats SSL (configurés par Certbot)
    ssl_certificate /etc/letsencrypt/live/votre-domaine-dashboard.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine-dashboard.com/privkey.pem;
    
    # Configuration SSL moderne
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    root /chemin/vers/wenoble-dashboard/client/dist;
    index index.html;

    access_log /var/log/nginx/dashboard-client-access.log;
    error_log /var/log/nginx/dashboard-client-error.log;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Modifiez `/etc/nginx/sites-available/client-domains` :

```nginx
# Domaines clients - HTTP (redirect to HTTPS)
server {
    listen 80;
    server_name _;
    
    return 301 https://$host$request_uri;
}

# Domaines clients - HTTPS
server {
    listen 443 ssl http2;
    server_name _;

    # SSL on-demand (géré par Certbot au fur et à mesure)
    ssl_certificate /etc/letsencrypt/live/default/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/default/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    access_log /var/log/nginx/client-domains-access.log;
    error_log /var/log/nginx/client-domains-error.log;

    location / {
        proxy_pass https://domain-router.votre-compte.workers.dev;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_redirect off;
    }
}
```

### Étape 4.3 : Arrêter Apache et basculer Nginx

**⚠️ POINT DE NON-RETOUR - Faire un backup avant !**

```bash
# 1. Backup de la configuration Apache
sudo cp -r /etc/apache2 /etc/apache2.backup
sudo systemctl stop apache2

# 2. Tester Nginx
sudo nginx -t

# 3. Recharger Nginx
sudo systemctl reload nginx

# 4. Vérifier que Nginx écoute sur 80 et 443
sudo netstat -tulnp | grep nginx

# 5. Tester l'accès
curl -I http://votre-domaine-dashboard.com
curl -I https://votre-domaine-dashboard.com

# 6. Si tout fonctionne, désactiver Apache au démarrage
sudo systemctl disable apache2

# 7. (Optionnel) Désinstaller Apache plus tard
# sudo apt remove apache2
```

---

## 🔧 Configuration Optimale Nginx

### Fichier `/etc/nginx/nginx.conf` complet

```nginx
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 2048;
    use epoll;
    multi_accept on;
}

http {
    # Basic Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;
    client_max_body_size 100M;

    # MIME
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss 
               application/rss+xml font/truetype font/opentype 
               application/vnd.ms-fontobject image/svg+xml;
    gzip_disable "msie6";

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_conn_zone $binary_remote_addr zone=addr:10m;

    # Virtual Host Configs
    include /etc/nginx/sites-enabled/*;
}
```

---

## 📋 Script de Migration Automatique

Créez `scripts/migrate-to-nginx.sh` :

```bash
#!/bin/bash

# Script de migration Apache → Nginx
# Usage: sudo bash migrate-to-nginx.sh

set -e

echo "=========================================="
echo "🔄 Migration Apache → Nginx"
echo "=========================================="

# Variables
DASHBOARD_DOMAIN="votre-domaine-dashboard.com"
DASHBOARD_CLIENT_PATH="/chemin/vers/wenoble-dashboard/client/dist"
WORKER_URL="https://domain-router.votre-compte.workers.dev"

echo ""
echo "📦 Phase 1: Installation de Nginx..."
apt update
apt install -y nginx certbot python3-certbot-nginx

echo ""
echo "🛑 Arrêt de Nginx (éviter conflit avec Apache)..."
systemctl stop nginx

echo ""
echo "📝 Phase 2: Configuration Nginx..."

# Dashboard Client
cat > /etc/nginx/sites-available/dashboard-client << 'EOF'
server {
    listen 8080;
    server_name DASHBOARD_DOMAIN;

    root DASHBOARD_CLIENT_PATH;
    index index.html;

    access_log /var/log/nginx/dashboard-client-access.log;
    error_log /var/log/nginx/dashboard-client-error.log;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Remplacer les variables
sed -i "s|DASHBOARD_DOMAIN|$DASHBOARD_DOMAIN|g" /etc/nginx/sites-available/dashboard-client
sed -i "s|DASHBOARD_CLIENT_PATH|$DASHBOARD_CLIENT_PATH|g" /etc/nginx/sites-available/dashboard-client

# Client domains
cat > /etc/nginx/sites-available/client-domains << 'EOF'
server {
    listen 8080;
    server_name _;

    access_log /var/log/nginx/client-domains-access.log;
    error_log /var/log/nginx/client-domains-error.log;

    location / {
        proxy_pass WORKER_URL;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sed -i "s|WORKER_URL|$WORKER_URL|g" /etc/nginx/sites-available/client-domains

# Activer les sites
ln -sf /etc/nginx/sites-available/dashboard-client /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/client-domains /etc/nginx/sites-enabled/

echo ""
echo "✅ Configuration Nginx créée sur port 8080"

echo ""
echo "🚀 Phase 3: Démarrage Nginx..."
systemctl start nginx
systemctl enable nginx

echo ""
echo "🧪 Test de la configuration..."
nginx -t

echo ""
echo "=========================================="
echo "✅ Migration Phase 1 terminée!"
echo "=========================================="
echo ""
echo "Prochaines étapes:"
echo "1. Tester le dashboard: http://$DASHBOARD_DOMAIN:8080"
echo "2. Vérifier les logs: tail -f /var/log/nginx/*.log"
echo "3. Si OK, lancer le basculement final avec: sudo bash migrate-to-nginx.sh --final"
echo ""
```

---

## 🔍 Monitoring Post-Migration

### Logs Nginx

```bash
# Tous les logs
tail -f /var/log/nginx/*.log

# Dashboard uniquement
tail -f /var/log/nginx/dashboard-client-*.log

# Domaines clients
tail -f /var/log/nginx/client-domains-*.log

# Erreurs uniquement
tail -f /var/log/nginx/error.log
```

### Performance

```bash
# Connexions actives
watch -n 1 'ss -s'

# Status Nginx
systemctl status nginx

# Processus Nginx
ps aux | grep nginx

# Test de charge
ab -n 1000 -c 10 https://votre-domaine-dashboard.com/
```

---

## ⚠️ Plan de Rollback

Si quelque chose ne fonctionne pas :

```bash
# 1. Arrêter Nginx
sudo systemctl stop nginx
sudo systemctl disable nginx

# 2. Redémarrer Apache
sudo systemctl start apache2
sudo systemctl enable apache2

# 3. Vérifier Apache
sudo systemctl status apache2
curl -I http://votre-domaine-dashboard.com

# 4. Restaurer la config Apache si besoin
sudo cp -r /etc/apache2.backup/* /etc/apache2/
```

---

## ✅ Checklist de Migration

### Avant migration
- [ ] Backup de la configuration Apache
- [ ] Backup de la base de données
- [ ] Liste de tous les domaines actifs
- [ ] Test du dashboard en local
- [ ] Variables d'environnement configurées

### Phase 1 (Port 8080)
- [ ] Nginx installé
- [ ] Configuration dashboard testée sur :8080
- [ ] Configuration domaines clients testée sur :8080
- [ ] PM2 configuré pour le backend
- [ ] Logs accessibles et fonctionnels

### Phase 2 (Basculement)
- [ ] Certificats SSL obtenus
- [ ] Configuration sur ports 80/443 testée
- [ ] Apache arrêté
- [ ] Nginx sur 80/443 fonctionnel
- [ ] Dashboard accessible en HTTPS
- [ ] Domaines clients accessibles en HTTPS

### Post-migration
- [ ] Monitoring actif
- [ ] Logs vérifiés
- [ ] Performance validée
- [ ] Apache désactivé au boot
- [ ] Documentation mise à jour

---

## 📚 Ressources

- [Documentation Nginx](https://nginx.org/en/docs/)
- [Certbot Documentation](https://certbot.eff.org/)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- Guide de migration: Ce fichier
- Architecture: `docs/custom-domain-architecture.md`
