-- Ajouter les nouveaux plans d'abonnement
-- Script de migration pour les plans Gratuit, Starter et CMS

-- D'abord, supprimer les anciens plans s'ils existent
DELETE FROM subscription_plans WHERE name IN ('premium', 'free');

-- Insérer le plan Gratuit
INSERT INTO subscription_plans (
    id,
    name, 
    description, 
    price, 
    billing_period, 
    stripe_price_id, 
    features, 
    is_active
) VALUES (
    gen_random_uuid(),
    'free',
    'Parfait pour commencer et tester la plateforme',
    0.00,
    'monthly',
    null, -- Pas de Stripe pour le plan gratuit
    '["Formulaire de contact", "Newsletter", "Preview Webflow uniquement"]',
    true
);

-- Insérer le plan Starter  
INSERT INTO subscription_plans (
    id,
    name, 
    description, 
    price, 
    billing_period, 
    stripe_price_id, 
    features, 
    is_active
) VALUES (
    gen_random_uuid(),
    'Idéal pour un site professionnel avec domaine personnalisé',
    4.99,
    'monthly',
    'price_starter_monthly', -- À remplacer par l'ID Stripe réel
    '["Domaine personnalisé", "SSL inclus", "Analytics"]',
    true
);

-- Insérer le plan CMS
INSERT INTO subscription_plans (
    id,
    name, 
    description, 
    price, 
    billing_period, 
    stripe_price_id, 
    features, 
    is_active
) VALUES (
    gen_random_uuid(),
    'cms',
    'Solution complète avec CMS, pages personnalisées et portfolio',
    9.99,
    'monthly',
    'price_cms_monthly', -- À remplacer par l'ID Stripe réel
    '["Toutes les fonctionnalités Starter", "CMS (Collections illimitées)", "Pages personnalisées", "Portfolio", "Support prioritaire"]',
    true
);