-- Script de migration pour initialiser les emails par défaut
-- Ce script va créer des emails par défaut pour les sites web existants basés sur les emails des propriétaires

-- Insérer des emails par défaut pour chaque site web existant
-- On prend l'email de l'utilisateur admin du site web comme email principal par défaut
INSERT INTO website_email (website_id, email, is_primary, is_active)
SELECT DISTINCT 
    w.id as website_id,
    au.email,
    TRUE as is_primary,
    TRUE as is_active
FROM website w
JOIN user_website uw ON w.id = uw.website_id
JOIN auth.users au ON uw.user_id::text = au.id::text
WHERE uw.user_role = 'admin'
AND NOT EXISTS (
    SELECT 1 FROM website_email we 
    WHERE we.website_id = w.id
)
ON CONFLICT DO NOTHING;

-- Mettre à jour les messages de contact existants pour associer le website_id
-- Si un message n'a pas de website_id, on essaie de le déduire
UPDATE contact_website 
SET website_id = (
    SELECT uw.website_id 
    FROM user_website uw 
    WHERE uw.user_id = contact_website.user_id 
    AND uw.user_role = 'admin'
    LIMIT 1
)
WHERE website_id IS NULL
AND user_id IN (
    SELECT DISTINCT user_id 
    FROM user_website 
    WHERE user_role = 'admin'
);

-- Afficher un résumé des emails créés
SELECT 
    w.website_name,
    w.website_slug,
    we.email,
    we.is_primary,
    we.is_active,
    we.created_at
FROM website_email we
JOIN website w ON we.website_id = w.id
ORDER BY w.website_name, we.is_primary DESC, we.created_at ASC;
