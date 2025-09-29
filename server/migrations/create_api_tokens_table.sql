-- Migration pour créer la table api_tokens
-- Cette table stocke les tokens API générés pour chaque site web

CREATE TABLE api_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_name VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) NOT NULL, -- Partie du token pour identification
    permissions JSONB NOT NULL DEFAULT '["cms"]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Index pour les requêtes fréquentes
    CONSTRAINT unique_token_name_per_website UNIQUE (website_id, token_name)
);

-- Index pour améliorer les performances
CREATE INDEX idx_api_tokens_website_id ON api_tokens(website_id);
CREATE INDEX idx_api_tokens_created_by ON api_tokens(created_by);
CREATE INDEX idx_api_tokens_is_active ON api_tokens(is_active);

-- Politique de sécurité RLS (Row Level Security)
ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux utilisateurs de voir seulement les tokens des sites auxquels ils ont accès
CREATE POLICY api_tokens_select_policy ON api_tokens
    FOR SELECT
    USING (
        website_id IN (
            SELECT website_id 
            FROM user_websites 
            WHERE user_id = auth.uid()
        )
    );

-- Politique pour permettre aux utilisateurs d'insérer des tokens seulement pour les sites auxquels ils ont accès
CREATE POLICY api_tokens_insert_policy ON api_tokens
    FOR INSERT
    WITH CHECK (
        website_id IN (
            SELECT website_id 
            FROM user_websites 
            WHERE user_id = auth.uid()
        )
        AND created_by = auth.uid()
    );

-- Politique pour permettre aux utilisateurs de modifier/supprimer seulement leurs propres tokens
CREATE POLICY api_tokens_update_policy ON api_tokens
    FOR UPDATE
    USING (
        website_id IN (
            SELECT website_id 
            FROM user_websites 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY api_tokens_delete_policy ON api_tokens
    FOR DELETE
    USING (
        website_id IN (
            SELECT website_id 
            FROM user_websites 
            WHERE user_id = auth.uid()
        )
    );

-- Commentaires pour documenter la table
COMMENT ON TABLE api_tokens IS 'Tokens API générés pour chaque site web permettant l''accès externe aux fonctionnalités CMS';
COMMENT ON COLUMN api_tokens.token_name IS 'Nom descriptif du token choisi par l''utilisateur';
COMMENT ON COLUMN api_tokens.token_hash IS 'Première partie du token JWT pour identification (pas le token complet pour la sécurité)';
COMMENT ON COLUMN api_tokens.permissions IS 'Permissions accordées au token (ex: ["cms", "analytics"])';
COMMENT ON COLUMN api_tokens.last_used_at IS 'Dernière utilisation du token pour tracking';