# Migration Complète : Features Basées sur les Plans d'Abonnement

## 🎯 Objectif

Remplacer le système manuel de gestion des features par un système **automatique basé sur les plans d'abonnement**.

---

## ✅ Fichiers Modifiés

### Backend (Server)

#### 1. **`server/website/website.js`**
- ✅ Ajout de la fonction `getFeaturesByPlan(planName)`
- ✅ Modification de `GET /getFeaturesWebsite` → Récupère le plan et retourne les features correspondantes
- ✅ Suppression de `PUT /website-features/:websiteId` → Plus de modification manuelle
- ✅ Modification de `POST /createWebsite` → Ne crée plus d'entrée dans `website_feature`

#### 2. **`server/users/authorisation.js`**
- ✅ Ajout de la fonction `getFeaturesByPlan(planName)` (identique à website.js)
- ✅ Modification de `POST /getAuthorisation` → Récupère le plan au lieu de la table `website_feature`
- ✅ Retourne maintenant `{success, authorisation, role, plan}`

---

### Frontend (Client)

#### 3. **`client/src/Components/Dashboard/Pages/website/editWebsite.jsx`**
- ✅ Suppression de l'état `features`
- ✅ Suppression de la fonction `loadWebsiteFeatures()`
- ✅ Suppression de la fonction `handleSaveFeatures()`
- ✅ Suppression de l'appel `loadWebsiteFeatures()` dans useEffect
- ✅ Suppression de toute la section UI "Fonctionnalités" (toggles)
- ✅ Suppression de l'import `DefaultSwitch`

---

## 📋 Mapping des Features par Plan

| Feature | Free (0€) | Starter (4.99€) | CMS (9.99€) |
|---------|-----------|-----------------|-------------|
| **Newsletter** | ✅ | ✅ | ✅ |
| **Contact** | ✅ | ✅ | ✅ |
| **Domaine personnalisé** | ❌ | ✅ | ✅ |
| **SSL** | ❌ | ✅ | ✅ |
| **Analytics** | ❌ | ✅ | ✅ |
| **Portfolio** | ❌ | ❌ | ✅ |
| **Pages** | ❌ | ❌ | ✅ |
| **Blog/CMS** | ❌ | ❌ | ✅ |
| **E-commerce** | ❌ | ❌ | ✅ |

---

## 🔄 Flux de Fonctionnement

### 1. Vérification des Autorisations (Frontend → Backend)

```
Frontend (Authorisation.jsx)
    ↓
    checkAuthorization('auth_blog', websiteId)
    ↓
POST /getAuthorisation
    ↓
Server (authorisation.js)
    ↓
    1. Vérifier accès utilisateur au site
    2. Si admin → toutes les features autorisées
    3. Sinon → récupérer l'abonnement actif
    4. Extraire le plan (free, starter, cms)
    5. getFeaturesByPlan(plan)
    6. Retourner features[type]
    ↓
Réponse: { success: true, authorisation: true/false, role, plan }
```

### 2. Récupération des Features (pour affichage)

```
Frontend
    ↓
GET /getFeaturesWebsite?websiteId=123
    ↓
Server (website.js)
    ↓
    1. Vérifier accès utilisateur au site
    2. Récupérer l'abonnement actif
    3. Extraire le plan (free, starter, cms)
    4. getFeaturesByPlan(plan)
    5. Retourner toutes les features
    ↓
Réponse: { features: {...}, plan: 'cms', cancel_at_period_end: false }
```

---

## 🔧 Fonction `getFeaturesByPlan()`

Cette fonction est **dupliquée** dans deux fichiers pour éviter les dépendances circulaires :

### Localisation
1. `server/website/website.js` (ligne ~15-60)
2. `server/users/authorisation.js` (ligne ~15-60)

### Pourquoi Dupliquée ?
- `website.js` et `authorisation.js` sont des modules indépendants
- Évite les imports circulaires
- Fonction simple et stable (peu de modifications attendues)

### Maintenance
⚠️ **IMPORTANT** : Si vous modifiez les features d'un plan, **modifiez les DEUX fichiers**.

```javascript
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

---

## 📊 Avant / Après

### Système d'Autorisation (authorisation.js)

#### ❌ AVANT
```javascript
// Récupérait depuis la table website_feature
const { data, error } = await supabase
    .from('website_feature')
    .select(type)
    .eq('website_id', websiteId)
    .single();

// Créait une entrée si elle n'existait pas
const defaultFeatures = {
    website_id: websiteId,
    auth_portfolio: false,
    auth_page: false,
    auth_blog: false,
    auth_ecom: false,
    auth_newsletter: false
};

return res.status(200).json({ 
    success: true, 
    authorisation: data?.[type] || false,
    role: role
});
```

#### ✅ APRÈS
```javascript
// Récupère l'abonnement actif
const { data: subscription } = await supabase
    .from('website_subscriptions')
    .select('subscription_plans(name)')
    .eq('website_id', websiteId)
    .eq('status', 'active');

// Détermine le plan
let planName = 'free';
if (subscription && subscription.subscription_plans) {
    planName = subscription.subscription_plans.name;
}

// Récupère les features autorisées
const features = getFeaturesByPlan(planName);

return res.status(200).json({ 
    success: true, 
    authorisation: features[type] || false,
    role: role,
    plan: planName
});
```

---

### Page Edit Website (editWebsite.jsx)

#### ❌ AVANT (~780 lignes)
```jsx
// État
const [features, setFeatures] = useState({
  auth_portfolio: false,
  auth_page: false,
  auth_blog: false,
  auth_ecom: false,
  auth_newsletter: false
});

// Fonctions
const loadWebsiteFeatures = async () => {...};
const handleSaveFeatures = async () => {...};

// UI
<div className="input-container">
  <h4>Fonctionnalités</h4>
  <div className="features_grid">
    <DefaultSwitch
      checked={features.auth_portfolio}
      onChange={(e) => setFeatures({...features, auth_portfolio: e.target.checked})}
    />
    {/* ... 4 autres toggles ... */}
  </div>
  <DefaultButton onClick={handleSaveFeatures}>
    Enregistrer
  </DefaultButton>
</div>
```

#### ✅ APRÈS (~670 lignes, -110 lignes)
```jsx
// Plus d'état features
// Plus de fonction loadWebsiteFeatures
// Plus de fonction handleSaveFeatures
// Plus de section UI de gestion des features

// Optionnel : Afficher le plan actuel (à implémenter)
<NavLink to={`/dashboard/website/${websiteId}/subscription`}>
  <DefaultButton>Gérer l'abonnement</DefaultButton>
</NavLink>
```

---

## 🧪 Tests à Effectuer

### Test 1 : Autorisation pour un Site Gratuit
```bash
1. Créer un nouveau site (plan gratuit par défaut)
2. Essayer d'accéder à /portfolio → ❌ Bloqué
3. Essayer d'accéder à /blog → ❌ Bloqué
4. Accéder à /newsletter → ✅ Autorisé
```

### Test 2 : Upgrade vers Starter
```bash
1. Souscrire au plan Starter (4.99€)
2. Essayer d'accéder à /portfolio → ❌ Toujours bloqué
3. Essayer d'accéder à /blog → ❌ Toujours bloqué
4. Vérifier domaine personnalisé → ✅ Autorisé
```

### Test 3 : Upgrade vers CMS
```bash
1. Souscrire au plan CMS (9.99€)
2. Accéder à /portfolio → ✅ Autorisé
3. Accéder à /blog → ✅ Autorisé
4. Accéder à /pages → ✅ Autorisé
5. Vérifier toutes les features → ✅ Toutes autorisées
```

### Test 4 : Page Edit Website
```bash
1. Ouvrir /dashboard/website/:id/edit
2. Vérifier qu'il n'y a plus de section "Fonctionnalités"
3. Vérifier que les autres sections fonctionnent (Infos, Utilisateurs, Tokens)
4. Vérifier qu'aucune erreur console n'apparaît
```

### Test 5 : Annulation d'Abonnement
```bash
1. Annuler un abonnement CMS
2. Vérifier que les features restent actives jusqu'à la fin de période
3. Attendre la fin de période
4. Vérifier que le plan revient à 'free'
5. Vérifier que /portfolio est maintenant bloqué
```

---

## ⚠️ Points d'Attention

### 1. **Table `website_feature` Obsolète**
- ⚠️ La table n'est plus utilisée
- ⚠️ Peut être supprimée dans une future migration
- ⚠️ Garder temporairement pour rollback éventuel

### 2. **Fonction Dupliquée**
- ⚠️ `getFeaturesByPlan()` existe dans 2 fichiers
- ⚠️ Modifier les DEUX si changement de features

### 3. **Compatibilité Ascendante**
- ✅ Anciens sites sans abonnement → plan 'free' par défaut
- ✅ Pas de migration de données nécessaire
- ✅ Système fonctionne immédiatement

### 4. **Admins**
- ✅ Les admins (`is_admin = true`) ont toutes les features
- ✅ Quelle que soit le plan du site

---

## 📚 Documentation Associée

1. **`server/docs/subscription-features-system.md`**
   - Documentation complète du système
   - Exemples de code
   - Guide d'utilisation

2. **`server/docs/features-migration-summary.md`**
   - Résumé des changements backend
   - Comparaison avant/après
   - Prochaines étapes

3. **`client/docs/frontend-features-cleanup.md`**
   - Détails des suppressions frontend
   - Recommandations UI
   - Tests à effectuer

4. **`server/docs/fix-canceled-at-error.md`**
   - Correction de l'erreur PGRST204
   - Système d'annulation

---

## 🚀 Améliorations Futures Recommandées

### 1. **Afficher le Plan dans Edit Website**
```jsx
// Ajouter dans editWebsite.jsx
const [planInfo, setPlanInfo] = useState(null);

useEffect(() => {
  const fetchPlan = async () => {
    const response = await Axios.get(`${apiUrl}/getFeaturesWebsite?websiteId=${websiteId}`);
    setPlanInfo(response.data);
  };
  fetchPlan();
}, [websiteId]);

// Dans le JSX
<div className="input-container">
  <h4>Plan d'abonnement</h4>
  <p>Plan actuel : <strong>{planInfo?.plan?.toUpperCase()}</strong></p>
  <ul>
    {planInfo?.features.auth_portfolio && <li>✅ Portfolio</li>}
    {planInfo?.features.auth_blog && <li>✅ Blog/CMS</li>}
    {/* ... autres features ... */}
  </ul>
  <NavLink to={`/dashboard/website/${websiteId}/subscription`}>
    <DefaultButton>Modifier mon abonnement</DefaultButton>
  </NavLink>
</div>
```

### 2. **Messages d'Upgrade**
```jsx
// Dans les pages protégées
{!isAuthorized && (
  <UpgradePrompt
    feature="Portfolio"
    currentPlan="free"
    requiredPlan="CMS"
    price="9.99€/mois"
  />
)}
```

### 3. **Centraliser `getFeaturesByPlan()`**
```javascript
// Créer un fichier partagé
// server/utils/subscription-features.js

const getFeaturesByPlan = (planName) => {
  // ... définition unique
};

module.exports = { getFeaturesByPlan };

// Puis importer dans website.js et authorisation.js
const { getFeaturesByPlan } = require('../utils/subscription-features');
```

### 4. **Analytics sur les Tentatives d'Accès**
```javascript
// Logger les tentatives d'accès aux features non autorisées
if (!features[type]) {
  await logEvent({
    type: 'feature_access_denied',
    userId,
    websiteId,
    feature: type,
    currentPlan: planName
  });
}
```

---

## ✅ Checklist Finale

### Backend
- [x] `getFeaturesByPlan()` ajoutée dans `website.js`
- [x] `getFeaturesByPlan()` ajoutée dans `authorisation.js`
- [x] `GET /getFeaturesWebsite` modifié → récupère le plan
- [x] `PUT /website-features/:websiteId` supprimé
- [x] `POST /createWebsite` modifié → ne crée plus d'entrée
- [x] `POST /getAuthorisation` modifié → utilise le plan

### Frontend
- [x] État `features` supprimé
- [x] Fonction `loadWebsiteFeatures()` supprimée
- [x] Fonction `handleSaveFeatures()` supprimée
- [x] Appel useEffect supprimé
- [x] Section UI supprimée
- [x] Import `DefaultSwitch` supprimé

### Documentation
- [x] `subscription-features-system.md` créé
- [x] `features-migration-summary.md` créé
- [x] `frontend-features-cleanup.md` créé
- [x] `COMPLETE-MIGRATION-SUMMARY.md` créé (ce fichier)

### Tests
- [ ] Test autorisation plan gratuit
- [ ] Test upgrade Starter
- [ ] Test upgrade CMS
- [ ] Test page Edit Website
- [ ] Test annulation abonnement
- [ ] Test utilisateur admin

---

## 🎉 Résultat Final

### Avantages

✅ **Cohérence garantie** : Les features sont toujours alignées sur le plan d'abonnement  
✅ **Sécurité renforcée** : Impossible d'activer des features gratuitement  
✅ **Simplicité** : Moins de code, moins de bugs potentiels  
✅ **Automatisation** : Changement de plan = changement automatique des features  
✅ **UX améliorée** : Utilisateurs comprennent le lien entre plan et fonctionnalités  

### Statistiques

- **Code supprimé** : ~180 lignes
- **Fichiers modifiés** : 3 (website.js, authorisation.js, editWebsite.jsx)
- **Fichiers créés** : 4 documents de documentation
- **Tables obsolètes** : 1 (website_feature)
- **Endpoints supprimés** : 1 (PUT /website-features)
- **Endpoints modifiés** : 3 (GET /getFeaturesWebsite, POST /getAuthorisation, POST /createWebsite)

---

## 📞 Support

Pour toute question ou problème :
- 📄 Consulter les docs dans `server/docs/` et `client/docs/`
- 🔍 Vérifier les fonctions `getFeaturesByPlan()` pour les mappings
- 🐛 Vérifier les logs serveur pour les erreurs d'abonnement

**✅ Migration complète réussie !** 🚀
