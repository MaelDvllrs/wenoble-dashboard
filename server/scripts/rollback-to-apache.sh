#!/bin/bash

###############################################################################
# Script de ROLLBACK - Retour à Apache si problème avec Nginx
# Usage: sudo bash rollback-to-apache.sh
###############################################################################

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Vérifier root
if [ "$EUID" -ne 0 ]; then 
    log_error "Ce script doit être exécuté en tant que root (sudo)"
    exit 1
fi

echo "=========================================="
echo "🔙 ROLLBACK - Retour à Apache"
echo "=========================================="
echo ""

log_warning "Ce script va:"
echo "  1. Arrêter Nginx"
echo "  2. Restaurer la configuration Apache (si backup disponible)"
echo "  3. Redémarrer Apache"
echo ""

read -p "Continuer? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_error "Rollback annulé"
    exit 1
fi

###############################################################################
# Phase 1: Trouver le backup le plus récent
###############################################################################

log_info "📦 Recherche du backup..."

BACKUP_DIR=$(ls -td /root/migration-backup-* 2>/dev/null | head -1)

if [ -z "$BACKUP_DIR" ]; then
    log_error "Aucun backup trouvé dans /root/migration-backup-*"
    log_info "Essayez de restaurer manuellement la configuration Apache"
    exit 1
fi

log_success "Backup trouvé: $BACKUP_DIR"

###############################################################################
# Phase 2: Arrêter Nginx
###############################################################################

log_info "🛑 Arrêt de Nginx..."

if systemctl is-active --quiet nginx; then
    systemctl stop nginx
    systemctl disable nginx
    log_success "Nginx arrêté et désactivé"
else
    log_info "Nginx n'est pas actif"
fi

###############################################################################
# Phase 3: Restaurer Apache
###############################################################################

log_info "📥 Restauration de la configuration Apache..."

if [ -d "$BACKUP_DIR/apache2" ]; then
    # Backup de la config actuelle au cas où
    if [ -d /etc/apache2 ]; then
        mv /etc/apache2 /etc/apache2.before-rollback-$(date +%Y%m%d-%H%M%S)
    fi
    
    # Restaurer la config
    cp -r "$BACKUP_DIR/apache2" /etc/apache2
    log_success "Configuration Apache restaurée"
else
    log_error "Backup Apache non trouvé dans $BACKUP_DIR"
    exit 1
fi

###############################################################################
# Phase 4: Redémarrer Apache
###############################################################################

log_info "🚀 Redémarrage d'Apache..."

# Vérifier la configuration
if ! apache2ctl configtest 2>/dev/null; then
    log_error "Configuration Apache invalide"
    log_info "Vérifiez manuellement: sudo apache2ctl configtest"
    exit 1
fi

# Démarrer Apache
systemctl start apache2
systemctl enable apache2

if systemctl is-active --quiet apache2; then
    log_success "Apache démarré et activé"
else
    log_error "Impossible de démarrer Apache"
    systemctl status apache2
    exit 1
fi

###############################################################################
# Phase 5: Vérifications
###############################################################################

log_info "✅ Vérifications..."

echo ""
echo "=========================================="
echo "📊 État des services"
echo "=========================================="

# Apache
if systemctl is-active --quiet apache2; then
    log_success "Apache est actif"
    apache2 -v
else
    log_error "Apache n'est pas actif"
fi

# Nginx
if systemctl is-active --quiet nginx; then
    log_warning "Nginx est toujours actif (devrait être arrêté)"
else
    log_success "Nginx est arrêté"
fi

# PM2
if command -v pm2 &> /dev/null; then
    log_info "PM2 est toujours installé (backend Node.js)"
    pm2 status
fi

echo ""
echo "=========================================="
echo "🌐 Test de connectivité"
echo "=========================================="

# Test port 80
if nc -z localhost 80 2>/dev/null; then
    log_success "Port 80 accessible"
else
    log_error "Port 80 inaccessible"
fi

# Test port 443
if nc -z localhost 443 2>/dev/null; then
    log_success "Port 443 accessible"
else
    log_warning "Port 443 inaccessible (normal si pas de SSL)"
fi

echo ""
echo "=========================================="
log_success "✅ Rollback terminé!"
echo "=========================================="
echo ""

log_info "Apache a été restauré et redémarré"
log_info "Backup utilisé: $BACKUP_DIR"
echo ""
log_info "Vérifiez que votre site fonctionne:"
echo "  curl -I http://localhost"
echo "  curl -I https://votre-domaine.com"
echo ""
log_warning "Si vous voulez réessayer la migration vers Nginx:"
echo "  1. Analysez ce qui n'a pas fonctionné"
echo "  2. Corrigez la configuration"
echo "  3. Relancez: sudo bash migrate-to-nginx.sh --test"

exit 0
