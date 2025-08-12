-- Migration complète pour ajouter les politiques RLS pour toutes les tables de collection
-- Date: 2025-01-20

-- ===============================
-- TABLE: collection_element
-- ===============================
ALTER TABLE collection_element ENABLE ROW LEVEL SECURITY;

-- Politique pour voir les éléments de collection
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

-- Politique pour créer des éléments de collection
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

-- Politique pour modifier des éléments de collection
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

-- Politique pour supprimer des éléments de collection
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
-- TABLE: collection_field_text
-- ===============================
ALTER TABLE collection_field_text ENABLE ROW LEVEL SECURITY;

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
  )
  WITH CHECK (
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

-- ===============================
-- TABLE: collection_field_richtext
-- ===============================
ALTER TABLE collection_field_richtext ENABLE ROW LEVEL SECURITY;

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
  )
  WITH CHECK (
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

-- ===============================
-- TABLE: collection_field_image
-- ===============================
ALTER TABLE collection_field_image ENABLE ROW LEVEL SECURITY;

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
  )
  WITH CHECK (
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

-- ===============================
-- TABLE: collection_field_gallery
-- ===============================
ALTER TABLE collection_field_gallery ENABLE ROW LEVEL SECURITY;

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
  )
  WITH CHECK (
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

-- ===============================
-- TABLE: collection_field_video
-- ===============================
ALTER TABLE collection_field_video ENABLE ROW LEVEL SECURITY;

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
  )
  WITH CHECK (
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

-- ===============================
-- TABLE: collection_field_multireference
-- ===============================
ALTER TABLE collection_field_multireference ENABLE ROW LEVEL SECURITY;

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
  )
  WITH CHECK (
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
