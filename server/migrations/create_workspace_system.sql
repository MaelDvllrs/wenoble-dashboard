-- Migration pour créer le système de workspace
-- Créé le : 2025-01-21

-- 1. Créer la table workspaces
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_name VARCHAR(255) NOT NULL,
    workspace_slug VARCHAR(255) UNIQUE NOT NULL,
    workspace_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_default BOOLEAN DEFAULT FALSE -- Pour le workspace par défaut de l'utilisateur
);

-- 2. Créer la table user_workspaces (relation many-to-many entre users et workspaces)
CREATE TABLE IF NOT EXISTS user_workspaces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member', -- admin, member, viewer
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, workspace_id)
);

-- 3. Ajouter workspace_id à la table websites
ALTER TABLE websites ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

-- 3.1. Ajouter la colonne de visibilité aux sites web
ALTER TABLE websites ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) DEFAULT 'workspace'; 
-- 'workspace' = visible par tous les membres du workspace
-- 'restricted' = visible seulement par les utilisateurs explicitement ajoutés

-- 4. Créer des index pour les performances
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(workspace_slug);
CREATE INDEX IF NOT EXISTS idx_workspaces_created_by ON workspaces(created_by);
CREATE INDEX IF NOT EXISTS idx_user_workspaces_user_id ON user_workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_user_workspaces_workspace_id ON user_workspaces(workspace_id);
CREATE INDEX IF NOT EXISTS idx_websites_workspace_id ON websites(workspace_id);

-- 5. Créer un workspace par défaut pour chaque utilisateur existant
INSERT INTO workspaces (workspace_name, workspace_slug, workspace_description, created_by, is_default)
SELECT 
    CONCAT(username, ' - Workspace Personnel'),
    CONCAT(LOWER(REPLACE(username, ' ', '-')), '-workspace'),
    'Workspace personnel par défaut',
    id,
    true
FROM users
WHERE NOT EXISTS (
    SELECT 1 FROM workspaces WHERE created_by = users.id AND is_default = true
);

-- 6. Ajouter les utilisateurs à leur workspace par défaut comme admin
INSERT INTO user_workspaces (user_id, workspace_id, role)
SELECT 
    u.id,
    w.id,
    'admin'
FROM users u
JOIN workspaces w ON w.created_by = u.id AND w.is_default = true
WHERE NOT EXISTS (
    SELECT 1 FROM user_workspaces uw 
    WHERE uw.user_id = u.id AND uw.workspace_id = w.id
);

-- 7. Associer les sites web existants au workspace par défaut de leur propriétaire
UPDATE websites 
SET workspace_id = (
    SELECT w.id 
    FROM workspaces w 
    JOIN user_websites uw ON uw.website_id = websites.id 
    WHERE uw.role = 'admin' 
    AND w.created_by = uw.user_id 
    AND w.is_default = true
    LIMIT 1
)
WHERE workspace_id IS NULL;

-- 8. Créer les politiques RLS pour workspaces
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Politique pour voir les workspaces
DROP POLICY IF EXISTS "Users can view workspaces they have access to" ON workspaces;
CREATE POLICY "Users can view workspaces they have access to" ON workspaces
FOR SELECT USING (
    id IN (
        SELECT workspace_id FROM user_workspaces 
        WHERE user_id = auth.uid()
    )
);

-- Politique pour créer des workspaces
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
CREATE POLICY "Users can create workspaces" ON workspaces
FOR INSERT WITH CHECK (created_by = auth.uid());

-- Politique pour modifier les workspaces (admin seulement)
DROP POLICY IF EXISTS "Workspace admins can update workspaces" ON workspaces;
CREATE POLICY "Workspace admins can update workspaces" ON workspaces
FOR UPDATE USING (
    id IN (
        SELECT workspace_id FROM user_workspaces 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Politique pour supprimer les workspaces (admin seulement)
DROP POLICY IF EXISTS "Workspace admins can delete workspaces" ON workspaces;
CREATE POLICY "Workspace admins can delete workspaces" ON workspaces
FOR DELETE USING (
    id IN (
        SELECT workspace_id FROM user_workspaces 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- 9. Créer les politiques RLS pour user_workspaces
ALTER TABLE user_workspaces ENABLE ROW LEVEL SECURITY;

-- Politique pour voir les relations workspace-user
DROP POLICY IF EXISTS "Users can view their workspace memberships" ON user_workspaces;
CREATE POLICY "Users can view their workspace memberships" ON user_workspaces
FOR SELECT USING (
    user_id = auth.uid()
    OR workspace_id IN (
        SELECT workspace_id FROM user_workspaces 
        WHERE user_id = auth.uid() AND role IN ('admin')
    )
);

-- Politique pour ajouter des utilisateurs aux workspaces (admin seulement)
DROP POLICY IF EXISTS "Workspace admins can add users" ON user_workspaces;
CREATE POLICY "Workspace admins can add users" ON user_workspaces
FOR INSERT WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM user_workspaces 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Politique pour modifier les rôles (admin seulement)
DROP POLICY IF EXISTS "Workspace admins can update user roles" ON user_workspaces;
CREATE POLICY "Workspace admins can update user roles" ON user_workspaces
FOR UPDATE USING (
    workspace_id IN (
        SELECT workspace_id FROM user_workspaces 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Politique pour retirer des utilisateurs (admin seulement, sauf soi-même)
DROP POLICY IF EXISTS "Workspace admins can remove users" ON user_workspaces;
CREATE POLICY "Workspace admins can remove users" ON user_workspaces
FOR DELETE USING (
    user_id = auth.uid()
    OR workspace_id IN (
        SELECT workspace_id FROM user_workspaces 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- 10. Mettre à jour les politiques RLS pour websites en tenant compte des workspaces
-- Cette politique sera mise à jour dans le fichier website.js

-- 11. Mettre à jour les sites web existants avec la visibilité par défaut
UPDATE websites SET visibility = 'workspace' WHERE visibility IS NULL;

COMMENT ON TABLE workspaces IS 'Table des workspaces - espaces de travail qui contiennent les sites web';
COMMENT ON TABLE user_workspaces IS 'Table de relation entre les utilisateurs et les workspaces avec leurs rôles';
COMMENT ON COLUMN websites.workspace_id IS 'ID du workspace auquel appartient le site web';
COMMENT ON COLUMN websites.visibility IS 'Visibilité du site: workspace (tous les membres) ou restricted (utilisateurs ajoutés seulement)';
