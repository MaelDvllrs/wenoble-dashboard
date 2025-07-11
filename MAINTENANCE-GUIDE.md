# Guide de maintenance complet - Wenoble Dashboard

## 🎯 Résumé du nettoyage effectué

### Client (React + Vite)
- ✅ **Supprimé** : `@ffmpeg/core`, `@ffmpeg/ffmpeg`, `socket.io-client`, `@types/react-dom`
- ✅ **Nettoyé** : Imports non utilisés dans App.jsx
- ✅ **Sécurité** : Vulnérabilités réduites de 11 à 5
- ✅ **Bundle** : Taille optimisée (5.5 MB → 5.49 MB)

### Serveur (Node.js + Express)
- ✅ **Supprimé** : `crypto-js`, `supabase` (CLI)
- ✅ **Ajouté** : `body-parser`, `googleapis`, `draft-js` (dépendances manquantes)
- ✅ **Sécurité** : Vulnérabilités éliminées (11 → 0)
- ✅ **Stabilité** : Tous les modules critiques préservés

## 🔧 Scripts de maintenance disponibles

### Client
```bash
cd client
npm run clean-deps    # Analyse et nettoyage
npm run analyze       # Analyse depcheck uniquement
npm run build         # Test de build
npm run dev           # Test en développement
```

### Serveur
```bash
cd server
npm run clean-deps    # Analyse intelligente
npm run analyze       # Analyse depcheck (avec faux positifs)
npm run security      # Audit de sécurité
npm start            # Test de démarrage
```

## 📋 Processus de maintenance recommandé

### 🗓️ Mensuel
1. **Analyse client**
   ```bash
   cd client && npm run clean-deps
   cd client && npm audit fix
   ```

2. **Analyse serveur**
   ```bash
   cd server && npm run clean-deps
   cd server && npm run security
   ```

3. **Test complet**
   ```bash
   cd client && npm run build
   cd server && npm start
   ```

### 🚀 Avant chaque déploiement
1. **Audit de sécurité**
   ```bash
   cd client && npm audit
   cd server && npm audit
   ```

2. **Build de production**
   ```bash
   cd client && npm run build
   ```

3. **Test du serveur**
   ```bash
   cd server && npm start
   ```

### 💡 Ajout de nouvelles dépendances
1. **Installation prudente**
   ```bash
   # Client
   cd client && npm install package --save-exact
   cd client && npm run analyze
   
   # Serveur
   cd server && npm install package --save-exact
   cd server && npm run clean-deps
   ```

2. **Vérification immédiate**
   ```bash
   npm run build  # Client
   npm start      # Serveur
   ```

## ⚠️ Modules à ne jamais supprimer

### Client (React)
- `react`, `react-dom` - Core React
- `react-router-dom` - Routage
- `@mui/material`, `@mui/icons-material` - Interface utilisateur
- `@supabase/supabase-js` - Base de données
- `axios` - Requêtes HTTP
- `vite` - Build tool

### Serveur (Node.js)
- `express` - Framework web
- `@supabase/supabase-js` - Base de données
- `cors` - Gestion CORS
- `jsonwebtoken` - Authentification
- `bcryptjs` - Hashage mots de passe
- `multer` - Upload fichiers
- `socket.io` - WebSocket notifications

## 🔍 Dépendances surveillées

### Potentiellement problématiques
- `moment` → Utiliser `dayjs` ou `date-fns`
- `lodash` → Utiliser les méthodes natives JS
- `request` → Utiliser `axios`
- `crypto-js` → Utiliser Node.js crypto natif

### APIs externes (à garder)
- `@google-analytics/data` - Google Analytics
- `googleapis` - Google Search Console
- `resend` - Service email

## 📊 Métriques de santé

### Objectifs cibles
- **Client** : < 10 vulnérabilités, bundle < 6MB
- **Serveur** : 0 vulnérabilité, < 25 dépendances
- **Build time** : < 15 secondes
- **Startup time** : < 5 secondes

### Commandes de monitoring
```bash
# Taille bundle client
cd client && npm run build | grep "gzip:"

# Temps de démarrage serveur
cd server && time npm start

# Vulnérabilités
npm audit --summary

# Dépendances outdated
npm outdated
```

## 🛠️ Troubleshooting

### Erreur "Module not found"
1. Vérifiez si le module est installé : `npm list package`
2. Réinstallez si nécessaire : `npm install package`
3. Vérifiez les imports/require dans le code

### Build qui échoue
1. Nettoyez les caches : `rm -rf node_modules package-lock.json`
2. Réinstallez : `npm install`
3. Testez : `npm run build`

### Serveur qui ne démarre pas
1. Vérifiez les variables d'environnement
2. Testez la syntaxe : `node -c index.js`
3. Vérifiez les ports en conflit

### Vulnérabilités persistantes
1. Essayez : `npm audit fix --force`
2. Vérifiez les alternatives : `npm outdated`
3. Mettez à jour manuellement si nécessaire

## 📈 Avantages obtenus

### Performance
- ⚡ Installation plus rapide
- 🗂️ Bundle plus léger
- 🔄 Builds plus rapides

### Sécurité
- 🔒 Moins de vulnérabilités
- 🛡️ Surface d'attaque réduite
- 🔍 Dépendances tracées

### Maintenance
- 🧹 Code plus propre
- 📦 Dépendances claires
- 🔧 Outils de monitoring

---

**Next steps :**
1. Configurez ces scripts dans votre CI/CD
2. Planifiez les audits réguliers
3. Documentez les nouvelles dépendances ajoutées

*Guide maintenu par l'équipe Wenoble - $(date)*
