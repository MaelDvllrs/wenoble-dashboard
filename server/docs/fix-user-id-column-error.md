# Résoudre l'erreur PGRST204 - Colonne 'user_id' manquante

## Problème
```
Erreur lors de la vérification de l'abonnement: {
  code: 'PGRST204',
  details: null,
  hint: null,
  message: "Could not find the 'user_id' column of 'website_subscriptions' in the schema cache"
}
```

## Solution

### 1. Exécuter la Migration
Connectez-vous à votre base de données Supabase et exécutez l'une des migrations suivantes :

**Option A - Migration complète Stripe (recommandée) :**
```sql
-- Exécuter le fichier setup_stripe_integration.sql
```

**Option B - Migration spécifique :**
```sql
-- Exécuter le fichier add_user_id_to_website_subscriptions.sql
```

### 2. Vérification
Après l'exécution, vérifiez que la colonne existe :

```sql
-- Vérifier la structure de la table
\d website_subscriptions;

-- Ou avec une requête SQL
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'website_subscriptions' 
AND column_name = 'user_id';
```

### 3. Test de Fonctionnement
Après l'exécution de la migration, testez l'endpoint qui causait l'erreur :

```javascript
// L'endpoint /verify-subscription devrait maintenant fonctionner
const response = await fetch('/api/verify-subscription', {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer YOUR_TOKEN',
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        sessionId: 'cs_test_xxxxx',
        websiteId: 'website-id'
    })
});
```

## Migration SQL Manuelle (si nécessaire)

Si vous préférez exécuter manuellement :

```sql
-- Ajouter la colonne user_id
ALTER TABLE website_subscriptions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Ajouter les indices pour les performances
CREATE INDEX IF NOT EXISTS idx_website_subscriptions_user_id 
ON website_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_website_subscriptions_user_website 
ON website_subscriptions(user_id, website_id);

-- Optionnel : Remplir les données existantes
-- UPDATE website_subscriptions 
-- SET user_id = (
--     SELECT uw.user_id 
--     FROM user_workspaces uw 
--     WHERE uw.website_id = website_subscriptions.website_id 
--     LIMIT 1
-- )
-- WHERE user_id IS NULL;
```

## Notes Importantes

1. **Sauvegarde** : Faites une sauvegarde avant d'exécuter les migrations
2. **RLS** : La colonne `user_id` est nécessaire pour les politiques de sécurité au niveau des lignes
3. **Relations** : Cette colonne assure la liaison entre les utilisateurs et leurs abonnements
4. **Performance** : Les indices créés améliorent les performances des requêtes fréquentes