-- Script pour créer les politiques RLS pour les tables workspace et user_workspaces
-- Ce script peut être exécuté séparément si les politiques n'ont pas été créées avec la migration

-- ============================
-- POLITIQUES POUR LA TABLE WORKSPACES
-- ============================

-- Activer RLS sur la table workspaces
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- 1. Politique SELECT - Les utilisateurs peuvent voir les workspaces auxquels ils appartiennent
DROP POLICY IF EXISTS "Users can view workspaces they have access to" ON workspaces;
CREATE POLICY "Users can view workspaces they have access to" ON workspaces
FOR SELECT USING (
    id IN (
        SELECT workspace_id FROM user_workspaces 
        WHERE user_id = auth.uid()
    )
);

-- 2. Politique INSERT - Les utilisateurs peuvent créer des workspaces
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
CREATE POLICY "Users can create workspaces" ON workspaces
FOR INSERT WITH CHECK (
    created_by = auth.uid()
);

-- 3. Politique UPDATE - Seuls les admins d'un workspace peuvent le modifier
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

-- 4. Politique DELETE - Seuls les admins d'un workspace peuvent le supprimer
DROP POLICY IF EXISTS "Workspace admins can delete workspaces" ON workspaces;
CREATE POLICY "Workspace admins can delete workspaces" ON workspaces
FOR DELETE USING (
    id IN (
        SELECT workspace_id FROM user_workspaces 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- ============================
-- POLITIQUES POUR LA TABLE USER_WORKSPACES
-- ============================

-- Activer RLS sur la table user_workspaces
ALTER TABLE user_workspaces ENABLE ROW LEVEL SECURITY;

-- 1. Politique SELECT - Les utilisateurs peuvent voir leurs propres relations et celles des workspaces qu'ils administrent
DROP POLICY IF EXISTS "Users can view their workspace memberships" ON user_workspaces;
CREATE POLICY "Users can view their workspace memberships" ON user_workspaces
FOR SELECT USING (
    user_id = auth.uid()
    OR workspace_id IN (
        SELECT workspace_id FROM user_workspaces 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- 2. Politique INSERT - Seuls les admins d'un workspace peuvent ajouter des utilisateurs
DROP POLICY IF EXISTS "Workspace admins can add users" ON user_workspaces;
CREATE POLICY "Workspace admins can add users" ON user_workspaces
FOR INSERT WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM user_workspaces 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- 3. Politique UPDATE - Seuls les admins d'un workspace peuvent modifier les rôles
DROP POLICY IF EXISTS "Workspace admins can update user roles" ON user_workspaces;
CREATE POLICY "Workspace admins can update user roles" ON user_workspaces
FOR UPDATE USING (
    workspace_id IN (
        SELECT workspace_id FROM user_workspaces 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
) WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM user_workspaces 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- 4. Politique DELETE - Les admins peuvent retirer des utilisateurs, ou les utilisateurs peuvent se retirer eux-mêmes
DROP POLICY IF EXISTS "Workspace admins can remove users" ON user_workspaces;
CREATE POLICY "Workspace admins can remove users" ON user_workspaces
FOR DELETE USING (
    user_id = auth.uid() -- L'utilisateur peut se retirer lui-même
    OR workspace_id IN (
        SELECT workspace_id FROM user_workspaces 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- ============================
-- POLITIQUES ADDITIONNELLES POUR SÉCURITÉ RENFORCÉE
-- ============================

-- Politique pour empêcher la modification du rôle du créateur d'un workspace
DROP POLICY IF EXISTS "Prevent creator role modification" ON user_workspaces;
CREATE POLICY "Prevent creator role modification" ON user_workspaces
FOR UPDATE USING (
    NOT (
        user_id IN (
            SELECT created_by FROM workspaces WHERE id = workspace_id
        )
        AND role != 'admin'
    )
);

-- Politique pour empêcher la suppression du créateur d'un workspace
DROP POLICY IF EXISTS "Prevent creator removal" ON user_workspaces;
CREATE POLICY "Prevent creator removal" ON user_workspaces
FOR DELETE USING (
    NOT (
        user_id IN (
            SELECT created_by FROM workspaces WHERE id = workspace_id
        )
        AND user_id != auth.uid() -- Sauf si le créateur se retire lui-même
    )
);

-- ============================
-- VÉRIFICATIONS ET COMMENTAIRES
-- ============================

-- Vérifier que RLS est bien activé
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('workspaces', 'user_workspaces');

-- Lister toutes les politiques créées
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('workspaces', 'user_workspaces');

COMMENT ON POLICY "Users can view workspaces they have access to" ON workspaces IS 
'Permet aux utilisateurs de voir uniquement les workspaces auxquels ils appartiennent';

COMMENT ON POLICY "Users can create workspaces" ON workspaces IS 
'Permet à tout utilisateur authentifié de créer un nouveau workspace';

COMMENT ON POLICY "Workspace admins can update workspaces" ON workspaces IS 
'Seuls les administrateurs d un workspace peuvent le modifier';

COMMENT ON POLICY "Workspace admins can delete workspaces" ON workspaces IS 
'Seuls les administrateurs d un workspace peuvent le supprimer';

COMMENT ON POLICY "Users can view their workspace memberships" ON user_workspaces IS 
'Les utilisateurs peuvent voir leurs propres relations et celles des workspaces qu ils administrent';

COMMENT ON POLICY "Workspace admins can add users" ON user_workspaces IS 
'Seuls les administrateurs peuvent ajouter des utilisateurs à un workspace';

COMMENT ON POLICY "Workspace admins can update user roles" ON user_workspaces IS 
'Seuls les administrateurs peuvent modifier les rôles des membres';

COMMENT ON POLICY "Workspace admins can remove users" ON user_workspaces IS 
'Les administrateurs peuvent retirer des utilisateurs ou les utilisateurs peuvent se retirer eux-mêmes';

-- ============================
-- TESTS DE VÉRIFICATION
-- ============================

-- Ces requêtes peuvent être utilisées pour tester les politiques
-- (à adapter avec de vrais IDs d'utilisateurs et de workspaces)

/*
-- Test 1: Vérifier qu'un utilisateur ne voit que ses workspaces
SET SESSION AUTHORIZATION 'user_uuid_here';
SELECT * FROM workspaces; -- Doit retourner seulement les workspaces de l'utilisateur

-- Test 2: Vérifier qu'un utilisateur ne peut pas voir les relations d'autres workspaces
SELECT * FROM user_workspaces; -- Doit retourner seulement les relations liées à l'utilisateur

-- Test 3: Vérifier qu'un membre ne peut pas modifier un workspace
UPDATE workspaces SET workspace_name = 'Test' WHERE id = 'workspace_uuid_here'; -- Doit échouer si pas admin

-- Test 4: Vérifier qu'un membre ne peut pas ajouter d'utilisateurs
INSERT INTO user_workspaces (user_id, workspace_id, role) VALUES ('other_user_uuid', 'workspace_uuid', 'member'); -- Doit échouer si pas admin
*/
