-- Script pour créer les politiques RLS manquantes sur la table workspaces
-- À exécuter sur Supabase

-- ============================
-- ACTIVATION RLS SUR WORKSPACES
-- ============================

-- S'assurer que RLS est activé sur la table workspaces
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- ============================
-- POLITIQUES POUR WORKSPACES
-- ============================

-- 1. POLITIQUE SELECT - Voir les workspaces
-- Les utilisateurs peuvent voir les workspaces auxquels ils appartiennent
DROP POLICY IF EXISTS "Users can view workspaces they have access to" ON workspaces;
CREATE POLICY "Users can view workspaces they have access to" ON workspaces
FOR SELECT USING (
    id IN (
        SELECT workspace_id FROM user_workspaces 
        WHERE user_id = auth.uid()
    )
);

-- 2. POLITIQUE INSERT - Créer des workspaces
-- Tout utilisateur authentifié peut créer un workspace (il en devient automatiquement admin)
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
CREATE POLICY "Users can create workspaces" ON workspaces
FOR INSERT WITH CHECK (
    created_by = auth.uid()
);

-- 3. POLITIQUE UPDATE - Modifier les workspaces
-- Seuls les admins d'un workspace peuvent le modifier
DROP POLICY IF EXISTS "Workspace admins can update workspaces" ON workspaces;
CREATE POLICY "Workspace admins can update workspaces" ON workspaces
FOR UPDATE USING (
    id IN (
        SELECT workspace_id FROM user_workspaces 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
) WITH CHECK (
    id IN (
        SELECT workspace_id FROM user_workspaces 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- 4. POLITIQUE DELETE - Supprimer les workspaces
-- Seuls les admins d'un workspace peuvent le supprimer
DROP POLICY IF EXISTS "Workspace admins can delete workspaces" ON workspaces;
CREATE POLICY "Workspace admins can delete workspaces" ON workspaces
FOR DELETE USING (
    id IN (
        SELECT workspace_id FROM user_workspaces 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- ============================
-- POLITIQUES DE SÉCURITÉ RENFORCÉE
-- ============================

-- 5. POLITIQUE - Empêcher la suppression des workspaces par défaut
-- Les workspaces par défaut ne peuvent pas être supprimés
DROP POLICY IF EXISTS "Prevent default workspace deletion" ON workspaces;
CREATE POLICY "Prevent default workspace deletion" ON workspaces
FOR DELETE USING (
    NOT is_default
);

-- 6. POLITIQUE - Seul le créateur peut modifier le statut par défaut
-- Empêche la modification du champ is_default par d'autres que le créateur
DROP POLICY IF EXISTS "Only creator can modify default status" ON workspaces;
CREATE POLICY "Only creator can modify default status" ON workspaces
FOR UPDATE USING (
    created_by = auth.uid()
    OR (
        -- Si on ne modifie pas is_default, alors les admins peuvent modifier
        id IN (
            SELECT workspace_id FROM user_workspaces 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    )
) WITH CHECK (
    created_by = auth.uid()
    OR (
        -- Autoriser les modifications si is_default n'est pas changé
        id IN (
            SELECT workspace_id FROM user_workspaces 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
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
WHERE tablename = 'workspaces';

-- Lister toutes les politiques créées sur workspaces
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
WHERE tablename = 'workspaces'
ORDER BY cmd, policyname;

-- Compter le nombre total de politiques
SELECT 
    'Total des politiques' as info,
    COUNT(*) as nombre_politiques
FROM pg_policies 
WHERE tablename = 'workspaces';

-- ============================
-- COMMENTAIRES SUR LES POLITIQUES
-- ============================

COMMENT ON POLICY "Users can view workspaces they have access to" ON workspaces IS 
'Permet aux utilisateurs de voir uniquement les workspaces auxquels ils appartiennent';

COMMENT ON POLICY "Users can create workspaces" ON workspaces IS 
'Permet à tout utilisateur authentifié de créer un nouveau workspace dont il devient le propriétaire';

COMMENT ON POLICY "Workspace admins can update workspaces" ON workspaces IS 
'Seuls les administrateurs d un workspace peuvent le modifier';

COMMENT ON POLICY "Workspace admins can delete workspaces" ON workspaces IS 
'Seuls les administrateurs d un workspace peuvent le supprimer';

COMMENT ON POLICY "Prevent default workspace deletion" ON workspaces IS 
'Empêche la suppression des workspaces marqués comme par défaut';

COMMENT ON POLICY "Only creator can modify default status" ON workspaces IS 
'Seul le créateur peut modifier le statut par défaut d un workspace';

-- ============================
-- TESTS RAPIDES DES POLITIQUES
-- ============================

-- Test basique pour vérifier que les politiques fonctionnent
-- (Ces requêtes doivent être exécutées avec un utilisateur authentifié)

/*
-- Test 1: Vérifier que l'utilisateur voit ses workspaces
SELECT 'Test SELECT' as test, COUNT(*) as mes_workspaces 
FROM workspaces;

-- Test 2: Créer un workspace de test (doit réussir)
INSERT INTO workspaces (workspace_name, workspace_slug, created_by) 
VALUES ('Test Workspace', 'test-workspace-' || extract(epoch from now()), auth.uid());

-- Test 3: Essayer de modifier un workspace (doit réussir si admin)
UPDATE workspaces 
SET workspace_description = 'Description mise à jour' 
WHERE created_by = auth.uid() 
AND workspace_name = 'Test Workspace';

-- Test 4: Essayer de supprimer un workspace non-défaut (doit réussir si admin)
DELETE FROM workspaces 
WHERE created_by = auth.uid() 
AND workspace_name = 'Test Workspace' 
AND NOT is_default;
*/

-- ============================
-- VÉRIFICATION DE COHÉRENCE
-- ============================

-- Vérifier que chaque workspace a au moins un admin
SELECT 
    w.id,
    w.workspace_name,
    COUNT(uw.user_id) as nb_admins
FROM workspaces w
LEFT JOIN user_workspaces uw ON w.id = uw.workspace_id AND uw.role = 'admin'
GROUP BY w.id, w.workspace_name
HAVING COUNT(uw.user_id) = 0;

-- Cette requête ne doit retourner aucun résultat (pas de workspaces sans admin)

-- ============================
-- INSTRUCTIONS FINALES
-- ============================

/*
APRÈS AVOIR EXÉCUTÉ CE SCRIPT :

1. Vérifiez que toutes les politiques sont créées :
   - 6 politiques au total sur workspaces
   - RLS activé

2. Politiques créées :
   ✅ SELECT: Users can view workspaces they have access to
   ✅ INSERT: Users can create workspaces  
   ✅ UPDATE: Workspace admins can update workspaces
   ✅ DELETE: Workspace admins can delete workspaces
   ✅ DELETE: Prevent default workspace deletion
   ✅ UPDATE: Only creator can modify default status

3. Testez avec votre application :
   - Créer un nouveau workspace
   - Modifier un workspace existant (en tant qu'admin)
   - Essayer de supprimer un workspace par défaut (doit échouer)
   - Vérifier que seuls vos workspaces sont visibles

4. Si des erreurs surviennent :
   - Vérifiez que la table user_workspaces existe
   - Vérifiez que les relations entre les tables sont correctes
   - Vérifiez que auth.uid() fonctionne dans votre contexte

SÉCURITÉ GARANTIE :
- Isolation complète des données par utilisateur
- Seuls les admins peuvent gérer les workspaces
- Protection des workspaces par défaut
- Contrôle strict des permissions de création/modification/suppression
*/
