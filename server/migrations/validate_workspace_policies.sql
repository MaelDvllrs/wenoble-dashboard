-- Script de vérification des politiques RLS pour les workspaces
-- À exécuter après avoir créé les politiques pour valider leur fonctionnement

-- ============================
-- VÉRIFICATIONS DE BASE
-- ============================

-- 1. Vérifier que RLS est activé sur les tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS activé'
        ELSE '❌ RLS désactivé'
    END as status
FROM pg_tables 
WHERE tablename IN ('workspaces', 'user_workspaces')
ORDER BY tablename;

-- 2. Lister toutes les politiques existantes
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
WHERE tablename IN ('workspaces', 'user_workspaces')
ORDER BY tablename, cmd, policyname;

-- ============================
-- VÉRIFICATIONS FONCTIONNELLES
-- ============================

-- 3. Vérifier la structure des tables et les contraintes
\d workspaces
\d user_workspaces

-- 4. Compter les données existantes
SELECT 
    'workspaces' as table_name,
    COUNT(*) as total_records
FROM workspaces
UNION ALL
SELECT 
    'user_workspaces' as table_name,
    COUNT(*) as total_records
FROM user_workspaces;

-- ============================
-- TESTS DE SÉCURITÉ SIMULÉS
-- ============================

-- Ces tests utilisent des fonctions pour simuler différents contextes utilisateur

-- Test 1: Fonction pour simuler l'accès d'un utilisateur spécifique
CREATE OR REPLACE FUNCTION test_user_workspace_access(test_user_id UUID)
RETURNS TABLE(
    test_name TEXT,
    workspace_id UUID,
    workspace_name TEXT,
    user_role TEXT,
    can_access BOOLEAN
) AS $$
BEGIN
    -- Simuler le contexte utilisateur
    PERFORM set_config('request.jwt.claims', json_build_object('sub', test_user_id)::text, true);
    
    RETURN QUERY
    SELECT 
        'Accès aux workspaces' as test_name,
        w.id as workspace_id,
        w.workspace_name,
        uw.role as user_role,
        true as can_access
    FROM workspaces w
    JOIN user_workspaces uw ON w.id = uw.workspace_id
    WHERE uw.user_id = test_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test 2: Fonction pour vérifier les permissions d'administration
CREATE OR REPLACE FUNCTION test_admin_permissions(test_user_id UUID)
RETURNS TABLE(
    workspace_id UUID,
    workspace_name TEXT,
    is_admin BOOLEAN,
    can_modify BOOLEAN,
    can_delete BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id as workspace_id,
        w.workspace_name,
        (uw.role = 'admin') as is_admin,
        (uw.role = 'admin') as can_modify,
        (uw.role = 'admin' AND NOT w.is_default) as can_delete
    FROM workspaces w
    JOIN user_workspaces uw ON w.id = uw.workspace_id
    WHERE uw.user_id = test_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================
-- TESTS DE VALIDATION DES POLITIQUES
-- ============================

-- Test 3: Vérifier que les politiques SELECT fonctionnent
CREATE OR REPLACE FUNCTION validate_select_policies()
RETURNS TABLE(
    policy_test TEXT,
    result TEXT,
    details TEXT
) AS $$
DECLARE
    workspace_count INTEGER;
    user_workspace_count INTEGER;
BEGIN
    -- Tester avec un utilisateur fictif
    PERFORM set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid())::text, true);
    
    -- Compter les workspaces visibles (devrait être 0 pour un utilisateur sans accès)
    SELECT COUNT(*) INTO workspace_count FROM workspaces;
    
    -- Compter les relations user_workspaces visibles
    SELECT COUNT(*) INTO user_workspace_count FROM user_workspaces;
    
    RETURN QUERY VALUES 
        ('SELECT workspaces', 
         CASE WHEN workspace_count = 0 THEN '✅ PASS' ELSE '❌ FAIL' END,
         'Utilisateur sans accès voit ' || workspace_count || ' workspaces'),
        ('SELECT user_workspaces', 
         CASE WHEN user_workspace_count = 0 THEN '✅ PASS' ELSE '❌ FAIL' END,
         'Utilisateur sans accès voit ' || user_workspace_count || ' relations');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test 4: Vérifier les permissions d'insertion
CREATE OR REPLACE FUNCTION validate_insert_policies()
RETURNS TABLE(
    policy_test TEXT,
    result TEXT,
    details TEXT
) AS $$
DECLARE
    can_insert_workspace BOOLEAN := false;
    can_insert_user_workspace BOOLEAN := false;
    test_user_id UUID := gen_random_uuid();
    test_workspace_id UUID;
BEGIN
    -- Simuler un utilisateur authentifié
    PERFORM set_config('request.jwt.claims', json_build_object('sub', test_user_id)::text, true);
    
    -- Tester l'insertion d'un workspace
    BEGIN
        INSERT INTO workspaces (workspace_name, workspace_slug, created_by) 
        VALUES ('Test Workspace', 'test-workspace', test_user_id)
        RETURNING id INTO test_workspace_id;
        can_insert_workspace := true;
        
        -- Nettoyer
        DELETE FROM workspaces WHERE id = test_workspace_id;
    EXCEPTION WHEN OTHERS THEN
        can_insert_workspace := false;
    END;
    
    -- Tester l'insertion dans user_workspaces (devrait échouer sans être admin)
    BEGIN
        INSERT INTO user_workspaces (user_id, workspace_id, role) 
        VALUES (test_user_id, gen_random_uuid(), 'member');
        can_insert_user_workspace := true;
    EXCEPTION WHEN OTHERS THEN
        can_insert_user_workspace := false;
    END;
    
    RETURN QUERY VALUES 
        ('INSERT workspace', 
         CASE WHEN can_insert_workspace THEN '✅ PASS' ELSE '❌ FAIL' END,
         'Utilisateur peut créer un workspace'),
        ('INSERT user_workspace', 
         CASE WHEN NOT can_insert_user_workspace THEN '✅ PASS' ELSE '❌ FAIL' END,
         'Utilisateur non-admin ne peut pas ajouter d''autres utilisateurs');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================
-- RAPPORT DE VALIDATION COMPLET
-- ============================

-- Fonction principale pour exécuter tous les tests
CREATE OR REPLACE FUNCTION run_workspace_security_audit()
RETURNS TABLE(
    test_category TEXT,
    test_name TEXT,
    result TEXT,
    details TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Tests de base
    SELECT 
        'Configuration' as test_category,
        'RLS Status' as test_name,
        CASE WHEN rowsecurity THEN '✅ PASS' ELSE '❌ FAIL' END as result,
        'RLS sur table ' || tablename as details
    FROM pg_tables 
    WHERE tablename IN ('workspaces', 'user_workspaces');
    
    -- Tests de politiques
    RETURN QUERY SELECT * FROM validate_select_policies();
    RETURN QUERY SELECT * FROM validate_insert_policies();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================
-- EXÉCUTION DES TESTS
-- ============================

-- Exécuter l'audit complet
SELECT * FROM run_workspace_security_audit() ORDER BY test_category, test_name;

-- ============================
-- NETTOYAGE (optionnel)
-- ============================

-- Supprimer les fonctions de test après validation
-- DROP FUNCTION IF EXISTS test_user_workspace_access(UUID);
-- DROP FUNCTION IF EXISTS test_admin_permissions(UUID);
-- DROP FUNCTION IF EXISTS validate_select_policies();
-- DROP FUNCTION IF EXISTS validate_insert_policies();
-- DROP FUNCTION IF EXISTS run_workspace_security_audit();

-- ============================
-- INSTRUCTIONS D'UTILISATION
-- ============================

/*
Pour utiliser ce script de validation :

1. Exécutez d'abord le script create_workspace_policies.sql
2. Exécutez ce script de validation
3. Vérifiez que tous les tests montrent ✅ PASS
4. Si des tests échouent (❌ FAIL), vérifiez la configuration RLS

Tests manuels supplémentaires :
- Connectez-vous avec différents utilisateurs
- Essayez de modifier des workspaces sans être admin
- Vérifiez que chaque utilisateur ne voit que ses workspaces
*/
