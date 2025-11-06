-- Ajouter le champ folder à la table websites s'il n'existe pas déjà
-- Ce champ contient le nom du projet Cloudflare Pages (Worker name)

DO $$ 
BEGIN
    -- Vérifier si la colonne existe déjà
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'websites' 
        AND column_name = 'folder'
    ) THEN
        -- Ajouter la colonne folder
        ALTER TABLE websites 
        ADD COLUMN folder TEXT;
        
        RAISE NOTICE 'Colonne folder ajoutée à la table websites';
    ELSE
        RAISE NOTICE 'La colonne folder existe déjà dans la table websites';
    END IF;
    
    -- Ajouter un index pour améliorer les performances
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'websites'
        AND indexname = 'idx_websites_folder'
    ) THEN
        CREATE INDEX idx_websites_folder ON websites(folder);
        RAISE NOTICE 'Index idx_websites_folder créé';
    ELSE
        RAISE NOTICE 'Index idx_websites_folder existe déjà';
    END IF;
END $$;

-- Commentaire sur la colonne
COMMENT ON COLUMN websites.folder IS 'Nom du projet Cloudflare Pages (Worker name) pour la configuration des domaines personnalisés';
