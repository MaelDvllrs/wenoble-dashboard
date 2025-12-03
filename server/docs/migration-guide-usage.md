# 🚀 Guide de Migration Apache → Nginx

## 📋 Présentation

Ce guide vous permet de migrer votre infrastructure **Apache → Nginx** de manière **progressive et sécurisée**, sans interruption de service.

## 🎯 Objectif

Migrer de :
```
Apache (dashboard client + server + domaines clients)
```

Vers :
```
Nginx (dashboard client + reverse proxy vers Node.js) + PM2 (server) + Reverse proxy (domaines clients)
```

---

## ⚙️ Pré-requis

### Sur votre VPS

- Ubuntu/Debian (testé sur Ubuntu 20.04+)
- Apache actuellement en production
- Node.js installé (v16+)
- Accès root (sudo)

### Variables d'environnement

Avant de lancer la migration, configurez ces variables dans votre `.env` ou en export :

```bash
export DASHBOARD_DOMAIN="dashboard.wenoble.com"
export DASHBOARD_CLIENT_PATH="/var/www/wenoble-dashboard/client/dist"
export DASHBOARD_SERVER_PATH="/var/www/wenoble-dashboard/server"
export WORKER_URL="https://domain-router.votre-compte.workers.dev"
export VPS_IP="123.45.67.89"
export NODE_PORT="3000"
```

---

## 🔄 Processus de Migration (2 phases)

### Phase 1 : Test (Port 8080) ⚡ RECOMMANDÉ

Migration sur un port alternatif (8080) pour tester **sans impacter la production**.

```bash
# 1. Télécharger le script
cd /root
wget https://votre-repo/migrate-to-nginx.sh
chmod +x migrate-to-nginx.sh

# 2. Configurer les variables
export DASHBOARD_DOMAIN="dashboard.wenoble.com"
export DASHBOARD_CLIENT_PATH="/var/www/wenoble-dashboard/client"
export DASHBOARD_SERVER_PATH="/var/www/wenoble-dashboard/server"
export WORKER_URL="https://domain-router.workers.dev"
export NODE_PORT="3000"

# 3. Lancer la migration en mode TEST
sudo bash migrate-to-nginx.sh --test
```

**Résultat** :
- ✅ Nginx installé et configuré sur le port **8080**
- ✅ Apache continue de tourner sur les ports **80/443**
- ✅ Backend Node.js géré par PM2
- ✅ Vous pouvez tester : `http://votre-domaine.com:8080`

**Tests à effectuer** :
```bash
# Test dashboard sur port 8080
curl -I http://dashboard.wenoble.com:8080

# Test API backend
curl -I http://dashboard.wenoble.com:8080/api/health

# Logs en temps réel
tail -f /var/log/nginx/dashboard-client-access.log

# Status PM2
pm2 status

# Dans le navigateur
firefox http://dashboard.wenoble.com:8080
```

### Phase 2 : Production (Ports 80/443) 🚀

Une fois les tests validés, basculement sur les ports de production.

```bash
# ⚠️ ATTENTION : Apache sera arrêté
sudo bash migrate-to-nginx.sh --final
```

**Résultat** :
- ✅ Apache arrêté et désactivé
- ✅ Nginx actif sur les ports **80/443**
- ✅ Dashboard accessible en HTTP
- ⚠️ SSL à configurer avec Certbot

**Configuration SSL** :
```bash
# Installer Certbot (si pas déjà fait)
sudo apt install certbot python3-certbot-nginx

# Obtenir un certificat SSL
sudo certbot --nginx -d dashboard.wenoble.com

# Le certificat est automatiquement configuré dans Nginx
# Renouvellement automatique tous les 90 jours
```

---

## 📁 Structure créée

Après migration, vous aurez :

```
/etc/nginx/
├── nginx.conf                      # Configuration principale
├── sites-available/
│   ├── dashboard-client           # Config dashboard
│   └── client-domains             # Config domaines clients (reverse proxy)
└── sites-enabled/
    ├── dashboard-client → ../sites-available/dashboard-client
    └── client-domains → ../sites-available/client-domains

/var/log/nginx/
├── dashboard-client-access.log
├── dashboard-client-error.log
├── client-domains-access.log
└── client-domains-error.log

/var/www/wenoble-dashboard/
├── client/
│   └── dist/                      # Frontend buildé
└── server/
    └── index.js                   # Backend Node.js (PM2)
```

---

## 🔍 Monitoring et Commandes Utiles

### Logs

```bash
# Tous les logs Nginx
tail -f /var/log/nginx/*.log

# Logs dashboard uniquement
tail -f /var/log/nginx/dashboard-client-*.log

# Logs domaines clients
tail -f /var/log/nginx/client-domains-*.log

# Logs backend Node.js (PM2)
pm2 logs wenoble-server

# Logs en temps réel avec coloration
pm2 logs wenoble-server --lines 100
```

### Status des services

```bash
# Nginx
sudo systemctl status nginx
sudo nginx -t                    # Test configuration

# PM2 (Backend)
pm2 status
pm2 monit                        # Monitoring temps réel

# Apache (devrait être arrêté après migration finale)
sudo systemctl status apache2
```

### Performance

```bash
# Connexions actives
sudo ss -s

# Processus Nginx
ps aux | grep nginx

# Utilisation mémoire
free -h
pm2 monit

# Test de charge
ab -n 1000 -c 10 http://dashboard.wenoble.com/
```

### Gestion PM2

```bash
# Redémarrer le backend
pm2 restart wenoble-server

# Recharger (zero-downtime)
pm2 reload wenoble-server

# Arrêter
pm2 stop wenoble-server

# Logs
pm2 logs wenoble-server

# Informations détaillées
pm2 show wenoble-server
```

### Gestion Nginx

```bash
# Recharger la configuration (sans downtime)
sudo systemctl reload nginx

# Redémarrer Nginx
sudo systemctl restart nginx

# Tester la configuration avant reload
sudo nginx -t

# Vérifier la syntaxe d'un fichier spécifique
sudo nginx -t -c /etc/nginx/sites-available/dashboard-client
```

---

## 🔙 Rollback (Retour à Apache)

En cas de problème, vous pouvez revenir à Apache :

```bash
# Script de rollback automatique
sudo bash rollback-to-apache.sh
```

**Ce script va** :
1. Arrêter Nginx
2. Restaurer la configuration Apache depuis le backup
3. Redémarrer Apache
4. Vérifier que tout fonctionne

**Rollback manuel** :
```bash
# Arrêter Nginx
sudo systemctl stop nginx
sudo systemctl disable nginx

# Restaurer Apache
BACKUP_DIR=$(ls -td /root/migration-backup-* | head -1)
sudo cp -r $BACKUP_DIR/apache2/* /etc/apache2/

# Redémarrer Apache
sudo systemctl start apache2
sudo systemctl enable apache2

# Vérifier
sudo systemctl status apache2
curl -I http://localhost
```

---

## 📊 Checklist de Migration

### Avant migration
- [ ] Backup manuel de la base de données
- [ ] Variables d'environnement configurées
- [ ] Accès SSH stable au VPS
- [ ] Liste des domaines clients actifs
- [ ] Test du dashboard en local

### Phase 1 (Port 8080)
- [ ] Script `migrate-to-nginx.sh --test` exécuté
- [ ] Nginx actif sur port 8080
- [ ] Backend Node.js démarre avec PM2
- [ ] Dashboard accessible sur `:8080`
- [ ] API répond sur `:8080/api`
- [ ] Logs Nginx accessibles
- [ ] Apache toujours actif sur 80/443

### Phase 2 (Production)
- [ ] Tests phase 1 validés
- [ ] Script `migrate-to-nginx.sh --final` exécuté
- [ ] Apache arrêté
- [ ] Nginx actif sur 80/443
- [ ] Certificats SSL obtenus (Certbot)
- [ ] Dashboard accessible en HTTPS
- [ ] API fonctionne en HTTPS
- [ ] Domaines clients configurés

### Post-migration
- [ ] Monitoring actif (logs, PM2)
- [ ] Performance validée
- [ ] Backup de la nouvelle config Nginx
- [ ] Documentation à jour
- [ ] DNS des clients pointent vers VPS

---

## 🛠️ Dépannage

### Problème : Nginx ne démarre pas

```bash
# Vérifier la configuration
sudo nginx -t

# Voir les erreurs
sudo journalctl -u nginx -n 50

# Vérifier les ports
sudo netstat -tulnp | grep :80
sudo netstat -tulnp | grep :443

# Si Apache bloque les ports
sudo systemctl stop apache2
sudo systemctl start nginx
```

### Problème : Backend Node.js ne répond pas

```bash
# Vérifier PM2
pm2 status
pm2 logs wenoble-server

# Redémarrer
pm2 restart wenoble-server

# Vérifier le port
curl http://localhost:3000/health
sudo netstat -tulnp | grep :3000

# Vérifier les variables d'environnement
pm2 env wenoble-server
```

### Problème : Erreur 502 Bad Gateway

Cela signifie que Nginx ne peut pas joindre le backend.

```bash
# Vérifier que le backend tourne
pm2 status
curl http://localhost:3000

# Vérifier la configuration Nginx
sudo nginx -t
cat /etc/nginx/sites-available/dashboard-client | grep proxy_pass

# Logs Nginx
tail -f /var/log/nginx/dashboard-client-error.log
```

### Problème : Certificat SSL ne fonctionne pas

```bash
# Re-obtenir le certificat
sudo certbot --nginx -d dashboard.wenoble.com --force-renewal

# Vérifier le certificat
sudo certbot certificates

# Tester le renouvellement
sudo certbot renew --dry-run

# Logs Certbot
sudo journalctl -u certbot -n 50
```

---

## 📚 Ressources

### Documentation
- `migration-apache-to-nginx.md` - Guide complet de migration
- `custom-domain-architecture.md` - Architecture des domaines personnalisés
- `vps-reverse-proxy-setup.md` - Configuration détaillée du reverse proxy

### Scripts
- `migrate-to-nginx.sh` - Script de migration automatique
- `rollback-to-apache.sh` - Script de rollback
- `configure-domain-vps.js` - Configuration automatique des domaines

### Liens externes
- [Documentation Nginx](https://nginx.org/en/docs/)
- [Documentation PM2](https://pm2.keymetrics.io/docs/)
- [Certbot](https://certbot.eff.org/)
- [Let's Encrypt](https://letsencrypt.org/)

---

## 💡 Conseils

1. **Toujours tester en mode `--test` d'abord** sur le port 8080
2. **Gardez Apache actif** pendant la phase de test
3. **Prenez des backups** avant chaque modification
4. **Surveillez les logs** pendant et après la migration
5. **Testez le rollback** une fois en mode test pour vous familiariser
6. **Documentez** vos configurations spécifiques
7. **Planifiez** la migration finale en heures creuses

---

## ✅ Validation Post-Migration

Une fois la migration terminée, validez ces points :

```bash
# 1. Dashboard accessible
curl -I https://dashboard.wenoble.com
firefox https://dashboard.wenoble.com

# 2. API fonctionne
curl -I https://dashboard.wenoble.com/api/health

# 3. Domaines clients fonctionnent
curl -I https://domaine-client-test.com

# 4. SSL valide
openssl s_client -connect dashboard.wenoble.com:443 -servername dashboard.wenoble.com

# 5. Services actifs
sudo systemctl status nginx
pm2 status

# 6. Logs propres (pas d'erreurs)
tail -n 100 /var/log/nginx/error.log

# 7. Performance correcte
ab -n 100 -c 10 https://dashboard.wenoble.com/
```

---

## 📞 Support

En cas de problème :

1. Consultez les logs : `/var/log/nginx/*.log`
2. Vérifiez le statut des services : `systemctl status nginx` et `pm2 status`
3. Testez la configuration : `sudo nginx -t`
4. Si bloqué : utilisez le rollback `sudo bash rollback-to-apache.sh`

**Backup de secours** : `/root/migration-backup-YYYYMMDD-HHMMSS/`

---

🎉 **Bonne migration !**
