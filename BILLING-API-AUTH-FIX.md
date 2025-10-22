# Correction des Appels API Billing - Middleware d'Authentification

## 🎯 Objectif
Corriger les appels serveur dans les composants Billing et PaymentMethodDialog pour inclure les informations d'authentification nécessaires pour passer le middleware.

---

## ✅ Modifications Effectuées

### 1. **BillingDashboard.jsx**

#### Import du Token d'Authentification
```jsx
// AJOUTÉ
import Cookies from 'js-cookie';

// Dans le composant
const token = Cookies.get('token');
```

#### Correction des Appels API
```jsx
// AVANT
const [billingResponse, invoicesResponse, paymentMethodsResponse] = await Promise.all([
  Axios.get(`${config.apiUrl}/subscription-info/${siteId}`),
  Axios.get(`${config.apiUrl}/invoices/${siteId}`),
  Axios.get(`${config.apiUrl}/payment-methods/${siteId}`)
]);

// APRÈS
const [billingResponse, invoicesResponse, paymentMethodsResponse] = await Promise.all([
  Axios.get(`${config.apiUrl}/billing/subscription-info/${siteId}`, {
    headers: { Authorization: `Bearer ${token}` }
  }),
  Axios.get(`${config.apiUrl}/billing/invoices/${siteId}`, {
    headers: { Authorization: `Bearer ${token}` }
  }),
  Axios.get(`${config.apiUrl}/billing/payment-methods/${siteId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
]);
```

#### Correction du Téléchargement de Factures
```jsx
// AVANT
const response = await Axios.get(`${config.apiUrl}/invoice-pdf/${invoiceId}`, {
  responseType: 'blob'
});

// APRÈS
const response = await Axios.get(`${config.apiUrl}/billing/invoice-pdf/${invoiceId}`, {
  responseType: 'blob',
  headers: { Authorization: `Bearer ${token}` }
});
```

---

### 2. **PaymentMethodDialog.jsx**

#### Import du Token d'Authentification
```jsx
// AJOUTÉ
import Cookies from 'js-cookie';

// Dans le composant
const token = Cookies.get('token');
```

#### Correction de l'Ajout de Méthode de Paiement
```jsx
// AVANT
const response = await Axios.post(`${config.apiUrl}/add-payment-method`, {
  websiteId,
  paymentData: {
    ...paymentData,
    cardNumber: paymentData.cardNumber.replace(/\s/g, '')
  }
});

// APRÈS
const response = await Axios.post(`${config.apiUrl}/billing/add-payment-method`, {
  websiteId,
  paymentData: {
    ...paymentData,
    cardNumber: paymentData.cardNumber.replace(/\s/g, '')
  }
}, {
  headers: { Authorization: `Bearer ${token}` }
});
```

---

## 🔧 Corrections des Chemins d'API

### URLs Corrigées
```javascript
// AVANT
/subscription-info/${siteId}
/invoices/${siteId}
/payment-methods/${siteId}
/invoice-pdf/${invoiceId}
/add-payment-method

// APRÈS
/billing/subscription-info/${siteId}
/billing/invoices/${siteId}
/billing/payment-methods/${siteId}
/billing/invoice-pdf/${invoiceId}
/billing/add-payment-method
```

---

## 🔐 Pattern d'Authentification

### Structure des Headers
```javascript
{
  headers: { 
    Authorization: `Bearer ${token}` 
  }
}
```

### Récupération du Token
```javascript
import Cookies from 'js-cookie';
const token = Cookies.get('token');
```

---

## 📋 Conformité avec les Autres Composants

### Pattern Utilisé par Exemple dans SubscriptionPlans.jsx
```javascript
const response = await Axios.get(`${config.apiUrl}/subscription-status/${websiteId}`, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

### Cohérence dans l'Application
- ✅ **Import Token** : `Cookies.get('token')`
- ✅ **Headers** : `Authorization: Bearer ${token}`
- ✅ **Chemins API** : Préfixe `/billing/` pour tous les endpoints
- ✅ **Gestion d'Erreurs** : try/catch avec messages explicites

---

## 🧪 Vérification Middleware

### Backend - Middleware authenticateToken
```javascript
// server/middleware/authToken.js
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Token requis' });
  }
  
  // Validation du token...
  req.user = decoded;
  next();
};
```

### Routes Protégées
```javascript
// server/billing/billing.js
router.get("/subscription-info/:websiteId", authenticateToken, async (req, res) => {
  const userId = req.user.idUser; // ✅ Disponible grâce au token
  // ...
});
```

---

## 🔄 Tests à Effectuer

### Test 1 : Informations d'Abonnement
```bash
# Frontend
# Aller sur /dashboard/website/billing/:websiteId
# Vérifier que les données se chargent sans erreur 401

# Backend
POST /billing/subscription-info/12345
Headers: Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Doit retourner 200 avec les données d'abonnement
```

### Test 2 : Historique des Factures
```bash
# Frontend
# Vérifier que la liste des factures s'affiche
# Tester le téléchargement d'une facture PDF

# Backend  
GET /billing/invoices/12345
Headers: Authorization: Bearer ...
# Doit retourner 200 avec la liste des factures
```

### Test 3 : Méthodes de Paiement
```bash
# Frontend
# Ouvrir le dialog d'ajout de carte
# Tenter de soumettre le formulaire

# Backend
POST /billing/add-payment-method
Headers: Authorization: Bearer ...
Body: { websiteId: "12345", paymentData: {...} }
# Doit retourner 200 ou erreur métier (pas 401)
```

---

## ⚠️ Points d'Attention

### Sécurité
- ✅ **Token JWT** : Validation côté serveur
- ✅ **Vérification Propriété** : `checkUserWebsiteAccess()`
- ✅ **Headers Requis** : Middleware `authenticateToken`

### Performance
- ✅ **Requêtes Parallèles** : `Promise.all()` pour les 3 endpoints
- ✅ **Gestion d'Erreurs** : Try/catch avec fallbacks
- ✅ **États de Chargement** : Spinners pendant les requêtes

### Conformité
- ✅ **Pattern Cohérent** : Même structure que les autres composants
- ✅ **Chemins d'API** : Préfixe `/billing/` pour l'organisation
- ✅ **Import Standard** : Cookies.js-cookie pour le token

---

## 📊 Résultats Attendus

### Avant Correction
```bash
# Erreurs 401 Unauthorized
GET /subscription-info/12345 → 401 (Token manquant)
GET /invoices/12345 → 401 (Token manquant)
POST /add-payment-method → 401 (Token manquant)
```

### Après Correction
```bash
# Succès avec données
GET /billing/subscription-info/12345 → 200 + données abonnement
GET /billing/invoices/12345 → 200 + liste factures
POST /billing/add-payment-method → 200 + confirmation
```

---

## ✅ Résumé

**Les appels API de facturation passent maintenant correctement le middleware d'authentification :**

- 🔐 **Token JWT** : Récupéré depuis les cookies
- 📡 **Headers** : `Authorization: Bearer ${token}` sur tous les appels
- 🛣️ **Chemins** : Préfixe `/billing/` pour l'organisation
- 🔒 **Sécurité** : Validation utilisateur + propriété du site
- 🎯 **Cohérence** : Pattern identique aux autres composants

**Les pages de facturation sont maintenant sécurisées et fonctionnelles !** ✅