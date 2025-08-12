-- Migration pour ajouter les politiques RLS pour la table collection
-- Date: 2025-01-20

-- Activer RLS sur la table collection si ce n'est pas déjà fait
ALTER TABLE collection ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux utilisateurs de voir les collections des sites web auxquels ils ont accès
CREATE POLICY "Users can view collections from accessible websites" ON collection
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM websites w
      INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
      WHERE w.id = collection.website_id
      AND uw.user_id = auth.uid()
      AND uw.role IN ('admin', 'editor')
    )
  );

-- Politique pour permettre aux utilisateurs admin et editor de créer des collections
CREATE POLICY "Users can create collections on accessible websites" ON collection
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM websites w
      INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
      WHERE w.id = collection.website_id
      AND uw.user_id = auth.uid()
      AND uw.role IN ('admin', 'editor')
    )
  );

-- Politique pour permettre aux utilisateurs admin et editor de modifier des collections
CREATE POLICY "Users can update collections on accessible websites" ON collection
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM websites w
      INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
      WHERE w.id = collection.website_id
      AND uw.user_id = auth.uid()
      AND uw.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM websites w
      INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
      WHERE w.id = collection.website_id
      AND uw.user_id = auth.uid()
      AND uw.role IN ('admin', 'editor')
    )
  );

-- Politique pour permettre aux utilisateurs admin de supprimer des collections
CREATE POLICY "Admins can delete collections on accessible websites" ON collection
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM websites w
      INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
      WHERE w.id = collection.website_id
      AND uw.user_id = auth.uid()
      AND uw.role = 'admin'
    )
  );

-- Ajouter des politiques pour la table collection_config également
ALTER TABLE collection_config ENABLE ROW LEVEL SECURITY;

-- Politique pour voir les configurations de collection
CREATE POLICY "Users can view collection configs from accessible websites" ON collection_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collection c
      INNER JOIN websites w ON w.id = c.website_id
      INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
      WHERE c.id = collection_config.collection_id
      AND uw.user_id = auth.uid()
      AND uw.role IN ('admin', 'editor')
    )
  );

-- Politique pour créer des configurations de collection
CREATE POLICY "Users can create collection configs on accessible websites" ON collection_config
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collection c
      INNER JOIN websites w ON w.id = c.website_id
      INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
      WHERE c.id = collection_config.collection_id
      AND uw.user_id = auth.uid()
      AND uw.role IN ('admin', 'editor')
    )
  );

-- Politique pour modifier des configurations de collection
CREATE POLICY "Users can update collection configs on accessible websites" ON collection_config
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM collection c
      INNER JOIN websites w ON w.id = c.website_id
      INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
      WHERE c.id = collection_config.collection_id
      AND uw.user_id = auth.uid()
      AND uw.role IN ('admin', 'editor')
    )
  );

-- Politique pour supprimer des configurations de collection
CREATE POLICY "Admins can delete collection configs on accessible websites" ON collection_config
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM collection c
      INNER JOIN websites w ON w.id = c.website_id
      INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
      WHERE c.id = collection_config.collection_id
      AND uw.user_id = auth.uid()
      AND uw.role = 'admin'
    )
  );
