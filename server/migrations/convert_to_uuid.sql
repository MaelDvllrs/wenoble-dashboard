-- Migration pour convertir les IDs INTEGER vers UUID
-- ATTENTION: Cette migration va modifier les données existantes
-- Créé le : 2025-01-21

-- 1. Désactiver temporairement les politiques RLS
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_workspaces DISABLE ROW LEVEL SECURITY;

-- 2. Supprimer temporairement les contraintes de clés étrangères
ALTER TABLE user_workspaces DROP CONSTRAINT IF EXISTS user_workspaces_workspace_id_fkey;
ALTER TABLE websites DROP CONSTRAINT IF EXISTS websites_workspace_id_fkey;

-- 3. Ajouter des colonnes temporaires UUID
ALTER TABLE workspaces ADD COLUMN temp_id UUID DEFAULT gen_random_uuid();
ALTER TABLE user_workspaces ADD COLUMN temp_id UUID DEFAULT gen_random_uuid();
ALTER TABLE user_workspaces ADD COLUMN temp_workspace_id UUID;

-- 4. Remplir les colonnes temporaires avec des UUID
UPDATE workspaces SET temp_id = gen_random_uuid();
UPDATE user_workspaces SET temp_id = gen_random_uuid();

-- 5. Créer une table de mapping pour les workspaces
CREATE TEMP TABLE workspace_id_mapping AS
SELECT id as old_id, temp_id as new_id FROM workspaces;

-- 6. Mettre à jour les références dans user_workspaces
UPDATE user_workspaces 
SET temp_workspace_id = m.new_id
FROM workspace_id_mapping m
WHERE user_workspaces.workspace_id = m.old_id;

-- 7. Ajouter une colonne temporaire pour websites si elle existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'websites' AND column_name = 'workspace_id') THEN
        ALTER TABLE websites ADD COLUMN temp_workspace_id UUID;
        
        UPDATE websites 
        SET temp_workspace_id = m.new_id
        FROM workspace_id_mapping m
        WHERE websites.workspace_id = m.old_id;
    END IF;
END $$;

-- 8. Supprimer les anciennes colonnes ID
ALTER TABLE workspaces DROP COLUMN id CASCADE;
ALTER TABLE user_workspaces DROP COLUMN id CASCADE;
ALTER TABLE user_workspaces DROP COLUMN workspace_id CASCADE;

-- 9. Renommer les colonnes temporaires
ALTER TABLE workspaces RENAME COLUMN temp_id TO id;
ALTER TABLE user_workspaces RENAME COLUMN temp_id TO id;
ALTER TABLE user_workspaces RENAME COLUMN temp_workspace_id TO workspace_id;

-- 10. Ajouter les contraintes PRIMARY KEY
ALTER TABLE workspaces ADD PRIMARY KEY (id);
ALTER TABLE user_workspaces ADD PRIMARY KEY (id);

-- 11. Mettre à jour la colonne workspace_id dans websites si elle existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'websites' AND column_name = 'temp_workspace_id') THEN
        ALTER TABLE websites DROP COLUMN workspace_id CASCADE;
        ALTER TABLE websites RENAME COLUMN temp_workspace_id TO workspace_id;
    END IF;
END $$;

-- 12. Recréer les contraintes de clés étrangères
ALTER TABLE user_workspaces 
ADD CONSTRAINT user_workspaces_workspace_id_fkey 
FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- 13. Ajouter la contrainte pour websites si la colonne existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'websites' AND column_name = 'workspace_id') THEN
        ALTER TABLE websites 
        ADD CONSTRAINT websites_workspace_id_fkey 
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 14. Recréer les contraintes UNIQUE
ALTER TABLE user_workspaces ADD CONSTRAINT user_workspaces_user_id_workspace_id_key UNIQUE (user_id, workspace_id);

-- 15. Recréer les index
DROP INDEX IF EXISTS idx_workspaces_slug;
DROP INDEX IF EXISTS idx_workspaces_created_by;
DROP INDEX IF EXISTS idx_user_workspaces_user_id;
DROP INDEX IF EXISTS idx_user_workspaces_workspace_id;
DROP INDEX IF EXISTS idx_websites_workspace_id;

CREATE INDEX idx_workspaces_slug ON workspaces(workspace_slug);
CREATE INDEX idx_workspaces_created_by ON workspaces(created_by);
CREATE INDEX idx_user_workspaces_user_id ON user_workspaces(user_id);
CREATE INDEX idx_user_workspaces_workspace_id ON user_workspaces(workspace_id);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'websites' AND column_name = 'workspace_id') THEN
        CREATE INDEX idx_websites_workspace_id ON websites(workspace_id);
    END IF;
END $$;

-- 16. Réactiver les politiques RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_workspaces ENABLE ROW LEVEL SECURITY;

-- 17. Recréer les politiques RLS pour workspaces
DROP POLICY IF EXISTS "Users can view workspaces they have access to" ON workspaces;
CREATE POLICY "Users can view workspaces they have access to" ON workspaces
FOR SELECT USING (
    id IN (
        SELECT workspace_id FROM user_workspaces 
        WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
CREATE POLICY "Users can create workspaces" ON workspaces
FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Workspace admins can update workspaces" ON workspaces;
CREATE POLICY "Workspace admins can update workspaces" ON workspaces
FOR UPDATE USING (
    id IN (
        SELECT workspace_id FROM user_workspaces 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

DROP POLICY IF EXISTS "Workspace admins can delete workspaces" ON workspaces;
CREATE POLICY "Workspace admins can delete workspaces" ON workspaces
FOR DELETE USING (
    id IN (
        SELECT workspace_id FROM user_workspaces 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- 18. Recréer les politiques RLS pour user_workspaces
DROP POLICY IF EXISTS "Users can view their workspace memberships" ON user_workspaces;
CREATE POLICY "Users can view their workspace memberships" ON user_workspaces
FOR SELECT USING (
    user_id = auth.uid()
    OR workspace_id IN (
        SELECT workspace_id FROM user_workspaces 
        WHERE user_id = auth.uid() AND role IN ('admin')
    )
);

DROP POLICY IF EXISTS "Workspace admins can add users" ON user_workspaces;
CREATE POLICY "Workspace admins can add users" ON user_workspaces
FOR INSERT WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM user_workspaces 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

DROP POLICY IF EXISTS "Workspace admins can update user roles" ON user_workspaces;
CREATE POLICY "Workspace admins can update user roles" ON user_workspaces
FOR UPDATE USING (
    workspace_id IN (
        SELECT workspace_id FROM user_workspaces 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

DROP POLICY IF EXISTS "Workspace admins can remove users" ON user_workspaces;
CREATE POLICY "Workspace admins can remove users" ON user_workspaces
FOR DELETE USING (
    user_id = auth.uid()
    OR workspace_id IN (
        SELECT workspace_id FROM user_workspaces 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

COMMENT ON TABLE workspaces IS 'Table des workspaces - espaces de travail qui contiennent les sites web (UUID)';
COMMENT ON TABLE user_workspaces IS 'Table de relation entre les utilisateurs et les workspaces avec leurs rôles (UUID)';
