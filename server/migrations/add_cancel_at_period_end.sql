-- Ajouter la colonne cancel_at_period_end à website_subscriptions
-- Cette colonne indique si l'abonnement doit être annulé à la fin de la période

ALTER TABLE website_subscriptions 
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

-- Optionnel : Supprimer l'ancienne colonne canceled_at si elle existe
-- (à décommenter si vous êtes sûr qu'elle n'est pas utilisée ailleurs)
-- ALTER TABLE website_subscriptions DROP COLUMN IF EXISTS canceled_at;

-- Créer un index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_website_subscriptions_cancel_at_period_end 
ON website_subscriptions(cancel_at_period_end) WHERE cancel_at_period_end = true;