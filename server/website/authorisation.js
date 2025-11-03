
const express = require('express');
const cors = require('cors')

const { supabaseServer, supabaseServerAdmin } = require('../supabase');
const { authenticateToken } = require('../middleware/authToken');
const { checkUserWebsiteAccess } = require('./website');

require('dotenv').config();
const secretKey = process.env.SECRET_KEY; 

const router = express.Router();

router.use(cors())
router.use(express.json());

// Mapping des anciens noms de features vers les nouveaux
const mapFeatureName = (oldFeatureName) => {
  const mapping = {
    'auth_portfolio': 'portfolio',
    'auth_page': 'pages',
    'auth_blog': 'collections',
    'auth_newsletter': 'newsletter',
    'auth_contact': 'contact',
    'auth_analytics': 'analytics',
    'custom_domain': 'custom_domain'
  };
  return mapping[oldFeatureName] || oldFeatureName;
};

router.post('/getAuthorisation', authenticateToken, async (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);
    // admin client bypasses RLS and is safe for server-side lookups/creates here
    const supabaseAdmin = supabaseServerAdmin();

    const { type, websiteId } = req.body;
    const userId = req.user.idUser;


    if (!type) {
        return res.status(400).json({ success: false, message: 'Type d\'autorisation requis' });
    }

    if (!websiteId) {
        return res.status(400).json({ success: false, message: 'Website ID requis' });
    }

    try {
        // Vérifier l'accès de l'utilisateur au site web
        const { hasAccess, role } = await checkUserWebsiteAccess(supabase, userId, websiteId);
        
        if (!hasAccess) {
            return res.status(403).json({ 
                success: false, 
                message: 'Accès refusé au site web',
                authorisation: false
            });
        }


        // Do not auto-grant authorisations to admins here.
        // Admin users will be evaluated against the site's subscription features
        // so that their access follows the same plan-based restrictions as other roles.

        // Mapper l'ancien nom vers le nouveau
        const featureName = mapFeatureName(type);
        
    // authorization check invoked

        // récupérer le plan d'abonnement du site avec les features (use admin client to avoid RLS)
        let { data: subscription, error: subError } = await supabaseAdmin
            .from('website_subscriptions')
            .select(`
                *,
                subscription_plans (
                    id,
                    name,
                    features
                )
            `)
            .eq('website_id', websiteId)
            .eq('status', 'active')
            .maybeSingle();

            // subscription fetch completed

            if (subError && subError.code !== 'PGRST116') {
                console.error('Erreur lors de la récupération de l\'abonnement:', subError);
            }


        // Si aucun abonnement actif n'existe, créer un abonnement gratuit par défaut
        if (!subscription && !subError) {
            
            // Récupérer le plan gratuit
            const { data: freePlan } = await supabaseAdmin
                .from("subscription_plans")
                .select("*")
                .eq("name", "free")
                .maybeSingle();

            if (freePlan) {
                // Créer l'abonnement gratuit
                const { data: newSubscription, error: createError } = await supabaseAdmin
                    .from("website_subscriptions")
                    .insert({
                        website_id: websiteId,
                        plan_id: freePlan.id,
                        status: "active",
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .select(`
                        *,
                        subscription_plans (
                            id,
                            name,
                            features
                        )
                    `)
                    .maybeSingle();

                if (!createError) {
                    subscription = newSubscription;
                } else {
                    console.error("Erreur lors de la création de l'abonnement gratuit:", createError);
                }
            }
        }

        if (subError && subError.code !== 'PGRST116') {
            console.error('Erreur lors de la récupération de l\'abonnement:', subError);
        }


        // Déterminer le plan et les features (par défaut 'free' si pas d'abonnement actif)
        let planName = 'free';
        let features = {
            auth_portfolio: false,
            auth_page: false,
            auth_blog: false,
            auth_newsletter: true,
            auth_contact: true,
            auth_analytics: false,
            custom_domain: false,
            ssl: false,
            analytics: false
        };

        // Normalize the subscription -> plan payload. Some responses embed the related
        // subscription_plans as an object, some as an array, and sometimes not at all.
        // If it's missing but subscription.subscription_plan_id exists, try to fetch the plan.
        try {
            if (!subscription) {
                // no subscription found in initial query
            } else {
                let planObj = subscription.subscription_plans;

                if (Array.isArray(planObj)) {
                    // If the relation was returned as an array, take the first element (expected single)
                    planObj = planObj.length ? planObj[0] : null;
                }

                // If relation not present but a foreign key exists on subscription, fetch the plan
                if (!planObj && subscription.subscription_plan_id) {
                    const { data: fetchedPlan, error: fetchedError } = await supabaseAdmin
                        .from('subscription_plans')
                        .select('id, name, features')
                        .eq('id', subscription.subscription_plan_id)
                        .maybeSingle();

                    if (fetchedError) {
                        console.error('Erreur lors de la récupération du plan par id:', fetchedError);
                    } else if (fetchedPlan) {
                        planObj = fetchedPlan;
                    }
                }

                if (planObj) {
                    planName = planObj.name || planName;
                    features = planObj.features || features;
                }
            }
        } catch (normalizeErr) {
            console.error('Erreur lors de la normalisation de l\'abonnement/plan:', normalizeErr);
        }

        
        // Fonction utilitaire pour vérifier une feature quel que soit son format
        const checkFeatureAvailability = (featuresObj, key) => {
            if (!featuresObj) return false;

            // Si features est un array (forme normalisée côté API), chercher par key
            if (Array.isArray(featuresObj)) {
                const entry = featuresObj.find(f => f.key === key || (f.name && f.name.toLowerCase().includes(key)));
                if (!entry) return false;
                // Pour collections, accepter value (nombre) ou value === 'illimités' ou included true
                if (key === 'collections') {
                    if (entry.value && (typeof entry.value === 'string' || typeof entry.value === 'number')) return true;
                    return !!entry.included;
                }
                return !!entry.included;
            }

            // Si features est un objet map (format DB classique)
            const raw = featuresObj[key];
            if (key === 'collections') {
                if (typeof raw === 'number' && raw > 0) return true;
                if (raw === true) return true; // true => unlimited per new semantics
                if (typeof raw === 'string' && raw.toLowerCase() === 'unlimited') return true;
                return false;
            }

            return raw === true;
        };

        const hasFeature = checkFeatureAvailability(features, featureName);

        res.json({
            success: true,
            authorisation: hasFeature,
            role: role,
            plan: planName,
            feature: featureName
        });

    } catch (error) {
        console.error('Erreur lors de la vérification de l\'autorisation:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur lors de la vérification de l\'autorisation',
            authorisation: false
        });
    }
});


// Route dédiée pour vérifier la feature custom_domain à partir du websiteId
router.get('/custom-domain-authorisation/:websiteId', authenticateToken, async (req, res) => {
    const { websiteId } = req.params;
    const supabaseAdmin = supabaseServerAdmin();

    if (!websiteId) {
        return res.status(400).json({ success: false, message: 'websiteId requis' });
    }

    try {
        // Récupérer la souscription active du site et le plan associé
        const { data: subscription, error: subError } = await supabaseAdmin
            .from('website_subscriptions')
            .select('*, subscription_plans (id, name, features)')
            .eq('website_id', websiteId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (subError && subError.code !== 'PGRST116') {
            console.error('Erreur récupération souscription:', subError);
            return res.status(500).json({ success: false, message: 'Erreur récupération souscription' });
        }

        // Si aucune souscription active, utiliser le plan gratuit par défaut
        if (!subscription) {
            // Récupérer le plan gratuit
            const { data: freePlan } = await supabaseAdmin
                .from("subscription_plans")
                .select("*")
                .eq("name", "free")
                .maybeSingle();

            if (freePlan) {
                // Retourner les features du plan gratuit (sans custom_domain)
                return res.json({ success: true, authorisation: false });
            } else {
                // Si le plan gratuit n'existe pas en BDD, retourner false par défaut
                return res.json({ success: true, authorisation: false });
            }
        }

        // Récupérer les features du plan
        let features = {};
        let planObj = subscription.subscription_plans;
        if (Array.isArray(planObj)) planObj = planObj[0];
        if (planObj && planObj.features) {
            features = planObj.features;
        }

        // Vérifier la feature custom_domain
        let hasCustomDomain = false;
        if (Array.isArray(features)) {
            const entry = features.find(f => f.key === 'custom_domain' || (f.name && f.name.toLowerCase().includes('custom_domain')));
            hasCustomDomain = !!(entry && (entry.included === true || entry.value === true));
        } else if (typeof features === 'object' && features !== null) {
            hasCustomDomain = features.custom_domain === true;
        }

        return res.json({ success: true, authorisation: hasCustomDomain });
    } catch (error) {
        console.error('Erreur authorisation custom_domain:', error);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

module.exports = router;