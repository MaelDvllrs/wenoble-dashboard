-- Script pour créer les politiques RLS manquantes sur la table user_workspaces
-- À copier-coller directement dans Supabase SQL Editor

-- ============================
-- ACTIVATION RLS SUR USER_WORKSPACES
-- ============================

-- S'assurer que RLS est activé sur la table user_workspaces
ALTER TABLE user_workspaces ENABLE ROW LEVEL SECURITY;

-- ============================
-- SUPPRESSION DES ANCIENNES POLITIQUES
-- ============================

DROP POLICY IF EXISTS "Users can view their workspace memberships" ON user_workspaces;
DROP POLICY IF EXISTS "Workspace admins can add users" ON user_workspaces;
DROP POLICY IF EXISTS "Workspace admins can update user roles" ON user_workspaces;
DROP POLICY IF EXISTS "Workspace admins can remove users" ON user_workspaces;
DROP POLICY IF EXISTS "Prevent creator role modification" ON user_workspaces;
DROP POLICY IF EXISTS "Prevent creator removal" ON user_workspaces;

-- ============================
-- NOUVELLES POLITIQUES SANS RÉCURSION
-- ============================

-- 1. POLITIQUE SELECT - Voir ses propres relations OU celles des workspaces qu'on a créés
CREATE POLICY "view_user_workspaces" ON user_workspaces
FOR SELECT USING (
    user_id = auth.uid()
    OR workspace_id IN (
        SELECT w.id FROM workspaces w 
        WHERE w.created_by = auth.uid()
    )
);

-- 2. POLITIQUE INSERT - Seuls les créateurs peuvent ajouter des utilisateurs
CREATE POLICY "add_users_to_workspace" ON user_workspaces
FOR INSERT WITH CHECK (
    workspace_id IN (
        SELECT w.id FROM workspaces w 
        WHERE w.created_by = auth.uid()
    )
);

-- 3. POLITIQUE UPDATE - Seuls les créateurs peuvent modifier les rôles
CREATE POLICY "update_user_roles" ON user_workspaces
FOR UPDATE USING (
    workspace_id IN (
        SELECT w.id FROM workspaces w 
        WHERE w.created_by = auth.uid()
    )
);

-- 4. POLITIQUE UPDATE WITH CHECK - Validation pour les modifications
CREATE POLICY "update_user_roles_check" ON user_workspaces
FOR UPDATE WITH CHECK (
    workspace_id IN (
        SELECT w.id FROM workspaces w 
        WHERE w.created_by = auth.uid()
    )
);

-- 5. POLITIQUE DELETE - Les utilisateurs peuvent se retirer OU les créateurs peuvent retirer
CREATE POLICY "remove_users_from_workspace" ON user_workspaces
FOR DELETE USING (
    user_id = auth.uid()
    OR workspace_id IN (
        SELECT w.id FROM workspaces w 
        WHERE w.created_by = auth.uid()
    )
);

-- 6. POLITIQUE PROTECTION - Empêcher la suppression du créateur
CREATE POLICY "protect_workspace_creator" ON user_workspaces
FOR DELETE USING (
    NOT (
        user_id IN (
            SELECT created_by FROM workspaces WHERE id = workspace_id
        )
        AND user_id != auth.uid()
    )
);

-- ============================
-- VÉRIFICATION DES POLITIQUES CRÉÉES
-- ============================

-- Vérifier que RLS est activé
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS activé'
        ELSE '❌ RLS désactivé'
    END as status
FROM pg_tables 
WHERE tablename = 'user_workspaces';

-- Lister toutes les politiques créées sur user_workspaces
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd as operation,
    CASE 
        WHEN qual IS NOT NULL THEN '✅ USING clause'
        ELSE '⚠️ Pas de USING'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN '✅ WITH CHECK clause'
        ELSE '⚠️ Pas de WITH CHECK'
    END as with_check_clause
FROM pg_policies 
WHERE tablename = 'user_workspaces'
ORDER BY cmd, policyname;

-- ============================
-- COMMENTAIRES SUR LES POLITIQUES
-- ============================

COMMENT ON POLICY "Users can view their workspace memberships" ON user_workspaces IS 
'Les utilisateurs peuvent voir leurs propres relations workspace ET celles des workspaces qu ils administrent';

COMMENT ON POLICY "Workspace admins can add users" ON user_workspaces IS 
'Seuls les administrateurs d un workspace peuvent ajouter des utilisateurs';

COMMENT ON POLICY "Workspace admins can update user roles" ON user_workspaces IS 
'Seuls les administrateurs peuvent modifier les rôles des membres d un workspace';

COMMENT ON POLICY "Workspace admins can remove users" ON user_workspaces IS 
'Les administrateurs peuvent retirer des utilisateurs OU les utilisateurs peuvent se retirer eux-mêmes';

COMMENT ON POLICY "Prevent creator role modification" ON user_workspaces IS 
'Empêche la modification du rôle du créateur d un workspace - il doit rester admin';

COMMENT ON POLICY "Prevent creator removal" ON user_workspaces IS 
'Empêche la suppression du créateur d un workspace sauf s il se retire lui-même';

-- ============================
-- TEST RAPIDE DES POLITIQUES
-- ============================

-- Test basique pour vérifier que les politiques fonctionnent
-- (Ces requêtes doivent être exécutées avec un utilisateur authentifié)

/*
-- Test 1: Vérifier que l'utilisateur voit ses relations
SELECT 'Test SELECT' as test, COUNT(*) as mes_workspaces 
FROM user_workspaces 
WHERE user_id = auth.uid();

-- Test 2: Essayer d'insérer une relation (doit échouer si pas admin)
-- INSERT INTO user_workspaces (user_id, workspace_id, role) 
-- VALUES (auth.uid(), 'some-workspace-id', 'member');

-- Test 3: Essayer de modifier un rôle (doit échouer si pas admin)
-- UPDATE user_workspaces 
-- SET role = 'admin' 
-- WHERE user_id = auth.uid();
*/

-- ============================
-- INSTRUCTIONS FINALES
-- ============================

/*
APRÈS AVOIR EXÉCUTÉ CE SCRIPT :

1. Vérifiez que toutes les politiques sont créées :
   - 6 politiques au total sur user_workspaces
   - RLS activé

2. Testez avec votre application :
   - Les utilisateurs ne doivent voir que leurs workspaces
   - Seuls les admins peuvent ajouter/modifier/retirer des membres
   - Le créateur ne peut pas perdre ses droits

3. Si des erreurs surviennent :
   - Vérifiez que la table workspaces existe
   - Vérifiez que les colonnes user_id, workspace_id, role existent
   - Vérifiez que auth.uid() fonctionne dans votre contexte
*/
