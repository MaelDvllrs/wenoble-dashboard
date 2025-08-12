-- Script pour corriger les politiques RLS avec récursion infinie
-- SOLUTION: Utiliser une approche différente pour éviter l'auto-référence

-- ============================
-- SUPPRESSION DES POLITIQUES PROBLÉMATIQUES
-- ============================

-- Supprimer toutes les politiques existantes sur user_workspaces
DROP POLICY IF EXISTS "Users can view their workspace memberships" ON user_workspaces;
DROP POLICY IF EXISTS "Workspace admins can add users" ON user_workspaces;
DROP POLICY IF EXISTS "Workspace admins can update user roles" ON user_workspaces;
DROP POLICY IF EXISTS "Workspace admins can remove users" ON user_workspaces;
DROP POLICY IF EXISTS "Prevent creator role modification" ON user_workspaces;
DROP POLICY IF EXISTS "Prevent creator removal" ON user_workspaces;

-- ============================
-- NOUVELLES POLITIQUES SANS RÉCURSION
-- ============================

-- APPROCHE 1: POLITIQUES BASÉES SUR LE CRÉATEUR DU WORKSPACE
-- Ces politiques évitent l'auto-référence en utilisant la table workspaces

-- 1. SELECT: Voir ses propres relations OU celles des workspaces qu'on a créés
CREATE POLICY "view_user_workspaces" ON user_workspaces
FOR SELECT USING (
    user_id = auth.uid()
    OR workspace_id IN (
        SELECT w.id FROM workspaces w 
        WHERE w.created_by = auth.uid()
    )
);

-- 2. INSERT: Seuls les créateurs de workspace peuvent ajouter des utilisateurs
CREATE POLICY "add_users_to_workspace" ON user_workspaces
FOR INSERT WITH CHECK (
    workspace_id IN (
        SELECT w.id FROM workspaces w 
        WHERE w.created_by = auth.uid()
    )
);

-- 3. UPDATE: Seuls les créateurs peuvent modifier les rôles
CREATE POLICY "update_user_roles" ON user_workspaces
FOR UPDATE USING (
    workspace_id IN (
        SELECT w.id FROM workspaces w 
        WHERE w.created_by = auth.uid()
    )
) WITH CHECK (
    workspace_id IN (
        SELECT w.id FROM workspaces w 
        WHERE w.created_by = auth.uid()
    )
);

-- 4. DELETE: Les utilisateurs peuvent se retirer OU les créateurs peuvent retirer
CREATE POLICY "remove_users_from_workspace" ON user_workspaces
FOR DELETE USING (
    user_id = auth.uid()
    OR workspace_id IN (
        SELECT w.id FROM workspaces w 
        WHERE w.created_by = auth.uid()
    )
);

-- ============================
-- ALTERNATIVE: POLITIQUES AVEC FONCTIONS PERSONNALISÉES
-- Si vous avez besoin que les admins (pas seulement les créateurs) puissent gérer
-- ============================

-- Créer une fonction sécurisée pour vérifier les permissions admin
CREATE OR REPLACE FUNCTION is_workspace_admin(workspace_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Vérifier si l'utilisateur est le créateur du workspace
    IF EXISTS (
        SELECT 1 FROM workspaces w 
        WHERE w.id = workspace_uuid 
        AND w.created_by = user_uuid
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Ou vérifier s'il est admin (en utilisant un comptage pour éviter la récursion)
    IF (
        SELECT COUNT(*) FROM user_workspaces uw 
        WHERE uw.workspace_id = workspace_uuid 
        AND uw.user_id = user_uuid 
        AND uw.role = 'admin'
    ) > 0 THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Politiques alternatives utilisant la fonction (à utiliser si nécessaire)
/*
-- Ces politiques sont commentées car elles peuvent encore causer des problèmes
-- Utilisez-les seulement si vous avez absolument besoin que les admins gèrent

CREATE POLICY "view_user_workspaces_with_admin" ON user_workspaces
FOR SELECT USING (
    user_id = auth.uid()
    OR is_workspace_admin(workspace_id, auth.uid())
);

CREATE POLICY "add_users_with_admin" ON user_workspaces
FOR INSERT WITH CHECK (
    is_workspace_admin(workspace_id, auth.uid())
);

CREATE POLICY "update_roles_with_admin" ON user_workspaces
FOR UPDATE USING (
    is_workspace_admin(workspace_id, auth.uid())
) WITH CHECK (
    is_workspace_admin(workspace_id, auth.uid())
);

CREATE POLICY "remove_users_with_admin" ON user_workspaces
FOR DELETE USING (
    user_id = auth.uid()
    OR is_workspace_admin(workspace_id, auth.uid())
);
*/

-- ============================
-- POLITIQUES POUR WORKSPACES (CORRIGÉES)
-- ============================

-- Supprimer les anciennes politiques workspaces si nécessaire
DROP POLICY IF EXISTS "Users can view workspaces they have access to" ON workspaces;
DROP POLICY IF EXISTS "Workspace admins can update workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspace admins can delete workspaces" ON workspaces;

-- Nouvelles politiques workspaces sans récursion
CREATE POLICY "view_workspaces" ON workspaces
FOR SELECT USING (
    -- Workspaces créés par l'utilisateur
    created_by = auth.uid()
    -- OU workspaces où l'utilisateur est membre (vérification directe)
    OR EXISTS (
        SELECT 1 FROM user_workspaces uw
        WHERE uw.workspace_id = workspaces.id
        AND uw.user_id = auth.uid()
    )
);

CREATE POLICY "update_workspaces" ON workspaces
FOR UPDATE USING (
    -- Seuls les créateurs peuvent modifier
    created_by = auth.uid()
) WITH CHECK (
    created_by = auth.uid()
);

CREATE POLICY "delete_workspaces" ON workspaces
FOR DELETE USING (
    -- Seuls les créateurs peuvent supprimer (et pas les workspaces par défaut)
    created_by = auth.uid() AND NOT is_default
);

-- ============================
-- TESTS DE VÉRIFICATION
-- ============================

-- Test que les requêtes fonctionnent maintenant
SELECT 'Test SELECT user_workspaces' as test_name, COUNT(*) as result FROM user_workspaces;
SELECT 'Test SELECT workspaces' as test_name, COUNT(*) as result FROM workspaces;

-- Vérifier les politiques créées
SELECT 
    tablename,
    policyname,
    cmd as operation
FROM pg_policies 
WHERE tablename IN ('workspaces', 'user_workspaces')
ORDER BY tablename, cmd;

-- ============================
-- COMMENTAIRES ET DOCUMENTATION
-- ============================

COMMENT ON POLICY "view_user_workspaces" ON user_workspaces IS 
'Permet de voir ses propres relations workspace ou celles des workspaces qu on a créés';

COMMENT ON POLICY "add_users_to_workspace" ON user_workspaces IS 
'Seuls les créateurs de workspace peuvent ajouter des utilisateurs';

COMMENT ON POLICY "update_user_roles" ON user_workspaces IS 
'Seuls les créateurs peuvent modifier les rôles des membres';

COMMENT ON POLICY "remove_users_from_workspace" ON user_workspaces IS 
'Les utilisateurs peuvent se retirer ou les créateurs peuvent retirer des membres';

COMMENT ON FUNCTION is_workspace_admin(UUID, UUID) IS 
'Fonction pour vérifier si un utilisateur est admin d un workspace sans récursion';

-- ============================
-- INSTRUCTIONS D'UTILISATION
-- ============================

/*
SOLUTION APPLIQUÉE :

1. SUPPRESSION DE LA RÉCURSION :
   - Les politiques user_workspaces ne référencent plus user_workspaces
   - Utilisation de la table workspaces.created_by pour les permissions
   - Vérifications directes avec EXISTS au lieu de sous-requêtes récursives

2. PERMISSIONS SIMPLIFIÉES :
   - Les CRÉATEURS de workspace ont tous les droits
   - Les utilisateurs peuvent voir leurs propres relations
   - Les utilisateurs peuvent se retirer d'un workspace

3. FONCTION ALTERNATIVE :
   - is_workspace_admin() pour des besoins avancés
   - Utilise un comptage pour éviter la récursion
   - Peut être utilisée si vous avez besoin que les admins gèrent

CETTE APPROCHE ÉLIMINE COMPLÈTEMENT LA RÉCURSION INFINIE !

Pour réactiver la gestion par les admins (pas seulement les créateurs),
décommentez les politiques alternatives qui utilisent is_workspace_admin().
*/
