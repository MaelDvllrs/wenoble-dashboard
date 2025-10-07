# Guide: Correction de la création automatique de workspaces

## Problème identifié
La fonction de création automatique de workspaces ne se déclenche pas lors de la confirmation d'email car elle était sur un trigger séparé.

## Solution appliquée
Modification de la fonction existante `handle_new_user()` pour inclure la création du workspace.

## Étapes d'application

### 1. Mise à jour de la fonction
Dans votre Dashboard Supabase → SQL Editor, exécutez le contenu de :
```
server/migrations/create_user_profile_trigger_with_pending.sql
```

### 2. Créer les workspaces manqués
Pour les utilisateurs existants qui n'ont pas de workspace :
```sql
SELECT create_missing_default_workspaces();
```

### 3. Vérification
```sql
-- Voir les utilisateurs et leurs workspaces
SELECT 
  u.email,
  u.username,
  w.workspace_name,
  w.is_default
FROM public.users u
LEFT JOIN public.workspaces w ON w.created_by = u.id AND w.is_default = true
ORDER BY u.created_at DESC;
```

### 4. Test avec un nouvel utilisateur
1. S'inscrire avec un nouvel email
2. Confirmer l'email
3. Vérifier que l'utilisateur a son workspace par défaut

## Endpoints de vérification

```bash
# Voir les workspaces d'un utilisateur connecté
curl -H "Authorization: Bearer TOKEN" http://localhost:3002/user/workspaces

# Créer manuellement les workspaces manqués (admin)
curl -X POST http://localhost:3002/admin/create-missing-workspaces
```

## Résultat attendu
- ✅ Nouveaux utilisateurs : Profil + Workspace créés automatiquement après confirmation email
- ✅ Utilisateurs existants : Workspaces créés avec la fonction de rattrapage
- ✅ Pas de conflits entre triggers
- ✅ Gestion d'erreur robuste (profil créé même si workspace échoue)

## Débogage
Si les workspaces ne se créent toujours pas :

1. Vérifier que la fonction `create_default_workspace_for_user` existe :
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'create_default_workspace_for_user';
```

2. Vérifier les logs PostgreSQL pour les messages d'erreur

3. Tester manuellement :
```sql
SELECT create_default_workspace_for_user(
  (SELECT id FROM public.users WHERE email = 'test@example.com'),
  'testuser'
);
```