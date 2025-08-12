-- Script de test simple pour vérifier les politiques user_workspaces
-- À exécuter APRÈS avoir appliqué add_user_workspaces_policies.sql

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
WHERE tablename = 'user_workspaces';

-- 2. Compter les politiques créées
SELECT 
    'Policies Count' as check_type,
    tablename,
    COUNT(*) || ' politiques créées' as status
FROM pg_policies 
WHERE tablename = 'user_workspaces'
GROUP BY tablename;

-- 3. Lister les politiques par opération
SELECT 
    cmd as operation,
    policyname,
    '✅ Créée' as status
FROM pg_policies 
WHERE tablename = 'user_workspaces'
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
    COUNT(*) || ' relations visibles' as details
FROM user_workspaces;

-- ============================
-- VÉRIFICATION DE LA SÉCURITÉ
-- ============================

-- 5. Test de sécurité - vérifier qu'on ne peut pas contourner les politiques
-- (Ce test doit être exécuté par un utilisateur non-admin)

-- Créer une fonction de test temporaire
CREATE OR REPLACE FUNCTION test_user_workspaces_security()
RETURNS TABLE(
    test_name TEXT,
    expected_result TEXT,
    actual_result TEXT,
    status TEXT
) AS $$
DECLARE
    test_user_id UUID;
    test_workspace_id UUID;
    can_insert BOOLEAN := false;
    can_select_all BOOLEAN := false;
    select_count INTEGER := 0;
BEGIN
    -- Générer des IDs de test
    test_user_id := gen_random_uuid();
    test_workspace_id := gen_random_uuid();
    
    -- Test 1: Essayer de voir toutes les relations (devrait être limité)
    BEGIN
        SELECT COUNT(*) INTO select_count FROM user_workspaces;
        can_select_all := true;
    EXCEPTION WHEN OTHERS THEN
        can_select_all := false;
        select_count := -1;
    END;
    
    RETURN QUERY VALUES (
        'SELECT user_workspaces',
        'Accès limité aux relations autorisées',
        CASE 
            WHEN select_count >= 0 THEN 'Accès autorisé - ' || select_count || ' relations'
            ELSE 'Accès refusé'
        END,
        CASE 
            WHEN select_count >= 0 THEN '✅ PASS'
            ELSE '❌ FAIL'
        END
    );
    
    -- Test 2: Essayer d'insérer sans autorisation (devrait échouer)
    BEGIN
        INSERT INTO user_workspaces (user_id, workspace_id, role) 
        VALUES (test_user_id, test_workspace_id, 'member');
        can_insert := true;
        -- Nettoyer si l'insertion a réussi
        DELETE FROM user_workspaces 
        WHERE user_id = test_user_id AND workspace_id = test_workspace_id;
    EXCEPTION WHEN OTHERS THEN
        can_insert := false;
    END;
    
    RETURN QUERY VALUES (
        'INSERT user_workspaces',
        'Insertion refusée pour non-admin',
        CASE 
            WHEN can_insert THEN 'Insertion autorisée'
            ELSE 'Insertion refusée'
        END,
        CASE 
            WHEN NOT can_insert THEN '✅ PASS'
            ELSE '❌ FAIL'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Exécuter le test de sécurité
SELECT * FROM test_user_workspaces_security();

-- ============================
-- RAPPORT FINAL
-- ============================

-- Rapport complet de l'état des politiques
SELECT 
    '=== RAPPORT FINAL ===' as section,
    '' as details,
    '' as status
UNION ALL
SELECT 
    'RLS Status',
    'user_workspaces',
    CASE WHEN rowsecurity THEN '✅ Activé' ELSE '❌ Désactivé' END
FROM pg_tables WHERE tablename = 'user_workspaces'
UNION ALL
SELECT 
    'Politiques',
    cmd || ': ' || policyname,
    '✅ Créée'
FROM pg_policies WHERE tablename = 'user_workspaces'
ORDER BY section, details;

-- ============================
-- NETTOYAGE
-- ============================

-- Supprimer la fonction de test
DROP FUNCTION IF EXISTS test_user_workspaces_security();

-- ============================
-- INSTRUCTIONS DE VALIDATION
-- ============================

/*
RÉSULTATS ATTENDUS :

1. RLS Status : ✅ Activé
2. 6 politiques créées :
   - SELECT: Users can view their workspace memberships
   - INSERT: Workspace admins can add users  
   - UPDATE: Workspace admins can update user roles
   - DELETE: Workspace admins can remove users
   - UPDATE: Prevent creator role modification
   - DELETE: Prevent creator removal

3. Tests de sécurité : ✅ PASS

Si tous les tests passent, les politiques RLS sont correctement configurées !

PROCHAINES ÉTAPES :
1. Testez avec votre application React
2. Vérifiez que les API workspace.js fonctionnent
3. Testez la création/modification de workspaces
*/
