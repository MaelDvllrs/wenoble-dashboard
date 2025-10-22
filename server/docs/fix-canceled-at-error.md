# Corrections - Suppression de canceled_at

## Problème Résolu

**Erreur :**
```
PGRST204: Could not find the 'canceled_at' column of 'website_subscriptions' in the schema cache
```

## Corrections Effectuées

### 1. **Suppression de l'ancienne route `/cancel-subscription`**

**Avant :** Deux routes `/cancel-subscription` présentes dans le fichier
- Ligne ~508 : Ancienne version (utilise `canceled_at`)
- Ligne ~655 : Nouvelle version (utilise `cancel_at_period_end`)

**Après :** Une seule route `/cancel-subscription`
- Suppression complète de l'ancienne route
- Seule la nouvelle route reste active

### 2. **Correction de `handleSubscriptionDeleted()`**

**Avant :**
```javascript
.update({
    status: 'canceled',
    canceled_at: new Date().toISOString(),  // ❌ Colonne inexistante
    updated_at: new Date().toISOString()
})
```

**Après :**
```javascript
.update({
    status: 'canceled',
    updated_at: new Date().toISOString()  // ✅ Pas de canceled_at
})
```

### 3. **Correction de l'ID utilisateur**

**Avant :**
```javascript
const userId = req.user.id;  // ❌ Incohérent avec le reste du code
```

**Après :**
```javascript
const userId = req.user.idUser;  // ✅ Cohérent avec toutes les autres routes
```

## Vérification

### Recherche de `canceled_at`
```bash
# Résultat : Aucune occurrence trouvée ✅
grep -r "canceled_at" server/subscription/subscription.js
```

### Routes `/cancel-subscription`
```bash
# Résultat : Une seule route (ligne ~594) ✅
grep -r "router.post(\"/cancel-subscription\"" server/subscription/subscription.js
```

## Structure Finale Correcte

### Colonne BDD Utilisée
```sql
cancel_at_period_end BOOLEAN DEFAULT false  -- ✅ Correct
```

### Route d'Annulation
```javascript
router.post("/cancel-subscription", authenticateToken, async (req, res) => {
    // ...
    
    // Stripe : Annuler à la fin de période
    await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
    });
    
    // BDD : Marquer pour annulation
    await supabaseServerAdmin()
        .from("website_subscriptions")
        .update({
            cancel_at_period_end: true,  // ✅ Correct
            updated_at: new Date().toISOString()
        });
});
```

### Webhook Stripe
```javascript
async function handleSubscriptionDeleted(subscription) {
    await supabaseServerAdmin()
        .from("website_subscriptions")
        .update({
            status: 'canceled',  // ✅ Pas de canceled_at
            updated_at: new Date().toISOString()
        });
}
```

## Tests à Effectuer

1. ✅ Redémarrer le serveur Node.js
2. ✅ Tester l'annulation d'un abonnement
3. ✅ Vérifier que l'erreur PGRST204 a disparu
4. ✅ Vérifier que le bandeau jaune s'affiche
5. ✅ Vérifier que la date de fin est correcte

## Migration BDD Requise

Si ce n'est pas déjà fait, exécuter :
```sql
-- Fichier : add_cancel_at_period_end.sql
ALTER TABLE website_subscriptions 
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;
```

L'erreur devrait maintenant être complètement résolue ! 🎉