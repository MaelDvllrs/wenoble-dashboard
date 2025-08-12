-- Migration pour ajouter website_id à la table contact_website
-- Cette colonne permettra de lier les messages aux sites web spécifiques

ALTER TABLE contact_website 
ADD COLUMN IF NOT EXISTS website_id UUID;

-- Ajouter la contrainte de clé étrangère
ALTER TABLE contact_website 
ADD CONSTRAINT fk_contact_website_website_id 
FOREIGN KEY (website_id) REFERENCES website(id) ON DELETE CASCADE;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_contact_website_website_id ON contact_website(website_id);

-- Optionnel : Migrer les données existantes
-- Cette partie devra être adaptée selon la logique métier existante
-- UPDATE contact_website SET website_id = (
--     SELECT w.id FROM website w 
--     JOIN user_website uw ON w.id = uw.website_id 
--     WHERE uw.user_id = contact_website.user_id 
--     LIMIT 1
-- ) WHERE website_id IS NULL;
