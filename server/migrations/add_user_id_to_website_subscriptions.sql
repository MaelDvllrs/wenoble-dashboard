-- Ajouter la colonne user_id à la table website_subscriptions
-- Cette colonne est nécessaire pour associer les abonnements aux utilisateurs

ALTER TABLE website_subscriptions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Ajouter un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_website_subscriptions_user_id 
ON website_subscriptions(user_id);

-- Ajouter un index composé pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_website_subscriptions_user_website 
ON website_subscriptions(user_id, website_id);

-- Optionnel : Mettre à jour les enregistrements existants si nécessaire
-- (À adapter selon les données existantes)
-- UPDATE website_subscriptions 
-- SET user_id = (SELECT user_id FROM user_workspaces WHERE website_id = website_subscriptions.website_id LIMIT 1)
-- WHERE user_id IS NULL;