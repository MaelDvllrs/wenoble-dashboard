const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authToken");
const { supabaseServerAdmin } = require("../supabase");
const stripe = require("../stripe/stripe");

// Créer un PaymentIntent pour les paiements personnalisés
router.post("/create-payment-intent", authenticateToken, async (req, res) => {
    try {
        const { planId, websiteId } = req.body;
        const userId = req.user.idUser;

        // Vérifier la propriété du site
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

        // Récupérer ou créer le client Stripe
        let stripeCustomerId;
        const { data: existingCustomer } = await supabaseServerAdmin()
            .from("stripe_customers")
            .select("stripe_customer_id")
            .eq("user_id", userId)
            .maybeSingle();

        if (existingCustomer) {
            stripeCustomerId = existingCustomer.stripe_customer_id;
        } else {
            // Récupérer les infos utilisateur
            const { data: userProfile } = await supabaseServerAdmin()
                .from("users")
                .select("email, first_name, last_name")
                .eq("id", userId)
                .maybeSingle();

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

        // Créer le PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(plan.price * 100), // Convertir en centimes
            currency: 'eur',
            customer: stripeCustomerId,
            setup_future_usage: 'off_session', // Pour sauvegarder le moyen de paiement
            metadata: {
                userId: userId,
                websiteId: websiteId,
                planId: planId
            }
        });

        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret
        });

    } catch (error) {
        console.error("Erreur lors de la création du PaymentIntent:", error);
        res.status(500).json({ 
            success: false, 
            message: "Erreur serveur" 
        });
    }
});

// Récupérer les factures d'un site
router.get("/invoices/:websiteId", authenticateToken, async (req, res) => {
    try {
        const { websiteId } = req.params;
        const userId = req.user.idUser;

        // Vérifier la propriété du site
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

        // Récupérer le client Stripe
        const { data: stripeCustomer } = await supabaseServerAdmin()
            .from("stripe_customers")
            .select("stripe_customer_id")
            .eq("user_id", userId)
            .maybeSingle();

        if (!stripeCustomer) {
            return res.json({
                success: true,
                invoices: []
            });
        }

        // Récupérer les factures depuis Stripe
        const invoices = await stripe.invoices.list({
            customer: stripeCustomer.stripe_customer_id,
            limit: 100
        });

        res.json({
            success: true,
            invoices: invoices.data
        });

    } catch (error) {
        console.error("Erreur lors de la récupération des factures:", error);
        res.status(500).json({ 
            success: false, 
            message: "Erreur serveur" 
        });
    }
});

// Télécharger une facture
router.get("/invoice/:invoiceId/download", authenticateToken, async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const userId = req.user.idUser;

        // Récupérer la facture depuis Stripe
        const invoice = await stripe.invoices.retrieve(invoiceId);

        // Vérifier que l'utilisateur est propriétaire de cette facture
        const { data: stripeCustomer } = await supabaseServerAdmin()
            .from("stripe_customers")
            .select("stripe_customer_id")
            .eq("user_id", userId)
            .maybeSingle();

        if (!stripeCustomer || invoice.customer !== stripeCustomer.stripe_customer_id) {
            return res.status(403).json({ 
                success: false, 
                message: "Accès refusé" 
            });
        }

        if (!invoice.invoice_pdf) {
            return res.status(404).json({ 
                success: false, 
                message: "PDF de facture non disponible" 
            });
        }

        // Rediriger vers le PDF de la facture
        res.redirect(invoice.invoice_pdf);

    } catch (error) {
        console.error("Erreur lors du téléchargement de facture:", error);
        res.status(500).json({ 
            success: false, 
            message: "Erreur serveur" 
        });
    }
});

// Récupérer les moyens de paiement
router.get("/payment-methods", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.idUser;

        // Récupérer le client Stripe
        const { data: stripeCustomer } = await supabaseServerAdmin()
            .from("stripe_customers")
            .select("stripe_customer_id")
            .eq("user_id", userId)
            .maybeSingle();

        if (!stripeCustomer) {
            return res.json({
                success: true,
                paymentMethods: []
            });
        }

        // Récupérer les moyens de paiement depuis Stripe
        const paymentMethods = await stripe.paymentMethods.list({
            customer: stripeCustomer.stripe_customer_id,
            type: 'card'
        });

        res.json({
            success: true,
            paymentMethods: paymentMethods.data
        });

    } catch (error) {
        console.error("Erreur lors de la récupération des moyens de paiement:", error);
        res.status(500).json({ 
            success: false, 
            message: "Erreur serveur" 
        });
    }
});

// Ajouter un moyen de paiement
router.post("/payment-methods", authenticateToken, async (req, res) => {
    try {
        const { paymentMethodId } = req.body;
        const userId = req.user.idUser;

        // Récupérer le client Stripe
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

        // Attacher le moyen de paiement au client
        await stripe.paymentMethods.attach(paymentMethodId, {
            customer: stripeCustomer.stripe_customer_id
        });

        res.json({
            success: true,
            message: "Moyen de paiement ajouté avec succès"
        });

    } catch (error) {
        console.error("Erreur lors de l'ajout du moyen de paiement:", error);
        res.status(500).json({ 
            success: false, 
            message: "Erreur serveur" 
        });
    }
});

// Supprimer un moyen de paiement
router.delete("/payment-methods/:paymentMethodId", authenticateToken, async (req, res) => {
    try {
        const { paymentMethodId } = req.params;
        const userId = req.user.idUser;

        // Récupérer le moyen de paiement et vérifier qu'il appartient à l'utilisateur
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
        
        const { data: stripeCustomer } = await supabaseServerAdmin()
            .from("stripe_customers")
            .select("stripe_customer_id")
            .eq("user_id", userId)
            .maybeSingle();

        if (!stripeCustomer || paymentMethod.customer !== stripeCustomer.stripe_customer_id) {
            return res.status(403).json({ 
                success: false, 
                message: "Accès refusé" 
            });
        }

        // Détacher le moyen de paiement
        await stripe.paymentMethods.detach(paymentMethodId);

        res.json({
            success: true,
            message: "Moyen de paiement supprimé avec succès"
        });

    } catch (error) {
        console.error("Erreur lors de la suppression du moyen de paiement:", error);
        res.status(500).json({ 
            success: false, 
            message: "Erreur serveur" 
        });
    }
});

module.exports = router;