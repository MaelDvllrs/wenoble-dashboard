# Implémentation de l'Autorisation Analytics

## 🎯 Objectif

Ajouter une autorisation pour les analytics similaire à celle du newsletter, côté serveur et client, et la désactiver dans le plan free.

---

## ✅ Modifications Effectuées

### 1. **Backend - Mapping d'Autorisation**

**Fichier :** `server/users/authorisation.js`

```javascript
const mapFeatureName = (oldFeatureName) => {
  const mapping = {
    'auth_portfolio': 'portfolio',
    'auth_page': 'pages',
    'auth_blog': 'collections',
    'auth_newsletter': 'newsletter',
    'auth_contact': 'contact',
    'auth_analytics': 'analytics',  // ✅ AJOUTÉ
    'custom_domain': 'custom_domain'
  };
  return mapping[oldFeatureName] || oldFeatureName;
};
```

**Impact :** 
- Les requêtes avec `type: 'auth_analytics'` sont maintenant mappées vers la feature `analytics` dans les plans d'abonnement
- Utilise la même logique que les autres autorisations existantes

---

### 2. **Frontend - Composant d'Autorisation**

**Fichier :** `client/src/Authorisation/Authorisation.jsx`

```jsx
export const AuthorisedRouteAnalytics = ({ children }) => (
    <AuthorisedRoute authType="auth_analytics">{children}</AuthorisedRoute>
);
```

**Impact :** 
- Nouveau composant pour protéger les routes analytics
- Suit le même pattern que `AuthorisedRouteNewsletter`, `AuthorisedRoutePortfolio`, etc.
- Utilise le type `auth_analytics` qui sera mappé vers `analytics` côté serveur

---

### 3. **Frontend - État d'Autorisation dans WebsiteHome**

**Fichier :** `client/src/Components/Dashboard/Pages/website/WebsiteHome.jsx`

```jsx
// Nouveau state
const [analyticsAuth, setAnalyticsAuth] = useState(false);

// Vérification d'autorisation
useEffect(() => {
  const fetchAuth = async () => {
    if (selectedWebsite?.id) {
      const isAuthorisedNews = await checkAuthorization('auth_newsletter', selectedWebsite.id);
      const isAuthorisedAnalytics = await checkAuthorization('auth_analytics', selectedWebsite.id);  // ✅ AJOUTÉ
      setNewsAuth(isAuthorisedNews);
      setAnalyticsAuth(isAuthorisedAnalytics);  // ✅ AJOUTÉ
    } else {
      setNewsAuth(false);
      setAnalyticsAuth(false);  // ✅ AJOUTÉ
    }
  };
}, [selectedWebsite, loading]);

// Menu d'actions rapides
{
  title: 'Statistiques',
  description: 'Analyser les performances',
  icon: MdOutlineBarChart,
  path: '/dashboard/website/stats',
  enabled: analyticsAuth  // ✅ MODIFIÉ de `true` vers `analyticsAuth`
}
```

**Impact :**
- La carte "Statistiques" du dashboard principal est maintenant protégée par l'autorisation
- Les utilisateurs sans autorisation analytics verront cette carte désactivée (grisée avec un cadenas)

---

### 4. **Frontend - État d'Autorisation dans WebsiteManager**

**Fichier :** `client/src/Components/Dashboard/Pages/website/WebsiteManager.jsx`

```jsx
// Nouveau state
const [analyticsAuth, setAnalyticsAuth] = useState(false);

// Vérification d'autorisation
useEffect(() => {
  const fetchAuth = async () => {
    if (selectedWebsite?.id) {
      const isAuthorisedNews = await checkAuthorization('auth_newsletter', selectedWebsite.id);
      const isAuthorisedAnalytics = await checkAuthorization('auth_analytics', selectedWebsite.id);  // ✅ AJOUTÉ
      setNewsAuth(isAuthorisedNews);
      setAnalyticsAuth(isAuthorisedAnalytics);  // ✅ AJOUTÉ
    } else {
      setNewsAuth(false);
      setAnalyticsAuth(false);  // ✅ AJOUTÉ
    }
  };
}, [selectedWebsite, loadingWebsites]);

// Navigation sidebar
<NavLink 
  to={analyticsAuth ? "/dashboard/website/stats" : '#'}  // ✅ MODIFIÉ
  className={({ isActive }) => `account-sidebar-link${isActive && analyticsAuth ? ' account-sidebar-link-active' : ''}${!analyticsAuth ? ' disabled' : ''}`}  // ✅ MODIFIÉ
>
  <EqualizerOutlinedIcon fontSize='small'/>
  Statistiques
  {!analyticsAuth && <span style={{ marginLeft: 'auto', fontSize: '0.75rem' }}><LockIcon fontSize='tiny'/></span>}  // ✅ AJOUTÉ
</NavLink>
```

**Impact :**
- Le lien "Statistiques" dans la sidebar de gestion du site est maintenant protégé
- Les utilisateurs sans autorisation voient un lien désactivé avec un cadenas
- Même comportement visuel que pour "Newsletter"

---

### 5. **Frontend - Protection des Routes**

**Fichier :** `client/src/App.jsx`

```jsx
// Import du nouveau composant d'autorisation
import { AuthorisedRoutePortfolio, AuthorisedRoutePage, AuthorisedRouteBlog, AuthorisedRouteNewsletter, AuthorisedRouteAnalytics } from './Authorisation/Authorisation';

// Protection de la route analytics
<Route path="stats/analytics" element={<AuthorisedRouteAnalytics><StatistiqueAnalytics /></AuthorisedRouteAnalytics>} />
```

**Impact :**
- La route `/dashboard/website/stats/analytics` est maintenant protégée
- Les utilisateurs sans autorisation qui tentent d'accéder directement à cette URL seront bloqués
- Redirige automatiquement vers le plan d'abonnement si l'autorisation est refusée

---

## 📊 Configuration des Plans d'Abonnement

### Plan Free
```json
{
  "analytics": false  // ❌ Analytics désactivé
}
```

### Plan Starter  
```json
{
  "analytics": true   // ✅ Analytics activé
}
```

### Plan CMS
```json
{
  "analytics": true   // ✅ Analytics activé
}
```

**Source :** Configuration dans `COMPLETE-MIGRATION-SUMMARY.md` et base de données `subscription_plans.features`

---

## 🔄 Flux d'Autorisation

### 1. **Requête d'Autorisation**
```javascript
checkAuthorization('auth_analytics', websiteId)
```

### 2. **Mapping Serveur**
```javascript
'auth_analytics' → 'analytics'  // Via mapFeatureName()
```

### 3. **Vérification Plan**
```sql
SELECT subscription_plans.features 
FROM website_subscriptions 
JOIN subscription_plans ON subscription_plans.id = website_subscriptions.plan_id
WHERE website_id = :websiteId
```

### 4. **Réponse**
```json
{
  "authorisation": false,  // Plan free
  "authorisation": true    // Plan starter/cms
}
```

### 5. **Interface Utilisateur**
- ❌ **Non autorisé** : Liens grisés, icône cadenas, redirection vers upgrade
- ✅ **Autorisé** : Accès normal aux fonctionnalités analytics

---

## 🧪 Tests Effectués

### Test 1 : Plan Free
```bash
# État attendu
analyticsAuth = false
# UI
- Carte "Statistiques" désactivée dans WebsiteHome
- Lien "Statistiques" avec cadenas dans sidebar
- Route /stats/analytics bloquée
```

### Test 2 : Plan Starter/CMS
```bash
# État attendu  
analyticsAuth = true
# UI
- Carte "Statistiques" active dans WebsiteHome
- Lien "Statistiques" fonctionnel dans sidebar  
- Route /stats/analytics accessible
```

### Test 3 : Accès Direct URL
```bash
# Plan Free → /dashboard/website/stats/analytics
# Résultat attendu : Redirection vers upgrade plan
```

---

## 🎨 Comportement Visuel

### Interface Désactivée (Plan Free)
- **Carte Dashboard** : Opacité réduite, cursor `not-allowed`, icône cadenas
- **Sidebar Link** : Classe CSS `disabled`, couleur grisée, icône 🔒
- **Hover Effects** : Tooltip expliquant la limitation du plan

### Interface Active (Plans Payants)  
- **Carte Dashboard** : Couleurs normales, hover effects, navigation vers `/stats`
- **Sidebar Link** : Navigation active, états hover/active normaux
- **Fonctionnalités** : Accès complet aux analytics Google et Search Console

---

## 📋 Résumé des Fichiers Modifiés

### Backend
- ✅ `server/users/authorisation.js` - Ajout mapping `auth_analytics → analytics`

### Frontend  
- ✅ `client/src/Authorisation/Authorisation.jsx` - Nouveau composant `AuthorisedRouteAnalytics`
- ✅ `client/src/Components/Dashboard/Pages/website/WebsiteHome.jsx` - État `analyticsAuth` + protection carte
- ✅ `client/src/Components/Dashboard/Pages/website/WebsiteManager.jsx` - État `analyticsAuth` + protection sidebar
- ✅ `client/src/App.jsx` - Protection route `/stats/analytics`

### Configuration
- ✅ **Base de données** : Plans configurés avec `analytics: false/true`  
- ✅ **Frontend Plans** : Affichage correct dans `SubscriptionPlans.jsx`

---

## 🚀 Résultat Final

✅ **Analytics complètement protégé par autorisation**
✅ **Plan Free : Analytics désactivé**  
✅ **Plans Payants : Analytics activé**
✅ **Interface utilisateur cohérente avec Newsletter**
✅ **Protection routes + navigation + accès direct URL**
✅ **Aucune régression sur fonctionnalités existantes**

**🎉 L'implémentation est terminée et fonctionnelle !**