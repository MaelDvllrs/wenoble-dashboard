# Configuration Stripe pour Wenoble Dashboard

## Étapes de configuration

### 1. Créer un compte Stripe

1. Allez sur [stripe.com](https://stripe.com) et créez un compte
2. Activez le mode test pour le développement

### 2. Récupérer les clés API

Dans le dashboard Stripe, allez dans **Developers > API keys** :

- **Clé secrète** : `sk_test_...` (pour le serveur)
- **Clé publique** : `pk_test_...` (pour le client, si nécessaire)

### 3. Créer un produit et prix

1. Dans le dashboard Stripe, allez dans **Products**
2. Créez un nouveau produit "Wenoble Premium"
3. Ajoutez un prix récurrent (ex: 9.99€/mois)
4. Copiez l'ID du prix (format : `price_...`)

### 4. Configurer les webhooks

1. Allez dans **Developers > Webhooks**
2. Créez un endpoint : `https://votre-domaine.com/subscription/webhook`
3. Sélectionnez ces événements :
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copiez la clé de signature du webhook (`whsec_...`)

### 5. Mettre à jour le fichier .env

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_VOTRE_CLE_SECRETE
STRIPE_PUBLISHABLE_KEY=pk_test_VOTRE_CLE_PUBLIQUE
STRIPE_WEBHOOK_SECRET=whsec_VOTRE_CLE_WEBHOOK
STRIPE_PREMIUM_PRICE_ID=price_VOTRE_ID_PRIX
CLIENT_URL=http://localhost:5173
```

### 6. Exécuter les migrations

Exécutez le fichier SQL `setup_stripe_integration.sql` dans votre base de données Supabase :

1. Ouvrez le SQL Editor dans Supabase
2. Copiez et exécutez le contenu du fichier de migration

### 7. Mettre à jour les plans dans la base de données

Ajoutez le `stripe_price_id` à votre plan Premium dans la table `subscription_plans` :

```sql
UPDATE subscription_plans 
SET stripe_price_id = 'price_VOTRE_ID_PRIX' 
WHERE name = 'Premium';
```

## URLs de redirection

- **Succès** : `/dashboard/website/{websiteId}/subscription?success=true`
- **Annulation** : `/dashboard/website/{websiteId}/subscription?canceled=true`
- **Retour portail** : `/dashboard/website/{websiteId}/subscription`

## Test en mode développement

1. Utilisez les cartes de test Stripe :
   - **Succès** : `4242 4242 4242 4242`
   - **Échec** : `4000 0000 0000 0002`

2. Vérifiez les webhooks dans le dashboard Stripe

## Production

1. Basculez en mode live dans Stripe
2. Remplacez les clés test par les clés live
3. Mettez à jour l'URL du webhook avec votre domaine de production
4. Testez avec de vraies cartes (petits montants)

## Sécurité

- ⚠️ **JAMAIS** exposer la clé secrète côté client
- ✅ Toujours vérifier les webhooks avec la signature
- ✅ Valider les données côté serveur
- ✅ Utiliser HTTPS en production