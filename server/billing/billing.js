const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authToken");
const { supabaseServerAdmin } = require("../supabase");
const stripe = require("../stripe/stripe");
const axios = require('axios');

// Helper function to safely convert Stripe timestamps
const convertStripeTimestamp = (timestamp) => {
    if (!timestamp) {
        return null;
    }

    // Accepter les timestamps fournis comme chaîne numérique ou comme nombre
    let tsNumber = null;
    if (typeof timestamp === 'number') {
        tsNumber = timestamp;
    } else if (typeof timestamp === 'string' && /^\d+$/.test(timestamp)) {
        tsNumber = parseInt(timestamp, 10);
    } else if (typeof timestamp === 'object' && timestamp !== null && typeof timestamp === 'object' && typeof timestamp.seconds === 'number') {
        // Certains SDK ou objets peuvent exposer { seconds: 12345 }
        tsNumber = timestamp.seconds;
    }

    if (!tsNumber || tsNumber <= 0) {
        return null;
    }

    try {
        const date = new Date(tsNumber * 1000);
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

// Supprimer un moyen de paiement
router.delete("/payment-methods/:websiteId/:paymentMethodId", authenticateToken, async (req, res) => {
    try {
        const { paymentMethodId, websiteId } = req.params;
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

        // Récupérer le moyen de paiement et vérifier qu'il appartient à l'utilisateur
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
        
        // Récupérer le customer Stripe depuis l'abonnement actif
        let stripeCustomerId = null;
        
        // D'abord, essayer de récupérer depuis l'abonnement actif
        const { data: subscriptions, error: subError } = await supabaseServerAdmin()
            .from("website_subscriptions")
            .select("stripe_subscription_id")
            .eq("website_id", websiteId)
            .eq("status", "active")
            .order('created_at', { ascending: false });

        if (!subError && subscriptions && subscriptions.length > 0) {
            const subscription = subscriptions[0];
            try {
                const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
                stripeCustomerId = stripeSubscription.customer;
            } catch (error) {
                console.error("Erreur récupération abonnement Stripe:", error);
            }
        }

        // Fallback: récupérer depuis stripe_customers
        if (!stripeCustomerId) {
            const { data: customerData, error: customerError } = await supabaseServerAdmin()
                .from("stripe_customers")
                .select("stripe_customer_id")
                .eq("user_id", userId)
                .maybeSingle();

            if (!customerError && customerData) {
                stripeCustomerId = customerData.stripe_customer_id;
            }
        }

        if (!stripeCustomerId || paymentMethod.customer !== stripeCustomerId) {
            return res.status(403).json({ 
                success: false, 
                message: "Accès refusé" 
            });
        }

        // Vérifier si c'est le moyen de paiement par défaut et s'il y a un abonnement actif
        const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId);
        const isDefaultPaymentMethod = stripeCustomer.invoice_settings?.default_payment_method === paymentMethodId;

        if (isDefaultPaymentMethod) {
            // Vérifier s'il y a un abonnement actif
            const { data: activeSubscriptions, error: subCheckError } = await supabaseServerAdmin()
                .from("website_subscriptions")
                .select("stripe_subscription_id")
                .eq("website_id", websiteId)
                .eq("status", "active");

            if (!subCheckError && activeSubscriptions && activeSubscriptions.length > 0) {
                // Il y a un abonnement actif, vérifier s'il y a d'autres moyens de paiement
                const paymentMethods = await stripe.paymentMethods.list({
                    customer: stripeCustomerId,
                    type: 'card'
                });

                if (paymentMethods.data.length <= 1) {
                    return res.status(400).json({ 
                        success: false, 
                        message: "Impossible de supprimer le seul moyen de paiement d'un abonnement actif" 
                    });
                }

                // S'il y a d'autres moyens de paiement, définir un autre comme par défaut avant de supprimer
                const otherPaymentMethods = paymentMethods.data.filter(pm => pm.id !== paymentMethodId);
                if (otherPaymentMethods.length > 0) {
                    const newDefaultPaymentMethod = otherPaymentMethods[0];
                    
                    // Définir le nouveau moyen de paiement par défaut
                    await stripe.customers.update(stripeCustomerId, {
                        invoice_settings: {
                            default_payment_method: newDefaultPaymentMethod.id
                        }
                    });

                    // Mettre à jour l'abonnement avec le nouveau moyen de paiement
                    const subscription = activeSubscriptions[0];
                    if (subscription.stripe_subscription_id) {
                        try {
                            await stripe.subscriptions.update(subscription.stripe_subscription_id, {
                                default_payment_method: newDefaultPaymentMethod.id
                            });
                        } catch (subscriptionError) {
                            console.error("Erreur lors de la mise à jour de l'abonnement:", subscriptionError);
                        }
                    }
                }
            }
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

                // Utiliser directement les informations de période de Stripe
                let currentPeriodStart = convertStripeTimestamp(stripeSubscription.current_period_start);
                let currentPeriodEnd = convertStripeTimestamp(stripeSubscription.current_period_end);

                // Si Stripe ne renvoie pas ces périodes (null), tenter d'en extraire
                // depuis la latest_invoice liée à l'abonnement ou en listant les factures.
                if ((!currentPeriodStart || !currentPeriodEnd) && stripeSubscription.latest_invoice) {
                    try {
                        const latestInvoice = await stripe.invoices.retrieve(stripeSubscription.latest_invoice);

                        if (latestInvoice && latestInvoice.lines && latestInvoice.lines.data && latestInvoice.lines.data.length > 0) {
                            const firstLine = latestInvoice.lines.data[0];
                            if (firstLine.period) {
                                currentPeriodStart = currentPeriodStart || convertStripeTimestamp(firstLine.period.start);
                                currentPeriodEnd = currentPeriodEnd || convertStripeTimestamp(firstLine.period.end);
                            }
                        }
                    } catch (invErr) {
                        console.warn('Impossible de récupérer la latest_invoice pour extraire la période:', invErr && invErr.message);
                    }
                }

                // Si toujours manquantes, essayer de lister les invoices pour l'abonnement
                if ((!currentPeriodStart || !currentPeriodEnd) && stripeSubscription.id) {
                    try {
                        const invoiceList = await stripe.invoices.list({ subscription: stripeSubscription.id, limit: 5 });

                        if (invoiceList && invoiceList.data && invoiceList.data.length > 0) {
                            // Prendre la facture la plus récente contenant une période
                            for (const inv of invoiceList.data) {
                                

                                if (inv.lines && inv.lines.data && inv.lines.data.length > 0) {
                                    const line = inv.lines.data[0];
                                    if (line.period) {
                                        currentPeriodStart = currentPeriodStart || convertStripeTimestamp(line.period.start);
                                        currentPeriodEnd = currentPeriodEnd || convertStripeTimestamp(line.period.end);
                                        if (currentPeriodStart && currentPeriodEnd) break;
                                    }
                                }
                            }
                        }
                    } catch (listErr) {
                        console.warn('Erreur lors de la récupération des factures pour extraire la période:', listErr && listErr.message);
                    }
                }



                // Utiliser le prix du plan comme montant récurrent attendu
                let nextInvoiceDate = null;
                let nextInvoiceAmount = null; // montant en cents basé sur le plan
                let lastInvoiceAmount = null; // montant en cents issu de la dernière facture si disponible

                const planPrice = subscription.subscription_plans?.price;
                if (typeof planPrice === 'number') {
                    nextInvoiceAmount = Math.round(planPrice * 100);
                }

                // Extraire le montant de la dernière facture si disponible
                if (stripeSubscription.latest_invoice) {
                    try {
                        const latestInvoice = await stripe.invoices.retrieve(stripeSubscription.latest_invoice);
                        if (latestInvoice) {
                            if (typeof latestInvoice.total === 'number' && latestInvoice.total > 0) {
                                lastInvoiceAmount = latestInvoice.total;
                            } else if (typeof latestInvoice.amount_due === 'number' && latestInvoice.amount_due > 0) {
                                lastInvoiceAmount = latestInvoice.amount_due;
                            } else if (typeof latestInvoice.amount_paid === 'number' && latestInvoice.amount_paid > 0) {
                                lastInvoiceAmount = latestInvoice.amount_paid;
                            }
                            // Si la facture contient une date de prochain paiement, l'utiliser
                            if (latestInvoice.next_payment_attempt) {
                                nextInvoiceDate = convertStripeTimestamp(latestInvoice.next_payment_attempt);
                            }
                        }
                    } catch (invErr) {
                        console.warn('Impossible de récupérer la latest_invoice pour extraire le montant:', invErr && invErr.message);
                    }
                }

                // Indiquer au client si le prix peut varier (prorata) :
                // true si last invoice exists and differs du prix du plan
                let price_may_vary = false;
                if (lastInvoiceAmount && nextInvoiceAmount && lastInvoiceAmount !== nextInvoiceAmount) {
                    price_may_vary = true;
                }

                billingInfo.subscription = {
                    id: subscription.id,
                    plan_name: subscription.subscription_plans?.name || 'free',
                    price: subscription.subscription_plans?.price,
                    billing_period: subscription.subscription_plans?.billing_period,
                    status: stripeSubscription.status,
                    current_period_start: currentPeriodStart,
                    current_period_end: currentPeriodEnd,
                    next_invoice_date: nextInvoiceDate || currentPeriodEnd,
                    next_invoice_amount: nextInvoiceAmount || null,
                    last_invoice_amount: lastInvoiceAmount || null,
                    price_may_vary: price_may_vary,
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
        

        let invoices = [];
        let stripeCustomerId = null;

        // Si on a un abonnement Stripe, récupérer le customer ID
        if (subscription && subscription.stripe_subscription_id) {
            try {
                const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
                stripeCustomerId = stripeSubscription.customer;
            } catch (error) {
                console.error("Erreur récupération abonnement Stripe pour factures:", error);
            }
        }

        
        if (stripeCustomerId) {
            try {
                // Récupérer les factures depuis Stripe
                const stripeInvoices = await stripe.invoices.list({
                    customer: stripeCustomerId,
                    limit: 50
                });
            
                
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
        }

        
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

        let paymentMethods = [];
        let stripeCustomerId = null;

        // D'abord, essayer de récupérer le customer ID depuis la table stripe_customers
        const { data: customerData, error: customerError } = await supabaseServerAdmin()
            .from("stripe_customers")
            .select("stripe_customer_id")
            .eq("user_id", userId)
            .maybeSingle();

        if (!customerError && customerData) {
            stripeCustomerId = customerData.stripe_customer_id;
        } else {
            // Fallback: récupérer via l'abonnement si pas de customer direct
            const { data: subscriptions, error: subError } = await supabaseServerAdmin()
                .from("website_subscriptions")
                .select("stripe_subscription_id")
                .eq("website_id", websiteId)
                .eq("status", "active")
                .order('created_at', { ascending: false });

            if (!subError && subscriptions && subscriptions.length > 0) {
                const subscription = subscriptions[0];
                try {
                    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
                    stripeCustomerId = stripeSubscription.customer;
                } catch (error) {
                    console.error("Erreur récupération abonnement Stripe:", error);
                }
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
                        exp_year: method.card.exp_year,
                        name: method.billing_details?.name || null
                    } : null,
                    billing_details: method.billing_details || null,
                    is_default: method.id === stripeCustomer.invoice_settings?.default_payment_method
                }));
            } catch (stripeError) {
                console.error("Erreur lors de la récupération des méthodes de paiement Stripe:", stripeError);
                // En cas d'erreur, on retourne une liste vide plutôt qu'une erreur
                paymentMethods = [];
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

// Middleware d'authentification flexible pour les téléchargements
const authenticateTokenFlexible = (req, res, next) => {
    let token = null;
    
    // Essayer d'abord les headers
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    }
    
    // Sinon, essayer les paramètres de requête
    if (!token && req.query.token) {
        token = req.query.token;
    }
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Token d\'authentification requis' 
        });
    }
    
    // Utiliser la même logique que authenticateToken
    const jwt = require('jsonwebtoken');
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ 
            success: false, 
            message: 'Token invalide' 
        });
    }
};

// Télécharger une facture PDF
router.get("/invoice-pdf/:websiteId/:invoiceId", authenticateTokenFlexible, async (req, res) => {
    try {
        const { invoiceId, websiteId } = req.params;
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

        // Récupérer la facture depuis Stripe
        const invoice = await stripe.invoices.retrieve(invoiceId);
        
        // Récupérer le customer Stripe depuis l'abonnement actif
        let stripeCustomerId = null;
        
        // D'abord, essayer de récupérer depuis l'abonnement actif
        const { data: subscriptions, error: subError } = await supabaseServerAdmin()
            .from("website_subscriptions")
            .select("stripe_subscription_id")
            .eq("website_id", websiteId)
            .eq("status", "active")
            .order('created_at', { ascending: false });

        if (!subError && subscriptions && subscriptions.length > 0) {
            const subscription = subscriptions[0];
            try {
                const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
                stripeCustomerId = stripeSubscription.customer;
            } catch (error) {
                console.error("Erreur récupération abonnement Stripe:", error);
            }
        }

        // Fallback: récupérer depuis stripe_customers
        if (!stripeCustomerId) {
            const { data: customerData, error: customerError } = await supabaseServerAdmin()
                .from("stripe_customers")
                .select("stripe_customer_id")
                .eq("user_id", userId)
                .maybeSingle();

            if (!customerError && customerData) {
                stripeCustomerId = customerData.stripe_customer_id;
            }
        }

        if (!stripeCustomerId || stripeCustomerId !== invoice.customer) {
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

// Créer un SetupIntent pour sauvegarder une méthode de paiement
router.post("/create-setup-intent", authenticateToken, async (req, res) => {
    try {
        const { websiteId } = req.body;
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

        let stripeCustomerId = null;

        // D'abord, essayer de récupérer le client Stripe depuis l'abonnement actif existant
        const { data: subscriptions, error: subError } = await supabaseServerAdmin()
            .from("website_subscriptions")
            .select("stripe_subscription_id")
            .eq("website_id", websiteId)
            .eq("status", "active")
            .order('created_at', { ascending: false });

        if (!subError && subscriptions && subscriptions.length > 0) {
            const subscription = subscriptions[0];
            try {
                const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
                stripeCustomerId = stripeSubscription.customer;
            } catch (error) {
                console.error("Erreur récupération abonnement Stripe:", error);
            }
        }

        // Fallback: récupérer depuis stripe_customers ou créer un nouveau
        if (!stripeCustomerId) {
            let { data: customer, error: customerError } = await supabaseServerAdmin()
                .from("stripe_customers")
                .select("stripe_customer_id")
                .eq("user_id", userId)
                .maybeSingle();
            
            if (!customer) {
                // Créer un nouveau client Stripe
                const { data: userData, error: userError } = await supabaseServerAdmin()
                    .from("users")
                    .select("email")
                    .eq("id", userId)
                    .maybeSingle();

                if (userError || !userData) {
                    return res.status(400).json({ 
                        success: false, 
                        message: "Utilisateur non trouvé" 
                    });
                }

                const stripeCustomer = await stripe.customers.create({
                    email: userData.email,
                    metadata: {
                        user_id: userId,
                        website_id: websiteId
                    }
                });

                stripeCustomerId = stripeCustomer.id;

                // Sauvegarder la relation dans la base de données
                await supabaseServerAdmin()
                    .from("stripe_customers")
                    .insert({
                        user_id: userId,
                        stripe_customer_id: stripeCustomerId,
                        created_at: new Date().toISOString()
                    });
                
            } else {
                stripeCustomerId = customer.stripe_customer_id;
            }
        }

        // Créer le SetupIntent
        const setupIntent = await stripe.setupIntents.create({
            customer: stripeCustomerId,
            payment_method_types: ['card'],
            usage: 'off_session', // Pour les paiements futurs
            metadata: {
                user_id: userId,
                website_id: websiteId
            }
        });

        res.json({ 
            success: true, 
            client_secret: setupIntent.client_secret 
        });

    } catch (error) {
        console.error("Erreur lors de la création du SetupIntent:", error);
        res.status(500).json({ 
            success: false, 
            message: "Erreur lors de la création du SetupIntent" 
        });
    }
});

// Confirmer l'ajout d'une méthode de paiement après succès du SetupIntent
router.post("/payment-method-added", authenticateToken, async (req, res) => {
    try {
        const { websiteId, setupIntentId, paymentMethodId, setAsDefault = true } = req.body;
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

        // Récupérer les détails de la méthode de paiement depuis Stripe
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
        
        // Récupérer le customer Stripe depuis l'abonnement actif
        let stripeCustomerId = null;
        
        // D'abord, essayer de récupérer depuis l'abonnement actif
        const { data: subscriptions, error: subError } = await supabaseServerAdmin()
            .from("website_subscriptions")
            .select("stripe_subscription_id")
            .eq("website_id", websiteId)
            .eq("status", "active")
            .order('created_at', { ascending: false });

        if (!subError && subscriptions && subscriptions.length > 0) {
            const subscription = subscriptions[0];
            try {
                const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
                stripeCustomerId = stripeSubscription.customer;
            } catch (error) {
                console.error("Erreur récupération abonnement Stripe:", error);
            }
        }

        // Fallback: récupérer depuis stripe_customers
        if (!stripeCustomerId) {
            const { data: customerData, error: customerError } = await supabaseServerAdmin()
                .from("stripe_customers")
                .select("stripe_customer_id")
                .eq("user_id", userId)
                .maybeSingle();

            if (!customerError && customerData) {
                stripeCustomerId = customerData.stripe_customer_id;
            }
        }

        if (stripeCustomerId && setAsDefault) {
            // Définir cette méthode de paiement comme par défaut pour le customer
            await stripe.customers.update(stripeCustomerId, {
                invoice_settings: {
                    default_payment_method: paymentMethodId
                }
            });

            // Récupérer l'abonnement actif pour ce site et le mettre à jour
            const { data: subscriptions, error: subError } = await supabaseServerAdmin()
                .from("website_subscriptions")
                .select("stripe_subscription_id")
                .eq("website_id", websiteId)
                .eq("status", "active")
                .order('created_at', { ascending: false });

            if (!subError && subscriptions && subscriptions.length > 0) {
                const subscription = subscriptions[0];
                
                if (subscription.stripe_subscription_id) {
                    try {
                        // Mettre à jour l'abonnement avec la nouvelle méthode de paiement
                        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
                            default_payment_method: paymentMethodId
                        });
                        
                    } catch (subscriptionError) {
                        console.error("Erreur lors de la mise à jour de l'abonnement:", subscriptionError);
                        // On continue même si la mise à jour de l'abonnement échoue
                    }
                }
            }
        }
        
        res.json({ 
            success: true, 
            message: setAsDefault ? "Méthode de paiement ajoutée et définie par défaut" : "Méthode de paiement ajoutée",
            paymentMethod: {
                id: paymentMethod.id,
                type: paymentMethod.type,
                card: paymentMethod.card ? {
                    brand: paymentMethod.card.brand,
                    last4: paymentMethod.card.last4,
                    exp_month: paymentMethod.card.exp_month,
                    exp_year: paymentMethod.card.exp_year
                } : null
            }
        });

    } catch (error) {
        console.error("Erreur lors de la confirmation d'ajout de méthode de paiement:", error);
        res.status(500).json({ 
            success: false, 
            message: "Erreur lors de la confirmation" 
        });
    }
});

// Récupérer la clé publique Stripe pour le client
router.get("/stripe-config", (req, res) => {
    res.json({
        success: true,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
});

module.exports = router;