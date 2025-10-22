# Configuration des Nouveaux Plans d'Abonnement

## Plans à Créer dans Stripe

### 1. Plan Starter - 4,99€/mois
- Nom dans Stripe : "Starter Plan"
- Prix : 4,99 EUR
- Récurrence : Mensuelle
- Description : "Plan Starter avec domaine personnalisé et analytics"

### 2. Plan CMS - 9,99€/mois  
- Nom dans Stripe : "CMS Plan"
- Prix : 9,99 EUR
- Récurrence : Mensuelle
- Description : "Plan complet avec CMS, pages personnalisées et portfolio"

## Étapes de Configuration

### 1. Créer les Produits dans Stripe Dashboard

1. Aller sur https://dashboard.stripe.com/products
2. Cliquer sur "Ajouter un produit"
3. Pour chaque plan :
   - Nom : "Starter Plan" / "CMS Plan"
   - Description : Copier depuis ci-dessus
   - Modèle de prix : Abonnement récurrent
   - Prix : 4,99 EUR / 9,99 EUR
   - Fréquence de facturation : Mensuelle

### 2. Récupérer les Price IDs

Après création, récupérer les IDs de prix (format: `price_xxxxx`) et les ajouter dans :

1. **Variables d'environnement** (.env) :
```
STRIPE_STARTER_PRICE_ID=price_xxxxx
STRIPE_CMS_PRICE_ID=price_xxxxx
```

2. **Base de données** : Mettre à jour le script SQL
```sql
-- Remplacer les placeholders dans add_new_subscription_plans.sql
UPDATE subscription_plans SET stripe_price_id = 'price_xxxxx' WHERE name = 'starter';
UPDATE subscription_plans SET stripe_price_id = 'price_xxxxx' WHERE name = 'cms';
```

### 3. Exécuter les Migrations

1. Connectez-vous à Supabase SQL Editor
2. Exécutez le script `add_new_subscription_plans.sql`
3. Vérifiez que les 3 plans sont créés :
```sql
SELECT * FROM subscription_plans WHERE is_active = true;
```

### 4. Test des Paiements

- Plan Gratuit : Pas de paiement requis
- Plan Starter : Test avec carte 4242 4242 4242 4242
- Plan CMS : Test avec carte 4242 4242 4242 4242

## Structure des Fonctionnalités par Plan

### Plan Gratuit (0€)
- ✅ Formulaire de contact
- ✅ Newsletter  
- ✅ Preview Webflow uniquement
- ❌ Domaine personnalisé
- ❌ SSL
- ❌ Analytics
- ❌ CMS
- ❌ Pages personnalisées
- ❌ Portfolio

### Plan Starter (4,99€)
- ✅ Toutes les fonctionnalités Gratuit
- ✅ Domaine personnalisé
- ✅ SSL inclus
- ✅ Analytics
- ❌ CMS
- ❌ Pages personnalisées
- ❌ Portfolio

### Plan CMS (9,99€)
- ✅ Toutes les fonctionnalités Starter
- ✅ CMS (Collections illimitées)
- ✅ Pages personnalisées
- ✅ Portfolio
- ✅ Support prioritaire