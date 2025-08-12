-- Migration complète pour résoudre l'erreur RLS sur les collections
-- À exécuter dans l'éditeur SQL de Supabase
-- CORRIGÉ: table "websites" avec "s"

-- ===============================
-- TABLES PRINCIPALES
-- ===============================

-- TABLE: collection
ALTER TABLE collection ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view collections from accessible websites" ON collection;
CREATE POLICY "Users can view collections from accessible websites" ON collection
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM websites w
      INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
      WHERE w.id = collection.website_id
      AND uw.user_id = auth.uid()
      AND uw.user_role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "Users can create collections on accessible websites" ON collection;
CREATE POLICY "Users can create collections on accessible websites" ON collection
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM websites w
      INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
      WHERE w.id = collection.website_id
      AND uw.user_id = auth.uid()
      AND uw.user_role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "Users can update collections on accessible websites" ON collection;
CREATE POLICY "Users can update collections on accessible websites" ON collection
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM websites w
      INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
      WHERE w.id = collection.website_id
      AND uw.user_id = auth.uid()
      AND uw.user_role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "Admins can delete collections on accessible websites" ON collection;
CREATE POLICY "Admins can delete collections on accessible websites" ON collection
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM websites w
      INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
      WHERE w.id = collection.website_id
      AND uw.user_id = auth.uid()
      AND uw.user_role = 'admin'
    )
  );

-- TABLE: collection_config
ALTER TABLE collection_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view collection configs from accessible websites" ON collection_config;
CREATE POLICY "Users can view collection configs from accessible websites" ON collection_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collection c
      INNER JOIN websites w ON w.id = c.website_id
      INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
      WHERE c.id = collection_config.collection_id
      AND uw.user_id = auth.uid()
      AND uw.user_role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "Users can create collection configs on accessible websites" ON collection_config;
CREATE POLICY "Users can create collection configs on accessible websites" ON collection_config
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collection c
      INNER JOIN websites w ON w.id = c.website_id
      INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
      WHERE c.id = collection_config.collection_id
      AND uw.user_id = auth.uid()
      AND uw.user_role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "Users can update collection configs on accessible websites" ON collection_config;
CREATE POLICY "Users can update collection configs on accessible websites" ON collection_config
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM collection c
      INNER JOIN websites w ON w.id = c.website_id
      INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
      WHERE c.id = collection_config.collection_id
      AND uw.user_id = auth.uid()
      AND uw.user_role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "Admins can delete collection configs on accessible websites" ON collection_config;
CREATE POLICY "Admins can delete collection configs on accessible websites" ON collection_config
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM collection c
      INNER JOIN websites w ON w.id = c.website_id
      INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
      WHERE c.id = collection_config.collection_id
      AND uw.user_id = auth.uid()
      AND uw.user_role = 'admin'
    )
  );

-- TABLE: collection_element
ALTER TABLE collection_element ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view collection elements from accessible websites" ON collection_element;
CREATE POLICY "Users can view collection elements from accessible websites" ON collection_element
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collection c
      INNER JOIN websites w ON w.id = c.website_id
      INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
      WHERE c.id = collection_element.collection_id
      AND uw.user_id = auth.uid()
      AND uw.user_role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "Users can create collection elements on accessible websites" ON collection_element;
CREATE POLICY "Users can create collection elements on accessible websites" ON collection_element
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collection c
      INNER JOIN websites w ON w.id = c.website_id
      INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
      WHERE c.id = collection_element.collection_id
      AND uw.user_id = auth.uid()
      AND uw.user_role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "Users can update collection elements on accessible websites" ON collection_element;
CREATE POLICY "Users can update collection elements on accessible websites" ON collection_element
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM collection c
      INNER JOIN websites w ON w.id = c.website_id
      INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
      WHERE c.id = collection_element.collection_id
      AND uw.user_id = auth.uid()
      AND uw.user_role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "Users can delete collection elements on accessible websites" ON collection_element;
CREATE POLICY "Users can delete collection elements on accessible websites" ON collection_element
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM collection c
      INNER JOIN websites w ON w.id = c.website_id
      INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
      WHERE c.id = collection_element.collection_id
      AND uw.user_id = auth.uid()
      AND uw.user_role IN ('admin', 'editor')
    )
  );

-- ===============================
-- TABLES DE CHAMPS DE COLLECTION
-- ===============================

-- TABLE: collection_field_text
ALTER TABLE collection_field_text ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage collection text fields" ON collection_field_text;
CREATE POLICY "Users can manage collection text fields" ON collection_field_text
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM collection_element ce
      INNER JOIN collection c ON c.id = ce.collection_id
      INNER JOIN websites w ON w.id = c.website_id
      INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
      WHERE ce.id = collection_field_text.collection_element_id
      AND uw.user_id = auth.uid()
      AND uw.user_role IN ('admin', 'editor')
    )
  );

-- TABLE: collection_field_richtext
ALTER TABLE collection_field_richtext ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage collection richtext fields" ON collection_field_richtext;
CREATE POLICY "Users can manage collection richtext fields" ON collection_field_richtext
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM collection_element ce
      INNER JOIN collection c ON c.id = ce.collection_id
      INNER JOIN websites w ON w.id = c.website_id
      INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
      WHERE ce.id = collection_field_richtext.collection_element_id
      AND uw.user_id = auth.uid()
      AND uw.user_role IN ('admin', 'editor')
    )
  );

-- TABLE: collection_field_image
ALTER TABLE collection_field_image ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage collection image fields" ON collection_field_image;
CREATE POLICY "Users can manage collection image fields" ON collection_field_image
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM collection_element ce
      INNER JOIN collection c ON c.id = ce.collection_id
      INNER JOIN websites w ON w.id = c.website_id
      INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
      WHERE ce.id = collection_field_image.collection_element_id
      AND uw.user_id = auth.uid()
      AND uw.user_role IN ('admin', 'editor')
    )
  );

-- TABLE: collection_field_gallery
ALTER TABLE collection_field_gallery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage collection gallery fields" ON collection_field_gallery;
CREATE POLICY "Users can manage collection gallery fields" ON collection_field_gallery
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM collection_element ce
      INNER JOIN collection c ON c.id = ce.collection_id
      INNER JOIN websites w ON w.id = c.website_id
      INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
      WHERE ce.id = collection_field_gallery.collection_element_id
      AND uw.user_id = auth.uid()
      AND uw.user_role IN ('admin', 'editor')
    )
  );

-- TABLE: collection_field_video
ALTER TABLE collection_field_video ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage collection video fields" ON collection_field_video;
CREATE POLICY "Users can manage collection video fields" ON collection_field_video
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM collection_element ce
      INNER JOIN collection c ON c.id = ce.collection_id
      INNER JOIN websites w ON w.id = c.website_id
      INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
      WHERE ce.id = collection_field_video.collection_element_id
      AND uw.user_id = auth.uid()
      AND uw.user_role IN ('admin', 'editor')
    )
  );

-- TABLE: collection_field_multireference
ALTER TABLE collection_field_multireference ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage collection multireference fields" ON collection_field_multireference;
CREATE POLICY "Users can manage collection multireference fields" ON collection_field_multireference
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM collection_element ce
      INNER JOIN collection c ON c.id = ce.collection_id
      INNER JOIN websites w ON w.id = c.website_id
      INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
      WHERE ce.id = collection_field_multireference.collection_element_id
      AND uw.user_id = auth.uid()
      AND uw.user_role IN ('admin', 'editor')
    )
  );
