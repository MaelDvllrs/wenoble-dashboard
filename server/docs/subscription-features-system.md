# Système de Features Basé sur les Plans d'Abonnement

## Vue d'Ensemble

Les fonctionnalités (features) d'un site web sont maintenant **automatiquement déterminées** par le plan d'abonnement actif du site. Les utilisateurs ne peuvent plus activer/désactiver manuellement les features - elles sont contrôlées par le plan choisi.

## Architecture

### Principe de Fonctionnement

1. **Chaque site web** a un abonnement actif dans `website_subscriptions`
2. **Chaque abonnement** est lié à un plan dans `subscription_plans` (free, starter, cms)
3. **Chaque plan** définit automatiquement quelles features sont disponibles
4. **Les features sont lues dynamiquement** en fonction du plan actuel

### Avantages

✅ **Cohérence garantie** : Impossible d'activer une feature non autorisée par le plan  
✅ **Simplicité** : Pas de gestion manuelle des features  
✅ **Automatique** : Changement de plan = changement automatique des features  
✅ **Sécurité** : Pas de manipulation côté client possible

---

## Plans et Features Disponibles

### 🆓 Plan GRATUIT (free)

**Prix :** 0€/mois

**Features incluses :**
- ✅ `auth_newsletter` : Newsletter
- ✅ `auth_contact` : Formulaire de contact
- ❌ `auth_portfolio` : Portfolio
- ❌ `auth_page` : Pages personnalisées
- ❌ `auth_blog` : Blog/CMS
- ❌ `auth_ecom` : E-commerce
- ❌ `custom_domain` : Domaine personnalisé
- ❌ `ssl` : Certificat SSL
- ❌ `analytics` : Analytics

**Usage :** Preview Webflow uniquement, idéal pour tester la plateforme

---

### 🚀 Plan STARTER

**Prix :** 4.99€/mois

**Features incluses :**
- ✅ `auth_newsletter` : Newsletter
- ✅ `auth_contact` : Formulaire de contact
- ✅ `custom_domain` : Domaine personnalisé
- ✅ `ssl` : Certificat SSL inclus
- ✅ `analytics` : Google Analytics
- ❌ `auth_portfolio` : Portfolio
- ❌ `auth_page` : Pages personnalisées
- ❌ `auth_blog` : Blog/CMS
- ❌ `auth_ecom` : E-commerce

**Usage :** Site professionnel avec domaine personnalisé

---

### 💎 Plan CMS (Recommandé)

**Prix :** 9.99€/mois

**Features incluses :**
- ✅ **TOUTES les features** :
  - `auth_portfolio` : Portfolio
  - `auth_page` : Pages personnalisées illimitées
  - `auth_blog` : Blog/CMS avec collections illimitées
  - `auth_ecom` : E-commerce
  - `auth_newsletter` : Newsletter
  - `auth_contact` : Formulaire de contact
  - `custom_domain` : Domaine personnalisé
  - `ssl` : Certificat SSL inclus
  - `analytics` : Google Analytics
  - Support prioritaire

**Usage :** Solution complète pour sites complexes avec CMS et portfolio

---

## Implémentation Technique

### Fonction Helper

```javascript
// server/website/website.js

const getFeaturesByPlan = (planName) => {
  const planFeatures = {
    'free': {
      auth_portfolio: false,
      auth_page: false,
      auth_blog: false,
      auth_ecom: false,
      auth_newsletter: true,
      auth_contact: true,
      custom_domain: false,
      ssl: false,
      analytics: false
    },
    'starter': {
      auth_portfolio: false,
      auth_page: false,
      auth_blog: false,
      auth_ecom: false,
      auth_newsletter: true,
      auth_contact: true,
      custom_domain: true,
      ssl: true,
      analytics: true
    },
    'cms': {
      auth_portfolio: true,
      auth_page: true,
      auth_blog: true,
      auth_ecom: true,
      auth_newsletter: true,
      auth_contact: true,
      custom_domain: true,
      ssl: true,
      analytics: true
    }
  };

  return planFeatures[planName] || planFeatures['free'];
};
```

### Endpoint API

**GET** `/getFeaturesWebsite?websiteId=xxx`

**Réponse :**
```json
{
  "features": {
    "auth_portfolio": true,
    "auth_page": true,
    "auth_blog": true,
    "auth_ecom": true,
    "auth_newsletter": true,
    "auth_contact": true,
    "custom_domain": true,
    "ssl": true,
    "analytics": true
  },
  "plan": "cms",
  "cancel_at_period_end": false
}
```

**Logique :**
1. Récupère l'abonnement actif du site (`status = 'active'`)
2. Récupère le nom du plan associé à cet abonnement
3. Retourne les features autorisées par ce plan via `getFeaturesByPlan()`
4. Si pas d'abonnement actif → plan 'free' par défaut

---

## Flux de Données

```
┌─────────────────┐
│   Utilisateur   │
└────────┬────────┘
         │
         │ GET /getFeaturesWebsite?websiteId=123
         ▼
┌─────────────────────────────┐
│  API (website.js)           │
│  - Authentification         │
│  - Vérification accès       │
└────────┬────────────────────┘
         │
         │ SELECT subscription
         ▼
┌─────────────────────────────┐
│  website_subscriptions      │
│  - status = 'active'        │
│  - JOIN subscription_plans  │
└────────┬────────────────────┘
         │
         │ plan_name = 'cms'
         ▼
┌─────────────────────────────┐
│  getFeaturesByPlan('cms')   │
│  - Retourne les features    │
│    autorisées pour CMS      │
└────────┬────────────────────┘
         │
         │ Features + plan + cancel_at_period_end
         ▼
┌─────────────────────────────┐
│  Réponse JSON au client     │
└─────────────────────────────┘
```

---

## Changements Effectués

### ✅ Modifications Backend (server/website/website.js)

1. **Ajout de `getFeaturesByPlan()`** : Fonction helper qui map chaque plan à ses features
2. **Modification de GET `/getFeaturesWebsite`** :
   - Récupère le plan d'abonnement actif du site
   - Retourne les features autorisées par le plan
   - Ne lit plus la table `website_feature`
3. **Suppression de PUT `/website-features/:websiteId`** :
   - Endpoint complètement supprimé
   - Les features ne sont plus modifiables manuellement
4. **Modification de POST `/createWebsite`** :
   - Ne crée plus d'entrée dans `website_feature`
   - Les features sont déterminées dynamiquement par le plan

### ⚠️ Table `website_feature` Obsolète

La table `website_feature` peut être supprimée dans une future migration. Elle n'est plus utilisée.

---

## Migration des Données

### Avant (Ancien Système)

```
Table: website_feature
┌────────────┬──────────────┬───────────────┐
│ website_id │ auth_blog    │ auth_portfolio│
├────────────┼──────────────┼───────────────┤
│    123     │    true      │    false      │  ← Modifiable manuellement
└────────────┴──────────────┴───────────────┘
```

### Après (Nouveau Système)

```
Table: website_subscriptions
┌────────────┬────────┬──────────────┐
│ website_id │ status │ plan_id      │
├────────────┼────────┼──────────────┤
│    123     │ active │ cms_plan_id  │  → Détermine les features automatiquement
└────────────┴────────┴──────────────┘
                  ↓
         getFeaturesByPlan('cms')
                  ↓
        {auth_blog: true, auth_portfolio: true, ...}
```

---

## Utilisation Côté Client

### Exemple : Vérifier si une feature est disponible

```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';
import config from './config';
import Cookies from 'js-cookie';

const MyComponent = ({ websiteId }) => {
  const [features, setFeatures] = useState(null);
  const [plan, setPlan] = useState('free');

  useEffect(() => {
    const fetchFeatures = async () => {
      const token = Cookies.get('token');
      const response = await axios.get(
        `${config.apiUrl}/getFeaturesWebsite?websiteId=${websiteId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setFeatures(response.data.features);
      setPlan(response.data.plan);
    };

    fetchFeatures();
  }, [websiteId]);

  if (!features) return <div>Chargement...</div>;

  return (
    <div>
      <h2>Plan actuel : {plan}</h2>
      
      {features.auth_blog ? (
        <BlogSection />
      ) : (
        <UpgradeMessage feature="Blog/CMS" requiredPlan="CMS" />
      )}

      {features.auth_portfolio ? (
        <PortfolioSection />
      ) : (
        <UpgradeMessage feature="Portfolio" requiredPlan="CMS" />
      )}
    </div>
  );
};
```

---

## Tests à Effectuer

### Scénario 1 : Site avec Plan Gratuit
1. Créer un nouveau site (plan gratuit par défaut)
2. Appeler `/getFeaturesWebsite`
3. ✅ Vérifier que seuls `auth_newsletter` et `auth_contact` sont `true`

### Scénario 2 : Upgrade vers Starter
1. Souscrire au plan Starter (4.99€)
2. Appeler `/getFeaturesWebsite`
3. ✅ Vérifier que `custom_domain`, `ssl`, `analytics` sont maintenant `true`
4. ✅ Vérifier que `auth_blog`, `auth_portfolio`, etc. restent `false`

### Scénario 3 : Upgrade vers CMS
1. Souscrire au plan CMS (9.99€)
2. Appeler `/getFeaturesWebsite`
3. ✅ Vérifier que **TOUTES** les features sont `true`

### Scénario 4 : Annulation d'Abonnement
1. Annuler un abonnement payant
2. Attendre la fin de période
3. Appeler `/getFeaturesWebsite`
4. ✅ Vérifier que le plan revient à 'free'
5. ✅ Vérifier que les features sont limitées au plan gratuit

---

## Sécurité

### ✅ Protection Serveur

- Les features sont **toujours** calculées côté serveur
- Impossible de manipuler les features depuis le client
- L'endpoint PUT `/website-features` a été supprimé

### ✅ Vérification d'Accès

```javascript
// Vérifier l'accès au site AVANT de retourner les features
const { hasAccess } = await checkUserWebsiteAccess(supabase, userId, websiteId);
if (!hasAccess) {
  return res.status(403).send({ error: 'Accès non autorisé à ce site web' });
}
```

---

## Questions Fréquentes

### Q : Que se passe-t-il si un site n'a pas d'abonnement actif ?

**R :** Le système retourne automatiquement les features du plan 'free' (gratuit).

### Q : Peut-on avoir des features personnalisées pour un client spécifique ?

**R :** Oui, il suffit d'ajouter un plan custom dans `subscription_plans` et de l'ajouter dans `getFeaturesByPlan()`.

### Q : Comment ajouter une nouvelle feature ?

**R :** 
1. Ajouter la feature dans `getFeaturesByPlan()` pour chaque plan
2. Mettre à jour la documentation
3. Utiliser la feature côté client via `/getFeaturesWebsite`

### Q : La table `website_feature` est-elle encore utilisée ?

**R :** Non, elle est obsolète. Elle peut être supprimée dans une future migration.

---

## Prochaines Étapes

- [ ] Supprimer la table `website_feature` (migration)
- [ ] Mettre à jour le frontend pour supprimer l'UI de gestion des features
- [ ] Créer des messages d'upgrade incitant à passer au plan supérieur
- [ ] Ajouter des analytics sur les tentatives d'accès à des features non autorisées

---

## Résumé

| Aspect | Ancien Système | Nouveau Système |
|--------|----------------|-----------------|
| **Stockage** | Table `website_feature` | Calculé dynamiquement depuis `subscription_plans` |
| **Modification** | Endpoint PUT manuel | Automatique via changement de plan |
| **Cohérence** | Possible désynchronisation | Toujours cohérent avec le plan |
| **Sécurité** | Modifiable par admin | Lié au paiement uniquement |
| **Simplicité** | 2 tables + logique manuelle | 1 fonction simple |

✅ **Le système est maintenant automatisé, sécurisé et cohérent !**
