const express = require('express');
const cors = require('cors')

const { supabaseServer, supabaseServerAdmin } = require('../supabase');
const { authenticateToken } = require('../middleware/authToken');
const { checkUserWebsiteAccess } = require('../website/website');

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
    'auth_ecom': 'collections', // E-commerce utilise aussi les collections
    'auth_newsletter': 'newsletter',
    'auth_contact': 'contact',
    'custom_domain': 'custom_domain'
  };
  return mapping[oldFeatureName] || oldFeatureName;
};

router.post('/getAuthorisation', authenticateToken, async (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);   

    const { type, websiteId } = req.body;
    const userId = req.user.idUser;

    console.log(`Vérification de l'autorisation pour l'utilisateur ${userId} sur le site ${websiteId} pour le type ${type}`);

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
                message: 'Accès refusé au site web' 
            });
        }

        // Vérifier d'abord si l'utilisateur est admin
        const { data: userData } = await supabase
            .from('users')
            .select('is_admin')
            .eq('id', userId)
            .single();
            
        // Les admins ont toutes les autorisations
        if (userData && userData.is_admin) {
            return res.status(200).json({ 
                success: true, 
                authorisation: true 
            });
        }

        // Pour les non-admins, récupérer le plan d'abonnement du site avec les features
        console.log('Recherche d\'abonnement pour websiteId:', websiteId);
        
        // Utiliser supabaseServerAdmin pour bypass RLS (Row Level Security)
        const supabaseAdmin = supabaseServerAdmin();
        
        const { data: subscription, error: subscriptionError } = await supabaseAdmin
            .from('website_subscriptions')
            .select(`
                status,
                subscription_plans (
                    name,
                    features
                )
            `)
            .eq('website_id', websiteId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        console.log('Subscription data:', subscription);    
        console.log('Subscription error:', subscriptionError);

        if (subscriptionError && subscriptionError.code !== 'PGRST116') {
            console.error('Erreur lors de la récupération de l\'abonnement:', subscriptionError);
            return res.status(500).json({ success: false, message: 'Erreur de base de données' });
        }

        // Déterminer le plan et les features (par défaut 'free' si pas d'abonnement actif)
        let planName = 'free';
        let features = {
            pages: true,
            contact: true,
            portfolio: true,
            newsletter: true,
            collections: true,
            custom_domain: false,
            webflow_preview_only: true
        };

        if (subscription && subscription.subscription_plans) {
            planName = subscription.subscription_plans.name;
            features = subscription.subscription_plans.features || features;
        }

        // Mapper le nom de feature ancien vers le nouveau format
        const mappedFeatureName = mapFeatureName(type);
        
        return res.status(200).json({ 
            success: true, 
            authorisation: features[mappedFeatureName] || false,
            role: role,
            plan: planName
        });
    } catch (error) {
        console.error('Erreur interne:', error);
        return res.status(500).json({ success: false });
    }
});

module.exports = router;

