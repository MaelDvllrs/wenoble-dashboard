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


        // Si pas d'abonnement actif, créer ou récupérer un abonnement au plan gratuit
        if (!subscription) {
            // Vérifier s'il existe déjà un abonnement gratuit (même inactif)
            const { data: existingFreeSubscription } = await supabaseServerAdmin()
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
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            // Si un abonnement existe déjà (même inactif), le retourner
            if (existingFreeSubscription) {
                return res.json({
                    success: true,
                    subscription: {
                        id: existingFreeSubscription.id,
                        plan_id: existingFreeSubscription.subscription_plans.id,
                        plan_name: existingFreeSubscription.subscription_plans.name,
                        price: existingFreeSubscription.subscription_plans.price,
                        billing_period: existingFreeSubscription.subscription_plans.billing_period,
                        features: normalizeFeatures(existingFreeSubscription.subscription_plans.features),
                        status: existingFreeSubscription.status,
                        is_free: true
                    }
                });
            }

            // Sinon, créer un nouvel abonnement gratuit (premier abonnement du site)
            const { data: freePlan, error: freePlanError } = await supabaseServerAdmin()
                .from("subscription_plans")
                .select("*")
                .eq("name", "free")
                .maybeSingle();

            if (freePlanError) {
                throw freePlanError;
            }

            // Créer l'abonnement gratuit dans la base de données
            const { data: newFreeSubscription, error: insertError } = await supabaseServerAdmin()
                .from("website_subscriptions")
                .insert({
                    website_id: websiteId,
                    plan_id: freePlan.id,
                    status: 'active',
                    stripe_subscription_id: null,
                    stripe_customer_id: null,
                    current_period_start: null,
                    current_period_end: null,
                    cancel_at_period_end: false,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (insertError) {
                console.error("Erreur création abonnement gratuit:", insertError);
                throw insertError;
            }

            return res.json({
                success: true,
                subscription: {
                    id: newFreeSubscription.id,
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

        // Vérifier que l'utilisateur possède ce site et récupérer les infos du site
        const { data: websiteOwnership, error: ownershipError } = await supabaseServerAdmin()
            .from("user_websites")
            .select(`
                *,
                websites (
                    id,
                    website_name,
                    stripe_customer_id
                )
            `)
            .eq("website_id", websiteId)
            .eq("user_id", userId)
            .maybeSingle();

        if (ownershipError || !websiteOwnership) {
            return res.status(403).json({ 
                success: false, 
                message: "Vous n'avez pas accès à ce site" 
            });
        }

        const website = websiteOwnership.websites;

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

        // Récupérer ou créer le client Stripe UNIQUE pour ce site
        let stripeCustomerId = website.stripe_customer_id;
        let existingSubscription = null;

        // Vérifier s'il y a déjà un abonnement actif pour ce site
        const { data: activeSubscriptions, error: subError } = await supabaseServerAdmin()
            .from("website_subscriptions")
            .select("stripe_subscription_id, id")
            .eq("website_id", websiteId)
            .eq("status", "active")
            .order('created_at', { ascending: false });

        if (!subError && activeSubscriptions && activeSubscriptions.length > 0) {
            existingSubscription = activeSubscriptions[0];
        }

        // Si pas de client Stripe pour ce site, en créer un UNIQUE
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: userProfile?.email,
                name: `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim(),
                metadata: {
                    userId: userId,
                    websiteId: websiteId,
                    websiteName: website.website_name
                }
            });

            stripeCustomerId = customer.id;

            // Sauvegarder l'ID client Stripe dans la table websites
            await supabaseServerAdmin()
                .from("websites")
                .update({ stripe_customer_id: stripeCustomerId })
                .eq("id", websiteId);
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
            success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard/website/subscription/?success=true&session_id={CHECKOUT_SESSION_ID}&subscription_updated=true`,
            cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard/website/subscription/?canceled=true`,
            metadata: sessionMetadata,
            allow_promotion_codes: true
            // En mode subscription, Stripe enregistre automatiquement la méthode de paiement
            // Le webhook handleCheckoutCompleted se charge de la définir comme par défaut
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
            // D'abord vérifier par stripe_subscription_id pour éviter les doublons
            const { data: existingByStripeId } = await supabaseServerAdmin()
                .from("website_subscriptions")
                .select("*")
                .eq("stripe_subscription_id", subscription.id)
                .maybeSingle();

            // Ensuite vérifier s'il y a un abonnement actif pour ce site
            const { data: existingByWebsite } = await supabaseServerAdmin()
                .from("website_subscriptions")
                .select("*")
                .eq("website_id", session.metadata.websiteId)
                .eq("status", "active")
                .maybeSingle();

            const existingSubscription = existingByStripeId || existingByWebsite;

            
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

// Changer le plan d'un abonnement existant
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

        // Si c'est un plan payant, vérifier que Stripe est configuré
        if (newPlan.price > 0 && !isStripeConfigured()) {
            return res.status(503).json({
                success: false,
                message: "Service de paiement temporairement indisponible.",
                error_code: "STRIPE_NOT_CONFIGURED"
            });
        }


        // Récupérer l'abonnement actif existant
        const { data: activeSubscriptions, error: subError } = await supabaseServerAdmin()
            .from("website_subscriptions")
            .select("id, stripe_subscription_id, status")
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

        // Annuler l'ancien abonnement Stripe si existant
        let newStripeSub = null;
        if (currentSubscription.stripe_subscription_id) {
            // Annuler l'ancien abonnement Stripe immédiatement
            try {
                await stripe.subscriptions.cancel(currentSubscription.stripe_subscription_id);
            } catch (err) {
                console.error("Erreur lors de l'annulation de l'ancien abonnement Stripe:", err);
            }
        }

        // Marquer l'ancien abonnement comme canceled dans la BDD
        await supabaseServerAdmin()
            .from("website_subscriptions")
            .update({ status: 'canceled', updated_at: new Date().toISOString() })
            .eq("id", currentSubscription.id);

        // Créer ou réactiver le nouvel abonnement dans la BDD
        let newDbSub = null;
        if (newPlan.name === 'free' || newPlan.price === 0) {
            // Plan gratuit : vérifier s'il existe déjà un abonnement gratuit (même canceled)
            const { data: existingFreeSubscriptions } = await supabaseServerAdmin()
                .from("website_subscriptions")
                .select("id, plan_id, subscription_plans!inner(name, price)")
                .eq("website_id", websiteId)
                .order('created_at', { ascending: false });

            // Chercher un abonnement gratuit existant (canceled ou non)
            const existingFreeSub = existingFreeSubscriptions?.find(sub => 
                sub.subscription_plans.name === 'free' || sub.subscription_plans.price === 0
            );

            if (existingFreeSub) {
                // Réactiver l'abonnement gratuit existant
                const { data: updated, error: updateError } = await supabaseServerAdmin()
                    .from("website_subscriptions")
                    .update({
                        status: 'active',
                        updated_at: new Date().toISOString(),
                        stripe_subscription_id: null,
                        stripe_customer_id: null,
                        current_period_start: null,
                        current_period_end: null,
                        cancel_at_period_end: false
                    })
                    .eq("id", existingFreeSub.id)
                    .select()
                    .single();
                
                if (updateError) {
                    return res.status(500).json({ success: false, message: "Erreur lors de la réactivation de l'abonnement gratuit" });
                }
                newDbSub = updated;
            } else {
                // Créer un nouvel abonnement gratuit seulement s'il n'en existe aucun
                const { data: inserted, error: insertError } = await supabaseServerAdmin()
                    .from("website_subscriptions")
                    .insert({
                        website_id: websiteId,
                        plan_id: planId,
                        status: 'active',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        stripe_subscription_id: null,
                        stripe_customer_id: null,
                        current_period_start: null,
                        current_period_end: null,
                        cancel_at_period_end: false
                    })
                    .select()
                    .single();
                
                if (insertError) {
                    return res.status(500).json({ success: false, message: "Erreur lors de la création de l'abonnement gratuit" });
                }
                newDbSub = inserted;
            }
        } else {
            // Plan payant : mettre à jour l'abonnement existant ou en créer un nouveau
            // Récupérer le client Stripe du site
            const { data: website } = await supabaseServerAdmin()
                .from("websites")
                .select("stripe_customer_id, website_name")
                .eq("id", websiteId)
                .maybeSingle();

            let stripeCustomerId = website?.stripe_customer_id;

            // Si pas de client Stripe pour ce site, en créer un
            if (!stripeCustomerId) {
                const { data: userProfile } = await supabaseServerAdmin()
                    .from("users")
                    .select("email, first_name, last_name")
                    .eq("id", userId)
                    .maybeSingle();

                const customer = await stripe.customers.create({
                    email: userProfile?.email,
                    name: `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim(),
                    metadata: { 
                        userId, 
                        websiteId,
                        websiteName: website?.website_name 
                    }
                });
                stripeCustomerId = customer.id;

                // Sauvegarder dans la table websites
                await supabaseServerAdmin()
                    .from("websites")
                    .update({ stripe_customer_id: stripeCustomerId })
                    .eq("id", websiteId);
            }

            // Récupérer le client Stripe pour obtenir la méthode de paiement par défaut
            const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId);
            
            // Vérifier s'il existe déjà un abonnement Stripe actif (non-gratuit) pour ce client
            let existingStripeSubscriptions = null;
            try {
                const subscriptionsList = await stripe.subscriptions.list({
                    customer: stripeCustomerId,
                    status: 'active',
                    limit: 10
                });
                existingStripeSubscriptions = subscriptionsList.data;
            } catch (error) {
                console.error("Erreur lors de la récupération des abonnements Stripe:", error);
            }

            let stripeSub = null;

            // Si un abonnement Stripe actif existe, le mettre à jour
            if (existingStripeSubscriptions && existingStripeSubscriptions.length > 0) {
                const existingStripeSub = existingStripeSubscriptions[0];
                
                // Mettre à jour l'abonnement existant avec le nouveau prix
                stripeSub = await stripe.subscriptions.update(existingStripeSub.id, {
                    items: [{
                        id: existingStripeSub.items.data[0].id,
                        price: newPlan.stripe_price_id || process.env.STRIPE_PREMIUM_PRICE_ID
                    }],
                    proration_behavior: 'create_prorations',
                    metadata: { userId, websiteId, planId }
                });

                // Mettre à jour l'enregistrement existant dans la BDD
                const { data: existingDbSub } = await supabaseServerAdmin()
                    .from("website_subscriptions")
                    .select("id")
                    .eq("stripe_subscription_id", existingStripeSub.id)
                    .maybeSingle();

                if (existingDbSub) {
                    const { data: updated, error: updateError } = await supabaseServerAdmin()
                        .from("website_subscriptions")
                        .update({
                            plan_id: planId,
                            status: 'active',
                            updated_at: new Date().toISOString(),
                            current_period_start: convertStripeTimestamp(stripeSub.current_period_start),
                            current_period_end: convertStripeTimestamp(stripeSub.current_period_end),
                            cancel_at_period_end: false
                        })
                        .eq("id", existingDbSub.id)
                        .select()
                        .single();
                    
                    if (updateError) {
                        return res.status(500).json({ success: false, message: "Erreur lors de la mise à jour de l'abonnement" });
                    }
                    newDbSub = updated;
                } else {
                    // Cas rare : l'abonnement existe dans Stripe mais pas en BDD
                    const { data: inserted, error: insertError } = await supabaseServerAdmin()
                        .from("website_subscriptions")
                        .insert({
                            website_id: websiteId,
                            plan_id: planId,
                            status: 'active',
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            stripe_subscription_id: stripeSub.id,
                            stripe_customer_id: stripeCustomerId,
                            current_period_start: convertStripeTimestamp(stripeSub.current_period_start),
                            current_period_end: convertStripeTimestamp(stripeSub.current_period_end),
                            cancel_at_period_end: false
                        })
                        .select()
                        .single();
                    
                    if (insertError) {
                        return res.status(500).json({ success: false, message: "Erreur lors de la création de l'abonnement" });
                    }
                    newDbSub = inserted;
                }
            } else {
                // Aucun abonnement Stripe actif, en créer un nouveau
                // Vérifier si le client a une méthode de paiement par défaut
                const subscriptionParams = {
                    customer: stripeCustomerId,
                    items: [{ price: newPlan.stripe_price_id || process.env.STRIPE_PREMIUM_PRICE_ID }],
                    proration_behavior: 'create_prorations',
                    metadata: { userId, websiteId, planId }
                };

                // Si le client a une méthode de paiement par défaut, l'utiliser
                if (stripeCustomer.invoice_settings?.default_payment_method) {
                    subscriptionParams.default_payment_method = stripeCustomer.invoice_settings.default_payment_method;
                } else if (stripeCustomer.default_source) {
                    subscriptionParams.default_source = stripeCustomer.default_source;
                }

                stripeSub = await stripe.subscriptions.create(subscriptionParams);

                // Enregistrer dans la BDD
                const { data: inserted, error: insertError } = await supabaseServerAdmin()
                    .from("website_subscriptions")
                    .insert({
                        website_id: websiteId,
                        plan_id: planId,
                        status: 'active',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        stripe_subscription_id: stripeSub.id,
                        stripe_customer_id: stripeCustomerId,
                        current_period_start: convertStripeTimestamp(stripeSub.current_period_start),
                        current_period_end: convertStripeTimestamp(stripeSub.current_period_end),
                        cancel_at_period_end: false
                    })
                    .select()
                    .single();
                
                if (insertError) {
                    return res.status(500).json({ success: false, message: "Erreur lors de la création de l'abonnement Stripe" });
                }
                newDbSub = inserted;
            }
        }

        res.json({
            success: true,
            message: `Plan changé avec succès vers ${newPlan.name}`,
            subscription: newDbSub
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

            case 'customer.created':
                // Événement informationnel - pas d'action nécessaire
                console.log('Nouveau client Stripe créé:', event.data.object.id);
                break;

            case 'customer.subscription.created':
                await handleSubscriptionUpdate(event.data.object);
                break;
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
        
        // Définir la méthode de paiement par défaut sur le client
        if (subscription.default_payment_method && session.customer) {
            try {
                await stripe.customers.update(session.customer, {
                    invoice_settings: {
                        default_payment_method: subscription.default_payment_method
                    }
                });
            } catch (error) {
                console.error("Erreur lors de la définition de la méthode de paiement par défaut:", error);
            }
        }
        
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
        
        // Vérifier si l'abonnement existe déjà en BDD (éviter les doublons)
        const { data: existingDbSub } = await supabaseServerAdmin()
            .from("website_subscriptions")
            .select("id")
            .eq("stripe_subscription_id", subscription.id)
            .maybeSingle();

        if (existingDbSub) {
            // L'abonnement existe déjà, le mettre à jour
            await supabaseServerAdmin()
                .from("website_subscriptions")
                .update({
                    status: 'active',
                    current_period_start: convertStripeTimestamp(subscription.current_period_start),
                    current_period_end: convertStripeTimestamp(subscription.current_period_end),
                    updated_at: new Date().toISOString()
                })
                .eq("id", existingDbSub.id);
        } else {
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
    
    // Récupérer l'abonnement qui va être annulé
    const { data: currentSub } = await supabaseServerAdmin()
        .from("website_subscriptions")
        .select("website_id")
        .eq("stripe_subscription_id", subscription.id)
        .maybeSingle();

    if (!currentSub) {
        console.error("Abonnement non trouvé pour stripe_subscription_id:", subscription.id);
        return;
    }

    const websiteId = currentSub.website_id;

    // Marquer l'abonnement comme annulé
    await supabaseServerAdmin()
        .from("website_subscriptions")
        .update({
            status: 'canceled',
            updated_at: new Date().toISOString()
        })
        .eq("stripe_subscription_id", subscription.id);

    // Chercher un abonnement gratuit existant pour ce site
    const { data: existingFreeSubscriptions } = await supabaseServerAdmin()
        .from("website_subscriptions")
        .select("id, plan_id, subscription_plans!inner(name, price)")
        .eq("website_id", websiteId)
        .order('created_at', { ascending: false });

    const existingFreeSub = existingFreeSubscriptions?.find(sub => 
        sub.subscription_plans.name === 'free' || sub.subscription_plans.price === 0
    );

    if (existingFreeSub) {
        // Réactiver l'abonnement gratuit existant
        await supabaseServerAdmin()
            .from("website_subscriptions")
            .update({
                status: 'active',
                updated_at: new Date().toISOString(),
                stripe_subscription_id: null,
                stripe_customer_id: null,
                current_period_start: null,
                current_period_end: null,
                cancel_at_period_end: false
            })
            .eq("id", existingFreeSub.id);
    } else {
        // Créer un nouvel abonnement gratuit seulement s'il n'en existe aucun
        const { data: freePlan } = await supabaseServerAdmin()
            .from("subscription_plans")
            .select("id")
            .eq("name", "free")
            .maybeSingle();

        if (freePlan) {
            await supabaseServerAdmin()
                .from("website_subscriptions")
                .insert({
                    website_id: websiteId,
                    plan_id: freePlan.id,
                    status: 'active',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    stripe_subscription_id: null,
                    stripe_customer_id: null,
                    current_period_start: null,
                    current_period_end: null,
                    cancel_at_period_end: false
                });
        }
    }
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
