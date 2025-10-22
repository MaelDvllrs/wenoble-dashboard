const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authToken");
const { supabaseServerAdmin } = require("../supabase");
const stripe = require("../stripe/stripe");

// Helper function to safely convert Stripe timestamps
const convertStripeTimestamp = (timestamp) => {
    if (!timestamp || typeof timestamp !== 'number' || timestamp <= 0) {
        return null;
    }
    try {
        const date = new Date(timestamp * 1000);
        if (isNaN(date.getTime())) {
            return null;
        }
        return date.toISOString();
    } catch (error) {
        console.error('Erreur conversion timestamp:', timestamp, error);
        return null;
    }
};

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

// Récupérer les informations de facturation d'un site
router.get("/subscription-info/:websiteId", authenticateToken, async (req, res) => {
    try {
        const { websiteId } = req.params;
        const userId = req.user.idUser;

        // Vérifier l'accès au site
        const { data: websiteAccess, error: accessError } = await supabaseServerAdmin()
            .from("user_websites")
            .select("*")
            .eq("website_id", websiteId)
            .eq("user_id", userId)
            .maybeSingle();

        if (accessError || !websiteAccess) {
            return res.status(403).json({ 
                success: false, 
                message: "Accès refusé à ce site" 
            });
        }

        // Récupérer les informations d'abonnement
        let { data: subscriptions, error: subError } = await supabaseServerAdmin()
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
            .order('created_at', { ascending: false }); // Le plus récent en premier

        // Prendre le premier abonnement (le plus récent)
        let subscription = subscriptions && subscriptions.length > 0 ? subscriptions[0] : null;

        
        // Si on a plusieurs abonnements, désactiver les anciens
        if (subscriptions && subscriptions.length > 1) {
            
            // Désactiver tous les abonnements sauf le premier (le plus récent)
            const oldSubscriptionIds = subscriptions.slice(1).map(sub => sub.id);
            if (oldSubscriptionIds.length > 0) {
                await supabaseServerAdmin()
                    .from("website_subscriptions")
                    .update({ status: "cancelled", updated_at: new Date().toISOString() })
                    .in("id", oldSubscriptionIds);
                    
            }
        }
        
        // Si aucun abonnement actif n'existe, créer un abonnement gratuit par défaut
        if (!subscription && !subError) {
            
            // Récupérer le plan gratuit
            const { data: freePlan, error: freePlanError } = await supabaseServerAdmin()
                .from("subscription_plans")
                .select("*")
                .eq("name", "free")
                .single();
                

            if (freePlan) {
                // Créer l'abonnement gratuit
                const { data: newSubscription, error: createError } = await supabaseServerAdmin()
                    .from("website_subscriptions")
                    .insert({
                        website_id: websiteId,
                        subscription_plan_id: freePlan.id,
                        status: "active",
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
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
                    .single();

                
                if (!createError) {
                    subscription = newSubscription;
                    console.log(`Abonnement gratuit créé avec succès pour le site ${websiteId}`);
                } else {
                    console.error("Erreur lors de la création de l'abonnement gratuit:", createError);
                }
            } else {
                console.error("Aucun plan gratuit trouvé dans la base de données");
            }
        }

        let billingInfo = {
            subscription: null,
            customer: null
        };



        if (subscription && subscription.stripe_subscription_id) {
            try {
                // Récupérer les détails de l'abonnement depuis Stripe
                const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
                
                
                // Récupérer les informations de période depuis la dernière facture
                let periodStart = convertStripeTimestamp(stripeSubscription.start_date);
                let periodEnd = null;
                
                if (stripeSubscription.latest_invoice) {
                    try {
                        const latestInvoice = await stripe.invoices.retrieve(stripeSubscription.latest_invoice);
                        periodStart = convertStripeTimestamp(latestInvoice.period_start);
                        periodEnd = convertStripeTimestamp(latestInvoice.period_end);

                    } catch (invoiceError) {
                        console.error('Erreur récupération facture:', invoiceError);
                    }
                }
                
                // Calculer la prochaine date de facturation si pas disponible
                let nextBillingDate = periodEnd;
                if (!nextBillingDate && periodStart && stripeSubscription.plan) {
                    const startDate = new Date(periodStart);
                    const interval = stripeSubscription.plan.interval; // 'month' ou 'year'
                    const intervalCount = stripeSubscription.plan.interval_count || 1;
                    
                    if (interval === 'month') {
                        startDate.setMonth(startDate.getMonth() + intervalCount);
                    } else if (interval === 'year') {
                        startDate.setFullYear(startDate.getFullYear() + intervalCount);
                    }
                    nextBillingDate = startDate.toISOString();
                }
                
                billingInfo.subscription = {
                    id: subscription.id,
                    plan_name: subscription.subscription_plans?.name || 'free',
                    price: subscription.subscription_plans?.price,
                    billing_period: subscription.subscription_plans?.billing_period,
                    status: stripeSubscription.status,
                    current_period_start: periodStart,
                    current_period_end: nextBillingDate,
                    cancel_at_period_end: stripeSubscription.cancel_at_period_end,
                    trial_end: convertStripeTimestamp(stripeSubscription.trial_end)
                };

                // Récupérer les détails du client
                if (stripeSubscription.customer) {
                    const customer = await stripe.customers.retrieve(stripeSubscription.customer);
                    billingInfo.customer = {
                        email: customer.email,
                        name: customer.name
                    };
                }
            } catch (stripeError) {
                console.error("Erreur Stripe:", stripeError);
                // Retourner les infos de base si Stripe échoue
                billingInfo.subscription = {
                    plan_name: subscription.subscription_plans?.name || 'free',
                    price: subscription.subscription_plans?.price,
                    billing_period: subscription.subscription_plans?.billing_period,
                    status: subscription.status
                };
            }
        } else if (subscription) {
            // Abonnement existant sans Stripe (probablement gratuit)
            billingInfo.subscription = {
                id: subscription.id,
                plan_name: subscription.subscription_plans?.name || 'free',
                price: subscription.subscription_plans?.price || 0,
                billing_period: subscription.subscription_plans?.billing_period,
                status: subscription.status || 'active'
            };
        } else {
            // Aucun abonnement trouvé - ne devrait pas arriver après nos corrections
            billingInfo.subscription = {
                plan_name: 'free',
                price: 0,
                billing_period: null,
                status: 'active'
            };
        }

        res.json({
            success: true,
            ...billingInfo
        });

    } catch (error) {
        console.error("Erreur lors de la récupération des infos de facturation:", error);
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

        console.log("Fetching invoices for website:", websiteId, "and user:", userId);

        // Vérifier l'accès au site
        const { data: websiteAccess, error: accessError } = await supabaseServerAdmin()
            .from("user_websites")
            .select("*")
            .eq("website_id", websiteId)
            .eq("user_id", userId)
            .maybeSingle();

        if (accessError || !websiteAccess) {
            console.error("Accès refusé au site pour factures:", { websiteId, userId });
            return res.status(403).json({ 
                success: false, 
                message: "Accès refusé à ce site" 
            });
        }

        // Récupérer l'abonnement (même logique que subscription-info)
        const { data: subscriptions, error: subError } = await supabaseServerAdmin()
            .from("website_subscriptions")
            .select("stripe_subscription_id")
            .eq("website_id", websiteId)
            .eq("status", "active")
            .order('created_at', { ascending: false });

        // Prendre le premier abonnement (le plus récent)
        const subscription = subscriptions && subscriptions.length > 0 ? subscriptions[0] : null;
        
        console.log("Subscription found for invoices:", !!subscription, subscriptions?.length || 0, "total");

        let invoices = [];
        let stripeCustomerId = null;

        // Si on a un abonnement Stripe, récupérer le customer ID
        if (subscription && subscription.stripe_subscription_id) {
            try {
                const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
                stripeCustomerId = stripeSubscription.customer;
                console.log("Customer ID for invoices:", stripeCustomerId);
            } catch (error) {
                console.error("Erreur récupération abonnement Stripe pour factures:", error);
            }
        }

        console.log("Checking if stripeCustomerId exists:", !!stripeCustomerId);
        
        if (stripeCustomerId) {
            console.log("About to call Stripe invoices API with customer:", stripeCustomerId);
            try {
                // Récupérer les factures depuis Stripe
                console.log("Calling stripe.invoices.list...");
                const stripeInvoices = await stripe.invoices.list({
                    customer: stripeCustomerId,
                    limit: 50
                });
                
                console.log("Stripe API call successful");
                console.log("Invoices found:", stripeInvoices.data.length);
                
                if (stripeInvoices.data.length > 0) {
                    console.log("First invoice sample:", {
                        id: stripeInvoices.data[0].id,
                        number: stripeInvoices.data[0].number,
                        status: stripeInvoices.data[0].status,
                        amount_paid: stripeInvoices.data[0].amount_paid,
                        created: stripeInvoices.data[0].created
                    });
                }
                
                invoices = stripeInvoices.data.map(invoice => ({
                    id: invoice.id,
                    number: invoice.number,
                    status: invoice.status,
                    amount_paid: invoice.amount_paid,
                    amount_due: invoice.amount_due,
                    currency: invoice.currency,
                    created: convertStripeTimestamp(invoice.created),
                    due_date: convertStripeTimestamp(invoice.due_date),
                    invoice_pdf: invoice.invoice_pdf,
                    hosted_invoice_url: invoice.hosted_invoice_url,
                    lines: {
                        data: invoice.lines.data.map(line => ({
                            description: line.description,
                            amount: line.amount,
                            quantity: line.quantity,
                            period: line.period ? {
                                start: convertStripeTimestamp(line.period.start),
                                end: convertStripeTimestamp(line.period.end)
                            } : null
                        }))
                    }
                }));
            } catch (stripeError) {
                console.error("Erreur lors de la récupération des factures Stripe:", {
                    message: stripeError.message,
                    type: stripeError.type,
                    code: stripeError.code,
                    statusCode: stripeError.statusCode,
                    customer: stripeCustomerId
                });
            }
        } else {
            console.log("No stripe customer ID found, skipping invoice retrieval");
        }

        console.log("Final invoices array:", invoices.length, "invoices");
        
        res.json({
            success: true,
            invoices
        });

    } catch (error) {
        console.error("Erreur lors de la récupération des factures:", error);
        res.status(500).json({ 
            success: false, 
            message: "Erreur serveur" 
        });
    }
});

// Récupérer les méthodes de paiement d'un site
router.get("/payment-methods/:websiteId", authenticateToken, async (req, res) => {
    try {
        const { websiteId } = req.params;
        const userId = req.user.idUser;

        // Vérifier l'accès au site
        const { data: websiteAccess, error: accessError } = await supabaseServerAdmin()
            .from("user_websites")
            .select("*")
            .eq("website_id", websiteId)
            .eq("user_id", userId)
            .maybeSingle();

        if (accessError || !websiteAccess) {
            return res.status(403).json({ 
                success: false, 
                message: "Accès refusé à ce site" 
            });
        }

        // Récupérer l'abonnement pour obtenir le customer Stripe
        const { data: subscriptions, error: subError } = await supabaseServerAdmin()
            .from("website_subscriptions")
            .select("stripe_subscription_id")
            .eq("website_id", websiteId)
            .eq("status", "active")
            .order('created_at', { ascending: false });

        if (subError || !subscriptions || subscriptions.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Aucun abonnement actif trouvé" 
            });
        }

        const subscription = subscriptions[0]; // Prendre le plus récent

        let paymentMethods = [];
        let stripeCustomerId = null;

        // Si on a un abonnement Stripe, récupérer le customer ID
        if (subscription && subscription.stripe_subscription_id) {
            try {
                const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
                stripeCustomerId = stripeSubscription.customer;
            } catch (error) {
                console.error("Erreur récupération abonnement Stripe:", error);
            }
        }

        if (stripeCustomerId) {
            try {
                // Récupérer les méthodes de paiement depuis Stripe
                const stripeMethods = await stripe.paymentMethods.list({
                    customer: stripeCustomerId,
                    type: 'card'
                });


                // Récupérer la méthode de paiement par défaut
                const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId);

                paymentMethods = stripeMethods.data.map(method => ({
                    id: method.id,
                    type: method.type,
                    card: method.card ? {
                        brand: method.card.brand,
                        last4: method.card.last4,
                        exp_month: method.card.exp_month,
                        exp_year: method.card.exp_year
                    } : null,
                    is_default: method.id === stripeCustomer.invoice_settings?.default_payment_method
                }));
            } catch (stripeError) {
                console.error("Erreur lors de la récupération des méthodes de paiement Stripe:", stripeError);
            }
        }

        res.json({
            success: true,
            paymentMethods
        });

    } catch (error) {
        console.error("Erreur lors de la récupération des méthodes de paiement:", error);
        res.status(500).json({ 
            success: false, 
            message: "Erreur serveur" 
        });
    }
});

// Télécharger une facture PDF
router.get("/invoice-pdf/:invoiceId", authenticateToken, async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const userId = req.user.idUser;

        // Récupérer la facture depuis Stripe
        const invoice = await stripe.invoices.retrieve(invoiceId);
        
        // Vérifier que l'utilisateur a accès à cette facture
        const { data: customer, error: customerError } = await supabaseServerAdmin()
            .from("stripe_customers")
            .select("stripe_customer_id")
            .eq("user_id", userId)
            .maybeSingle();

        if (!customer || customer.stripe_customer_id !== invoice.customer) {
            return res.status(403).json({ 
                success: false, 
                message: "Accès refusé à cette facture" 
            });
        }

        if (!invoice.invoice_pdf) {
            return res.status(404).json({ 
                success: false, 
                message: "PDF de facture non disponible" 
            });
        }

        // Rediriger vers l'URL du PDF Stripe
        res.redirect(invoice.invoice_pdf);

    } catch (error) {
        console.error("Erreur lors du téléchargement de la facture:", error);
        res.status(500).json({ 
            success: false, 
            message: "Erreur lors du téléchargement de la facture" 
        });
    }
});

module.exports = router;