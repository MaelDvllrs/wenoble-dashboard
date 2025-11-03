# Système d'Abonnement Stripe - Documentation Complète

## 📋 Vue d'ensemble

Ce document décrit l'implémentation complète du système d'abonnement avec Stripe pour Wenoble Dashboard.

## 🎯 Fonctionnalités

- ✅ Plans d'abonnement : **Gratuit** et **Premium** (9,99€/mois)
- ✅ Affichage du plan actuel par site
- ✅ Interface utilisateur pour comparer les plans
- ✅ Routes API backend pour gérer les abonnements
- ⏳ Intégration Stripe Checkout (à finaliser)
- ⏳ Portail client Stripe (à finaliser)
- ⏳ Webhooks Stripe (à finaliser)

## 📁 Structure des fichiers

### Frontend

```
client/src/Components/Dashboard/Pages/Subscription/
├── SubscriptionPlans.jsx       # Page principale des abonnements
└── subscription.css            # Styles pour la page

client/src/service/
└── subscriptionService.js      # Service API pour les abonnements
```

### Backend

```
server/subscription/
├── subscription.js             # Routes API
├── stripeConfig.js            # Configuration Stripe
└── STRIPE-SETUP.md            # Guide de configuration
```

## 🗄️ Structure des tables Supabase

### Table: `subscription_plans`

Contient les différents plans d'abonnement disponibles.

```sql
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    billing_period VARCHAR(20) NOT NULL,
    stripe_price_id VARCHAR(255),
    features JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Données initiales :**
```sql
-- Plan Gratuit
INSERT INTO subscription_plans (name, price, billing_period, features, is_active)
VALUES (
    'Gratuit',
    0.00,
    'lifetime',
    '["Collections CMS", "Pages personnalisées", "Portfolio", "Contact", "Newsletter", "Preview uniquement"]',
    true
);

-- Plan Premium
INSERT INTO subscription_plans (name, price, billing_period, stripe_price_id, features, is_active)
VALUES (
    'Premium',
    9.99,
    'monthly',
    'price_XXXXXXXXXX', -- À remplacer par l'ID Stripe
    '["Toutes fonctionnalités Gratuit", "Domaine personnalisé", "SSL", "Support prioritaire", "Analytics avancées"]',
    true
);
```

### Table: `website_subscriptions`

Contient les abonnements actifs des sites.

```sql
CREATE TABLE website_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    canceled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX idx_website_subscriptions_website_id ON website_subscriptions(website_id);
CREATE INDEX idx_website_subscriptions_status ON website_subscriptions(status);
CREATE INDEX idx_website_subscriptions_stripe_subscription_id ON website_subscriptions(stripe_subscription_id);
```

## 🔌 Routes API Backend

### GET `/subscription-status/:websiteId`
Récupère le statut d'abonnement d'un site.

**Headers:**
```
Authorization: Bearer <token>
```

**Réponse:**
```json
{
    "success": true,
    "subscription": {
        "plan_id": "uuid",
        "plan_name": "Premium",
        "price": 9.99,
        "billing_period": "monthly",
        "features": [...],
        "status": "active",
        "is_free": false,
        "current_period_end": "2025-11-14T12:00:00Z"
    }
}
```

### GET `/plans`
Récupère tous les plans d'abonnement disponibles.

**Headers:**
```
Authorization: Bearer <token>
```

**Réponse:**
```json
{
    "success": true,
    "plans": [
        {
            "id": "uuid",
            "name": "Gratuit",
            "price": 0,
            "billing_period": "lifetime",
            "features": [...]
        },
        {
            "id": "uuid",
            "name": "Premium",
            "price": 9.99,
            "billing_period": "monthly",
            "features": [...]
        }
    ]
}
```

### POST `/create-checkout-session`
Crée une session Stripe Checkout pour s'abonner.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
    "websiteId": "uuid",
    "planId": "uuid"
}
```

**Réponse:**
```json
{
    "success": true,
    "checkoutUrl": "https://checkout.stripe.com/..."
}
```

### POST `/create-portal-session`
Crée une session portail Stripe pour gérer l'abonnement.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
    "websiteId": "uuid"
}
```

**Réponse:**
```json
{
    "success": true,
    "portalUrl": "https://billing.stripe.com/..."
}
```

### POST `/cancel-subscription`
Annule un abonnement actif.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
    "websiteId": "uuid"
}
```

**Réponse:**
```json
{
    "success": true,
    "message": "Abonnement annulé avec succès"
}
```

## 🔐 Configuration Stripe

### 1. Variables d'environnement

Ajouter dans `server/.env` :

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Client URL
CLIENT_URL=http://localhost:5173
```

### 2. Installation

```bash
cd server
npm install stripe
```

### 3. Configuration Stripe Dashboard

1. **Créer un compte Stripe** : https://stripe.com
2. **Créer un produit "Premium"** avec prix récurrent de 9,99€/mois
3. **Copier l'ID du prix** (commence par `price_...`)
4. **Mettre à jour la table** `subscription_plans` avec cet ID
5. **Configurer les webhooks** avec les événements suivants :
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

## 🎨 Interface Utilisateur

### Page Abonnement

**Route:** `/dashboard/website/subscription/:websiteId`

**Composant:** `SubscriptionPlans.jsx`

**Fonctionnalités:**
- Affichage des 2 plans côte à côte
- Badge "Recommandé" sur le plan Premium
- Badge "Plan actuel" sur le plan actif
- Comparaison des fonctionnalités avec icônes ✓/✗
- Bouton "S'abonner" pour le plan Premium
- Bouton "Gérer mon abonnement" pour les abonnés Premium
- Section FAQ

### Sidebar Navigation

Un nouveau lien "Abonnement" a été ajouté dans la sidebar secondaire de `WebsiteManager.jsx` :

```jsx
<NavLink to={`/dashboard/website/subscription/${selectedWebsite.id}`}>
    <CardMembershipIcon fontSize='small'/>
    Abonnement
</NavLink>
```

## 🔄 Flux utilisateur

### S'abonner au plan Premium

1. L'utilisateur clique sur "S'abonner" sur le plan Premium
2. `handleSubscribe()` est appelé
3. Frontend appelle `/create-checkout-session`
4. Backend crée une session Stripe Checkout
5. Utilisateur est redirigé vers Stripe
6. Après paiement, webhook Stripe notifie le backend
7. Backend crée l'entrée dans `website_subscriptions`
8. Utilisateur est redirigé vers la page de succès

### Gérer son abonnement

1. L'utilisateur clique sur "Gérer mon abonnement"
2. `handleManageSubscription()` est appelé
3. Frontend appelle `/create-portal-session`
4. Backend crée une session Stripe Customer Portal
5. Utilisateur est redirigé vers le portail Stripe
6. Utilisateur peut modifier/annuler son abonnement
7. Webhooks Stripe mettent à jour le backend

## 📝 Prochaines étapes

### Phase 1 : Configuration Stripe ⏳
- [ ] Créer compte Stripe
- [ ] Obtenir les clés API
- [ ] Créer le produit Premium
- [ ] Configurer les webhooks

### Phase 2 : Implémentation Stripe Checkout ⏳
- [ ] Implémenter la création de session Checkout
- [ ] Gérer les redirections succès/échec
- [ ] Tester le flux de paiement

### Phase 3 : Webhooks ⏳
- [ ] Implémenter la gestion des webhooks
- [ ] Créer/mettre à jour les abonnements
- [ ] Gérer les échecs de paiement

### Phase 4 : Portail Client ⏳
- [ ] Implémenter le portail client Stripe
- [ ] Permettre la modification/annulation

### Phase 5 : Restrictions ⏳
- [ ] Implémenter les vérifications de plan
- [ ] Bloquer les fonctionnalités Premium pour les gratuits
- [ ] Afficher les messages d'upgrade

### Phase 6 : Tests ⏳
- [ ] Tester le flux complet
- [ ] Tester les webhooks
- [ ] Tester les cas d'erreur

## 🐛 Débogage

### Tester les webhooks localement

Utiliser Stripe CLI :

```bash
stripe listen --forward-to localhost:3000/webhook
stripe trigger customer.subscription.created
```

### Logs

Les logs sont dans la console serveur pour :
- Création de sessions Checkout
- Réception de webhooks
- Erreurs d'API

## 📚 Ressources

- [Documentation Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Documentation Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Documentation Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)

---

**Date de création:** 14 octobre 2025  
**Dernière mise à jour:** 14 octobre 2025  
**Statut:** Backend créé, frontend connecté, Stripe à configurer
