const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authToken");
const { supabaseServerAdmin } = require("../supabase");
const stripe = require("../stripe/stripe");

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
                    features: freePlan.features,
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
                features: subscription.subscription_plans.features,
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

        res.json({
            success: true,
            plans
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

        // Créer ou récupérer le client Stripe
        let stripeCustomerId;
        const { data: existingCustomer } = await supabaseServerAdmin()
            .from("stripe_customers")
            .select("stripe_customer_id")
            .eq("user_id", userId)
            .maybeSingle();

        if (existingCustomer) {
            stripeCustomerId = existingCustomer.stripe_customer_id;
        } else {
            // Créer un nouveau client Stripe
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
            success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard/website/subscription/${websiteId}?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard/website/subscription/${websiteId}?canceled=true`,
            metadata: {
                userId: userId,
                websiteId: websiteId,
                planId: planId
            }
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
            const { data: existingSubscription } = await supabaseServerAdmin()
                .from("website_subscriptions")
                .select("*")
                .eq("stripe_subscription_id", subscription.id)
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
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        // Vérifier le webhook Stripe
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
});

// Fonctions utilitaires pour gérer les webhooks Stripe
async function handleCheckoutCompleted(session) {
    
    if (session.mode === 'subscription') {
        // Récupérer l'abonnement Stripe
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        
        // Créer l'abonnement dans la base de données (abonnement par site)
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
    console.log('Payment failed:', invoice.id);
    
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
                console.log("Abonnement Stripe programmé pour annulation à la fin de la période:", subscription.stripe_subscription_id);
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

module.exports = router;
