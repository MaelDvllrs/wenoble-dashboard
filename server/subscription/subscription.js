const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authToken");
const { supabaseServerAdmin } = require("../supabase");
const stripe = require("../stripe/stripe");

// Récupérer le statut d'abonnement d'un site
router.get("/subscription-status/:websiteId", authenticateToken, async (req, res) => {
    console.log("Récupération du statut d'abonnement demandé");
    try {
        const { websiteId } = req.params;
        const userId = req.user.idUser;
        
        console.log("Récupération du statut d'abonnement pour le site:", websiteId, "et l'utilisateur:", userId);
        // Vérifier que l'utilisateur possède ce site
        const { data: websiteOwnership, error: ownershipError } = await supabaseServerAdmin()
            .from("user_websites")
            .select("*")
            .eq("website_id", websiteId)
            .eq("user_id", userId)
            .maybeSingle();



            console.log("Propriétés du site récupérées:", websiteOwnership);

            if (ownershipError || !websiteOwnership) {
            return res.status(403).json({ 
                success: false, 
                message: "Vous n'avez pas accès à ce site" 
            });
        }

        // Récupérer l'abonnement actif du site
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

        console.log("Abonnement récupéré:", subscription);

        // Si pas d'abonnement actif, retourner le plan gratuit par défaut
        if (!subscription) {
            const { data: freePlan, error: freePlanError } = await supabaseServerAdmin()
                .from("subscription_plans")
                .select("*")
                .eq("name", "starter")
                .maybeSingle();

            if (freePlanError) {
                throw freePlanError;
            }

            console.log("Plan gratuit retourné:", freePlan);

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
            success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard/website/${websiteId}/subscription?success=true`,
            cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard/website/${websiteId}/subscription?canceled=true`,
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

// Créer un portail client Stripe (pour gérer l'abonnement)
router.post("/create-portal-session", authenticateToken, async (req, res) => {
    try {
        const { websiteId } = req.body;
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

// Annuler un abonnement
router.post("/cancel-subscription", authenticateToken, async (req, res) => {
    try {
        const { websiteId } = req.body;
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

        // TODO: Annuler l'abonnement sur Stripe
        // Pour l'instant, juste mettre à jour le statut dans la base de données
        const { error: updateError } = await supabaseServerAdmin()
            .from("website_subscriptions")
            .update({ 
                status: "canceled",
                canceled_at: new Date().toISOString()
            })
            .eq("id", subscription.id);

        if (updateError) {
            throw updateError;
        }

        res.json({
            success: true,
            message: "Abonnement annulé avec succès"
        });

    } catch (error) {
        console.error("Erreur lors de l'annulation de l'abonnement:", error);
        res.status(500).json({ 
            success: false, 
            message: "Erreur serveur" 
        });
    }
});

// Fonctions utilitaires pour gérer les webhooks Stripe
async function handleCheckoutCompleted(session) {
    console.log('Checkout session completed:', session.id);
    
    if (session.mode === 'subscription') {
        // Récupérer l'abonnement Stripe
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        
        // Créer l'abonnement dans la base de données
        await supabaseServerAdmin()
            .from("website_subscriptions")
            .insert({
                website_id: session.metadata.websiteId,
                user_id: session.metadata.userId,
                plan_id: session.metadata.planId,
                stripe_subscription_id: subscription.id,
                stripe_customer_id: session.customer,
                status: 'active',
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                created_at: new Date().toISOString()
            });
    }
}

async function handleSubscriptionUpdate(subscription) {
    console.log('Subscription updated:', subscription.id);
    
    // Mettre à jour l'abonnement dans la base de données
    await supabaseServerAdmin()
        .from("website_subscriptions")
        .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq("stripe_subscription_id", subscription.id);
}

async function handleSubscriptionDeleted(subscription) {
    console.log('Subscription deleted:', subscription.id);
    
    // Marquer l'abonnement comme annulé
    await supabaseServerAdmin()
        .from("website_subscriptions")
        .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq("stripe_subscription_id", subscription.id);
}

async function handlePaymentSucceeded(invoice) {
    console.log('Payment succeeded:', invoice.id);
    
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

module.exports = router;
