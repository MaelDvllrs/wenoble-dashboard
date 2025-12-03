#!/bin/bash

###############################################################################
# Script de migration Apache → Nginx pour wenoble-dashboard
# Usage: sudo bash migrate-to-nginx.sh [--test|--final]
###############################################################################

set -e

# Couleurs pour l'output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérifier que le script est exécuté en root
if [ "$EUID" -ne 0 ]; then 
    log_error "Ce script doit être exécuté en tant que root (sudo)"
    exit 1
fi

echo "=========================================="
echo "🔄 Migration Apache → Nginx"
echo "=========================================="
echo ""

# Demander la confirmation
read -p "⚠️  Cette migration va modifier la configuration du serveur. Continuer? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_error "Migration annulée"
    exit 1
fi

# Variables - À PERSONNALISER
DASHBOARD_DOMAIN="${DASHBOARD_DOMAIN:-localhost}"
DASHBOARD_CLIENT_PATH="${DASHBOARD_CLIENT_PATH:-/var/www/wenoble-dashboard/client/dist}"
DASHBOARD_SERVER_PATH="${DASHBOARD_SERVER_PATH:-/var/www/wenoble-dashboard/server}"
WORKER_URL="${WORKER_URL:-https://domain-router.workers.dev}"
VPS_IP="${VPS_IP:-0.0.0.0}"
NODE_PORT="${NODE_PORT:-3000}"

log_info "Configuration:"
echo "  - Dashboard domain: $DASHBOARD_DOMAIN"
echo "  - Client path: $DASHBOARD_CLIENT_PATH"
echo "  - Server path: $DASHBOARD_SERVER_PATH"
echo "  - Worker URL: $WORKER_URL"
echo "  - VPS IP: $VPS_IP"
echo "  - Node port: $NODE_PORT"
echo ""

# Mode de migration
MODE="${1:---test}"

if [ "$MODE" == "--final" ]; then
    log_warning "Mode FINAL - Apache sera arrêté et Nginx prendra le port 80/443"
    read -p "Êtes-vous sûr? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "Migration annulée"
        exit 1
    fi
    NGINX_HTTP_PORT=80
    NGINX_HTTPS_PORT=443
else
    log_info "Mode TEST - Nginx utilisera le port 8080"
    NGINX_HTTP_PORT=8080
    NGINX_HTTPS_PORT=8443
fi

###############################################################################
# Phase 1: Backup
###############################################################################

log_info "📦 Phase 1: Backup de la configuration actuelle..."

BACKUP_DIR="/root/migration-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup Apache
if systemctl is-active --quiet apache2; then
    log_info "Backup de la configuration Apache..."
    cp -r /etc/apache2 "$BACKUP_DIR/apache2"
    log_success "Configuration Apache sauvegardée dans $BACKUP_DIR/apache2"
fi

# Backup Nginx si existe
if [ -d /etc/nginx ]; then
    log_info "Backup de la configuration Nginx existante..."
    cp -r /etc/nginx "$BACKUP_DIR/nginx"
    log_success "Configuration Nginx sauvegardée dans $BACKUP_DIR/nginx"
fi

log_success "Backups créés dans $BACKUP_DIR"

###############################################################################
# Phase 2: Installation Nginx
###############################################################################

log_info "📦 Phase 2: Installation de Nginx..."

apt update -qq

if ! command -v nginx &> /dev/null; then
    log_info "Installation de Nginx..."
    apt install -y nginx
    log_success "Nginx installé"
else
    log_info "Nginx déjà installé"
fi

# Arrêter Nginx si en mode test (éviter conflit avec Apache)
if [ "$MODE" == "--test" ]; then
    systemctl stop nginx || true
    log_info "Nginx arrêté (mode test)"
fi

###############################################################################
# Phase 3: Installation PM2 pour Node.js
###############################################################################

log_info "📦 Phase 3: Installation PM2..."

if ! command -v pm2 &> /dev/null; then
    log_info "Installation de PM2..."
    npm install -g pm2
    log_success "PM2 installé"
else
    log_info "PM2 déjà installé"
fi

###############################################################################
# Phase 4: Configuration Nginx
###############################################################################

log_info "📝 Phase 4: Configuration Nginx..."

# Créer les dossiers de logs
mkdir -p /var/log/nginx
chown -R www-data:www-data /var/log/nginx

# Configuration principale Nginx
cat > /etc/nginx/nginx.conf << 'EOF'
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

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Include sites
    include /etc/nginx/sites-enabled/*;
}
EOF

log_success "Configuration principale Nginx créée"

# Configuration Dashboard Client
cat > /etc/nginx/sites-available/dashboard-client << EOF
server {
    listen ${NGINX_HTTP_PORT};
    server_name ${DASHBOARD_DOMAIN};

    root ${DASHBOARD_CLIENT_PATH};
    index index.html;

    access_log /var/log/nginx/dashboard-client-access.log;
    error_log /var/log/nginx/dashboard-client-error.log;

    # SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy to Node.js
    location /api {
        proxy_pass http://localhost:${NODE_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

log_success "Configuration dashboard créée"

# Configuration domaines clients
cat > /etc/nginx/sites-available/client-domains << EOF
# Configuration pour tous les domaines clients
server {
    listen ${NGINX_HTTP_PORT};
    server_name _;  # Accepte tous les domaines

    access_log /var/log/nginx/client-domains-access.log;
    error_log /var/log/nginx/client-domains-error.log;

    location / {
        # Proxy vers Cloudflare Worker
        proxy_pass ${WORKER_URL};
        
        # Headers
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        proxy_redirect off;
    }
}
EOF

log_success "Configuration domaines clients créée"

# Activer les sites
ln -sf /etc/nginx/sites-available/dashboard-client /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/client-domains /etc/nginx/sites-enabled/

# Supprimer le site par défaut
rm -f /etc/nginx/sites-enabled/default

log_success "Sites activés"

###############################################################################
# Phase 5: Démarrage du backend Node.js avec PM2
###############################################################################

log_info "🚀 Phase 5: Configuration du backend Node.js..."

cd "$DASHBOARD_SERVER_PATH"

# Vérifier que le fichier index.js existe
if [ ! -f "index.js" ]; then
    log_error "Fichier index.js non trouvé dans $DASHBOARD_SERVER_PATH"
    exit 1
fi

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    log_info "Installation des dépendances npm..."
    npm install
fi

# Arrêter l'instance PM2 existante si elle existe
pm2 stop wenoble-server 2>/dev/null || true
pm2 delete wenoble-server 2>/dev/null || true

# Démarrer avec PM2
log_info "Démarrage du serveur Node.js avec PM2..."
pm2 start index.js --name "wenoble-server" --time

# Sauvegarder la config PM2
pm2 save

# Configurer PM2 au démarrage
pm2 startup systemd -u root --hp /root

log_success "Backend Node.js démarré avec PM2"

# Vérifier que le serveur répond
sleep 3
if curl -s http://localhost:${NODE_PORT}/health > /dev/null 2>&1; then
    log_success "Backend répond sur le port ${NODE_PORT}"
else
    log_warning "Backend ne répond pas encore sur le port ${NODE_PORT}"
fi

###############################################################################
# Phase 6: Build du frontend
###############################################################################

log_info "🏗️  Phase 6: Build du frontend React..."

cd "$(dirname "$DASHBOARD_CLIENT_PATH")"

if [ -f "package.json" ]; then
    log_info "Installation des dépendances frontend..."
    npm install
    
    log_info "Build de production..."
    npm run build
    
    log_success "Frontend buildé dans $DASHBOARD_CLIENT_PATH"
else
    log_warning "package.json non trouvé, build ignoré"
fi

###############################################################################
# Phase 7: Test et démarrage Nginx
###############################################################################

log_info "🧪 Phase 7: Test de la configuration Nginx..."

nginx -t

if [ $? -eq 0 ]; then
    log_success "Configuration Nginx valide"
else
    log_error "Configuration Nginx invalide"
    exit 1
fi

log_info "🚀 Démarrage de Nginx..."

systemctl start nginx
systemctl enable nginx

log_success "Nginx démarré"

###############################################################################
# Phase 8: Basculement final (si mode --final)
###############################################################################

if [ "$MODE" == "--final" ]; then
    log_warning "🔄 Basculement final - Arrêt d'Apache..."
    
    if systemctl is-active --quiet apache2; then
        systemctl stop apache2
        systemctl disable apache2
        log_success "Apache arrêté et désactivé"
    fi
    
    # Recharger Nginx pour prendre les ports 80/443
    systemctl restart nginx
    log_success "Nginx redémarré sur les ports 80/443"
    
    # Installer Certbot si pas déjà installé
    if ! command -v certbot &> /dev/null; then
        log_info "Installation de Certbot..."
        apt install -y certbot python3-certbot-nginx
        log_success "Certbot installé"
    fi
    
    log_info "Pour obtenir un certificat SSL, exécutez:"
    echo "  sudo certbot --nginx -d $DASHBOARD_DOMAIN"
fi

###############################################################################
# Phase 9: Vérifications finales
###############################################################################

log_info "✅ Phase 9: Vérifications finales..."

echo ""
echo "=========================================="
echo "📊 État des services"
echo "=========================================="

# Nginx
if systemctl is-active --quiet nginx; then
    log_success "Nginx est actif"
else
    log_error "Nginx n'est pas actif"
fi

# PM2
PM2_STATUS=$(pm2 jlist | jq -r '.[0].pm2_env.status' 2>/dev/null || echo "unknown")
if [ "$PM2_STATUS" == "online" ]; then
    log_success "Backend Node.js est actif (PM2)"
else
    log_warning "Backend Node.js: $PM2_STATUS"
fi

# Apache
if systemctl is-active --quiet apache2; then
    log_warning "Apache est toujours actif"
else
    log_info "Apache est arrêté"
fi

echo ""
echo "=========================================="
echo "🌐 Points d'accès"
echo "=========================================="

if [ "$MODE" == "--test" ]; then
    echo "  Dashboard: http://${DASHBOARD_DOMAIN}:${NGINX_HTTP_PORT}"
    echo "  API: http://${DASHBOARD_DOMAIN}:${NGINX_HTTP_PORT}/api"
else
    echo "  Dashboard: http://${DASHBOARD_DOMAIN}"
    echo "  Dashboard HTTPS: https://${DASHBOARD_DOMAIN} (après Certbot)"
    echo "  API: http://${DASHBOARD_DOMAIN}/api"
fi

echo ""
echo "=========================================="
echo "📁 Fichiers importants"
echo "=========================================="
echo "  Backup: $BACKUP_DIR"
echo "  Logs Nginx: /var/log/nginx/"
echo "  Config Nginx: /etc/nginx/sites-available/"
echo "  PM2 logs: pm2 logs wenoble-server"

echo ""
echo "=========================================="
echo "🔍 Commandes utiles"
echo "=========================================="
echo "  Logs Nginx: tail -f /var/log/nginx/*.log"
echo "  Logs PM2: pm2 logs wenoble-server"
echo "  Status Nginx: systemctl status nginx"
echo "  Status PM2: pm2 status"
echo "  Test Nginx: sudo nginx -t"
echo "  Recharger Nginx: sudo systemctl reload nginx"

echo ""

if [ "$MODE" == "--test" ]; then
    log_success "✅ Migration en mode TEST terminée!"
    echo ""
    log_info "Prochaines étapes:"
    echo "  1. Testez le dashboard sur le port ${NGINX_HTTP_PORT}"
    echo "  2. Vérifiez les logs: tail -f /var/log/nginx/*.log"
    echo "  3. Si tout fonctionne, lancez: sudo bash migrate-to-nginx.sh --final"
    echo ""
    log_warning "Apache tourne toujours sur les ports 80/443"
else
    log_success "✅ Migration FINALE terminée!"
    echo ""
    log_info "Prochaines étapes:"
    echo "  1. Obtenez un certificat SSL: sudo certbot --nginx -d $DASHBOARD_DOMAIN"
    echo "  2. Testez le dashboard: https://$DASHBOARD_DOMAIN"
    echo "  3. Configurez les DNS des domaines clients vers: $VPS_IP"
    echo ""
    log_success "Apache a été arrêté et désactivé"
fi

echo ""
log_info "En cas de problème, restaurez la config Apache:"
echo "  sudo systemctl stop nginx"
echo "  sudo cp -r $BACKUP_DIR/apache2/* /etc/apache2/"
echo "  sudo systemctl start apache2"

exit 0
