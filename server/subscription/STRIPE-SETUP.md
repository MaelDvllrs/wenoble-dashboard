# Configuration Stripe pour les Abonnements

## Variables d'environnement à ajouter dans votre fichier .env

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# URL du client (pour les redirections)
CLIENT_URL=http://localhost:5173
```

## Comment obtenir vos clés Stripe

1. **Créer un compte Stripe**
   - Aller sur https://stripe.com
   - Créer un compte (utiliser le mode test pour débuter)

2. **Récupérer les clés API**
   - Aller dans Développeurs > Clés API
   - Copier la clé secrète (`sk_test_...`) et la clé publiable (`pk_test_...`)
   - Ajouter ces clés dans votre fichier `.env`

3. **Créer les produits dans Stripe**
   - Aller dans Produits
   - Créer un produit "Premium"
   - Ajouter un prix récurrent de 9,99€/mois
   - Copier l'ID du prix (commence par `price_...`)
   - Mettre à jour la table `subscription_plans` avec cet ID

4. **Configurer les webhooks**
   - Aller dans Développeurs > Webhooks
   - Ajouter un point de terminaison : `https://votre-domaine.com/webhook`
   - Sélectionner les événements :
     * `customer.subscription.created`
     * `customer.subscription.updated`
     * `customer.subscription.deleted`
     * `invoice.paid`
     * `invoice.payment_failed`
   - Copier le secret du webhook (`whsec_...`)
   - Ajouter ce secret dans votre fichier `.env`

## Installation du package Stripe

```bash
cd server
npm install stripe
```

## Structure des tables Supabase nécessaires

### Table: subscription_plans
```sql
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    billing_period VARCHAR(20) NOT NULL, -- 'monthly', 'yearly', 'lifetime'
    stripe_price_id VARCHAR(255), -- ID du prix Stripe
    features JSONB, -- Liste des fonctionnalités
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Table: website_subscriptions
```sql
CREATE TABLE website_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    stripe_subscription_id VARCHAR(255), -- ID de l'abonnement Stripe
    stripe_customer_id VARCHAR(255), -- ID du client Stripe
    status VARCHAR(20) NOT NULL, -- 'active', 'canceled', 'past_due', 'trialing'
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    canceled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Routes API créées

### GET /subscription-status/:websiteId
Récupère le statut d'abonnement d'un site spécifique.

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
        "is_free": false
    }
}
```

### GET /plans
Récupère tous les plans d'abonnement disponibles.

**Réponse:**
```json
{
    "success": true,
    "plans": [...]
}
```

### POST /create-checkout-session
Crée une session Stripe Checkout pour s'abonner.

**Body:**
```json
{
    "websiteId": "uuid",
    "planId": "uuid"
}
```

### POST /create-portal-session
Crée une session portail Stripe pour gérer l'abonnement.

**Body:**
```json
{
    "websiteId": "uuid"
}
```

### POST /cancel-subscription
Annule un abonnement actif.

**Body:**
```json
{
    "websiteId": "uuid"
}
```

### POST /webhook
Endpoint pour recevoir les webhooks Stripe.

## Prochaines étapes

1. ✅ Routes backend créées
2. ⏳ Installer le package Stripe
3. ⏳ Ajouter les variables d'environnement
4. ⏳ Implémenter Stripe Checkout dans les routes
5. ⏳ Implémenter les webhooks Stripe
6. ⏳ Connecter le frontend aux nouvelles routes API
7. ⏳ Tester le flux complet d'abonnement
