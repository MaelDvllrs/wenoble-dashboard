#!/bin/bash

###############################################################################
# Script de vérification post-migration
# Vérifie que tout fonctionne correctement après la migration Apache → Nginx
###############################################################################

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0
WARNINGS=0

check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

check_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo "=========================================="
echo "🔍 Vérification Post-Migration"
echo "=========================================="
echo ""

###############################################################################
# 1. Services
###############################################################################

echo "📦 1. Services"
echo "----------------------------------------"

# Nginx
if systemctl is-active --quiet nginx; then
    check_pass "Nginx est actif"
    
    # Vérifier ports
    if netstat -tulnp 2>/dev/null | grep -q ':80.*nginx'; then
        check_pass "Nginx écoute sur le port 80"
    else
        check_fail "Nginx n'écoute pas sur le port 80"
    fi
    
    if netstat -tulnp 2>/dev/null | grep -q ':443.*nginx'; then
        check_pass "Nginx écoute sur le port 443"
    else
        check_warn "Nginx n'écoute pas sur le port 443 (normal si pas de SSL)"
    fi
else
    check_fail "Nginx n'est pas actif"
fi

# Apache (devrait être arrêté)
if systemctl is-active --quiet apache2 2>/dev/null; then
    check_warn "Apache est toujours actif (devrait être arrêté après migration finale)"
else
    check_pass "Apache est arrêté"
fi

# PM2
if command -v pm2 &> /dev/null; then
    PM2_STATUS=$(pm2 jlist 2>/dev/null | jq -r '.[0].pm2_env.status' 2>/dev/null || echo "unknown")
    if [ "$PM2_STATUS" == "online" ]; then
        check_pass "Backend Node.js est actif (PM2)"
    else
        check_fail "Backend Node.js n'est pas actif: $PM2_STATUS"
    fi
else
    check_fail "PM2 n'est pas installé"
fi

echo ""

###############################################################################
# 2. Configuration Nginx
###############################################################################

echo "⚙️  2. Configuration Nginx"
echo "----------------------------------------"

# Test configuration
if nginx -t 2>&1 | grep -q "syntax is ok"; then
    check_pass "Configuration Nginx valide"
else
    check_fail "Configuration Nginx invalide"
fi

# Sites activés
if [ -L /etc/nginx/sites-enabled/dashboard-client ]; then
    check_pass "Site dashboard-client activé"
else
    check_warn "Site dashboard-client non activé"
fi

if [ -L /etc/nginx/sites-enabled/client-domains ]; then
    check_pass "Site client-domains activé"
else
    check_warn "Site client-domains non activé"
fi

# Logs
if [ -f /var/log/nginx/dashboard-client-access.log ]; then
    check_pass "Logs dashboard présents"
else
    check_warn "Logs dashboard absents"
fi

echo ""

###############################################################################
# 3. Connectivité
###############################################################################

echo "🌐 3. Connectivité"
echo "----------------------------------------"

# Port 80
if curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null | grep -qE '^[23]'; then
    check_pass "Port 80 répond (HTTP)"
else
    check_fail "Port 80 ne répond pas"
fi

# Port 443
if curl -s -o /dev/null -w "%{http_code}" https://localhost 2>/dev/null | grep -qE '^[23]'; then
    check_pass "Port 443 répond (HTTPS)"
elif curl -s -o /dev/null -I https://localhost 2>&1 | grep -q "SSL"; then
    check_warn "Port 443 accessible mais certificat invalide (normal si Certbot pas encore configuré)"
else
    check_warn "Port 443 ne répond pas (normal si pas de SSL configuré)"
fi

# Backend Node.js
BACKEND_PORT=$(grep -r "proxy_pass.*localhost:" /etc/nginx/sites-available/ 2>/dev/null | grep -oP 'localhost:\K\d+' | head -1)
if [ -n "$BACKEND_PORT" ]; then
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:${BACKEND_PORT} 2>/dev/null | grep -qE '^[23]'; then
        check_pass "Backend Node.js répond sur le port ${BACKEND_PORT}"
    else
        check_fail "Backend Node.js ne répond pas sur le port ${BACKEND_PORT}"
    fi
fi

echo ""

###############################################################################
# 4. SSL / Certificats
###############################################################################

echo "🔐 4. SSL / Certificats"
echo "----------------------------------------"

if command -v certbot &> /dev/null; then
    check_pass "Certbot est installé"
    
    CERT_COUNT=$(certbot certificates 2>/dev/null | grep -c "Certificate Name:" || echo "0")
    if [ "$CERT_COUNT" -gt 0 ]; then
        check_pass "Certificats SSL configurés ($CERT_COUNT)"
        
        # Vérifier expiration
        certbot certificates 2>/dev/null | grep -A 3 "Certificate Name:" | while read line; do
            if echo "$line" | grep -q "Expiry Date:"; then
                check_info "$line"
            fi
        done
    else
        check_warn "Aucun certificat SSL configuré (exécutez: sudo certbot --nginx -d votre-domaine.com)"
    fi
else
    check_warn "Certbot n'est pas installé"
fi

echo ""

###############################################################################
# 5. Fichiers et Permissions
###############################################################################

echo "📁 5. Fichiers et Permissions"
echo "----------------------------------------"

# Dossier frontend
DASHBOARD_CLIENT_PATH=$(grep -r "root " /etc/nginx/sites-available/dashboard-client 2>/dev/null | grep -v "#" | awk '{print $2}' | tr -d ';' | head -1)
if [ -n "$DASHBOARD_CLIENT_PATH" ] && [ -d "$DASHBOARD_CLIENT_PATH" ]; then
    check_pass "Dossier frontend existe: $DASHBOARD_CLIENT_PATH"
    
    if [ -f "$DASHBOARD_CLIENT_PATH/index.html" ]; then
        check_pass "Fichier index.html présent"
    else
        check_fail "Fichier index.html absent (build frontend requis)"
    fi
else
    check_fail "Dossier frontend introuvable"
fi

# Permissions logs
if [ -w /var/log/nginx ]; then
    check_pass "Permissions logs Nginx OK"
else
    check_warn "Permissions logs Nginx à vérifier"
fi

echo ""

###############################################################################
# 6. Performance et Ressources
###############################################################################

echo "📊 6. Performance et Ressources"
echo "----------------------------------------"

# Mémoire
MEM_TOTAL=$(free -m | awk 'NR==2{print $2}')
MEM_USED=$(free -m | awk 'NR==2{print $3}')
MEM_PERCENT=$((MEM_USED * 100 / MEM_TOTAL))

if [ $MEM_PERCENT -lt 80 ]; then
    check_pass "Utilisation mémoire: ${MEM_PERCENT}% (${MEM_USED}MB / ${MEM_TOTAL}MB)"
else
    check_warn "Utilisation mémoire élevée: ${MEM_PERCENT}% (${MEM_USED}MB / ${MEM_TOTAL}MB)"
fi

# Disque
DISK_PERCENT=$(df -h / | awk 'NR==2{print $5}' | tr -d '%')
if [ $DISK_PERCENT -lt 80 ]; then
    check_pass "Utilisation disque: ${DISK_PERCENT}%"
else
    check_warn "Utilisation disque élevée: ${DISK_PERCENT}%"
fi

# Processus Nginx
NGINX_PROCS=$(ps aux | grep -c "[n]ginx")
check_info "Processus Nginx actifs: $NGINX_PROCS"

echo ""

###############################################################################
# 7. Logs (dernières erreurs)
###############################################################################

echo "📝 7. Logs récents"
echo "----------------------------------------"

if [ -f /var/log/nginx/error.log ]; then
    ERROR_COUNT=$(grep -c "error" /var/log/nginx/error.log 2>/dev/null || echo "0")
    if [ "$ERROR_COUNT" -eq 0 ]; then
        check_pass "Aucune erreur dans les logs Nginx"
    else
        check_warn "$ERROR_COUNT erreurs trouvées dans /var/log/nginx/error.log"
        echo ""
        check_info "Dernières 5 erreurs:"
        tail -n 5 /var/log/nginx/error.log | sed 's/^/    /'
    fi
fi

if command -v pm2 &> /dev/null; then
    PM2_ERRORS=$(pm2 jlist 2>/dev/null | jq -r '.[0].pm2_env.unstable_restarts' 2>/dev/null || echo "0")
    if [ "$PM2_ERRORS" -eq 0 ]; then
        check_pass "Backend stable (0 restart)"
    else
        check_warn "Backend a redémarré $PM2_ERRORS fois"
    fi
fi

echo ""

###############################################################################
# 8. Sécurité
###############################################################################

echo "🔒 8. Sécurité"
echo "----------------------------------------"

# Firewall
if command -v ufw &> /dev/null; then
    if ufw status 2>/dev/null | grep -q "Status: active"; then
        check_pass "Firewall UFW actif"
    else
        check_warn "Firewall UFW inactif"
    fi
else
    check_info "UFW non installé"
fi

# Headers sécurité
if grep -r "X-Frame-Options" /etc/nginx/nginx.conf >/dev/null 2>&1; then
    check_pass "Headers de sécurité configurés"
else
    check_warn "Headers de sécurité non configurés dans nginx.conf"
fi

echo ""

###############################################################################
# Résumé
###############################################################################

echo "=========================================="
echo "📊 Résumé"
echo "=========================================="
echo ""

TOTAL=$((PASSED + FAILED + WARNINGS))
echo -e "Total de vérifications: ${BLUE}$TOTAL${NC}"
echo -e "Réussites: ${GREEN}$PASSED${NC}"
echo -e "Échecs: ${RED}$FAILED${NC}"
echo -e "Avertissements: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ Tout est parfait ! Migration réussie.${NC}"
    exit 0
elif [ $FAILED -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Migration OK mais avec des avertissements.${NC}"
    echo "Vérifiez les points ci-dessus."
    exit 0
else
    echo -e "${RED}❌ Des problèmes critiques ont été détectés.${NC}"
    echo ""
    echo "Actions recommandées:"
    echo "  1. Consultez les logs: tail -f /var/log/nginx/error.log"
    echo "  2. Vérifiez la config: sudo nginx -t"
    echo "  3. Consultez PM2: pm2 logs"
    echo "  4. Si nécessaire, rollback: sudo bash rollback-to-apache.sh"
    exit 1
fi
