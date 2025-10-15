// Configuration Stripe
// Créer un fichier .env et ajouter les clés Stripe

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const STRIPE_CONFIG = {
    // Clés API
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,

    // Configuration
    currency: 'eur',
    
    // URLs de redirection (à adapter selon votre domaine)
    successUrl: process.env.CLIENT_URL + '/dashboard/website/subscription/{CHECKOUT_SESSION_ID}/success',
    cancelUrl: process.env.CLIENT_URL + '/dashboard/website/subscription/{CHECKOUT_SESSION_ID}/cancel',
    
    // URL du portail client
    portalReturnUrl: process.env.CLIENT_URL + '/dashboard/website/subscription'
};

module.exports = {
    stripe,
    STRIPE_CONFIG
};
