# Résumé : Migration vers Features Basées sur les Plans

## ✅ Changements Effectués

### 1. **Nouvelle Fonction Helper** `getFeaturesByPlan(planName)`
- Définit les features autorisées pour chaque plan (free, starter, cms)
- Retourne automatiquement les permissions en fonction du plan

### 2. **Endpoint GET `/getFeaturesWebsite` - MODIFIÉ**

**Avant :**
```javascript
// Récupérait les features depuis la table website_feature
const { data: features } = await supabase
  .from('website_feature')
  .select('*')
  .eq('website_id', websiteId);
```

**Après :**
```javascript
// Récupère le plan d'abonnement actif et retourne les features correspondantes
const { data: subscription } = await supabase
  .from('website_subscriptions')
  .select('subscription_plans(name)')
  .eq('website_id', websiteId)
  .eq('status', 'active');

const features = getFeaturesByPlan(subscription.subscription_plans.name);
```

**Réponse :**
```json
{
  "features": { /* features selon le plan */ },
  "plan": "cms",
  "cancel_at_period_end": false
}
```

### 3. **Endpoint PUT `/website-features/:websiteId` - SUPPRIMÉ**

❌ Les features ne sont plus modifiables manuellement  
✅ Elles sont déterminées automatiquement par le plan d'abonnement

### 4. **Création de Site Web - MODIFIÉ**

**Avant :**
```javascript
// Créait une entrée dans website_feature
await supabase.from('website_feature').insert({
  website_id: websiteData.id,
  ...defaultFeatures
});
```

**Après :**
```javascript
// Ne crée plus d'entrée dans website_feature
// Les features sont calculées dynamiquement depuis le plan
```

---

## 📊 Mapping des Features par Plan

| Feature | Free | Starter | CMS |
|---------|------|---------|-----|
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

```
1. Utilisateur crée un site → Plan GRATUIT par défaut
   ↓
2. Appel /getFeaturesWebsite
   ↓
3. Récupère l'abonnement actif du site
   ↓
4. Pas d'abonnement actif → Plan 'free'
   ↓
5. Retourne features du plan gratuit (newsletter + contact uniquement)

---

1. Utilisateur souscrit au plan CMS (9.99€)
   ↓
2. Stripe webhook crée l'abonnement dans website_subscriptions
   ↓
3. Appel /getFeaturesWebsite
   ↓
4. Récupère l'abonnement actif → plan 'cms'
   ↓
5. getFeaturesByPlan('cms') → TOUTES les features = true
```

---

## ⚠️ Impact sur le Projet

### Fichiers Modifiés
- ✅ `server/website/website.js`

### Fichiers Créés
- ✅ `server/docs/subscription-features-system.md` (documentation complète)
- ✅ `server/docs/features-migration-summary.md` (ce fichier)

### Table Obsolète
- ⚠️ `website_feature` : N'est plus utilisée (peut être supprimée)

### Endpoints Modifiés
- ✅ `GET /getFeaturesWebsite` : Retourne maintenant `{features, plan, cancel_at_period_end}`

### Endpoints Supprimés
- ❌ `PUT /website-features/:websiteId` : Supprimé complètement

---

## 🧪 Tests Recommandés

1. **Test Plan Gratuit**
   ```bash
   GET /getFeaturesWebsite?websiteId=123
   # Vérifier : auth_newsletter=true, auth_contact=true, tout le reste=false
   ```

2. **Test Plan Starter**
   ```bash
   # Souscrire au plan Starter
   # Puis :
   GET /getFeaturesWebsite?websiteId=123
   # Vérifier : custom_domain=true, ssl=true, analytics=true
   ```

3. **Test Plan CMS**
   ```bash
   # Souscrire au plan CMS
   # Puis :
   GET /getFeaturesWebsite?websiteId=123
   # Vérifier : TOUTES les features = true
   ```

---

## 🚀 Prochaines Actions Recommandées

### Côté Frontend (Client)

1. **Supprimer l'UI de gestion manuelle des features**
   - Retirer les toggles/checkboxes pour activer/désactiver les features
   - Afficher uniquement les features disponibles selon le plan

2. **Ajouter des messages d'upgrade**
   ```jsx
   {!features.auth_blog && (
     <UpgradeCard
       message="Le Blog/CMS nécessite le plan CMS"
       action="Passer au plan CMS (9.99€/mois)"
     />
   )}
   ```

3. **Afficher le plan actuel**
   ```jsx
   <Badge color={plan === 'cms' ? 'success' : 'default'}>
     Plan {plan.toUpperCase()}
   </Badge>
   ```

### Côté Backend

1. **Migration future : Supprimer la table `website_feature`**
   ```sql
   -- À exécuter quand tout est validé
   DROP TABLE IF EXISTS website_feature;
   ```

2. **Ajouter des logs pour tracking**
   ```javascript
   console.log(`Features récupérées pour site ${websiteId} avec plan ${planName}`);
   ```

---

## 💡 Avantages du Nouveau Système

| Avant | Après |
|-------|-------|
| Features stockées en BDD | Features calculées dynamiquement |
| Modifiables manuellement | Automatiques selon le plan |
| Possibilité de désynchronisation | Toujours cohérent |
| Admin peut activer des features gratuitement | Lié au paiement uniquement |
| Complexité : 2 tables + logique | Simplicité : 1 fonction |

---

## 📞 Support

Pour toute question sur cette migration :
- 📄 Documentation complète : `server/docs/subscription-features-system.md`
- 🔧 Code source : `server/website/website.js` (fonction `getFeaturesByPlan`)

✅ **Migration terminée avec succès !**
