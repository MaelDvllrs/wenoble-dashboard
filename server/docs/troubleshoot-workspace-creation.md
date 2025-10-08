# Guide de résolution : Les workspaces ne se créent pas

## Étapes de diagnostic

### 1. Exécuter le script de diagnostic
Dans Supabase Dashboard → SQL Editor, exécutez :
```sql
-- Copier le contenu de debug_workspace_creation.sql
```

### 2. Vérifier les résultats
- ✅ La fonction `handle_new_user` existe ?
- ✅ Le trigger `on_auth_user_confirmed` existe ?
- ✅ Les tables `workspaces` et `user_workspaces` existent ?

### 3. Appliquer la correction
Exécutez la fonction mise à jour dans Supabase :
```sql
-- Copier le contenu COMPLET de create_user_profile_trigger_with_pending.sql
```

### 4. Tester manuellement
#### Option A : Via l'API
```bash
# Créer un workspace pour un utilisateur existant
curl -X POST -H "Content-Type: application/json" \
  -d '{"user_email":"test@example.com"}' \
  http://localhost:3002/admin/create-workspace-for-user

# Voir les workspaces d'un utilisateur
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3002/user/workspaces
```

#### Option B : Via SQL direct
```sql
-- Tester la création manuelle pour un utilisateur existant
DO $$
DECLARE
    test_user_id UUID;
    test_username TEXT;
    new_workspace_id UUID;
BEGIN
    -- Remplacez par un email d'utilisateur réel
    SELECT id, username INTO test_user_id, test_username 
    FROM public.users 
    WHERE email = 'votre-email@example.com';
    
    IF test_user_id IS NOT NULL THEN
        -- Créer le workspace
        INSERT INTO public.workspaces (
            workspace_name, 
            workspace_slug, 
            workspace_description, 
            created_by, 
            is_default
        ) VALUES (
            test_username || ' - Test Workspace',
            test_username || '-test-workspace',
            'Workspace de test créé manuellement',
            test_user_id,
            true
        ) RETURNING id INTO new_workspace_id;
        
        -- Ajouter l'utilisateur comme admin
        INSERT INTO public.user_workspaces (user_id, workspace_id, role)
        VALUES (test_user_id, new_workspace_id, 'admin');
        
        RAISE NOTICE 'Workspace créé avec ID: %', new_workspace_id;
    ELSE
        RAISE NOTICE 'Utilisateur non trouvé';
    END IF;
END $$;
```

### 5. Tester avec un nouvel utilisateur
1. S'inscrire avec un nouvel email
2. Confirmer l'email via le lien reçu
3. Vérifier dans Supabase Dashboard :
   ```sql
   -- Voir le nouvel utilisateur et son workspace
   SELECT 
     u.email,
     u.username,
     w.workspace_name,
     w.is_default,
     uw.role
   FROM public.users u
   LEFT JOIN public.workspaces w ON w.created_by = u.id AND w.is_default = true
   LEFT JOIN public.user_workspaces uw ON uw.workspace_id = w.id AND uw.user_id = u.id
   WHERE u.email = 'votre-nouvel-email@test.com';
   ```

## Erreurs communes et solutions

### Erreur : Fonction create_default_workspace_for_user n'existe pas
**Solution :** Utilisez la version intégrée dans le trigger (déjà corrigée)

### Erreur : Table workspaces ou user_workspaces n'existe pas
**Solution :** Créez les tables :
```sql
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_name TEXT NOT NULL,
  workspace_slug TEXT UNIQUE NOT NULL,
  workspace_description TEXT,
  created_by UUID REFERENCES public.users(id),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Erreur : Permissions insuffisantes
**Solution :** Ajoutez les permissions :
```sql
GRANT ALL ON public.workspaces TO anon, authenticated;
GRANT ALL ON public.user_workspaces TO anon, authenticated;
```

### Le workspace ne se crée toujours pas
**Solution :** Vérifiez les logs PostgreSQL dans Supabase Dashboard → Logs

## Validation finale
```sql
-- Cette requête devrait montrer que chaque utilisateur a un workspace par défaut
SELECT 
  COUNT(*) as total_users,
  COUNT(w.id) as users_with_default_workspace,
  COUNT(*) - COUNT(w.id) as users_missing_workspace
FROM public.users u
LEFT JOIN public.workspaces w ON w.created_by = u.id AND w.is_default = true;
```

Si `users_missing_workspace` > 0, utilisez l'endpoint de création manuelle ou le script SQL de test.