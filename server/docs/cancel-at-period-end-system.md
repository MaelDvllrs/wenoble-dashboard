# Annulation d'Abonnement à la Fin de Période - Documentation

## Changement de Comportement

### ❌ **Ancien Système (Annulation Immédiate)**
```
Utilisateur annule → Stripe cancel() → status = 'canceled' → Perte immédiate d'accès
```

### ✅ **Nouveau Système (Annulation à la Fin de Période)**
```
Utilisateur annule → Stripe update(cancel_at_period_end: true) 
→ cancel_at_period_end = true 
→ Accès conservé jusqu'à current_period_end
→ Stripe webhook annule automatiquement à la fin
```

## Structure Base de Données

### Colonne Modifiée

**Supprimé :**
```sql
canceled_at TIMESTAMP
```

**Ajouté :**
```sql
cancel_at_period_end BOOLEAN DEFAULT false
```

### Migration SQL

```sql
-- Exécuter : add_cancel_at_period_end.sql
ALTER TABLE website_subscriptions 
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_website_subscriptions_cancel_at_period_end 
ON website_subscriptions(cancel_at_period_end) WHERE cancel_at_period_end = true;
```

## Côté Serveur

### Route `/cancel-subscription`

```javascript
// Avant (annulation immédiate)
await stripe.subscriptions.cancel(subscription.stripe_subscription_id);

// Après (annulation à la fin de période)
await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    cancel_at_period_end: true
});
```

### Mise à Jour BDD

```javascript
// Avant
.update({
    status: 'canceled',
    canceled_at: new Date().toISOString()
})

// Après
.update({
    cancel_at_period_end: true,
    updated_at: new Date().toISOString()
})
```

### Réponse API

```javascript
{
    success: true,
    message: "Abonnement annulé avec succès. Vous conservez l'accès aux fonctionnalités premium jusqu'au 15 novembre 2025.",
    cancel_at_period_end: true,
    period_end: "2025-11-15T10:30:00Z"
}
```

## Côté Client

### État Ajouté

```jsx
const [subscriptionInfo, setSubscriptionInfo] = useState(null);
```

Stocke les informations complètes de l'abonnement incluant :
- `cancel_at_period_end` : Boolean
- `current_period_end` : Date ISO
- `plan_name` : String
- etc.

### Bandeau d'Information

**Quand afficher :**
```jsx
subscriptionInfo?.cancel_at_period_end && currentPlan !== 'free'
```

**Contenu :**
```
⚠️ Annulation programmée

Votre abonnement CMS sera annulé le 15 novembre 2025.
Vous conservez l'accès aux fonctionnalités premium jusqu'à cette date.
```

### Modal de Confirmation - Nouveau Contenu

```
📅 Ce qui va se passer :

• Vous conservez l'accès jusqu'à la fin de la période
• Aucune nouvelle facturation
• Passage au gratuit automatique à la fin
• Perte des fonctionnalités premium après

📆 Fin de la période : 15 novembre 2025
💡 Réabonnement possible à tout moment
```

## Webhooks Stripe

### Événement à Gérer

Stripe enverra automatiquement un webhook à la fin de la période :

```javascript
// Dans handleSubscriptionDeleted() ou handleSubscriptionUpdate()
if (subscription.cancel_at_period_end === true) {
    // L'abonnement est programmé pour annulation
    // Ne rien faire, attendre la fin de période
}

// À la fin de période, Stripe envoie :
'customer.subscription.deleted'
// → Mettre status = 'canceled'
```

## Expérience Utilisateur Complète

### Timeline d'Annulation

```
Jour 0 (15 oct) - Utilisateur clique "Passer au gratuit"
  ↓
  Modal de confirmation avec date de fin (15 nov)
  ↓
  Confirmation → Requête API
  ↓
  Stripe : cancel_at_period_end = true
  BDD : cancel_at_period_end = true
  ↓
Jour 0 à Jour 30 - Bandeau jaune affiché
  "Annulation programmée - Accès jusqu'au 15 nov"
  ✅ Toutes les fonctionnalités premium actives
  ✅ Aucune nouvelle facturation
  ↓
Jour 31 (15 nov) - Fin de période
  Stripe webhook → subscription.deleted
  BDD : status = 'canceled'
  ↓
  Interface : currentPlan = 'free'
  ❌ Perte accès fonctionnalités premium
```

### États de l'Interface

#### État 1 : Abonnement Actif (Normal)
```jsx
currentPlan = 'cms'
cancel_at_period_end = false

→ Affichage : "Plan actuel" sur la carte CMS
→ Bandeau : Aucun
→ Bouton : "Passer au gratuit" sur carte Gratuit
```

#### État 2 : Annulation Programmée
```jsx
currentPlan = 'cms' (encore actif)
cancel_at_period_end = true

→ Affichage : "Plan actuel" sur la carte CMS
→ Bandeau : Jaune "Annulation programmée - Fin le 15 nov"
→ Bouton : "Passer au gratuit" désactivé ou masqué
```

#### État 3 : Annulation Effective (Après Fin de Période)
```jsx
currentPlan = 'free'
status = 'canceled'

→ Affichage : "Plan actuel" sur carte Gratuit
→ Bandeau : Aucun
→ Bouton : "S'abonner" sur cartes payantes
```

## Avantages du Nouveau Système

✅ **Meilleure UX** : L'utilisateur garde ses fonctionnalités payées
✅ **Moins de frustration** : Pas de perte immédiate
✅ **Conforme Stripe** : Pratique standard des abonnements SaaS
✅ **Transparent** : Date de fin clairement affichée
✅ **Réversible** : Peut annuler l'annulation via Stripe Portal (optionnel)

## Points d'Attention

### 🔄 Gestion du Statut

Le plan reste **actif** jusqu'à la fin :
```javascript
// ❌ Ne PAS faire
if (response.data.success) {
    setCurrentPlan('free'); // Trop tôt !
}

// ✅ Faire
if (response.data.success) {
    setSubscriptionInfo({
        ...subscriptionInfo,
        cancel_at_period_end: true
    });
    // currentPlan reste inchangé
}
```

### 📅 Affichage de la Date

Toujours formater la date en français :
```javascript
new Date(subscriptionInfo.current_period_end).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
})
// → "15 novembre 2025"
```

Ce système offre une meilleure expérience utilisateur tout en restant cohérent avec les standards de l'industrie ! 🚀