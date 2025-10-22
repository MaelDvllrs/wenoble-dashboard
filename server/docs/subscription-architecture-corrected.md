# Architecture Abonnements par Site (Corrigée)

## Problème Identifié
L'architecture précédente utilisait `user_id` dans `website_subscriptions`, ce qui créait une logique d'**abonnement par utilisateur**. Cependant, la logique métier est **abonnement par site** avec plusieurs utilisateurs pouvant accéder au même site.

## Architecture Corrigée

### Tables et Relations

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   auth.users    │    │  user_websites   │    │ website_subscriptions│
│                 │    │                  │    │                     │
│ id (UUID)       │◄───┤ user_id         │    │ id                  │
│ email           │    │ website_id      ├───►│ website_id          │
│ ...             │    │ role            │    │ plan_id             │
└─────────────────┘    │ created_at      │    │ stripe_subscription_id│
                       └──────────────────┘    │ status              │
                                               │ current_period_start │
┌─────────────────┐                           │ current_period_end   │
│subscription_plans│                           └─────────────────────┘
│                 │                           
│ id (UUID)       │◄──────────────────────────┘
│ name            │                           
│ price           │                           
│ stripe_price_id │                           
└─────────────────┘                           
```

### Flux de Données

#### 1. **Vérification d'Accès**
```javascript
// L'utilisateur peut-il accéder à ce site ?
SELECT * FROM user_websites 
WHERE user_id = ${userId} AND website_id = ${websiteId}
```

#### 2. **Récupération de l'Abonnement**
```javascript
// Quel est l'abonnement de ce site ?
SELECT * FROM website_subscriptions 
WHERE website_id = ${websiteId} AND status = 'active'
```

#### 3. **Logique de Sécurité**
- ✅ **user_websites** → Qui peut accéder à quels sites
- ✅ **website_subscriptions** → Quel abonnement pour quel site
- ❌ ~~user_id dans website_subscriptions~~ → Supprimé

## Avantages de cette Architecture

### 🏢 **Multi-Utilisateurs par Site**
- Plusieurs utilisateurs peuvent gérer le même site
- Un seul abonnement par site
- Facturation simplifiée

### 💡 **Cas d'Usage Réels**
```
Entreprise ABC:
├── Site 1 (Plan CMS - 9.99€/mois)
│   ├── Jean (Administrateur)
│   ├── Marie (Éditeur)
│   └── Paul (Contributeur)
├── Site 2 (Plan Starter - 4.99€/mois)
│   ├── Jean (Administrateur)
│   └── Sophie (Éditeur)
```

**Total facturé**: 14.98€/mois (2 sites, pas 5 utilisateurs)

### 🔒 **Sécurité Maintenue**
- RLS basé sur `user_websites`
- Chaque utilisateur voit uniquement les sites autorisés
- Abonnements liés aux sites, pas aux utilisateurs

## Migration à Effectuer

### 1. **Supprimer user_id** (si elle existe)
```sql
-- Exécuter: remove_user_id_from_website_subscriptions.sql
```

### 2. **Setup Stripe Corrigé**
```sql
-- Exécuter: setup_stripe_integration_corrected.sql
```

### 3. **Vérification**
```sql
-- La table ne doit PAS avoir de colonne user_id
\d website_subscriptions;
```

## Code Backend Corrigé

### ✅ **Avant (Incorrect)**
```javascript
// Recherche par utilisateur ET site
.eq("user_id", userId)
.eq("website_id", websiteId)
```

### ✅ **Après (Correct)**
```javascript
// 1. Vérifier l'accès au site
SELECT * FROM user_websites WHERE user_id = ? AND website_id = ?

// 2. Récupérer l'abonnement du site
SELECT * FROM website_subscriptions WHERE website_id = ?
```

## Points Clés

1. **Un abonnement = Un site** (pas un utilisateur)
2. **Permissions via user_websites** (qui peut accéder à quoi)
3. **Facturation par site** (logique métier claire)
4. **Multi-utilisateurs supporté** (collaboration d'équipe)

Cette architecture reflète mieux la réalité business : les entreprises paient pour leurs sites, pas pour le nombre d'utilisateurs qui les gèrent.