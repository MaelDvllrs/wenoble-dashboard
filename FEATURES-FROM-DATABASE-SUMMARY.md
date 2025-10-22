# Résumé : Features depuis la BDD

## ✅ Changement Effectué

Les features sont maintenant **stockées dans `subscription_plans.features`** (JSON) au lieu d'être codées en dur.

---

## 📋 Nouvelle Structure

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

---

## 🔧 Modifications

### Backend
1. **`server/website/website.js`**
   - ❌ Suppression de `getFeaturesByPlan()`
   - ✅ `GET /getFeaturesWebsite` → Lit `subscription_plans.features`

2. **`server/users/authorisation.js`**
   - ❌ Suppression de `getFeaturesByPlan()`
   - ✅ Ajout de `mapFeatureName()` pour compatibilité
   - ✅ `POST /getAuthorisation` → Lit `subscription_plans.features`

---

## 🔄 Mapping Ancien → Nouveau

```javascript
'auth_portfolio' → 'portfolio'
'auth_page' → 'pages'
'auth_blog' → 'collections'
'auth_ecom' → 'collections'
'auth_newsletter' → 'newsletter'
'auth_contact' → 'contact'
```

---

## ✅ Avantages

- ✅ **Flexibilité** : Modifier les plans sans redéployer
- ✅ **Simplicité** : Plus de duplication de code
- ✅ **Évolutivité** : Ajouter de nouveaux plans en BDD
- ✅ **Cohérence** : Source unique de vérité

---

## 📚 Documentation Complète

Voir : `server/docs/features-from-database.md`

---

✅ **Migration terminée !**
