const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authToken");
const { supabase } = require("../supabase");

// Récupérer le statut d'abonnement d'un site
router.get("/subscription-status/:websiteId", verifyToken, async (req, res) => {
    try {
        const { websiteId } = req.params;
        const userId = req.user.id;

        // Vérifier que l'utilisateur possède ce site
        const { data: websiteOwnership, error: ownershipError } = await supabase
            .from("user_websites")
            .select("*")
            .eq("website_id", websiteId)
            .eq("user_id", userId)
            .single();

        if (ownershipError || !websiteOwnership) {
            return res.status(403).json({ 
                success: false, 
                message: "Vous n'avez pas accès à ce site" 
            });
        }

        // Récupérer l'abonnement actif du site
        const { data: subscription, error: subscriptionError } = await supabase
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
            .single();

        if (subscriptionError && subscriptionError.code !== "PGRST116") {
            throw subscriptionError;
        }

        // Si pas d'abonnement actif, retourner le plan gratuit par défaut
        if (!subscription) {
            const { data: freePlan, error: freePlanError } = await supabase
                .from("subscription_plans")
                .select("*")
                .eq("name", "Gratuit")
                .single();

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
router.get("/plans", verifyToken, async (req, res) => {
    try {
        const { data: plans, error } = await supabase
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
router.post("/create-checkout-session", verifyToken, async (req, res) => {
    try {
        const { websiteId, planId } = req.body;
        const userId = req.user.id;

        // Vérifier que l'utilisateur possède ce site
        const { data: websiteOwnership, error: ownershipError } = await supabase
            .from("user_websites")
            .select("*")
            .eq("website_id", websiteId)
            .eq("user_id", userId)
            .single();

        if (ownershipError || !websiteOwnership) {
            return res.status(403).json({ 
                success: false, 
                message: "Vous n'avez pas accès à ce site" 
            });
        }

        // Récupérer les détails du plan
        const { data: plan, error: planError } = await supabase
            .from("subscription_plans")
            .select("*")
            .eq("id", planId)
            .single();

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

        // TODO: Implémenter Stripe Checkout ici
        // Pour l'instant, retourner un placeholder
        res.json({
            success: true,
            message: "Stripe Checkout sera implémenté prochainement",
            checkoutUrl: null
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
router.post("/create-portal-session", verifyToken, async (req, res) => {
    try {
        const { websiteId } = req.body;
        const userId = req.user.id;

        // Vérifier que l'utilisateur possède ce site
        const { data: websiteOwnership, error: ownershipError } = await supabase
            .from("user_websites")
            .select("*")
            .eq("website_id", websiteId)
            .eq("user_id", userId)
            .single();

        if (ownershipError || !websiteOwnership) {
            return res.status(403).json({ 
                success: false, 
                message: "Vous n'avez pas accès à ce site" 
            });
        }

        // Récupérer l'abonnement actif
        const { data: subscription, error: subscriptionError } = await supabase
            .from("website_subscriptions")
            .select("*")
            .eq("website_id", websiteId)
            .eq("status", "active")
            .single();

        if (subscriptionError || !subscription) {
            return res.status(404).json({ 
                success: false, 
                message: "Aucun abonnement actif trouvé" 
            });
        }

        // TODO: Implémenter Stripe Customer Portal ici
        // Pour l'instant, retourner un placeholder
        res.json({
            success: true,
            message: "Stripe Portal sera implémenté prochainement",
            portalUrl: null
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
    try {
        // TODO: Implémenter la gestion des webhooks Stripe
        // - subscription.created
        // - subscription.updated
        // - subscription.deleted
        // - invoice.paid
        // - invoice.payment_failed
        
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
router.post("/cancel-subscription", verifyToken, async (req, res) => {
    try {
        const { websiteId } = req.body;
        const userId = req.user.id;

        // Vérifier que l'utilisateur possède ce site
        const { data: websiteOwnership, error: ownershipError } = await supabase
            .from("user_websites")
            .select("*")
            .eq("website_id", websiteId)
            .eq("user_id", userId)
            .single();

        if (ownershipError || !websiteOwnership) {
            return res.status(403).json({ 
                success: false, 
                message: "Vous n'avez pas accès à ce site" 
            });
        }

        // Récupérer l'abonnement actif
        const { data: subscription, error: subscriptionError } = await supabase
            .from("website_subscriptions")
            .select("*")
            .eq("website_id", websiteId)
            .eq("status", "active")
            .single();

        if (subscriptionError || !subscription) {
            return res.status(404).json({ 
                success: false, 
                message: "Aucun abonnement actif trouvé" 
            });
        }

        // TODO: Annuler l'abonnement sur Stripe
        // Pour l'instant, juste mettre à jour le statut dans la base de données
        const { error: updateError } = await supabase
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

module.exports = router;
