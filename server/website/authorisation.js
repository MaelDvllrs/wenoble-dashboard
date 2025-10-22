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
            console.log(`Utilisateur ${userId} n'a pas accès au site ${websiteId}`);
            return res.status(403).json({ 
                success: false, 
                message: 'Accès refusé au site web',
                authorisation: false
            });
        }


        // Les admins ont automatiquement toutes les autorisations
        if (role === 'admin') {
            return res.json({
                success: true,
                authorisation: true,
                role: 'admin'
            });
        }

        // Mapper l'ancien nom vers le nouveau
        const featureName = mapFeatureName(type);
        

        // Pour les non-admins, récupérer le plan d'abonnement du site avec les features
        let { data: subscription, error: subError } = await supabase
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

        // Si aucun abonnement actif n'existe, créer un abonnement gratuit par défaut
        if (!subscription && !subError) {
            console.log(`Création d'un abonnement gratuit pour le site ${websiteId}`);
            
            // Récupérer le plan gratuit
            const { data: freePlan } = await supabase
                .from("subscription_plans")
                .select("*")
                .eq("name", "free")
                .single();

            if (freePlan) {
                // Créer l'abonnement gratuit
                const { data: newSubscription, error: createError } = await supabase
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

        if (subscription && subscription.subscription_plans) {
            planName = subscription.subscription_plans.name;
            features = subscription.subscription_plans.features || features;
        } else {
            console.log('Aucun abonnement actif trouvé, utilisation du plan gratuit par défaut');
        }

        
        // Vérifier si la feature demandée est disponible dans le plan
        const hasFeature = features[featureName] === true;
        

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

module.exports = router;