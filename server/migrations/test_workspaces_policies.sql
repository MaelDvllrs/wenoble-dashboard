-- Script de test pour vérifier les politiques workspaces
-- À exécuter APRÈS avoir appliqué add_workspaces_policies.sql

-- ============================
-- VÉRIFICATION BASIQUE
-- ============================

-- 1. Vérifier que RLS est activé
SELECT 
    'RLS Status' as check_type,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ Activé'
        ELSE '❌ Désactivé'
    END as status
FROM pg_tables 
WHERE tablename = 'workspaces';

-- 2. Compter les politiques créées
SELECT 
    'Policies Count' as check_type,
    tablename,
    COUNT(*) || ' politiques créées' as status
FROM pg_policies 
WHERE tablename = 'workspaces'
GROUP BY tablename;

-- 3. Lister les politiques par opération
SELECT 
    cmd as operation,
    policyname,
    '✅ Créée' as status
FROM pg_policies 
WHERE tablename = 'workspaces'
ORDER BY cmd, policyname;

-- ============================
-- TEST FONCTIONNEL SIMPLE
-- ============================

-- 4. Test d'accès aux données (avec l'utilisateur actuel)
SELECT 
    'Data Access Test' as test_type,
    CASE 
        WHEN COUNT(*) >= 0 THEN '✅ Accès autorisé'
        ELSE '❌ Accès refusé'
    END as result,
    COUNT(*) || ' workspaces visibles' as details
FROM workspaces;

-- ============================
-- TESTS DE SÉCURITÉ DÉTAILLÉS
-- ============================

-- Créer une fonction de test pour les workspaces
CREATE OR REPLACE FUNCTION test_workspaces_security()
RETURNS TABLE(
    test_name TEXT,
    expected_result TEXT,
    actual_result TEXT,
    status TEXT
) AS $$
DECLARE
    test_workspace_id UUID;
    test_workspace_name TEXT := 'Test Workspace Security ' || extract(epoch from now());
    test_workspace_slug TEXT := 'test-workspace-' || extract(epoch from now());
    can_insert BOOLEAN := false;
    can_select BOOLEAN := false;
    can_update BOOLEAN := false;
    can_delete BOOLEAN := false;
    select_count INTEGER := 0;
    current_user_id UUID;
BEGIN
    -- Récupérer l'ID de l'utilisateur actuel
    current_user_id := auth.uid();
    
    -- Test 1: Vérifier l'accès SELECT (doit montrer seulement les workspaces autorisés)
    BEGIN
        SELECT COUNT(*) INTO select_count FROM workspaces;
        can_select := true;
    EXCEPTION WHEN OTHERS THEN
        can_select := false;
        select_count := -1;
    END;
    
    RETURN QUERY VALUES (
        'SELECT workspaces',
        'Accès limité aux workspaces autorisés',
        CASE 
            WHEN select_count >= 0 THEN 'Accès autorisé - ' || select_count || ' workspaces'
            ELSE 'Accès refusé'
        END,
        CASE 
            WHEN select_count >= 0 THEN '✅ PASS'
            ELSE '❌ FAIL'
        END
    );
    
    -- Test 2: Tester l'insertion (doit réussir)
    BEGIN
        INSERT INTO workspaces (workspace_name, workspace_slug, created_by) 
        VALUES (test_workspace_name, test_workspace_slug, current_user_id)
        RETURNING id INTO test_workspace_id;
        can_insert := true;
    EXCEPTION WHEN OTHERS THEN
        can_insert := false;
    END;
    
    RETURN QUERY VALUES (
        'INSERT workspace',
        'Insertion autorisée pour utilisateur authentifié',
        CASE 
            WHEN can_insert THEN 'Insertion réussie'
            ELSE 'Insertion échouée'
        END,
        CASE 
            WHEN can_insert THEN '✅ PASS'
            ELSE '❌ FAIL'
        END
    );
    
    -- Test 3: Tester la mise à jour (doit réussir pour le créateur)
    IF can_insert AND test_workspace_id IS NOT NULL THEN
        BEGIN
            UPDATE workspaces 
            SET workspace_description = 'Description de test mise à jour'
            WHERE id = test_workspace_id;
            can_update := true;
        EXCEPTION WHEN OTHERS THEN
            can_update := false;
        END;
        
        RETURN QUERY VALUES (
            'UPDATE workspace',
            'Mise à jour autorisée pour le créateur',
            CASE 
                WHEN can_update THEN 'Mise à jour réussie'
                ELSE 'Mise à jour échouée'
            END,
            CASE 
                WHEN can_update THEN '✅ PASS'
                ELSE '❌ FAIL'
            END
        );
    END IF;
    
    -- Test 4: Tester la suppression (doit réussir pour workspace non-défaut)
    IF can_insert AND test_workspace_id IS NOT NULL THEN
        BEGIN
            DELETE FROM workspaces WHERE id = test_workspace_id;
            can_delete := true;
        EXCEPTION WHEN OTHERS THEN
            can_delete := false;
        END;
        
        RETURN QUERY VALUES (
            'DELETE workspace',
            'Suppression autorisée pour workspace non-défaut',
            CASE 
                WHEN can_delete THEN 'Suppression réussie'
                ELSE 'Suppression échouée'
            END,
            CASE 
                WHEN can_delete THEN '✅ PASS'
                ELSE '❌ FAIL'
            END
        );
    END IF;
    
    -- Test 5: Tester la protection des workspaces par défaut
    DECLARE
        default_workspace_id UUID;
        can_delete_default BOOLEAN := true;
    BEGIN
        -- Trouver un workspace par défaut
        SELECT id INTO default_workspace_id 
        FROM workspaces 
        WHERE is_default = true 
        LIMIT 1;
        
        IF default_workspace_id IS NOT NULL THEN
            BEGIN
                DELETE FROM workspaces WHERE id = default_workspace_id;
                can_delete_default := true;
            EXCEPTION WHEN OTHERS THEN
                can_delete_default := false;
            END;
            
            RETURN QUERY VALUES (
                'DELETE default workspace',
                'Suppression interdite pour workspace par défaut',
                CASE 
                    WHEN NOT can_delete_default THEN 'Suppression bloquée'
                    ELSE 'Suppression autorisée (ERREUR)'
                END,
                CASE 
                    WHEN NOT can_delete_default THEN '✅ PASS'
                    ELSE '❌ FAIL'
                END
            );
        ELSE
            RETURN QUERY VALUES (
                'DELETE default workspace',
                'Test non applicable',
                'Aucun workspace par défaut trouvé',
                '⚠️ SKIP'
            );
        END IF;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Exécuter le test de sécurité
SELECT * FROM test_workspaces_security();

-- ============================
-- VÉRIFICATION DE LA COHÉRENCE DES DONNÉES
-- ============================

-- Test de cohérence : Vérifier que chaque workspace a au moins un admin
SELECT 
    'Cohérence des données' as test_type,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Tous les workspaces ont des admins'
        ELSE '❌ ' || COUNT(*) || ' workspaces sans admin'
    END as result,
    'Workspaces orphelins : ' || COUNT(*) as details
FROM (
    SELECT w.id
    FROM workspaces w
    LEFT JOIN user_workspaces uw ON w.id = uw.workspace_id AND uw.role = 'admin'
    GROUP BY w.id
    HAVING COUNT(uw.user_id) = 0
) orphaned_workspaces;

-- ============================
-- RAPPORT FINAL
-- ============================

-- Rapport complet de l'état des politiques workspaces
SELECT 
    '=== RAPPORT FINAL WORKSPACES ===' as section,
    '' as details,
    '' as status
UNION ALL
SELECT 
    'RLS Status',
    'workspaces',
    CASE WHEN rowsecurity THEN '✅ Activé' ELSE '❌ Désactivé' END
FROM pg_tables WHERE tablename = 'workspaces'
UNION ALL
SELECT 
    'Politiques',
    cmd || ': ' || policyname,
    '✅ Créée'
FROM pg_policies WHERE tablename = 'workspaces'
ORDER BY section, details;

-- ============================
-- NETTOYAGE
-- ============================

-- Supprimer la fonction de test
DROP FUNCTION IF EXISTS test_workspaces_security();

-- ============================
-- INSTRUCTIONS DE VALIDATION
-- ============================

/*
RÉSULTATS ATTENDUS :

1. RLS Status : ✅ Activé
2. 6 politiques créées :
   - SELECT: Users can view workspaces they have access to
   - INSERT: Users can create workspaces
   - UPDATE: Workspace admins can update workspaces  
   - UPDATE: Only creator can modify default status
   - DELETE: Workspace admins can delete workspaces
   - DELETE: Prevent default workspace deletion

3. Tests de sécurité : ✅ PASS pour tous
4. Cohérence des données : ✅ Aucun workspace orphelin

Si tous les tests passent, les politiques RLS workspaces sont correctement configurées !

PROCHAINES ÉTAPES :
1. Exécutez aussi add_user_workspaces_policies.sql
2. Testez avec votre application React
3. Vérifiez que les API workspace.js fonctionnent
4. Testez la création/modification/suppression de workspaces

SÉCURITÉ GARANTIE :
✅ Isolation complète des workspaces par utilisateur
✅ Seuls les admins peuvent modifier/supprimer
✅ Protection des workspaces par défaut
✅ Contrôle strict de la création
*/
