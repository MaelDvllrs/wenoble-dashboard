const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authToken");
const { supabaseServerAdmin } = require("../supabase");
const stripe = require("../stripe/stripe");
const { all } = require("../api/api");

// Fonction utilitaire pour vérifier si Stripe est configuré
function isStripeConfigured() {
    return process.env.STRIPE_SECRET_KEY && 
           process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder_key' && 
           !process.env.STRIPE_SECRET_KEY.includes('placeholder');
}

// Fonction utilitaire pour convertir un timestamp Stripe en date ISO
function convertStripeTimestamp(timestamp) {
    if (!timestamp || timestamp === null || timestamp === undefined) {
        return new Date().toISOString();
    }
    try {
        return new Date(timestamp * 1000).toISOString();
    } catch (error) {
        console.error('Erreur de conversion timestamp:', timestamp, error);
        return new Date().toISOString();
    }
}

// Normalize features: convert object map to ordered array of feature entries
function normalizeFeatures(features) {
    // If already an array, return as-is
    if (!features) return [];
    if (Array.isArray(features)) return features;

    // If it's an object (key -> bool), convert to array in preferred order
    if (typeof features === 'object') {
        const ORDER = [
            'custom_domain',
            'collections',
            'pages',
            'portfolio',
            'contact',
            'newsletter',
            'webflow_preview_only',
            'analytics',  
        ];

        const LABELS = {
            analytics: 'Analytics',
            collections: 'CMS (Collections)',
            contact: 'Formulaire de contact',
            custom_domain: 'Domaine personnalisé',
            newsletter: 'Newsletter',
            pages: 'Pages personnalisées',
            portfolio: 'Portfolio',
            webflow_preview_only: 'Preview Webflow uniquement'
        };

        const HIGHLIGHT = new Set(['custom_domain', 'analytics', 'collections']);

        const result = [];
        // First include keys in the preferred ORDER if present
        for (const key of ORDER) {
            if (Object.prototype.hasOwnProperty.call(features, key)) {
                // support different shapes for feature values (boolean, number, string)
                const raw = features[key];
                let included = !!raw;
                let value = null;

                // Special handling for collections: number => limit, true => unlimited, string 'unlimited' accepted too
                if (key === 'collections') {
                    if (typeof raw === 'number' && raw > 0) {
                        included = true;
                        value = String(raw); // e.g. "15"
                    } else if (raw === true) {
                        // boolean true means unlimited per new semantics
                        included = true;
                        value = 'illimités';
                    } else if (typeof raw === 'string' && raw.toLowerCase() === 'unlimited') {
                        included = true;
                        value = 'illimités';
                    } else {
                        included = false;
                        value = null;
                    }
                }

                result.push({
                    key,
                    name: LABELS[key] || key,
                    included,
                    highlight: HIGHLIGHT.has(key),
                    value
                });
            }
        }

        // Then include any other keys that were not in ORDER, preserving insertion order
        for (const key of Object.keys(features)) {
            if (!ORDER.includes(key)) {
                const raw = features[key];
                let included = !!raw;
                let value = null;

                if (key === 'collections') {
                    if (typeof raw === 'number' && raw > 0) {
                        included = true;
                        value = String(raw);
                    } else if (raw === true) {
                        included = true;
                        value = 'illimités';
                    } else if (typeof raw === 'string' && raw.toLowerCase() === 'unlimited') {
                        included = true;
                        value = 'illimités';
                    } else {
                        included = false;
                        value = null;
                    }
                }

                result.push({
                    key,
                    name: LABELS[key] || key,
                    included,
                    highlight: HIGHLIGHT.has(key),
                    value
                });
            }
        }

        // Ensure included features appear first while preserving relative order
        const ordered = [
            ...result.filter(r => r.included),
            ...result.filter(r => !r.included)
        ];

        return ordered;
    }

    // Unknown format, return empty
    return [];
}

// Récupérer le statut d'abonnement d'un site
router.get("/subscription-status/:websiteId", authenticateToken, async (req, res) => {
    try {
        const { websiteId } = req.params;
        const userId = req.user.idUser;
        
        // Vérifier que l'utilisateur possède ce site
        const { data: websiteOwnership, error: ownershipError } = await supabaseServerAdmin()
            .from("user_websites")
            .select("*")
            .eq("website_id", websiteId)
            .eq("user_id", userId)
            .maybeSingle();




            if (ownershipError || !websiteOwnership) {
            return res.status(403).json({ 
                success: false, 
                message: "Vous n'avez pas accès à ce site" 
            });
        }

        // Récupérer l'abonnement actif du site (l'abonnement est lié au site, pas à l'utilisateur)
        const { data: subscription, error: subscriptionError } = await supabaseServerAdmin()
            .from("website_subscriptions")
            .select(`
                *,
                subscription_plans (
                    id,
                    name,
                    price,
                    billing_period,
                    features
                )
            `)
            .eq("website_id", websiteId)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (subscriptionError && subscriptionError.code !== "PGRST116") {
            throw subscriptionError;
        }


        // Si pas d'abonnement actif, retourner le plan gratuit par défaut
        if (!subscription) {
            const { data: freePlan, error: freePlanError } = await supabaseServerAdmin()
                .from("subscription_plans")
                .select("*")
                .eq("name", "free")
                .maybeSingle();

            if (freePlanError) {
                throw freePlanError;
            }

            return res.json({
                success: true,
                subscription: {
                    plan_id: freePlan.id,
                    plan_name: freePlan.name,
                    price: freePlan.price,
                    billing_period: freePlan.billing_period,
                    features: normalizeFeatures(freePlan.features),
                    status: "active",
                    is_free: true
                }
            });
        }

        // Retourner l'abonnement actif
        res.json({
            success: true,
            subscription: {
                id: subscription.id,
                plan_id: subscription.subscription_plans.id,
                plan_name: subscription.subscription_plans.name,
                price: subscription.subscription_plans.price,
                billing_period: subscription.subscription_plans.billing_period,
                features: normalizeFeatures(subscription.subscription_plans.features),
                status: subscription.status,
                current_period_start: subscription.current_period_start,
                current_period_end: subscription.current_period_end,
                stripe_subscription_id: subscription.stripe_subscription_id,
                is_free: false
            }
        });


    } catch (error) {
        console.error("Erreur lors de la récupération du statut d'abonnement:", error);
        res.status(500).json({ 
            success: false, 
            message: "Erreur serveur" 
        });
    }
});

// Récupérer tous les plans disponibles
router.get("/plans", authenticateToken, async (req, res) => {
    try {
        const { data: plans, error } = await supabaseServerAdmin()
            .from("subscription_plans")
            .select("*")
            .order("price", { ascending: true });

        if (error) {
            throw error;
        }


        // Normalize features for each plan before sending
        const normalizedPlans = (plans || []).map(p => ({
            ...p,
            features: normalizeFeatures(p.features)
        }));

        res.json({
            success: true,
            plans: normalizedPlans
        });

    } catch (error) {
        console.error("Erreur lors de la récupération des plans:", error);
        res.status(500).json({ 
            success: false, 
            message: "Erreur serveur" 
        });
    }
});

// Créer une session Stripe Checkout (pour s'abonner)
router.post("/create-checkout-session", authenticateToken, async (req, res) => {
    try {
        const { websiteId, planId } = req.body;
        const userId = req.user.idUser;

        // Vérifier que l'utilisateur possède ce site
        const { data: websiteOwnership, error: ownershipError } = await supabaseServerAdmin()
            .from("user_websites")
            .select("*")
            .eq("website_id", websiteId)
            .eq("user_id", userId)
            .maybeSingle();

        if (ownershipError || !websiteOwnership) {
            return res.status(403).json({ 
                success: false, 
                message: "Vous n'avez pas accès à ce site" 
            });
        }

        // Récupérer les détails du plan
        const { data: plan, error: planError } = await supabaseServerAdmin()
            .from("subscription_plans")
            .select("*")
            .eq("id", planId)
            .maybeSingle();

        if (planError || !plan) {
            return res.status(404).json({ 
                success: false, 
                message: "Plan introuvable" 
            });
        }

        // Vérifier que ce n'est pas le plan gratuit
        if (plan.price === 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Le plan gratuit ne nécessite pas de paiement" 
            });
        }

        // Vérifier si Stripe est configuré
        if (!isStripeConfigured()) {
            return res.status(503).json({
                success: false,
                message: "Service de paiement temporairement indisponible. Stripe n'est pas configuré.",
                error_code: "STRIPE_NOT_CONFIGURED"
            });
        }

        // Récupérer les informations utilisateur pour Stripe
        const { data: userProfile } = await supabaseServerAdmin()
            .from("users")
            .select("email, first_name, last_name")
            .eq("id", userId)
            .maybeSingle();

        // Récupérer ou créer le client Stripe (en priorité depuis l'abonnement actif)
        let stripeCustomerId = null;
        let existingSubscription = null;

        // D'abord, vérifier s'il y a déjà un abonnement actif pour ce site
        const { data: activeSubscriptions, error: subError } = await supabaseServerAdmin()
            .from("website_subscriptions")
            .select("stripe_subscription_id, id")
            .eq("website_id", websiteId)
            .eq("status", "active")
            .order('created_at', { ascending: false });

        if (!subError && activeSubscriptions && activeSubscriptions.length > 0) {
            // Il y a un abonnement actif - mais il peut s'agir du plan gratuit (pas de stripe_subscription_id)
            existingSubscription = activeSubscriptions[0];
            if (existingSubscription.stripe_subscription_id) {
                try {
                    const stripeSubscription = await stripe.subscriptions.retrieve(existingSubscription.stripe_subscription_id);
                    stripeCustomerId = stripeSubscription.customer;
                } catch (error) {
                    console.error("Erreur récupération abonnement Stripe existant:", error);
                }
            }
        }

        // Si pas de client depuis un abonnement existant, chercher dans stripe_customers
        if (!stripeCustomerId) {
            const { data: existingCustomer } = await supabaseServerAdmin()
                .from("stripe_customers")
                .select("stripe_customer_id")
                .eq("user_id", userId)
                .maybeSingle();

            if (existingCustomer) {
                stripeCustomerId = existingCustomer.stripe_customer_id;
            }
        }

        // En dernier recours, créer un nouveau client
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: userProfile?.email,
                name: `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim(),
                metadata: {
                    userId: userId,
                    websiteId: websiteId
                }
            });

            stripeCustomerId = customer.id;

            // Sauvegarder l'ID client Stripe
            await supabaseServerAdmin()
                .from("stripe_customers")
                .insert({
                    user_id: userId,
                    stripe_customer_id: stripeCustomerId
                });
        }

        // Préparer les métadonnées pour la session
        const sessionMetadata = {
            userId: userId,
            websiteId: websiteId,
            planId: planId
        };

        // Si il y a un abonnement existant à remplacer, l'inclure dans les métadonnées
        if (existingSubscription && existingSubscription.stripe_subscription_id) {
            sessionMetadata.replaceSubscriptionId = existingSubscription.stripe_subscription_id;
            sessionMetadata.replaceDbSubscriptionId = existingSubscription.id;
        }

        // Créer la session Stripe Checkout
        const session = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: plan.stripe_price_id || process.env.STRIPE_PREMIUM_PRICE_ID,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard/website/subscription/${websiteId}?success=true&session_id={CHECKOUT_SESSION_ID}&subscription_updated=true`,
            cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard/website/subscription/${websiteId}?canceled=true`,
            metadata: sessionMetadata,
            allow_promotion_codes: true
        });

        res.json({
            success: true,
            checkoutUrl: session.url,
            sessionId: session.id
        });

    } catch (error) {
        console.error("Erreur lors de la création de la session Checkout:", error);
        res.status(500).json({ 
            success: false, 
            message: "Erreur serveur" 
        });
    }
});

// Vérifier et finaliser un abonnement après paiement réussi
router.post("/verify-subscription", authenticateToken, async (req, res) => {
    try {
        const { sessionId, websiteId } = req.body;
        const userId = req.user.idUser;

        // Vérifier si Stripe est configuré
        if (!isStripeConfigured()) {
            return res.status(503).json({
                success: false,
                message: "Service de paiement temporairement indisponible.",
                error_code: "STRIPE_NOT_CONFIGURED"
            });
        }

        // Récupérer la session Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        
        if (session.payment_status === 'paid' && session.mode === 'subscription') {

            // Récupérer l'abonnement Stripe
            const subscription = await stripe.subscriptions.retrieve(session.subscription);


            // Vérifier si l'abonnement existe déjà dans la base de données
            // On vérifie à la fois par website_id (pour gérer le cas du plan gratuit)
            const { data: existingSubscription } = await supabaseServerAdmin()
                .from("website_subscriptions")
                .select("*")
                .eq("website_id", session.metadata.websiteId)
                .eq("status", "active")
                .maybeSingle();

            if (!existingSubscription) {
                // Créer l'abonnement dans la base de données (abonnement par site)
                const { data: newSubscription, error: insertError } = await supabaseServerAdmin()
                    .from("website_subscriptions")
                    .insert({
                        website_id: websiteId,
                        plan_id: session.metadata.planId,
                        stripe_subscription_id: subscription.id,
                        stripe_customer_id: session.customer,
                        status: 'active',
                        current_period_start: convertStripeTimestamp(subscription.current_period_start),
                        current_period_end: convertStripeTimestamp(subscription.current_period_end),
                        created_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (insertError) {
                    throw insertError;
                }
            } else {
                // Mettre à jour l'abonnement existant avec les infos du nouvel abonnement Stripe
                const { error: updateError } = await supabaseServerAdmin()
                    .from("website_subscriptions")
                    .update({
                        plan_id: session.metadata.planId,
                        stripe_subscription_id: subscription.id,
                        stripe_customer_id: session.customer,
                        status: 'active',
                        current_period_start: convertStripeTimestamp(subscription.current_period_start),
                        current_period_end: convertStripeTimestamp(subscription.current_period_end),
                        updated_at: new Date().toISOString(),
                        cancel_at_period_end: false
                    })
                    .eq("id", existingSubscription.id);
                if (updateError) {
                    throw updateError;
                }
            }

            res.json({
                success: true,
                message: "Abonnement vérifié et activé avec succès",
                subscription: {
                    id: subscription.id,
                    status: subscription.status,
                    current_period_end: convertStripeTimestamp(subscription.current_period_end)
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: "Paiement non confirmé ou session invalide"
            });
        }

    } catch (error) {
        console.error("Erreur lors de la vérification de l'abonnement:", error);
        res.status(500).json({ 
            success: false, 
            message: "Erreur serveur" 
        });
    }
});

// Changer le plan d'un abonnement existant (sans checkout)
router.post("/change-subscription-plan", authenticateToken, async (req, res) => {
    try {
        const { websiteId, planId } = req.body;
        const userId = req.user.idUser;

        // Vérifier que l'utilisateur possède ce site
        const { data: websiteOwnership, error: ownershipError } = await supabaseServerAdmin()
            .from("user_websites")
            .select("*")
            .eq("website_id", websiteId)
            .eq("user_id", userId)
            .maybeSingle();

        if (ownershipError || !websiteOwnership) {
            return res.status(403).json({ 
                success: false, 
                message: "Vous n'avez pas accès à ce site" 
            });
        }

        // Vérifier si Stripe est configuré
        if (!isStripeConfigured()) {
            return res.status(503).json({
                success: false,
                message: "Service de paiement temporairement indisponible.",
                error_code: "STRIPE_NOT_CONFIGURED"
            });
        }

        // Récupérer le nouveau plan
        const { data: newPlan, error: planError } = await supabaseServerAdmin()
            .from("subscription_plans")
            .select("*")
            .eq("id", planId)
            .maybeSingle();

        if (planError || !newPlan) {
            return res.status(404).json({ 
                success: false, 
                message: "Plan introuvable" 
            });
        }

        // Récupérer l'abonnement actif existant
        const { data: activeSubscriptions, error: subError } = await supabaseServerAdmin()
            .from("website_subscriptions")
            .select("stripe_subscription_id, id, subscription_plans(name)")
            .eq("website_id", websiteId)
            .eq("status", "active")
            .order('created_at', { ascending: false });

        if (subError || !activeSubscriptions || activeSubscriptions.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Aucun abonnement actif trouvé" 
            });
        }

        const currentSubscription = activeSubscriptions[0];
        
        // Vérifier que l'abonnement actuel n'est pas gratuit
        if (!currentSubscription.stripe_subscription_id) {
            return res.status(400).json({ 
                success: false, 
                message: "Impossible de changer depuis un plan gratuit. Utilisez le checkout normal." 
            });
        }

        // Récupérer l'abonnement Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(currentSubscription.stripe_subscription_id);

        // Modifier l'abonnement dans Stripe
        const updatedSubscription = await stripe.subscriptions.update(currentSubscription.stripe_subscription_id, {
            items: [{
                id: stripeSubscription.items.data[0].id,
                price: newPlan.stripe_price_id || process.env.STRIPE_PREMIUM_PRICE_ID,
            }],
            proration_behavior: 'create_prorations', // Calculer la proratisation
        });

        // Mettre à jour l'abonnement dans la base de données
        await supabaseServerAdmin()
            .from("website_subscriptions")
            .update({
                plan_id: planId,
                updated_at: new Date().toISOString()
            })
            .eq("id", currentSubscription.id);


        res.json({
            success: true,
            message: `Plan changé avec succès vers ${newPlan.name}`,
            subscription: {
                id: updatedSubscription.id,
                status: updatedSubscription.status,
                current_period_end: convertStripeTimestamp(updatedSubscription.current_period_end)
            }
        });

    } catch (error) {
        console.error("Erreur lors du changement de plan:", error);
        res.status(500).json({ 
            success: false, 
            message: "Erreur lors du changement de plan" 
        });
    }
});

// Créer un portail client Stripe (pour gérer l'abonnement)
router.post("/create-portal-session", authenticateToken, async (req, res) => {
    try {
        const { websiteId } = req.body;
        const userId = req.user.idUser;

        // Vérifier si Stripe est configuré
        if (!isStripeConfigured()) {
            return res.status(503).json({
                success: false,
                message: "Service de gestion des abonnements temporairement indisponible. Stripe n'est pas configuré.",
                error_code: "STRIPE_NOT_CONFIGURED"
            });
        }

        // Vérifier que l'utilisateur possède ce site
        const { data: websiteOwnership, error: ownershipError } = await supabaseServerAdmin()
            .from("user_websites")
            .select("*")
            .eq("website_id", websiteId)
            .eq("user_id", userId)
            .maybeSingle();

        if (ownershipError || !websiteOwnership) {
            return res.status(403).json({ 
                success: false, 
                message: "Vous n'avez pas accès à ce site" 
            });
        }

        // Récupérer l'abonnement actif
        const { data: subscription, error: subscriptionError } = await supabaseServerAdmin()
            .from("website_subscriptions")
            .select("*")
            .eq("website_id", websiteId)
            .eq("status", "active")
            .maybeSingle();

        if (subscriptionError || !subscription) {
            return res.status(404).json({ 
                success: false, 
                message: "Aucun abonnement actif trouvé" 
            });
        }

        // Récupérer l'ID client Stripe
        const { data: stripeCustomer } = await supabaseServerAdmin()
            .from("stripe_customers")
            .select("stripe_customer_id")
            .eq("user_id", userId)
            .maybeSingle();

        if (!stripeCustomer) {
            return res.status(404).json({ 
                success: false, 
                message: "Client Stripe introuvable" 
            });
        }

        // Créer une session portail client
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: stripeCustomer.stripe_customer_id,
            return_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard/website/${websiteId}/subscription`,
        });

        res.json({
            success: true,
            portalUrl: portalSession.url
        });

    } catch (error) {
        console.error("Erreur lors de la création de la session Portal:", error);
        res.status(500).json({ 
            success: false, 
            message: "Erreur serveur" 
        });
    }
});

// Webhook Stripe pour gérer les événements d'abonnement
async function stripeWebhookHandler(req, res) {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        // Vérifier le webhook Stripe à partir du body brut
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Erreur de vérification webhook:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Gérer les différents types d'événements
    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object);
                break;

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await handleSubscriptionUpdate(event.data.object);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;

            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(event.data.object);
                break;

            case 'invoice.payment_failed':
                await handlePaymentFailed(event.data.object);
                break;

            default:
                console.log(`Événement non géré: ${event.type}`);
        }

        res.json({ received: true });

    } catch (error) {
        console.error("Erreur webhook Stripe:", error);
        res.status(400).json({ 
            success: false, 
            message: "Erreur webhook" 
        });
    }
}

// Keep a router-level route for compatibility (but recommend mounting the raw handler before body parsers)
router.post("/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);

// Fonctions utilitaires pour gérer les webhooks Stripe
async function handleCheckoutCompleted(session) {
    
    if (session.mode === 'subscription') {
        // Récupérer l'abonnement Stripe
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        
        // Si il y a un ancien abonnement à remplacer, l'annuler d'abord
        if (session.metadata.replaceSubscriptionId && session.metadata.replaceDbSubscriptionId) {
            try {
                // Annuler l'ancien abonnement Stripe immédiatement
                await stripe.subscriptions.cancel(session.metadata.replaceSubscriptionId);
                
                // Marquer l'ancien abonnement comme annulé dans la BDD
                await supabaseServerAdmin()
                    .from("website_subscriptions")
                    .update({
                        status: 'canceled',
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", session.metadata.replaceDbSubscriptionId);
                    
            } catch (error) {
                console.error("Erreur lors de l'annulation de l'ancien abonnement:", error);
                // On continue même si l'annulation échoue
            }
        }
        
        // Créer le nouvel abonnement dans la base de données
        await supabaseServerAdmin()
            .from("website_subscriptions")
            .insert({
                website_id: session.metadata.websiteId,
                plan_id: session.metadata.planId,
                stripe_subscription_id: subscription.id,
                stripe_customer_id: session.customer,
                status: 'active',
                current_period_start: convertStripeTimestamp(subscription.current_period_start),
                current_period_end: convertStripeTimestamp(subscription.current_period_end),
                created_at: new Date().toISOString()
            });
            
    }
}

async function handleSubscriptionUpdate(subscription) {
    
    // Mettre à jour l'abonnement dans la base de données
    await supabaseServerAdmin()
        .from("website_subscriptions")
        .update({
            status: subscription.status,
            current_period_start: convertStripeTimestamp(subscription.current_period_start),
            current_period_end: convertStripeTimestamp(subscription.current_period_end),
            updated_at: new Date().toISOString()
        })
        .eq("stripe_subscription_id", subscription.id);
}

async function handleSubscriptionDeleted(subscription) {
    
    // Marquer l'abonnement comme annulé
    await supabaseServerAdmin()
        .from("website_subscriptions")
        .update({
            status: 'canceled',
            updated_at: new Date().toISOString()
        })
        .eq("stripe_subscription_id", subscription.id);
}

async function handlePaymentSucceeded(invoice) {
    
    // Optionnel : Enregistrer le paiement dans une table séparée
    // Mettre à jour le statut de l'abonnement s'il était en attente
    if (invoice.subscription) {
        await supabaseServerAdmin()
            .from("website_subscriptions")
            .update({
                status: 'active',
                updated_at: new Date().toISOString()
            })
            .eq("stripe_subscription_id", invoice.subscription);
    }
}

async function handlePaymentFailed(invoice) {
    
    // Marquer l'abonnement comme ayant un problème de paiement
    if (invoice.subscription) {
        await supabaseServerAdmin()
            .from("website_subscriptions")
            .update({
                status: 'past_due',
                updated_at: new Date().toISOString()
            })
            .eq("stripe_subscription_id", invoice.subscription);
    }
}

// Route pour annuler un abonnement et revenir au plan gratuit
router.post("/cancel-subscription", authenticateToken, async (req, res) => {
    try {
        const { websiteId } = req.body;
        const userId = req.user.idUser;


        // Vérifier que l'utilisateur a accès à ce site
        const { data: websiteAccess, error: accessError } = await supabaseServerAdmin()
            .from("user_websites")
            .select("*")
            .eq("website_id", websiteId)
            .eq("user_id", userId)
            .maybeSingle();

        if (accessError || !websiteAccess) {
            return res.status(403).json({ 
                success: false, 
                message: "Vous n'avez pas accès à ce site" 
            });
        }

        // Récupérer l'abonnement actif du site
        const { data: subscription, error: subscriptionError } = await supabaseServerAdmin()
            .from("website_subscriptions")
            .select("*")
            .eq("website_id", websiteId)
            .eq("status", "active")
            .maybeSingle();

        if (subscriptionError) {
            throw subscriptionError;
        }

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: "Aucun abonnement actif trouvé pour ce site"
            });
        }

        // Si c'est un abonnement Stripe, l'annuler à la fin de la période
        if (subscription.stripe_subscription_id) {
            try {
                // Annuler l'abonnement Stripe à la fin de la période (pas immédiatement)
                await stripe.subscriptions.update(subscription.stripe_subscription_id, {
                    cancel_at_period_end: true
                });
            } catch (stripeError) {
                console.error("Erreur lors de l'annulation Stripe:", stripeError);
                // Continuer même si Stripe échoue (peut-être déjà annulé)
            }
        }

        // Mettre à jour le statut en base de données
        const { error: updateError } = await supabaseServerAdmin()
            .from("website_subscriptions")
            .update({
                cancel_at_period_end: true,
                updated_at: new Date().toISOString()
            })
            .eq("id", subscription.id);

        if (updateError) {
            throw updateError;
        }


        // Récupérer la date de fin de période pour informer l'utilisateur
        const endDate = subscription.current_period_end 
            ? new Date(subscription.current_period_end).toLocaleDateString('fr-FR')
            : 'la fin de la période';

        res.json({
            success: true,
            message: `Abonnement annulé avec succès. Vous conservez l'accès aux fonctionnalités premium jusqu'au ${endDate}.`,
            cancel_at_period_end: true,
            period_end: subscription.current_period_end
        });

    } catch (error) {
        console.error("Erreur lors de l'annulation de l'abonnement:", error);
        res.status(500).json({ 
            success: false, 
            message: "Erreur lors de l'annulation de l'abonnement" 
        });
    }
});

module.exports = {
    router,
    stripeWebhookHandler
};
