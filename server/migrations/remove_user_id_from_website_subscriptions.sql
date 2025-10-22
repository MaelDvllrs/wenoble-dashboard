-- Supprimer la colonne user_id de website_subscriptions
-- L'abonnement est par site, pas par utilisateur
-- Les permissions d'accès sont gérées via user_websites

-- Supprimer les index liés à user_id
DROP INDEX IF EXISTS idx_website_subscriptions_user_id;
DROP INDEX IF EXISTS idx_website_subscriptions_user_website;

-- Supprimer la colonne user_id
ALTER TABLE website_subscriptions 
DROP COLUMN IF EXISTS user_id;

-- Note: La logique d'accès aux abonnements se fait maintenant ainsi:
-- 1. Vérifier que l'utilisateur a accès au site via user_websites
-- 2. Récupérer l'abonnement du site via website_subscriptions.website_id
-- 3. Tous les utilisateurs autorisés sur le site peuvent voir l'abonnement du site