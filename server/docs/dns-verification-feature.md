# 🔍 Vérification DNS des Domaines Personnalisés

## 📋 Fonctionnalité

Cette fonctionnalité permet de **vérifier automatiquement** si un domaine personnalisé pointe correctement vers le VPS.

## ✨ Caractéristiques

### Vérification Automatique
- ✅ Vérification au chargement de la page si un domaine est configuré
- ✅ Vérification après configuration d'un nouveau domaine
- ✅ Bouton "Vérifier" pour test manuel à tout moment

### Indicateurs Visuels

#### 1. Domaine Vérifié (✅)
```
État: verified
Couleur: Vert
Message: "Le domaine pointe correctement vers le VPS (IP)"
```

#### 2. DNS Non Propagé (⏳)
```
État: not_propagated
Couleur: Orange
Message: "Le domaine n'est pas encore résolu. La propagation DNS peut prendre de 5 minutes à 48 heures."
Affiche: IP attendue
```

#### 3. Configuration Incorrecte (⚠️)
```
État: misconfigured
Couleur: Rouge
Message: "Configuration incorrecte"
Affiche: 
  - IP actuelle (en rouge)
  - IP attendue (en vert)
  - Instructions de correction
```

## 🔧 Backend - Route `/verify-custom-domain/:websiteId`

### Fonctionnement

```javascript
GET /verify-custom-domain/:websiteId
Headers: Authorization: Bearer <token>

Response:
{
  configured: true,
  verified: true|false,
  domain: "monsite.com",
  currentIP: "123.45.67.89",
  expectedIP: "123.45.67.89",
  wwwConfigured: true|false,
  message: "...",
  status: "active|not_propagated|misconfigured"
}
```

### Vérifications Effectuées

1. **Résolution DNS** du domaine principal (`monsite.com`)
   - Utilise `dns.resolve4()` de Node.js
   - Récupère l'adresse IP A

2. **Comparaison avec VPS_IP**
   - Compare l'IP résolue avec `process.env.VPS_IP`
   - Détermine si la configuration est correcte

3. **Vérification du sous-domaine www**
   - Vérifie également `www.monsite.com`
   - Indique si le sous-domaine est configuré

### États Possibles

| État | Description | Action |
|------|-------------|--------|
| `active` | Domaine pointe vers le VPS | ✅ Tout fonctionne |
| `not_propagated` | DNS non résolu | ⏳ Attendre la propagation |
| `misconfigured` | IP incorrecte | ⚠️ Corriger le DNS |

## 🎨 Frontend - Interface Utilisateur

### Affichage du Domaine Actuel

```jsx
{currentDomain && (
  <div className="input-container">
    <p className="blogField_name">Domaine actuel</p>
    <div style={{
      backgroundColor: /* Couleur selon status */,
      borderRadius: '8px',
      border: /* Bordure selon status */
    }}>
      {/* Icône + Domaine + Bouton Vérifier */}
      {/* Status détaillé avec IP */}
      {/* Instructions si erreur */}
    </div>
  </div>
)}
```

### États de l'Interface

#### Sans Vérification
```
🌐 monsite.com
[🔄 Vérifier]
"Cliquez sur Vérifier pour tester la configuration DNS"
```

#### Vérification en Cours
```
🌐 monsite.com
[⏳ Loading...]
```

#### Domaine Vérifié
```
✅ monsite.com
[🔄 Vérifier]
"✓ Le domaine pointe correctement vers le VPS (123.45.67.89)"
"✓ Le sous-domaine www est également configuré"
```

#### DNS Non Propagé
```
⏳ monsite.com
[🔄 Vérifier]
"⏳ DNS non propagé
 Le domaine n'est pas encore résolu...
 IP attendue : 123.45.67.89"
```

#### Configuration Incorrecte
```
⚠️ monsite.com
[🔄 Vérifier]
"⚠️ Configuration incorrecte
 IP actuelle : 54.32.10.98 (rouge)
 IP attendue : 123.45.67.89 (vert)
 Veuillez corriger votre enregistrement DNS..."
```

## 📝 Workflow Utilisateur

### 1. Configuration Initiale

```
1. Utilisateur configure le domaine "monsite.com"
2. Backend configure Cloudflare + sauvegarde en DB
3. Frontend affiche les instructions DNS
4. Vérification automatique après 2 secondes
   → État probable: "not_propagated"
```

### 2. Attente de Propagation

```
1. Utilisateur configure le DNS chez son registraire
2. Clique sur "Vérifier" régulièrement
3. État: "not_propagated" pendant 5min - 48h
4. Une fois propagé → État: "active"
```

### 3. Vérification Continue

```
1. À chaque ouverture de la page, vérification automatique
2. Bouton "Vérifier" disponible à tout moment
3. Notifications selon le résultat
```

## 🔔 Notifications

| Événement | Type | Message |
|-----------|------|---------|
| Domaine vérifié | Success | "Le domaine pointe correctement vers le VPS !" |
| DNS non propagé | Info | "Le domaine n'est pas encore résolu..." |
| Configuration incorrecte | Warning | "Le domaine pointe vers X au lieu de Y" |
| Erreur vérification | Error | "Erreur lors de la vérification du domaine" |

## 🛠️ Configuration Requise

### Variables d'Environnement

```bash
# server/.env
VPS_IP=123.45.67.89
```

Cette IP est utilisée pour :
1. Afficher dans les instructions DNS
2. Comparer avec l'IP résolue
3. Déterminer si la configuration est correcte

## 🧪 Tests Manuels

### Test 1 : Domaine Non Configuré

```bash
# Backend
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/verify-custom-domain/<websiteId>

# Résultat attendu
{
  "configured": false,
  "message": "Aucun domaine personnalisé configuré"
}
```

### Test 2 : Domaine Configuré, DNS Non Propagé

```bash
# Configurer un domaine sans DNS
POST /configure-custom-domain/<websiteId>
Body: { "domain": "test.example.com" }

# Vérifier immédiatement
GET /verify-custom-domain/<websiteId>

# Résultat attendu
{
  "configured": true,
  "verified": false,
  "status": "not_propagated",
  "message": "Le domaine n'est pas encore résolu..."
}
```

### Test 3 : Domaine Configuré Correctement

```bash
# Après avoir configuré le DNS A Record → VPS_IP
GET /verify-custom-domain/<websiteId>

# Résultat attendu
{
  "configured": true,
  "verified": true,
  "domain": "test.example.com",
  "currentIP": "123.45.67.89",
  "expectedIP": "123.45.67.89",
  "status": "active",
  "message": "Le domaine pointe correctement vers le VPS"
}
```

### Test 4 : Domaine Mal Configuré

```bash
# Si le DNS pointe vers une mauvaise IP
GET /verify-custom-domain/<websiteId>

# Résultat attendu
{
  "configured": true,
  "verified": false,
  "domain": "test.example.com",
  "currentIP": "54.32.10.98",
  "expectedIP": "123.45.67.89",
  "status": "misconfigured",
  "message": "Le domaine pointe vers 54.32.10.98 mais devrait pointer vers 123.45.67.89"
}
```

## 📊 Cas d'Usage

### Cas 1 : Configuration Réussie
```
Client configure le domaine → DNS propagé → Tout fonctionne
Timeline: 0-30 minutes
```

### Cas 2 : Propagation Lente
```
Client configure le domaine → Attente → DNS propagé après 24h
Timeline: 0-48 heures
Action: Informer le client que c'est normal
```

### Cas 3 : Erreur de Configuration
```
Client configure le mauvais DNS → Système détecte l'erreur
Action: Afficher l'IP actuelle vs attendue pour correction
```

### Cas 4 : Changement d'IP VPS
```
Admin change VPS_IP dans .env → Tous les domaines deviennent "misconfigured"
Action: Informer les clients du changement d'IP
```

## 🚨 Limitations

1. **Propagation DNS** : Peut prendre jusqu'à 48h (hors de notre contrôle)
2. **Cache DNS** : Les résultats peuvent être mis en cache localement
3. **Vérification Côté Serveur** : Dépend de la résolution DNS du serveur Node.js

## 🔮 Améliorations Futures

- [ ] Historique des vérifications
- [ ] Notifications par email quand le DNS est propagé
- [ ] Vérification automatique périodique (toutes les heures)
- [ ] Test de connectivité HTTPS (pas seulement DNS)
- [ ] Vérification du certificat SSL
- [ ] Suggestions de correction selon le registraire

---

✅ Cette fonctionnalité aide les clients à diagnostiquer les problèmes DNS et confirme que leur domaine est correctement configuré !
