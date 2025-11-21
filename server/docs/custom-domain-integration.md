# Intégration Custom Domain - Serveur Principal ↔ Domain-Server

## 📋 Vue d'ensemble

Le système custom domain est maintenant intégré entre le serveur principal et le domain-server pour automatiser la configuration des domaines personnalisés dans Cloudflare Pages.

## 🔄 Architecture

```
Client → Serveur Principal → Domain-Server → Cloudflare Pages API
                          ↓
                     Supabase DB
```

## 🚀 Nouvelles Routes API

### 1. Configuration d'un domaine custom

**POST** `/configure-custom-domain/:websiteId`

Configure automatiquement un domaine personnalisé dans Cloudflare Pages.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "customDomain": "testwenoble.fr"
}
```

**Réponse:**
```json
{
  "success": true,
  "message": "Domaine www.testwenoble.fr configuré dans Cloudflare Pages",
  "domain": "www.testwenoble.fr",
  "rootDomain": "testwenoble.fr",
  "project": "attique-test",
  "dns_records": [
    {
      "type": "A",
      "name": "@",
      "value": "77.37.51.201",
      "ttl": 300,
      "description": "Pointe le domaine racine vers le VPS pour redirection"
    },
    {
      "type": "CNAME",
      "name": "www",
      "value": "attique-test.pages.dev",
      "ttl": 300,
      "description": "Pointe www vers Cloudflare Pages"
    }
  ],
  "instructions": { /* Instructions détaillées par provider */ },
  "cloudflare_status": "pending",
  "next_step": "Configurez les enregistrements DNS chez votre registrar"
}
```

**Ce que fait cette route:**
1. Vérifie l'accès de l'utilisateur au website
2. Récupère les infos du website (folder_project, workspace_id)
3. Ajoute `www.<domain>` dans Cloudflare Pages via domain-server
4. Met à jour la BDD avec `website_slug: www.<domain>`
5. Retourne les enregistrements DNS à configurer

### 2. Vérification DNS complète

**GET** `/verify-custom-domain/:websiteId`

Vérifie la configuration DNS complète (A record + CNAME + Cloudflare status).

**Headers:**
```
Authorization: Bearer <token>
```

**Réponse:**
```json
{
  "configured": true,
  "domain": "www.testwenoble.fr",
  "rootDomain": "testwenoble.fr",
  "wwwDomain": "www.testwenoble.fr",
  "checks": {
    "rootA": {
      "status": "success",
      "message": "testwenoble.fr pointe correctement vers 77.37.51.201",
      "currentIP": "77.37.51.201"
    },
    "wwwCNAME": {
      "status": "success",
      "message": "www.testwenoble.fr pointe correctement vers Cloudflare Pages",
      "currentCNAME": "attique-test.pages.dev"
    },
    "cloudflare": {
      "status": "success",
      "message": "Domaine actif dans Cloudflare Pages",
      "cloudflareStatus": "active"
    }
  },
  "allConfigured": true,
  "verified": true,
  "status": "active"
}
```

**Ce que vérifie cette route:**
1. **A record** : `domain.com` → VPS IP (pour redirection 301)
2. **CNAME record** : `www.domain.com` → `project.pages.dev`
3. **Cloudflare Status** : Domaine actif dans Cloudflare Pages

## 📊 Flux complet côté client

### Étape 1 : L'utilisateur entre son domaine

```javascript
// Interface utilisateur
const customDomain = "testwenoble.fr";

// Appel API
const response = await fetch(`/configure-custom-domain/${websiteId}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ customDomain })
});

const data = await response.json();
// data.dns_records contient les enregistrements à afficher
```

### Étape 2 : Afficher les instructions DNS

```javascript
// Afficher les 2 enregistrements à configurer
data.dns_records.forEach(record => {
  console.log(`Type: ${record.type}`);
  console.log(`Nom: ${record.name}`);
  console.log(`Valeur: ${record.value}`);
  console.log(`Description: ${record.description}`);
});

// Afficher les instructions spécifiques au provider
if (data.instructions) {
  // Instructions détaillées par provider (Hostinger, OVH, etc.)
}
```

### Étape 3 : Vérification périodique

```javascript
// Polling toutes les 30 secondes pour vérifier la configuration
const checkInterval = setInterval(async () => {
  const verifyResponse = await fetch(`/verify-custom-domain/${websiteId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const status = await verifyResponse.json();
  
  // Vérifier chaque étape
  if (status.checks.rootA.status === 'success') {
    console.log('✅ A record configuré');
  }
  
  if (status.checks.wwwCNAME.status === 'success') {
    console.log('✅ CNAME configuré');
  }
  
  if (status.checks.cloudflare.status === 'success') {
    console.log('✅ Cloudflare actif');
  }
  
  if (status.allConfigured) {
    console.log('🎉 Domaine complètement configuré!');
    clearInterval(checkInterval);
  }
}, 30000);
```

## 🔧 Configuration Serveur

### Variables d'environnement

Ajoutez dans `.env` du serveur principal :

```env
# URL du domain-server
DOMAIN_SERVER_URL=http://localhost:3003

# IP du VPS pour vérification DNS
VPS_IP=77.37.51.201
```

### Domain-Server

Le domain-server doit être lancé et accessible :

```bash
cd domain-server
node index.js
```

Routes utilisées:
- `POST /api/auto-config/auto-configure` - Configure le domaine
- `GET /api/auto-config/status/:domain` - Vérifie le statut

## 📝 Base de données

### Table `websites`

Champs utilisés:
```sql
- website_slug (VARCHAR) : www.domain.com
- folder_project (VARCHAR) : nom du projet Cloudflare Pages
- workspace_id (UUID) : ID du workspace
- cloudflare_configured (BOOLEAN) : true si configuré
```

## 🎯 Exemple complet

### 1. Configuration

```bash
POST /configure-custom-domain/abc-123
{
  "customDomain": "testwenoble.fr"
}

→ Ajoute www.testwenoble.fr dans Cloudflare Pages
→ Met à jour la BDD
→ Retourne les enregistrements DNS
```

### 2. Configuration DNS chez Hostinger

```
Type: A
Nom: @
Valeur: 77.37.51.201

Type: CNAME
Nom: www
Valeur: attique-test.pages.dev
```

### 3. Vérification

```bash
GET /verify-custom-domain/abc-123

→ Vérifie A record
→ Vérifie CNAME
→ Vérifie Cloudflare status
→ Retourne le statut complet
```

### 4. Résultat

```
testwenoble.fr → VPS → 301 → www.testwenoble.fr
www.testwenoble.fr → Cloudflare Pages → Site web ✅
```

## ⚠️ Gestion d'erreurs

### Erreur : domain-server inaccessible

```json
{
  "success": false,
  "error": "Impossible de contacter le serveur de domaine",
  "details": "..."
}
```

**Solution** : Vérifier que domain-server tourne sur le port 3003

### Erreur : DNS non propagé

```json
{
  "checks": {
    "rootA": {
      "status": "error",
      "message": "testwenoble.fr non résolu (DNS non propagé)"
    }
  }
}
```

**Solution** : Attendre 15-60 minutes pour la propagation DNS

### Erreur : Cloudflare en attente

```json
{
  "checks": {
    "cloudflare": {
      "status": "warning",
      "cloudflareStatus": "pending"
    }
  }
}
```

**Solution** : Normal, Cloudflare vérifie le DNS (5-15 minutes)

## 🚀 Prochaines étapes

1. ✅ Routes API créées
2. ✅ Vérification DNS complète
3. ⏳ Interface utilisateur côté client
4. ⏳ Gestion des erreurs UI
5. ⏳ Notifications temps réel (websockets?)
