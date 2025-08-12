-- Script pour créer les politiques RLS pour la table workspaces
-- À copier-coller directement dans Supabase SQL Editor

-- ============================
-- ACTIVATION RLS SUR WORKSPACES
-- ============================

-- S'assurer que RLS est activé sur la table workspaces
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- ============================
-- SUPPRESSION DES ANCIENNES POLITIQUES
-- ============================

DROP POLICY IF EXISTS "Users can view workspaces they have access to" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspace admins can update workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspace admins can delete workspaces" ON workspaces;

-- ============================
-- NOUVELLES POLITIQUES SANS RÉCURSION
-- ============================

-- 1. POLITIQUE SELECT - Voir les workspaces créés OU ceux où on est membre
CREATE POLICY "view_workspaces" ON workspaces
FOR SELECT USING (
    created_by = auth.uid()
    OR EXISTS (
        SELECT 1 FROM user_workspaces uw
        WHERE uw.workspace_id = workspaces.id
        AND uw.user_id = auth.uid()
    )
);

-- 2. POLITIQUE INSERT - Tout utilisateur peut créer un workspace
CREATE POLICY "create_workspaces" ON workspaces
FOR INSERT WITH CHECK (
    created_by = auth.uid()
);

-- 3. POLITIQUE UPDATE - Seuls les créateurs peuvent modifier
CREATE POLICY "update_workspaces" ON workspaces
FOR UPDATE USING (
    created_by = auth.uid()
);

-- 4. POLITIQUE UPDATE WITH CHECK - Validation pour les modifications
CREATE POLICY "update_workspaces_check" ON workspaces
FOR UPDATE WITH CHECK (
    created_by = auth.uid()
);

-- 5. POLITIQUE DELETE - Seuls les créateurs peuvent supprimer (sauf workspaces par défaut)
CREATE POLICY "delete_workspaces" ON workspaces
FOR DELETE USING (
    created_by = auth.uid() 
    AND NOT is_default
);
