# 🧪 Guide de Test du Serveur de Domaines

## 📋 Prérequis

1. **Node.js** installé (version 16+)
2. **Accès à la base de données** (Supabase configuré)
3. **Variables d'environnement** configurées

## 🚀 Configuration Rapide

### 1. Installation
```bash
cd domain-server
npm install
```

### 2. Configuration
```bash
# Copier les variables d'environnement
cp .env.example .env

# Les variables sont déjà configurées, mais vérifiez :
# SUPABASE_URL=https://zaagwamadxckevfocnul.supabase.co
# SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# PORT=3003
```

### 3. Démarrage du serveur
```bash
# Mode développement (avec auto-reload)
npm run dev

# Ou mode production
npm start
```

**Sortie attendue :**
```
🚀 Serveur de redirection des domaines démarré
📍 Port: 3003
🌍 Environment: dev
💾 Supabase URL: ✅ Configuré
☁️  Cloudflare: ✅ Configuré

📊 Health check: http://localhost:3003/health
🔄 Redirection active pour tous les domaines configurés
```

## 🧪 Tests Automatisés

### Tests complets
```bash
# Lance tous les tests automatiquement
npm test

# Ou directement
node test-local.js
```

**Ce que ça teste :**
- ✅ Santé du serveur
- ✅ Connexion base de données  
- ✅ Liste des sites configurés
- ✅ Redirection de domaines fictifs
- ✅ Redirection de vrais domaines

### Test d'un domaine spécifique
```bash
# Tester un domaine particulier
npm run test:domain mondomaine.com

# Avec un chemin spécifique
npm run test:domain mondomaine.com /ma-page
```

## 🔧 Tests Manuels

### 1. Health Check
```bash
curl http://localhost:3003/health
```

**Réponse attendue :**
```json
{
  "status": "OK",
  "timestamp": "2025-11-14T10:30:00.000Z",
  "uptime": 123.456,
  "services": {
    "supabase": "configured",
    "cloudflare": "configured"
  }
}
```

### 2. Test Base de Données
```bash
curl http://localhost:3003/health/db
```

### 3. Test de Redirection
```bash
# Simuler une requête avec un header Host
curl -H "Host: mondomaine.com" http://localhost:3003/

# Avec un chemin
curl -H "Host: mondomaine.com" http://localhost:3003/ma-page
```

**Réponses possibles :**
- **302 Redirect** : Domaine autorisé → redirection vers Cloudflare
- **404 Not Found** : Domaine non configuré en base
- **403 Forbidden** : Domaine trouvé mais sans feature custom_domain

## 🌐 Tests avec de Vrais Domaines

### Méthode 1: Fichier Hosts (Recommandée)

1. **Éditer le fichier hosts** (en tant qu'administrateur)
   - Windows: `C:\Windows\System32\drivers\etc\hosts`
   - Mac/Linux: `/etc/hosts`

2. **Ajouter une ligne :**
   ```
   127.0.0.1  mondomaine.com
   ```

3. **Tester dans le navigateur :**
   ```
   http://mondomaine.com:3003/
   ```

### Méthode 2: ngrok (Pour tests externes)

1. **Installer ngrok**
2. **Exposer le serveur :**
   ```bash
   ngrok http 3003
   ```
3. **Utiliser l'URL fournie** pour les tests

### Méthode 3: Postman/Insomnia

1. **URL :** `http://localhost:3003/`
2. **Headers :** 
   ```
   Host: mondomaine.com
   ```

## 📊 Interprétation des Résultats

### ✅ Succès (302 Redirect)
```bash
[Redirect] ✅ Redirection: mondomaine.com/ → https://mon-site.pages.dev/
```

### ⚠️ Domaine Non Trouvé (404)
```json
{
  "error": "Domaine non configuré",
  "domain": "mondomaine.com",
  "message": "Ce domaine n'est pas enregistré dans le système"
}
```

**Solution :** Ajouter le domaine dans la table `websites`

### ⚠️ Feature Non Autorisée (403)
```json
{
  "error": "Custom domain non autorisé", 
  "domain": "mondomaine.com",
  "message": "Votre plan ne permet pas l'utilisation de domaines personnalisés",
  "plan": "free"
}
```

**Solution :** Mettre à jour le plan pour avoir `custom_domain: true`

## 🐛 Résolution de Problèmes

### Serveur ne démarre pas
- ✅ Vérifier que le port 3003 est libre
- ✅ Vérifier les variables .env
- ✅ Installer les dépendances avec `npm install`

### Base de données inaccessible
- ✅ Vérifier `SUPABASE_URL` et `SUPABASE_SERVICE_KEY`
- ✅ Tester la connexion : `npm test`

### Pas de redirections
- ✅ Vérifier que le domaine existe dans la table `websites`
- ✅ Vérifier l'abonnement actif avec feature `custom_domain`
- ✅ Vérifier le champ `folder` pour générer l'URL Cloudflare

## 📝 Logs Utiles

Le serveur génère des logs détaillés :

```
[2025-11-14T10:30:00.000Z] GET / - Host: mondomaine.com - IP: ::1
[Redirect] Requête reçue - Host: mondomaine.com, Path: /, Method: GET
[Redirect] ✅ Redirection: mondomaine.com/ → https://mon-site.pages.dev/
```

## 🎯 Checklist de Test

- [ ] Serveur démarre sans erreur
- [ ] Health check répond OK
- [ ] Connexion DB fonctionne
- [ ] Liste des sites s'affiche
- [ ] Domaine fictif retourne 404
- [ ] Vrai domaine autorisé redirige (302)
- [ ] Domaine non autorisé retourne 403
- [ ] Logs s'affichent correctement

## 🔄 Tests d'Intégration

Pour tester l'ensemble du système :

1. **Créer un site test** avec custom_domain
2. **Configurer un domaine test** dans hosts
3. **Vérifier la redirection** complète
4. **Tester différents chemins** (/page1, /api/test, etc.)

Voilà ! Votre serveur de domaines est prêt à être testé ! 🚀