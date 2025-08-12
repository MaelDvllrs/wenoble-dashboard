-- Migration pour créer la table website_email
-- Cette table stocke les emails destinataires pour les demandes de contact de chaque site web

CREATE TABLE IF NOT EXISTS website_email (
    id SERIAL PRIMARY KEY,
    website_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (website_id) REFERENCES website(id) ON DELETE CASCADE
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_website_email_website_id ON website_email(website_id);
CREATE INDEX IF NOT EXISTS idx_website_email_active ON website_email(is_active);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_website_email_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_website_email_updated_at
    BEFORE UPDATE ON website_email
    FOR EACH ROW
    EXECUTE FUNCTION update_website_email_updated_at();

-- Contrainte pour s'assurer qu'il n'y a qu'un seul email principal par site web
CREATE UNIQUE INDEX IF NOT EXISTS idx_website_email_primary_unique 
ON website_email(website_id) 
WHERE is_primary = TRUE;

-- Activer Row Level Security
ALTER TABLE website_email ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture (SELECT) à tout le monde
CREATE POLICY "Anyone can view website emails" ON website_email
    FOR SELECT
    USING (true);

-- Politique pour permettre l'insertion (INSERT) aux admins et editors
CREATE POLICY "Users can insert website emails if admin or editor" ON website_email
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_website uw
            WHERE uw.website_id = website_email.website_id
            AND uw.user_id = auth.uid()
            AND uw.user_role IN ('admin', 'editor')
        )
    );

-- Politique pour permettre la modification (UPDATE) aux admins et editors
CREATE POLICY "Users can update website emails if admin or editor" ON website_email
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_website uw
            WHERE uw.website_id = website_email.website_id
            AND uw.user_id = auth.uid()
            AND uw.user_role IN ('admin', 'editor')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_website uw
            WHERE uw.website_id = website_email.website_id
            AND uw.user_id = auth.uid()
            AND uw.user_role IN ('admin', 'editor')
        )
    );

-- Politique pour permettre la suppression (DELETE) aux admins et editors
CREATE POLICY "Users can delete website emails if admin or editor" ON website_email
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_website uw
            WHERE uw.website_id = website_email.website_id
            AND uw.user_id = auth.uid()
            AND uw.user_role IN ('admin', 'editor')
        )
    );
