-- Ajouter stripe_customer_id à la table websites
-- Chaque site aura son propre client Stripe unique

ALTER TABLE websites 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_websites_stripe_customer_id ON websites(stripe_customer_id);

-- Note: Les clients Stripe existants dans stripe_customers peuvent être migrés manuellement si nécessaire
-- La nouvelle logique créera automatiquement un client Stripe par site lors du premier checkout
