-- Table pour stocker les éditions d'éléments de sites statiques
-- Cette table permet de tracker les modifications apportées via l'éditeur visuel

CREATE TABLE IF NOT EXISTS website_edits (
  -- Identifiant unique de l'édition
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identifiant du site/workspace
  website_id VARCHAR(255) NOT NULL,
  
  -- Chemin de la page (ex: "/", "/about", "/blog/post-1")
  page_path VARCHAR(500) NOT NULL,
  
  -- Sélecteur CSS de l'élément (ex: "body > section:nth-child(2) > h1")
  element_path TEXT NOT NULL,
  
  -- Type d'édition
  edit_type VARCHAR(10) NOT NULL CHECK (edit_type IN ('text', 'image')),
  
  -- Valeur de l'édition (HTML pour text, URL ou base64 pour image)
  value TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  
  -- Index pour optimiser les requêtes fréquentes
  CONSTRAINT unique_edit UNIQUE (website_id, page_path, element_path)
);

-- Index composite pour recherche rapide par website et page
CREATE INDEX IF NOT EXISTS idx_website_page ON website_edits(website_id, page_path) 
WHERE deleted_at IS NULL;

-- Index pour recherche par website uniquement
CREATE INDEX IF NOT EXISTS idx_website_id ON website_edits(website_id) 
WHERE deleted_at IS NULL;

-- Index pour soft delete
CREATE INDEX IF NOT EXISTS idx_deleted_at ON website_edits(deleted_at);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_website_edits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER trigger_update_website_edits_updated_at
  BEFORE UPDATE ON website_edits
  FOR EACH ROW
  EXECUTE FUNCTION update_website_edits_updated_at();

-- Commentaires pour documentation
COMMENT ON TABLE website_edits IS 'Stocke les modifications d''éléments de sites statiques effectuées via l''éditeur visuel';
COMMENT ON COLUMN website_edits.website_id IS 'Identifiant du site/workspace';
COMMENT ON COLUMN website_edits.page_path IS 'Chemin de la page relative à la racine du site';
COMMENT ON COLUMN website_edits.element_path IS 'Sélecteur CSS stable identifiant l''élément modifié';
COMMENT ON COLUMN website_edits.edit_type IS 'Type de modification: text (contenu HTML) ou image (URL/base64)';
COMMENT ON COLUMN website_edits.value IS 'Nouvelle valeur de l''élément';
COMMENT ON COLUMN website_edits.deleted_at IS 'Date de suppression logique (soft delete)';
