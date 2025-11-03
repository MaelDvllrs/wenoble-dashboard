-- Configuration Stripe corrigée - Abonnements par site
-- Version corrigée sans user_id dans website_subscriptions

-- Créer la table stripe_customers pour stocker la relation entre utilisateurs et clients Stripe
CREATE TABLE IF NOT EXISTS stripe_customers (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    stripe_customer_id VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Créer la table subscription_plans si elle n'existe pas
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    billing_period VARCHAR(20) NOT NULL DEFAULT 'monthly',
    stripe_price_id VARCHAR(255),
    features JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Créer la table website_subscriptions si elle n'existe pas (SANS user_id)
CREATE TABLE IF NOT EXISTS website_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL, -- Référence au site (pas d'utilisateur spécifique)
    plan_id UUID REFERENCES subscription_plans(id),
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Ajouter les colonnes manquantes si la table existait déjà
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255);

ALTER TABLE website_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Ajouter des indices pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_customer_id ON stripe_customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_website_subscriptions_website_id ON website_subscriptions(website_id);
CREATE INDEX IF NOT EXISTS idx_website_subscriptions_stripe_subscription_id ON website_subscriptions(stripe_subscription_id);

-- Ajouter des politiques RLS (Row Level Security) pour stripe_customers
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stripe customer data" ON stripe_customers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stripe customer data" ON stripe_customers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stripe customer data" ON stripe_customers
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS pour website_subscriptions (basé sur l'accès au site via user_websites)
ALTER TABLE website_subscriptions ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir les abonnements des sites auxquels ils ont accès
CREATE POLICY "Users can view subscriptions of their websites" ON website_subscriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_websites uw 
            WHERE uw.website_id = website_subscriptions.website_id 
            AND uw.user_id = auth.uid()
        )
    );