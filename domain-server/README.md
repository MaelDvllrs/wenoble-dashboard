# Serveur de Redirection des Domaines Personnalisés

Ce serveur Node.js s'occupe de rediriger les domaines personnalisés vers les bons workers Cloudflare Pages.

## 🎯 Fonctionnalités

- **Redirection automatique** : Redirige les domaines configurés vers leurs workers Cloudflare respectifs
- **Vérification des permissions** : Vérifie que le domaine a la feature `custom_domain` activée
- **Proxy intelligent** : Redirection HTTP pour GET, proxy pour POST/PUT/DELETE
- **Health checks** : Endpoints de monitoring et vérification de santé
- **Logs détaillés** : Suivi complet des redirections et erreurs

## 📁 Structure

```
domain-server/
├── index.js                    # Point d'entrée principal
├── package.json                # Dépendances et scripts
├── .env.example               # Variables d'environnement exemple
├── routes/
│   ├── health.js              # Endpoints de santé
│   └── domainRedirect.js      # Logique de redirection
├── utils/
│   └── dnsVerification.js     # Outils de vérification DNS
└── README.md                  # Ce fichier
```

## 🚀 Installation

```bash
cd domain-server
npm install
```

## ⚙️ Configuration

Copiez `.env.example` vers `.env` et configurez :

```bash
# Base de données
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Serveur
PORT=3003
NODE_ENV=production

# VPS
VPS_IP=your_vps_ip

# Cloudflare (pour futures fonctionnalités)
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
```

## 🏃‍♂️ Démarrage

### Développement
```bash
npm run dev
```

### Production
```bash
npm start
```

### Avec ngrok (tests externes)
```bash
# Option 1: Script automatique (Windows)
./start-ngrok.bat

# Option 2: Script PowerShell
./start-ngrok.ps1

# Option 3: Manuel
npm run dev  # Terminal 1
ngrok http 3003  # Terminal 2

# Option 4: Via npm
npm run ngrok  # Après avoir démarré le serveur
```

## 🌐 Tests avec ngrok

Une fois ngrok démarré, vous obtenez une URL publique :
```
https://1234-abcd-efgh.ngrok-free.app -> http://localhost:3003
```

### Tests avec l'URL ngrok
```bash
# Health check public
curl https://1234-abcd-efgh.ngrok-free.app/health

# Test de redirection avec header Host
curl -H "Host: mondomaine.com" https://1234-abcd-efgh.ngrok-free.app/

# Tests automatisés avec ngrok
NGROK_URL=https://1234-abcd-efgh.ngrok-free.app npm test
```

Voir le guide détaillé dans [`NGROK-TESTING.md`](./NGROK-TESTING.md)

## 📊 Endpoints

### Health Check
- **GET** `/health` - État général du serveur
- **GET** `/health/db` - Test de connexion base de données

### Redirection
- **ALL** `/*` - Redirection automatique des domaines configurés

## 🔄 Fonctionnement

1. **Requête reçue** : Le serveur capture toutes les requêtes
2. **Vérification du domaine** : Recherche dans la base de données
3. **Validation des permissions** : Vérifie la feature `custom_domain`
4. **Génération de l'URL** : Crée l'URL du worker Cloudflare
5. **Redirection/Proxy** : 
   - GET → Redirection HTTP 302
   - POST/PUT/DELETE → Proxy avec transfert des données

## 🗃️ Base de Données

Le serveur utilise les tables suivantes :
- `websites` : Informations des sites (slug, folder)
- `website_subscriptions` : Abonnements actifs
- `subscription_plans` : Plans avec features

## 📝 Logs

Le serveur génère des logs détaillés :
```
[2025-11-14T10:30:00.000Z] GET / - Host: mondomaine.com - IP: 192.168.1.1
[Redirect] Requête reçue - Host: mondomaine.com, Path: /, Method: GET
[Redirect] ✅ Redirection: mondomaine.com/ → https://mon-site.pages.dev/
```

## 🛡️ Sécurité

- Vérification des permissions par abonnement
- Validation des domaines en base de données
- Proxy sécurisé avec headers appropriés
- Gestion des erreurs sans exposition d'informations sensibles

## 🔧 Configuration Nginx

Pour utiliser ce serveur avec Nginx :

```nginx
# Redirection des domaines personnalisés
server {
    listen 80;
    listen 443 ssl http2;
    server_name *.votredomaine.com;
    
    location / {
        proxy_pass http://localhost:3003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🚨 Dépannage

### Domaine non trouvé
- Vérifiez que le domaine est enregistré dans la table `websites`
- Le `website_slug` doit correspondre exactement au domaine

### Custom domain non autorisé
- Vérifiez l'abonnement dans `website_subscriptions`
- Le plan doit avoir `features.custom_domain = true`

### Erreur de proxy
- Vérifiez que l'URL du worker Cloudflare est accessible
- Vérifiez les logs pour les détails de l'erreur

## 📈 Monitoring

Utilisez les endpoints de health check pour monitorer :
- `/health` : État général
- `/health/db` : Connexion base de données

Exemple avec curl :
```bash
curl http://localhost:3003/health
```