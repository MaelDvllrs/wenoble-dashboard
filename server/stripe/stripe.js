require('dotenv').config();

// Vérifier si la clé Stripe est définie
if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder_key') {
    console.warn('⚠️ STRIPE_SECRET_KEY not configured. Stripe functionality will be disabled.');
    console.warn('Please set your Stripe secret key in the .env file to enable payments.');
    
    // Exporter un objet mock pour éviter les erreurs
    module.exports = {
        checkout: {
            sessions: {
                create: () => {
                    throw new Error('Stripe not configured. Please add your STRIPE_SECRET_KEY to .env file.');
                }
            }
        },
        billingPortal: {
            sessions: {
                create: () => {
                    throw new Error('Stripe not configured. Please add your STRIPE_SECRET_KEY to .env file.');
                }
            }
        },
        customers: {
            create: () => {
                throw new Error('Stripe not configured. Please add your STRIPE_SECRET_KEY to .env file.');
            }
        },
        webhooks: {
            constructEvent: () => {
                throw new Error('Stripe not configured. Please add your STRIPE_SECRET_KEY to .env file.');
            }
        }
    };
} else {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    module.exports = stripe;
}