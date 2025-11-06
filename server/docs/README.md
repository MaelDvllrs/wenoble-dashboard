# 📚 Documentation Complète - Système de Domaines Personnalisés

## 🎯 Vue d'ensemble du projet

Ce système permet aux clients de **wenoble-dashboard** d'utiliser leur propre nom de domaine pour leur site, avec une configuration DNS ultra-simple.

---

## 📁 Structure de la Documentation

### Guides Principaux

1. **`custom-domain-architecture.md`** 
   - Architecture complète du système
   - Flux de données (Client → VPS → Cloudflare → Pages)
   - Configuration technique détaillée
   - FAQ et troubleshooting
   
2. **`migration-apache-to-nginx.md`**
   - Guide technique de migration Apache → Nginx
   - Configuration étape par étape
   - Options Nginx vs Caddy
   - Configuration SSL avec Certbot

3. **`migration-guide-usage.md`** ⭐ **COMMENCER ICI**
   - Guide d'utilisation des scripts de migration
   - Checklist complète
   - Commandes essentielles
   - Dépannage courant

4. **`vps-reverse-proxy-setup.md`**
   - Configuration du VPS comme reverse proxy
   - Options Nginx, Caddy, et scripts Node.js
   - Workflow complet client → VPS → Cloudflare

### Guides DNS (pour les clients)

5. **`dns-configuration-guide.md`**
   - Guide détaillé pour tous les registraires
   - Instructions spécifiques (OVH, Gandi, Cloudflare, etc.)
   - Vérification et troubleshooting DNS

6. **`user-guide-custom-domain.md`**
   - Guide simplifié pour l'utilisateur final
   - Étapes visuelles avec captures d'écran
   - FAQ client

---

## 🛠️ Scripts Disponibles

### Scripts de Migration

| Script | Description | Usage |
|--------|-------------|-------|
| `migrate-to-nginx.sh` | Migration automatique Apache → Nginx | `sudo bash migrate-to-nginx.sh [--test\|--final]` |
| `rollback-to-apache.sh` | Retour à Apache en cas de problème | `sudo bash rollback-to-apache.sh` |
| `verify-migration.sh` | Vérification post-migration | `sudo bash verify-migration.sh` |

### Scripts de Gestion

| Script | Description | Usage |
|--------|-------------|-------|
| `configure-domain-vps.js` | Configure un domaine sur le VPS | `node configure-domain-vps.js monsite.com [add\|remove]` |

---

## 🚀 Démarrage Rapide

### Étape 1 : Préparer la Migration

```bash
# Sur votre VPS, en tant que root
cd /root

# Télécharger les scripts (ou git clone)
# Configurer les variables d'environnement
export DASHBOARD_DOMAIN="dashboard.wenoble.com"
export DASHBOARD_CLIENT_PATH="/var/www/wenoble-dashboard/client"
export DASHBOARD_SERVER_PATH="/var/www/wenoble-dashboard/server"
export WORKER_URL="https://domain-router.workers.dev"
export VPS_IP="123.45.67.89"
```

### Étape 2 : Migration en Mode Test

```bash
# Installer Nginx sur port 8080 (Apache reste actif sur 80/443)
sudo bash migrate-to-nginx.sh --test

# Vérifier que tout fonctionne
curl -I http://dashboard.wenoble.com:8080
firefox http://dashboard.wenoble.com:8080

# Consulter les logs
tail -f /var/log/nginx/dashboard-client-access.log
pm2 logs wenoble-server
```

### Étape 3 : Migration Finale

```bash
# ⚠️ Apache sera arrêté, Nginx prendra les ports 80/443
sudo bash migrate-to-nginx.sh --final

# Obtenir les certificats SSL
sudo certbot --nginx -d dashboard.wenoble.com

# Vérifier
sudo bash verify-migration.sh
```

### Étape 4 : Configuration des Domaines Clients

Les clients peuvent maintenant configurer leur domaine dans l'interface :

1. Se connecter au dashboard
2. Aller dans **Paramètres du site** → **Domaine personnalisé**
3. Entrer leur domaine : `monsite.com`
4. Suivre les instructions DNS affichées :
   - Ajouter un enregistrement A : `@` → `123.45.67.89`
   - Ajouter un enregistrement A : `www` → `123.45.67.89`
5. Attendre la propagation DNS (5-30 minutes)
6. Accéder à `https://monsite.com` 🎉

---

## 📊 Architecture Technique

### Infrastructure Actuelle (Après Migration)

```
┌──────────────────────────────────────────────────────────┐
│                    VPS (Nginx + PM2)                      │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Nginx (Ports 80/443)                               │ │
│  │  ├─ Dashboard Client (React SPA)                    │ │
│  │  ├─ Dashboard Server (Reverse proxy → :3000)       │ │
│  │  └─ Domaines Clients (Reverse proxy → Worker)      │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  PM2                                                 │ │
│  │  └─ wenoble-server (Node.js backend sur :3000)     │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌──────────────────────────────────────────────────────────┐
│                 Cloudflare Worker                         │
│  - Reçoit Host: monsite.com                              │
│  - Lookup en DB : monsite.com → project-xyz              │
│  - Proxy vers project-xyz.pages.dev                      │
└──────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│              Cloudflare Pages (project-xyz)               │
│  - Contenu statique du site                              │
└──────────────────────────────────────────────────────────┘
```

### Flux de Données

1. **Client** entre `monsite.com` dans son navigateur
2. **DNS** résout vers l'IP du VPS (`123.45.67.89`)
3. **Nginx** reçoit la requête, génère le SSL (Let's Encrypt)
4. **Nginx** fait un reverse proxy vers le **Cloudflare Worker**
5. **Worker** lit le `Host: monsite.com` header
6. **Worker** lookup dans la DB : `monsite.com` → `project-xyz`
7. **Worker** fait un fetch vers `project-xyz.pages.dev`
8. **Cloudflare Pages** retourne le HTML/CSS/JS
9. **Worker** → **Nginx** → **Client** (le site s'affiche)

---

## 🔍 Monitoring et Maintenance

### Commandes Essentielles

```bash
# Status des services
sudo systemctl status nginx
pm2 status

# Logs en temps réel
tail -f /var/log/nginx/*.log
pm2 logs wenoble-server

# Recharger Nginx (après changement config)
sudo nginx -t && sudo systemctl reload nginx

# Redémarrer backend
pm2 restart wenoble-server

# Vérifier la migration
sudo bash verify-migration.sh
```

### Certificats SSL

```bash
# Obtenir un certificat pour un nouveau domaine
sudo certbot --nginx -d nouveaudomaine.com

# Lister les certificats
sudo certbot certificates

# Renouvellement (automatique, mais pour tester)
sudo certbot renew --dry-run
```

### Performance

```bash
# Connexions actives
sudo ss -s

# Utilisation ressources
htop
pm2 monit

# Test de charge
ab -n 1000 -c 10 https://dashboard.wenoble.com/
```

---

## 🔧 Configuration Personnalisée

### Variables d'Environnement

Créez un fichier `.env` dans `/root/` :

```bash
# VPS
VPS_IP=123.45.67.89

# Dashboard
DASHBOARD_DOMAIN=dashboard.wenoble.com
DASHBOARD_CLIENT_PATH=/var/www/wenoble-dashboard/client
DASHBOARD_SERVER_PATH=/var/www/wenoble-dashboard/server

# Backend
NODE_PORT=3000

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=votre-account-id
CLOUDFLARE_API_TOKEN=votre-api-token
CLOUDFLARE_WORKER_URL=https://domain-router.workers.dev

# Proxy
PROXY_TYPE=nginx  # ou 'caddy'
```

### Charger les variables

```bash
# Dans ~/.bashrc ou ~/.profile
export $(cat /root/.env | xargs)

# Ou
source /root/.env
```

---

## 🆘 Dépannage Rapide

### Problème : Site inaccessible

```bash
# 1. Vérifier Nginx
sudo systemctl status nginx
sudo nginx -t

# 2. Vérifier les logs
tail -f /var/log/nginx/error.log

# 3. Tester la connectivité
curl -I http://localhost
curl -I https://votre-domaine.com

# 4. Si nécessaire, rollback
sudo bash rollback-to-apache.sh
```

### Problème : Backend ne répond pas (502)

```bash
# 1. Vérifier PM2
pm2 status
pm2 logs wenoble-server

# 2. Redémarrer le backend
pm2 restart wenoble-server

# 3. Vérifier le port
curl http://localhost:3000
sudo netstat -tulnp | grep :3000
```

### Problème : Certificat SSL invalide

```bash
# Renouveler le certificat
sudo certbot --nginx -d votre-domaine.com --force-renewal

# Vérifier les certificats
sudo certbot certificates

# Logs Certbot
sudo journalctl -u certbot -n 50
```

---

## 📝 Checklist de Production

Avant de déclarer la migration terminée :

- [ ] Nginx actif sur ports 80/443
- [ ] Apache arrêté et désactivé
- [ ] Backend Node.js démarre avec PM2
- [ ] Certificats SSL obtenus et valides
- [ ] Dashboard accessible en HTTPS
- [ ] API fonctionne (`/api/health`)
- [ ] Logs accessibles et propres
- [ ] Script de vérification passe tous les tests
- [ ] Domaine client test fonctionne
- [ ] Monitoring en place
- [ ] Backups configurés
- [ ] DNS des clients mis à jour
- [ ] Documentation à jour

---

## 📚 Ressources Externes

- [Nginx Documentation](https://nginx.org/en/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Certbot](https://certbot.eff.org/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages](https://developers.cloudflare.com/pages/)

---

## 📞 Support

En cas de problème critique :

1. **Consulter les logs** : `/var/log/nginx/*.log` et `pm2 logs`
2. **Lancer le script de vérification** : `sudo bash verify-migration.sh`
3. **Rollback si nécessaire** : `sudo bash rollback-to-apache.sh`
4. **Consulter la documentation** dans `docs/`

**Backup de secours automatique** : `/root/migration-backup-YYYYMMDD-HHMMSS/`

---

## 🎉 Conclusion

Vous disposez maintenant d'un système complet pour :

✅ Migrer Apache → Nginx sans interruption  
✅ Gérer les domaines clients simplement  
✅ Offrir une configuration DNS ultra-simple aux clients  
✅ Monitorer et maintenir l'infrastructure  
✅ Rollback en cas de problème  

**Bonne migration ! 🚀**
