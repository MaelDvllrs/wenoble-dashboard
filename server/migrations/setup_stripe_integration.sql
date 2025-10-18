-- Créer la table stripe_customers pour stocker la relation entre utilisateurs et clients Stripe
CREATE TABLE IF NOT EXISTS stripe_customers (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    stripe_customer_id VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Ajouter des colonnes manquantes à la table subscription_plans si nécessaire
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255);

-- Ajouter des colonnes manquantes à la table website_subscriptions si nécessaire
ALTER TABLE website_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP,
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Ajouter des indices pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_customer_id ON stripe_customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_website_subscriptions_stripe_subscription_id ON website_subscriptions(stripe_subscription_id);

-- Ajouter des politiques RLS (Row Level Security) pour stripe_customers
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stripe customer data" ON stripe_customers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stripe customer data" ON stripe_customers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stripe customer data" ON stripe_customers
    FOR UPDATE USING (auth.uid() = user_id);