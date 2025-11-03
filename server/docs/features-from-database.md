# Mise à Jour : Features Stockées en BDD

## 🎯 Changement Important

Les features ne sont plus **codées en dur** dans le code serveur, mais **stockées directement dans la table `subscription_plans`** en tant que JSON.

---

## 📋 Nouvelle Structure des Features

### Format JSON dans `subscription_plans.features`

```json
{
  "pages": true,
  "contact": true,
  "portfolio": true,
  "newsletter": true,
  "collections": true,
  "custom_domain": true,
  "webflow_preview_only": false
}
```

### Description des Features

| Feature | Type | Description |
|---------|------|-------------|
| **pages** | boolean | Pages personnalisées (ancien `auth_page`) |
| **contact** | boolean | Formulaire de contact (ancien `auth_contact`) |
| **portfolio** | boolean | Portfolio (ancien `auth_portfolio`) |
| **newsletter** | boolean | Newsletter (ancien `auth_newsletter`) |
| **collections** | boolean | CMS/Collections (ancien `auth_blog` + `auth_ecom`) |
| **custom_domain** | boolean | Domaine personnalisé |
| **webflow_preview_only** | boolean | Si true, site en mode preview uniquement |

---

## 🔄 Mapping Ancien → Nouveau Format

### Fonction de Mapping (`authorisation.js`)

```javascript
const mapFeatureName = (oldFeatureName) => {
  const mapping = {
    'auth_portfolio': 'portfolio',
    'auth_page': 'pages',
    'auth_blog': 'collections',
    'auth_ecom': 'collections',
    'auth_newsletter': 'newsletter',
    'auth_contact': 'contact',
    'custom_domain': 'custom_domain'
  };
  return mapping[oldFeatureName] || oldFeatureName;
};
```

### Correspondances

- `auth_portfolio` → `portfolio`
- `auth_page` → `pages`
- `auth_blog` → `collections`
- `auth_ecom` → `collections`
- `auth_newsletter` → `newsletter`
- `auth_contact` → `contact`

---

## 🔧 Modifications Effectuées

### 1. **`server/website/website.js`**

#### Suppression de `getFeaturesByPlan()`
```javascript
// ❌ AVANT : Fonction avec features en dur
const getFeaturesByPlan = (planName) => {
  const planFeatures = {
    'free': { auth_portfolio: false, ... },
    'starter': { auth_portfolio: false, ... },
    'cms': { auth_portfolio: true, ... }
  };
  return planFeatures[planName] || planFeatures['free'];
};

// ✅ APRÈS : Fonction supprimée, features lues depuis la BDD
```

#### Modification de `GET /getFeaturesWebsite`
```javascript
// ✅ NOUVEAU : Récupère les features depuis subscription_plans.features
const { data: subscription } = await supabase
  .from('website_subscriptions')
  .select(`
    status,
    cancel_at_period_end,
    subscription_plans (
      name,
      features    // ← NOUVEAU : Récupère le JSON features
    )
  `)
  .eq('website_id', websiteId)
  .eq('status', 'active')
  .maybeSingle();

// Features par défaut pour le plan gratuit
let features = {
  pages: false,
  contact: true,
  portfolio: false,
  newsletter: true,
  collections: false,
  custom_domain: false,
  webflow_preview_only: true
};

// Si abonnement actif, utiliser les features du plan
if (subscription && subscription.subscription_plans) {
  planName = subscription.subscription_plans.name;
  features = subscription.subscription_plans.features || features;
}

res.send({ features, plan: planName, cancel_at_period_end: ... });
```

---

### 2. **`server/users/authorisation.js`**

#### Ajout de `mapFeatureName()`
```javascript
// ✅ NOUVEAU : Mapper les anciens noms vers les nouveaux
const mapFeatureName = (oldFeatureName) => {
  const mapping = {
    'auth_portfolio': 'portfolio',
    'auth_page': 'pages',
    'auth_blog': 'collections',
    'auth_ecom': 'collections',
    'auth_newsletter': 'newsletter',
    'auth_contact': 'contact',
    'custom_domain': 'custom_domain'
  };
  return mapping[oldFeatureName] || oldFeatureName;
};
```

#### Modification de `POST /getAuthorisation`
```javascript
// ✅ NOUVEAU : Récupère les features depuis la BDD
const { data: subscription } = await supabase
  .from('website_subscriptions')
  .select(`
    status,
    subscription_plans (
      name,
      features    // ← NOUVEAU : Récupère le JSON features
    )
  `)
  .eq('website_id', websiteId)
  .eq('status', 'active')
  .maybeSingle();

let features = {
  pages: false,
  contact: true,
  portfolio: false,
  newsletter: true,
  collections: false,
  custom_domain: false,
  webflow_preview_only: true
};

if (subscription && subscription.subscription_plans) {
  planName = subscription.subscription_plans.name;
  features = subscription.subscription_plans.features || features;
}

// Mapper le nom de feature (ex: 'auth_portfolio' → 'portfolio')
const mappedFeatureName = mapFeatureName(type);

return res.status(200).json({ 
  success: true, 
  authorisation: features[mappedFeatureName] || false,
  role: role,
  plan: planName
});
```

---

## 📊 Exemples de Plans

### Plan GRATUIT (free)

```sql
INSERT INTO subscription_plans (name, features, price) VALUES (
  'free',
  '{
    "pages": false,
    "contact": true,
    "portfolio": false,
    "newsletter": true,
    "collections": false,
    "custom_domain": false,
    "webflow_preview_only": true
  }',
  0.00
);
```

### Plan STARTER

```sql
INSERT INTO subscription_plans (name, features, price) VALUES (
  'starter',
  '{
    "pages": false,
    "contact": true,
    "portfolio": false,
    "newsletter": true,
    "collections": false,
    "custom_domain": true,
    "webflow_preview_only": false
  }',
  4.99
);
```

### Plan CMS

```sql
INSERT INTO subscription_plans (name, features, price) VALUES (
  'cms',
  '{
    "pages": true,
    "contact": true,
    "portfolio": true,
    "newsletter": true,
    "collections": true,
    "custom_domain": true,
    "webflow_preview_only": false
  }',
  9.99
);
```

---

## 🔄 Flux de Données

### Avant (Features en dur dans le code)

```
Frontend
   ↓
POST /getAuthorisation (type: 'auth_portfolio')
   ↓
getFeaturesByPlan('cms')
   ↓
Return: { auth_portfolio: true } ← Codé en dur
```

### Après (Features depuis la BDD)

```
Frontend
   ↓
POST /getAuthorisation (type: 'auth_portfolio')
   ↓
SELECT subscription_plans.features FROM website_subscriptions
   ↓
features = { "portfolio": true, ... } ← Depuis la BDD
   ↓
mapFeatureName('auth_portfolio') → 'portfolio'
   ↓
Return: { authorisation: features['portfolio'] }
```

---

## ✅ Avantages

1. **Flexibilité** : Modifier les features sans redéployer le code
2. **Facilité** : Créer de nouveaux plans directement en BDD
3. **Cohérence** : Source unique de vérité (la BDD)
4. **Évolutivité** : Ajouter de nouvelles features facilement
5. **Testabilité** : Tester différents plans sans changer le code

---

## 🧪 Tests Recommandés

### Test 1 : Features Plan Gratuit
```bash
GET /getFeaturesWebsite?websiteId=123
# Vérifier :
# - pages: false
# - contact: true
# - portfolio: false
# - newsletter: true
# - collections: false
# - custom_domain: false
# - webflow_preview_only: true
```

### Test 2 : Autorisation avec Ancien Nom
```bash
POST /getAuthorisation
Body: { type: 'auth_portfolio', websiteId: 123 }
# Vérifier :
# - Mapping fonctionne ('auth_portfolio' → 'portfolio')
# - Retourne false si plan gratuit
```

### Test 3 : Plan CMS Toutes Features
```bash
# Site avec plan CMS
GET /getFeaturesWebsite?websiteId=456
# Vérifier :
# - Toutes les features à true sauf webflow_preview_only
```

---

## ⚠️ Points d'Attention

### 1. **Compatibilité Rétroactive**
- ✅ Le code frontend utilise encore les anciens noms (`auth_portfolio`, etc.)
- ✅ La fonction `mapFeatureName()` assure la compatibilité
- ⚠️ À terme, migrer le frontend vers les nouveaux noms

### 2. **Features par Défaut**
```javascript
// Toujours définir des features par défaut pour le plan gratuit
let features = {
  pages: false,
  contact: true,
  portfolio: false,
  newsletter: true,
  collections: false,
  custom_domain: false,
  webflow_preview_only: true
};
```

### 3. **Validation JSON**
- ⚠️ S'assurer que le JSON dans `subscription_plans.features` est valide
- ⚠️ Toutes les clés doivent être présentes

---

## 📚 Migration Future Recommandée

### Étape 1 : Mettre à Jour le Frontend

Remplacer progressivement les anciens noms :

```jsx
// ❌ ANCIEN
const isAuthorized = await checkAuthorization('auth_portfolio', websiteId);

// ✅ NOUVEAU
const isAuthorized = await checkAuthorization('portfolio', websiteId);
```

### Étape 2 : Supprimer le Mapping

Une fois le frontend mis à jour :

```javascript
// Supprimer la fonction mapFeatureName()
// Utiliser directement le nom de feature
return res.status(200).json({ 
  success: true, 
  authorisation: features[type] || false  // Plus besoin de mapping
});
```

---

## 📝 Commandes SQL Utiles

### Voir les Features d'un Plan
```sql
SELECT name, features 
FROM subscription_plans 
WHERE name = 'cms';
```

### Modifier les Features d'un Plan
```sql
UPDATE subscription_plans 
SET features = '{
  "pages": true,
  "contact": true,
  "portfolio": true,
  "newsletter": true,
  "collections": true,
  "custom_domain": true,
  "webflow_preview_only": false
}'
WHERE name = 'cms';
```

### Ajouter une Nouvelle Feature
```sql
UPDATE subscription_plans 
SET features = jsonb_set(
  features::jsonb, 
  '{new_feature}', 
  'true'
)
WHERE name = 'cms';
```

---

## ✅ Résumé

| Aspect | Avant | Après |
|--------|-------|-------|
| **Stockage** | Codé en dur dans `getFeaturesByPlan()` | JSON dans `subscription_plans.features` |
| **Flexibilité** | Redéploiement nécessaire | Modification en BDD uniquement |
| **Source** | 2 fichiers (website.js + authorisation.js) | 1 table (subscription_plans) |
| **Mapping** | Aucun | `mapFeatureName()` pour compatibilité |
| **Noms features** | Anciens (`auth_*`) | Nouveaux (`portfolio`, `pages`, etc.) |

**✅ Le système est maintenant flexible et basé sur la BDD !** 🎉
